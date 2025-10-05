import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ClayButton } from '../ui/ClayButton';
import { ClayColors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface CameraCaptureProps {
  onImageCapture: (uris: string[]) => void;
  onVideoCapture: (uris: string[]) => void;
  style?: any;
}

export const CameraCapture = forwardRef<any, CameraCaptureProps>(({ onImageCapture, onVideoCapture, style }, ref) => {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!cameraPermission.granted || !mediaLibraryPermission.granted) {
      Alert.alert(
        'Permissions Required',
        'Please grant camera and media library permissions to capture photos and videos.'
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && Array.isArray(result.assets) && result.assets.length > 0) {
        const uris = result.assets
          .filter(a => a.type === 'image' && typeof a.uri === 'string')
          .map(a => a.uri);
        if (uris.length > 0) {
          // Compress images immediately for faster upload later
          const compressed: string[] = [];
          for (const uri of uris) {
            try {
              const m = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1280 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
              compressed.push(m.uri);
            } catch (err) {
              console.warn('Image compression failed, using original', err);
              compressed.push(uri);
            }
          }
          onImageCapture(compressed);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const recordVideo = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        videoMaxDuration: 60,
      });

      if (!result.canceled && Array.isArray(result.assets) && result.assets.length > 0) {
        const uris = result.assets
          .filter(a => a.type === 'video' && typeof a.uri === 'string')
          .map(a => a.uri);
        if (uris.length > 0) onVideoCapture(uris);
      }
    } catch {
      Alert.alert('Error', 'Failed to record video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectFromLibrary = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && Array.isArray(result.assets) && result.assets.length > 0) {
        const imageUris: string[] = [];
        const videoUris: string[] = [];

        for (const asset of result.assets) {
          if (asset.type === 'image' && typeof asset.uri === 'string') {
            // compress each selected image
            try {
              const m = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 1280 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
              imageUris.push(m.uri);
            } catch (err) {
              console.warn('Image compression failed on selection, using original', err);
              imageUris.push(asset.uri);
            }
          }
          if (asset.type === 'video' && typeof asset.uri === 'string') videoUris.push(asset.uri);
        }

        if (imageUris.length > 0) onImageCapture(imageUris);
        if (videoUris.length > 0) onVideoCapture(videoUris);
      }
    } catch {
      Alert.alert('Error', 'Failed to select media. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    takePhoto,
    recordVideo,
  }));

  return (
    <View style={[styles.container, style]}>
      <ClayButton
        title="Take Photo"
        variant="primary"
        size="medium"
        onPress={takePhoto}
        disabled={isLoading}
        icon={<Ionicons name="camera" size={16} color={ClayColors.white} />}
        style={styles.fullWidthButton}
      />
      <ClayButton
        title="Record Video"
        variant="secondary"
        size="medium"
        onPress={recordVideo}
        disabled={isLoading}
        icon={<Ionicons name="videocam" size={16} color={ClayColors.white} />}
        style={styles.fullWidthButton}
      />
      <ClayButton
        title="Upload from Library"
        variant="secondary"
        size="medium"
        onPress={selectFromLibrary}
        disabled={isLoading}
        icon={<Ionicons name="cloud-upload-outline" size={16} color={ClayColors.white} />}
        style={styles.fullWidthButton}
      />
    </View>
  );
});

CameraCapture.displayName = 'CameraCapture';

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  fullWidthButton: {
    alignSelf: 'stretch',
  },
});
