import { Platform, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as MediaLibrary from 'expo-media-library';

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

export class PermissionUtils {
  static async requestLocationPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      return {
        granted: status === 'granted',
        canAskAgain,
        message: status !== 'granted' ? 'Location access is required for emergency features and hazard reporting.' : undefined
      };
    } catch {
      console.error('Error requesting location permission:');
      return { granted: false, canAskAgain: false, message: 'Failed to request location permission' };
    }
  }

  static async requestCameraPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
      
      return {
        granted: status === 'granted',
        canAskAgain,
        message: status !== 'granted' ? 'Camera access is required to capture photos and videos for hazard reports.' : undefined
      };
    } catch {
      console.error('Error requesting camera permission:');
      return { granted: false, canAskAgain: false, message: 'Failed to request camera permission' };
    }
  }

  static async requestMicrophonePermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await requestRecordingPermissionsAsync();
      
      return {
        granted: status === 'granted',
        canAskAgain,
        message: status !== 'granted' ? 'Microphone access is required to record voice notes for hazard reports.' : undefined
      };
    } catch {
      console.error('Error requesting microphone permission:');
      return { granted: false, canAskAgain: false, message: 'Failed to request microphone permission' };
    }
  }

  static async requestMediaLibraryPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      
      return {
        granted: status === 'granted',
        canAskAgain,
        message: status !== 'granted' ? 'Media library access is required to save and select photos and videos.' : undefined
      };
    } catch {
      console.error('Error requesting media library permission:');
      return { granted: false, canAskAgain: false, message: 'Failed to request media library permission' };
    }
  }

  static async requestAllPermissions(): Promise<{ [key: string]: PermissionStatus }> {
    const [location, camera, microphone, mediaLibrary] = await Promise.all([
      this.requestLocationPermission(),
      this.requestCameraPermission(),
      this.requestMicrophonePermission(),
      this.requestMediaLibraryPermission(),
    ]);

    return {
      location,
      camera,
      microphone,
      mediaLibrary,
    };
  }

  static showPermissionAlert(
    permissionName: string,
    message: string,
    canAskAgain: boolean = true
  ): void {
    const buttons = canAskAgain
      ? [
          { text: 'Cancel', style: 'cancel' as const },
          { text: 'Grant Permission', onPress: () => Linking.openSettings() }
        ]
      : [
          { text: 'OK', style: 'default' as const }
        ];

    Alert.alert(
      `${permissionName} Permission Required`,
      message,
      buttons
    );
  }

  static async checkAndRequestPermission(
    permissionType: 'location' | 'camera' | 'microphone' | 'mediaLibrary',
    showAlert: boolean = true
  ): Promise<boolean> {
    let permissionStatus: PermissionStatus;

    switch (permissionType) {
      case 'location':
        permissionStatus = await this.requestLocationPermission();
        break;
      case 'camera':
        permissionStatus = await this.requestCameraPermission();
        break;
      case 'microphone':
        permissionStatus = await this.requestMicrophonePermission();
        break;
      case 'mediaLibrary':
        permissionStatus = await this.requestMediaLibraryPermission();
        break;
      default:
        return false;
    }

    if (!permissionStatus.granted && showAlert && permissionStatus.message) {
      this.showPermissionAlert(
        permissionType.charAt(0).toUpperCase() + permissionType.slice(1),
        permissionStatus.message,
        permissionStatus.canAskAgain
      );
    }

    return permissionStatus.granted;
  }

  static getPermissionInstructions(platform: 'ios' | 'android' = Platform.OS as 'ios' | 'android'): string {
    if (platform === 'ios') {
      return 'To enable permissions:\n1. Go to Settings\n2. Find Mining Safety Companion\n3. Enable the required permissions';
    } else {
      return 'To enable permissions:\n1. Go to Settings\n2. Apps & notifications\n3. Mining Safety Companion\n4. Permissions\n5. Enable the required permissions';
    }
  }
}