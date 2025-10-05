import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { storage } from '../../firebaseConfig';

export class StorageService {
  static async uploadFile(
    filePath: string,
    fileUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // Convert file URI to blob for upload
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      const storageRef = ref(storage, filePath);
      
      if (onProgress) {
        // Upload with progress tracking
        const uploadTask = uploadBytesResumable(storageRef, blob);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(progress);
            },
            (error) => {
              console.error('Upload error:', error);
              reject(new Error('Failed to upload file'));
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              } catch (error) {
                reject(new Error('Failed to get download URL'));
              }
            }
          );
        });
      } else {
        // Simple upload without progress
        const snapshot = await uploadBytes(storageRef, blob);
        return await getDownloadURL(snapshot.ref);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  static async uploadAudio(audioUri: string, userId: string, reportId: string): Promise<string> {
    const filePath = `hazardReports/${userId}/${reportId}/audio.m4a`;
    return this.uploadFile(filePath, audioUri);
  }

  static async uploadImage(imageUri: string, userId: string, reportId: string, index: number): Promise<string> {
    const filePath = `hazardReports/${userId}/${reportId}/image_${index}.jpg`;
    return this.uploadFile(filePath, imageUri);
  }

  static async uploadVideo(videoUri: string, userId: string, reportId: string, index: number): Promise<string> {
    const filePath = `hazardReports/${userId}/${reportId}/video_${index}.mp4`;
    return this.uploadFile(filePath, videoUri);
  }

  static async deleteFile(filePath: string): Promise<void> {
    try {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  static generateFilePath(type: 'audio' | 'image' | 'video', userId: string, reportId: string, index?: number): string {
    const timestamp = Date.now();
    
    switch (type) {
      case 'audio':
        return `hazardReports/${userId}/${reportId}/audio_${timestamp}.m4a`;
      case 'image':
        return `hazardReports/${userId}/${reportId}/image_${index || 0}_${timestamp}.jpg`;
      case 'video':
        return `hazardReports/${userId}/${reportId}/video_${index || 0}_${timestamp}.mp4`;
      default:
        return `hazardReports/${userId}/${reportId}/file_${timestamp}`;
    }
  }
}