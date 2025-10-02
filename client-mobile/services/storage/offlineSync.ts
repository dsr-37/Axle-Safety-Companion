import { StorageService } from './asyncStorage';
import { FirestoreService } from '../firebase/firestore';
import { StorageService as FirebaseStorageService } from '../firebase/storage';
import NetInfo from '@react-native-community/netinfo';

interface OfflineAction {
  id: string;
  type: 'checklist' | 'hazard_report' | 'profile_update';
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
      console.error('Error adding to offline queue:', error);
    }
  }

  static async getQueue(): Promise<OfflineAction[]> {
    try {
      const queue = await StorageService.getObject<OfflineAction[]>(this.SYNC_QUEUE_KEY);
      return queue || [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
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
          console.error(`Error processing action ${action.id}:`, error);
          
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
      console.error('Error processing offline queue:', error);
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
        
      case 'hazard_report':
        // Upload media files first if they exist
        const reportId = await FirestoreService.submitHazardReport(action.data.report);
        
        if (action.data.mediaFiles) {
          for (const media of action.data.mediaFiles) {
            if (media.type === 'audio') {
              await FirebaseStorageService.uploadAudio(media.uri, action.data.userId, reportId);
            } else if (media.type === 'image') {
              await FirebaseStorageService.uploadImage(media.uri, action.data.userId, reportId, media.index);
            } else if (media.type === 'video') {
              await FirebaseStorageService.uploadVideo(media.uri, action.data.userId, reportId, media.index);
            }
          }
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
      console.error('Error checking internet connection:', error);
      return false;
    }
  }

  static async getLastSyncTime(): Promise<number | null> {
    try {
      const timestamp = await StorageService.getItem(StorageService.KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  static async clearQueue(): Promise<void> {
    try {
      await StorageService.removeItem(this.SYNC_QUEUE_KEY);
    } catch (error) {
      console.error('Error clearing offline queue:', error);
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