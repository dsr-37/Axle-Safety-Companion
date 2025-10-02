import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, AppSettings } from '../types/user';
import { StorageService } from '../services/storage/asyncStorage';
import { useAuth } from './AuthContext';

interface UserContextType {
  appSettings: AppSettings;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  resetAppSettings: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'en',
  notifications: {
    enabled: true,
    dailyReminder: true,
    emergencyAlerts: true,
    hazardUpdates: true,
  },
  offline: {
    autoSync: true,
    wifiOnly: false,
    maxStorageSize: 100, // 100MB
  },
  privacy: {
    shareLocation: true,
    anonymizeReports: false,
  },
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    loadAppSettings();
  }, [userProfile]);

  const loadAppSettings = async () => {
    try {
      const savedSettings = await StorageService.getObject<AppSettings>(StorageService.KEYS.APP_SETTINGS);
      if (savedSettings) {
        setAppSettings({ ...defaultSettings, ...savedSettings });
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
    }
  };

  const updateAppSettings = async (updates: Partial<AppSettings>) => {
    try {
      const newSettings = { ...appSettings, ...updates };
      setAppSettings(newSettings);
      await StorageService.setObject(StorageService.KEYS.APP_SETTINGS, newSettings);
    } catch (error) {
      console.error('Error updating app settings:', error);
      throw new Error('Failed to update settings');
    }
  };

  const resetAppSettings = async () => {
    try {
      setAppSettings(defaultSettings);
      await StorageService.setObject(StorageService.KEYS.APP_SETTINGS, defaultSettings);
    } catch (error) {
      console.error('Error resetting app settings:', error);
      throw new Error('Failed to reset settings');
    }
  };

  const value: UserContextType = {
    appSettings,
    updateAppSettings,
    resetAppSettings,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};