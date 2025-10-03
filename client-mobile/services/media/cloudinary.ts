import * as ImageManipulator from 'expo-image-manipulator';

// Cloudinary configuration (unsigned preset for MVP)
// NOTE: For production use signed uploads via a server-side signer.
const CLOUDINARY_CLOUD_NAME = 'drr7mutz7';
const CLOUDINARY_UPLOAD_PRESET = 'hazard_media';
const CLOUDINARY_UPLOAD_FOLDER = 'hazard_reports';

const makeUploadUrl = (resourceType: 'image' | 'video' | 'auto' = 'image') =>
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

async function uploadFile(formData: FormData, resourceType: 'image' | 'video' | 'auto') {
  const url = makeUploadUrl(resourceType as any);
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
  }
  return await res.json();
}

export async function uploadImage(imageUri: string, options?: { maxWidth?: number; compress?: number }) {
  // Default compression settings
  const maxWidth = options?.maxWidth ?? 1280;
  const compress = options?.compress ?? 0.7;

  // Resize/compress using expo-image-manipulator
  const manipResult = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: maxWidth } }],
    { compress, format: ImageManipulator.SaveFormat.JPEG }
  );

  const fileName = manipResult.uri.split('/').pop() || 'upload.jpg';

  const formData = new FormData();
  // @ts-ignore - React Native FormData accepts file objects with uri/name/type
  formData.append('file', { uri: manipResult.uri, name: fileName, type: 'image/jpeg' });
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', CLOUDINARY_UPLOAD_FOLDER);

  const json = await uploadFile(formData, 'image');
  return {
    url: json.secure_url as string,
    publicId: json.public_id as string,
    width: json.width,
    height: json.height,
    bytes: json.bytes,
    raw: json,
  };
}

export async function uploadVideo(videoUri: string) {
  const fileName = videoUri.split('/').pop() || 'upload.mp4';
  const formData = new FormData();
  // @ts-ignore
  formData.append('file', { uri: videoUri, name: fileName, type: 'video/mp4' });
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', CLOUDINARY_UPLOAD_FOLDER);

  const json = await uploadFile(formData, 'video');
  return {
    url: json.secure_url as string,
    publicId: json.public_id as string,
    width: json.width,
    height: json.height,
    bytes: json.bytes,
    duration: json.duration,
    raw: json,
  };
}

export async function uploadAudio(audioUri: string) {
  const fileName = audioUri.split('/').pop() || 'upload.m4a';
  const formData = new FormData();
  // @ts-ignore
  formData.append('file', { uri: audioUri, name: fileName, type: 'audio/m4a' });
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', CLOUDINARY_UPLOAD_FOLDER);

  // Use 'auto' to allow Cloudinary to determine resource type
  const json = await uploadFile(formData, 'auto');
  return {
    url: json.secure_url as string,
    publicId: json.public_id as string,
    bytes: json.bytes,
    duration: json.duration,
    raw: json,
  };
}

export default {
  uploadImage,
  uploadVideo,
  uploadAudio,
};
