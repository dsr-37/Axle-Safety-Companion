import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { UserProfile } from '../../types/user';
import { ChecklistItem, HazardReport } from '../../types/common';

export class FirestoreService {
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: userId, ...docSnap.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to load user profile');
    }
  }

  static async createUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    try {
      const userProfile: Partial<UserProfile> = {
        // Ensure required fields and serverTimestamp for createdAt for consistency
        ...profile,
        createdAt: serverTimestamp() as any,
        lastActive: new Date(),
        isActive: profile.isActive !== undefined ? profile.isActive : true,
      };

      await setDoc(doc(db, 'users', userId), userProfile);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        lastActive: new Date(),
      };
      
      await updateDoc(doc(db, 'users', userId), updateData);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  static async saveChecklistProgress(
    userId: string,
    date: string,
    checklist: ChecklistItem[]
  ): Promise<void> {
    try {
      const checklistData = {
        userId,
        date,
        checklist,
        completedAt: new Date(),
        completionRate: (checklist.filter(item => item.completed).length / checklist.length) * 100,
      };

      const docId = `${date}_${userId}`;
      await setDoc(doc(db, 'checklists', docId), checklistData);
    } catch (error) {
      console.error('Error saving checklist:', error);
      throw new Error('Failed to save checklist progress');
    }
  }

  static async getChecklistProgress(userId: string, date: string): Promise<ChecklistItem[] | null> {
    try {
      const docId = `${date}_${userId}`;
      const docRef = doc(db, 'checklists', docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.checklist || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching checklist:', error);
      return null;
    }
  }

  static async submitHazardReport(report: Partial<HazardReport>): Promise<string> {
    try {
      const hazardData = {
        ...report,
        timestamp: new Date(),
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'hazardReports'), hazardData);
      return docRef.id;
    } catch (error) {
      console.error('Error submitting hazard report:', error);
      throw new Error('Failed to submit hazard report');
    }
  }

  static async getHazardReports(userId?: string): Promise<HazardReport[]> {
    try {
      const hazardReportsCollection = collection(db, 'hazardReports');
      let q;
      
      if (userId) {
        q = query(hazardReportsCollection, where('userId', '==', userId), orderBy('timestamp', 'desc'));
      } else {
        q = query(hazardReportsCollection, orderBy('timestamp', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      const reports: HazardReport[] = [];
      
      querySnapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() } as HazardReport);
      });
      
      return reports;
    } catch (error) {
      console.error('Error fetching hazard reports:', error);
      return [];
    }
  }

  static async enableOfflineSupport(): Promise<void> {
    try {
      await enableNetwork(db);
    } catch (error) {
      console.error('Error enabling offline support:', error);
    }
  }

  static async disableOfflineSupport(): Promise<void> {
    try {
      await disableNetwork(db);
    } catch (error) {
      console.error('Error disabling offline support:', error);
    }
  }
}