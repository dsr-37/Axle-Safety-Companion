import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageService {
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
      throw new Error('Failed to save data locally');
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from AsyncStorage:', error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from AsyncStorage:', error);
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  }

  static async getAllKeys(): Promise<string[]> {
    try {
      return [...(await AsyncStorage.getAllKeys())];
    } catch (error) {
      console.error('Error getting all keys from AsyncStorage:', error);
      return [];
    }
  }

  // Utility methods for common storage operations
  static async setObject(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await this.setItem(key, jsonValue);
    } catch (error) {
      throw new Error('Failed to save object');
    }
  }

  static async getObject<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await this.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error parsing stored object:', error);
      return null;
    }
  }

  // App-specific storage keys
  static readonly KEYS = {
    USER_PROFILE: 'user_profile',
    OFFLINE_QUEUE: 'offline_queue',
    CHECKLIST_PREFIX: 'checklist_',
    HAZARD_REPORTS_PREFIX: 'hazard_reports_',
    APP_SETTINGS: 'app_settings',
    LAST_SYNC: 'last_sync_timestamp',
  };
}