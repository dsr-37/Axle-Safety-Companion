import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  AuthError
} from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { fetchSignInMethodsForEmail } from 'firebase/auth';

export class AuthService {
  static async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw this.handleAuthError(error as AuthError);
    }
  }

  static async createAccount(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw this.handleAuthError(error as AuthError);
    }
  }

  static async emailHasAccount(email: string): Promise<boolean> {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return Array.isArray(methods) && methods.length > 0;
    } catch (error) {
      // If the request fails (network), conservatively return false so caller can attempt registration and surface errors
      console.warn('Error checking email existence:', error);
      return false;
    }
  }

  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out');
    }
  }

  static handleAuthError(error: AuthError): Error {
    switch (error.code) {
      case 'auth/user-not-found':
        return new Error('No account found with this email address');
      case 'auth/wrong-password':
        return new Error('Incorrect password');
      case 'auth/email-already-in-use':
        return new Error('An account already exists with this email address');
      case 'auth/weak-password':
        return new Error('Password should be at least 6 characters');
      case 'auth/invalid-email':
        return new Error('Please enter a valid email address');
      case 'auth/network-request-failed':
        return new Error('Network error. Please check your connection');
      default:
        return new Error('Authentication failed. Please try again');
    }
  }

  // TODO: Implement phone number authentication
  static async signInWithPhoneNumber(phoneNumber: string): Promise<void> {
    // This will be implemented in Phase 2 with phone authentication
    throw new Error('Phone authentication not yet implemented');
  }
}