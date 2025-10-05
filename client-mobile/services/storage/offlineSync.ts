import { StorageService } from './asyncStorage';
import { FirestoreService } from '../firebase/firestore';
import { StorageService as FirebaseStorageService } from '../firebase/storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

interface OfflineAction {
  id: string;
  type: 'checklist' | 'hazard_report' | 'profile_update' | 'checklist_item' | 'emergency_sos' | 'emergency_ack';
  data: any;
  timestamp: number;
  retryCount: number;
}

export class OfflineSyncService {
  private static readonly MAX_RETRIES = 3;
  private static readonly SYNC_QUEUE_KEY = StorageService.KEYS.OFFLINE_QUEUE;
  
  static async addToQueue(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const queue = await this.getQueue();
      const newAction: OfflineAction = {
        ...action,
        id: `${action.type}_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        retryCount: 0,
      };
      
      queue.push(newAction);
      await StorageService.setObject(this.SYNC_QUEUE_KEY, queue);
    } catch (error) {
      console.warn('Error adding to offline queue:', (error as any)?.message || String(error));
    }
  }

  static async getQueue(): Promise<OfflineAction[]> {
    try {
      const queue = await StorageService.getObject<OfflineAction[]>(this.SYNC_QUEUE_KEY);
      return queue || [];
    } catch (error) {
      console.warn('Error getting offline queue:', (error as any)?.message || String(error));
      return [];
    }
  }

  static async processQueue(): Promise<void> {
    const isConnected = await this.checkInternetConnection();
    if (!isConnected) {
      console.log('No internet connection, skipping sync');
      return;
    }

    try {
      const queue = await this.getQueue();
      const successfulActions: string[] = [];
      
      for (const action of queue) {
        try {
          await this.processAction(action);
          successfulActions.push(action.id);
          } catch (error) {
          console.warn(`Error processing action ${action.id}:`, (error as any)?.message || String(error));
          
          // Increment retry count
          action.retryCount++;
          
          // Remove action if max retries exceeded
          if (action.retryCount >= this.MAX_RETRIES) {
            successfulActions.push(action.id);
            console.log(`Max retries exceeded for action ${action.id}, removing from queue`);
          }
        }
      }

      // Remove successful/failed actions from queue
      const updatedQueue = queue.filter(action => !successfulActions.includes(action.id));
      await StorageService.setObject(this.SYNC_QUEUE_KEY, updatedQueue);
      
      // Update last sync timestamp
      await StorageService.setItem(StorageService.KEYS.LAST_SYNC, Date.now().toString());
      
    } catch (error) {
      console.warn('Error processing offline queue:', (error as any)?.message || String(error));
    }
  }

  private static async processAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'checklist':
        await FirestoreService.saveChecklistProgress(
          action.data.userId,
          action.data.date,
          action.data.checklist
        );
        break;

      case 'checklist_item':
        // data: { userId, checklistId, action: 'mark'|'unmark', date? }
        if (!action.data) throw new Error('Missing checklist_item data');
        if (action.data.action === 'mark') {
          await FirestoreService.markChecklistItem(action.data.userId, action.data.checklistId, action.data.date);
        } else {
          await FirestoreService.unmarkChecklistItem(action.data.userId, action.data.checklistId, action.data.date);
        }
        break;
        
      case 'hazard_report':
        // For queued hazard reports: upload media to Cloudinary then save to Firestore (hazard_reports)
        const reportPayload = action.data.report;
        const mediaFiles = action.data.mediaFiles || [];

        const uploadedImages: any[] = [];
        const uploadedVideos: any[] = [];
        let uploadedAudio: any | undefined;

        // Upload images
        for (const media of mediaFiles.filter((m: any) => m.type === 'image')) {
          try {
            const res = await import('../media/cloudinary').then(mod => mod.uploadImage(media.uri));
            uploadedImages.push(res);
          } catch (err) {
            console.warn('Offline image upload failed', err);
            throw err;
          }
        }

        // Upload videos
        for (const media of mediaFiles.filter((m: any) => m.type === 'video')) {
          try {
            const res = await import('../media/cloudinary').then(mod => mod.uploadVideo(media.uri));
            uploadedVideos.push(res);
          } catch (err) {
            console.warn('Offline video upload failed', err);
            throw err;
          }
        }

        // Upload audio
        const audioMedia = mediaFiles.find((m: any) => m.type === 'audio');
        if (audioMedia) {
          try {
            uploadedAudio = await import('../media/cloudinary').then(mod => mod.uploadAudio(audioMedia.uri));
          } catch (err) {
            console.warn('Offline audio upload failed', err);
            throw err;
          }
        }

        // Attach uploaded media metadata to payload, but only include keys that are present
        const media: any = {};
        if (uploadedImages.length > 0) {
          media.images = uploadedImages.map(u => ({ url: u.url, publicId: u.publicId, width: u.width, height: u.height, bytes: u.bytes }));
        }
        if (uploadedVideos.length > 0) {
          media.videos = uploadedVideos.map(u => ({ url: u.url, publicId: u.publicId, width: u.width, height: u.height, bytes: u.bytes, duration: u.duration }));
        }
        if (uploadedAudio) {
          media.audio = { url: uploadedAudio.url, publicId: uploadedAudio.publicId, bytes: uploadedAudio.bytes, duration: uploadedAudio.duration };
        }

        if (Object.keys(media).length > 0) {
          reportPayload.media = media;
        } else if (reportPayload.media) {
          // ensure no undefined media key remains
          delete reportPayload.media;
        }

        // Remove any undefined top-level fields to avoid Firestore rejecting the document
        const cleanedPayload: any = {};
        Object.keys(reportPayload || {}).forEach((k) => {
          const v = (reportPayload as any)[k];
          if (v !== undefined) cleanedPayload[k] = v;
        });

        try {
          // Ensure payload has location triple; if missing, try to backfill from user profile
          if (!cleanedPayload.stateId && cleanedPayload.userId) {
            try {
              const profile = await FirestoreService.getUserProfile(cleanedPayload.userId);
              if (profile) {
                cleanedPayload.stateId = (profile as any).stateId;
                cleanedPayload.stateName = (profile as any).stateName;
                cleanedPayload.coalfieldId = (profile as any).coalfieldId;
                cleanedPayload.coalfieldName = (profile as any).coalfieldName;
                cleanedPayload.mineId = (profile as any).mineId;
                cleanedPayload.mineName = (profile as any).mineName;
              }
            } catch (pfErr) {
              console.warn('Failed to backfill location triple for queued hazard_report', pfErr);
            }
          }

          await FirestoreService.submitHazardReportCloud(cleanedPayload);
        } catch (err: any) {
          console.warn('Failed to submit queued hazard report after sanitization:', err?.message || String(err));
          // If this is an invalid-data error related to undefined fields, inform the user and drop the action.
          const message = err?.message || String(err);
          if (message.includes('Unsupported field value') || message.includes('invalid data') || message.includes('undefined')) {
            try {
              Alert.alert(
                'Report Upload Failed',
                'A saved report could not be submitted because it contains unsupported or missing fields. The report will be removed from the upload queue. Please recreate the report in the app if needed.',
                [{ text: 'OK' }]
              );
            } catch (aErr) {
              // ignore alert failure in non-UI contexts
            }
            // throw to let the queue handler mark it as handled/removed
            throw new Error('Dropping invalid queued report');
          }
          // For other errors, rethrow so the action will be retried according to retry policy
          throw err;
        }
        break;

      case 'emergency_sos':
        // data: { payload }
        if (!action.data || !action.data.payload) throw new Error('Missing emergency_sos payload');
        try {
          // backfill triple from user profile when possible
          const payload = action.data.payload || {};
          if ((!payload.stateId || !payload.mineId || !payload.coalfieldId) && payload.userId) {
            try {
              const profile = await FirestoreService.getUserProfile(payload.userId);
              if (profile) {
                payload.stateId = (profile as any).stateId;
                payload.stateName = (profile as any).stateName;
                payload.coalfieldId = (profile as any).coalfieldId;
                payload.coalfieldName = (profile as any).coalfieldName;
                payload.mineId = (profile as any).mineId;
                payload.mineName = (profile as any).mineName;
              }
            } catch (pfErr) {
              console.warn('Failed to backfill location triple for queued emergency_sos', pfErr);
            }
          }
          await FirestoreService.createEmergencyAlert(payload);
        } catch (err) {
          console.warn('Failed to submit queued emergency_sos:', (err as any)?.message || String(err));
          throw err;
        }
        break;

      case 'emergency_ack':
        // data: { alertId, acknowledger }
        if (!action.data || !action.data.alertId) throw new Error('Missing emergency_ack data');
        try {
          await FirestoreService.acknowledgeEmergencyAlert(action.data.alertId, action.data.acknowledger);
        } catch (err) {
          console.warn('Failed to submit queued emergency_ack:', (err as any)?.message || String(err));
          throw err;
        }
        break;
        
      case 'profile_update':
        await FirestoreService.updateUserProfile(action.data.userId, action.data.updates);
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  static async checkInternetConnection(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      return (netInfo.isConnected ?? false) && (netInfo.isInternetReachable ?? false);
    } catch (error) {
      console.warn('Error checking internet connection:', (error as any)?.message || String(error));
      return false;
    }
  }

  static async getLastSyncTime(): Promise<number | null> {
    try {
      const timestamp = await StorageService.getItem(StorageService.KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.warn('Error getting last sync time:', (error as any)?.message || String(error));
      return null;
    }
  }

  static async clearQueue(): Promise<void> {
    try {
      await StorageService.removeItem(this.SYNC_QUEUE_KEY);
    } catch (error) {
      console.warn('Error clearing offline queue:', (error as any)?.message || String(error));
    }
  }

  // Auto-sync setup
  static setupAutoSync(): void {
    // Process queue every 30 seconds when app is active
    setInterval(() => {
      this.processQueue();
    }, 30000);

    // Process queue when network becomes available
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });
  }
}