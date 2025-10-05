import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { OfflineSyncService } from '../services/storage/offlineSync';
import { SyncStatus } from '../types/common';

interface OfflineContextType {
  isOnline: boolean;
  syncStatus: SyncStatus;
  syncNow: () => Promise<void>;
  clearSyncQueue: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingActions: 0,
    isOnline: true,
    isSyncing: false,
    syncErrors: [],
  });

  useEffect(() => {
    // Setup network listener
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(connected);
      setSyncStatus(prev => ({ ...prev, isOnline: connected }));

      // Auto-sync when coming back online
      if (connected && !syncStatus.isSyncing) {
        syncNow();
      }
    });

    // Setup auto-sync
    OfflineSyncService.setupAutoSync();

    // Initial sync status check
    updateSyncStatus();

    return unsubscribe;
  }, []);

  const updateSyncStatus = async () => {
    try {
      const queue = await OfflineSyncService.getQueue();
      const lastSyncTime = await OfflineSyncService.getLastSyncTime();
      
      setSyncStatus(prev => ({
        ...prev,
        pendingActions: queue.length,
        lastSyncTime: lastSyncTime ? new Date(lastSyncTime) : undefined,
      }));
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  };

  const syncNow = async () => {
    if (!isOnline || syncStatus.isSyncing) {
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncErrors: [] }));

    try {
      await OfflineSyncService.processQueue();
      await updateSyncStatus();
    } catch (error) {
      console.error('Error during sync:', error);
      setSyncStatus(prev => ({
        ...prev,
        syncErrors: [...prev.syncErrors, 'Sync failed'],
      }));
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const clearSyncQueue = async () => {
    try {
      await OfflineSyncService.clearQueue();
      await updateSyncStatus();
    } catch (error) {
      console.error('Error clearing sync queue:', error);
    }
  };

  const value: OfflineContextType = {
    isOnline,
    syncStatus,
    syncNow,
    clearSyncQueue,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};
