// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, setLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBSceI14SdywHJs3z2nX9GWIRS6ppOsclE",
  authDomain: "axle-safety-app-37.firebaseapp.com",
  projectId: "axle-safety-app-37",
  storageBucket: "axle-safety-app-37.firebasestorage.app",
  messagingSenderId: "670587172193",
  appId: "1:670587172193:web:1194f1658c18b8604b4120",
  measurementId: "G-6414YV94L0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth for React Native with AsyncStorage persistence so auth state
// persists between app restarts. Without this, auth state defaults to memory
// persistence and will be lost when the app reloads.
// Requires: @react-native-async-storage/async-storage installed (already in package.json)
// Initialize auth differently for web (react-native-web) vs native platforms.
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

export const db = getFirestore(app);
export const storage = getStorage(app);
// Reduce Firestore client logging level to avoid noisy WARN messages in production/dev logs
try {
  // valid values include: 'debug', 'error', 'silent'
  setLogLevel('error');
} catch (e) {
  // ignore if setLogLevel not supported in this runtime
}