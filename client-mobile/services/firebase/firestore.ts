import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  enableNetwork,
  disableNetwork,
  deleteField,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { UserProfile } from '../../types/user';
import { ChecklistItem, HazardReport } from '../../types/common';

const getDateKeyAt3AM = (d?: Date) => {
  const date = d ? new Date(d) : new Date();
  // shift date backward by 3 hours to make day boundary at 03:00
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const yyyy = shifted.getFullYear();
  const mm = String(shifted.getMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

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

  // Supervisor helpers
  static async getSupervisorDocByEmail(email: string): Promise<{ id: string; data: any } | null> {
    try {
      const normalized = email.trim().toLowerCase();

      // First try common lowercase 'email' field
      let q = query(collection(db, 'supervisors'), where('email', '==', normalized));
      let snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return { id: docSnap.id, data: docSnap.data() };
      }

      // Fallback to capitalized 'Email' field if some docs use that schema
      q = query(collection(db, 'supervisors'), where('Email', '==', normalized));
      snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return { id: docSnap.id, data: docSnap.data() };
      }

      return null;
    } catch (error) {
      console.error('Error fetching supervisor doc by email:', error);
      return null;
    }
  }

  static async findUserDocByEmail(email: string): Promise<{ id: string; data: any } | null> {
    try {
      const normalized = email.trim().toLowerCase();
      const q = query(collection(db, 'users'), where('email', '==', normalized));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, data: docSnap.data() };
    } catch (error) {
      console.error('Error finding user doc by email:', error);
      return null;
    }
  }

  static async registerSupervisor(docId: string, userId: string, name: string, password?: string, location?: { stateId?: string; stateName?: string; coalfieldId?: string; coalfieldName?: string; mineId?: string; mineName?: string }): Promise<void> {
    try {
      const docRef = doc(db, 'supervisors', docId);
      const payload: any = { userId, name };
      if (password) payload.password = password;
      if (location) {
        payload.stateId = location.stateId;
        payload.stateName = location.stateName;
        payload.coalfieldId = location.coalfieldId;
        payload.coalfieldName = location.coalfieldName;
        payload.mineId = location.mineId;
        payload.mineName = location.mineName;
      }
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      console.error('Error registering supervisor:', error);
      throw new Error('Failed to register supervisor');
    }
  }

  static async addSupervisorEmailToMine(stateId: string, coalfieldId: string, mineId: string, email: string): Promise<void> {
    try {
      if (!stateId || !coalfieldId || !mineId || !email) return;
      const mineRef = doc(db, `locations/${stateId}/coalfields/${coalfieldId}/mines`, mineId as any);
      await updateDoc(mineRef, { supervisors: arrayUnion(email) } as any);
    } catch (error) {
      console.error('Failed to add supervisor email to mine doc:', error);
      // attempt to create doc if missing
      try {
        const mineRef = doc(db, `locations/${stateId}/coalfields/${coalfieldId}/mines`, mineId as any);
        await setDoc(mineRef, { supervisors: [email] }, { merge: true });
      } catch (e) {
        console.warn('Failed to create mine doc when adding supervisor email:', e);
      }
    }
  }

  static async createUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    try {
      // Guard: prevent creating profiles for known dev/test user ids (e.g. dev-a, dev-b)
      if (userId && typeof userId === 'string' && userId.startsWith('dev-')) {
        console.warn(`Skipping createUserProfile for dev/test user id: ${userId}`);
        return;
      }
      const userProfile: Partial<UserProfile> = {
        // Ensure required fields and serverTimestamp for createdAt for consistency
        ...profile,
        createdAt: serverTimestamp() as any,
  lastActive: serverTimestamp() as any,
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
        lastActive: serverTimestamp() as any,
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
      // Guard: avoid persisting checklist progress for dev/test user ids
      if (userId && typeof userId === 'string' && userId.startsWith('dev-')) {
        console.warn(`Skipping saveChecklistProgress for dev/test user id: ${userId}`);
        return;
      }
      // Filter out any dev/test checklist items that may have been injected
      const filteredChecklist = (checklist || []).filter(item => !(item?.id && typeof item.id === 'string' && item.id.startsWith('dev-')));
      if ((checklist || []).length !== filteredChecklist.length) {
        console.warn(`Removed ${ (checklist || []).length - filteredChecklist.length } dev-* items from checklist before saving for user ${userId}`);
      }

      const checklistData = {
        userId,
        date,
        checklist: filteredChecklist,
        completedAt: new Date(),
        completionRate: (filteredChecklist.filter(item => item.completed).length / (filteredChecklist.length || 1)) * 100,
      };

      // Normalize the date key to the 3:00 AM day boundary
      const dateKey = getDateKeyAt3AM(new Date(date));
      const docId = `${dateKey}_${userId}`;
      await setDoc(doc(db, 'checklists', docId), checklistData);
    } catch (error) {
      console.error('Error saving checklist:', error);
      throw new Error('Failed to save checklist progress');
    }
  }

  // Mark a single checklist item for the given user/date. Stores a map of marked items under `items`.
  static async markChecklistItem(userId: string, checklistId: string, date?: string): Promise<void> {
    try {
      // Guard: avoid creating/updating checklist docs for dev/test user ids or dev-* checklist ids
      if (userId && typeof userId === 'string' && userId.startsWith('dev-')) {
        console.warn(`Skipping markChecklistItem for dev/test user id: ${userId}`);
        return;
      }
      if (checklistId && typeof checklistId === 'string' && checklistId.startsWith('dev-')) {
        console.warn(`Skipping markChecklistItem for dev/test checklist id: ${checklistId}`);
        return;
      }
      const dateKey = getDateKeyAt3AM(date ? new Date(date) : new Date());
      const docId = `${dateKey}_${userId}`;
      const docRef = doc(db, 'checklists', docId);

      // Try to set the nested items.<checklistId> = true, creating the doc if needed.
      try {
        await updateDoc(docRef, {
          [`items.${checklistId}`]: true,
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        } as any);
      } catch (err) {
        // If update fails because doc doesn't exist, create it with the items map
        await setDoc(docRef, {
          userId,
          date: dateKey,
          items: { [checklistId]: true },
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error marking checklist item:', error);
      throw new Error('Failed to mark checklist item');
    }
  }

  // Unmark a single checklist item (remove the key) for given user/date.
  static async unmarkChecklistItem(userId: string, checklistId: string, date?: string): Promise<void> {
    try {
      // Guard: avoid updating checklist docs for dev/test user ids
      if (userId && typeof userId === 'string' && userId.startsWith('dev-')) {
        console.warn(`Skipping unmarkChecklistItem for dev/test user id: ${userId}`);
        return;
      }
      if (checklistId && typeof checklistId === 'string' && checklistId.startsWith('dev-')) {
        console.warn(`Skipping unmarkChecklistItem for dev/test checklist id: ${checklistId}`);
        return;
      }
      const dateKey = getDateKeyAt3AM(date ? new Date(date) : new Date());
      const docId = `${dateKey}_${userId}`;
      const docRef = doc(db, 'checklists', docId);

      await updateDoc(docRef, {
        [`items.${checklistId}`]: deleteField(),
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      } as any);
    } catch (error) {
      console.error('Error unmarking checklist item:', error);
      throw new Error('Failed to unmark checklist item');
    }
  }

  // Return array of marked checklist IDs for given user/date
  static async getMarkedChecklistIds(userId: string, date?: string): Promise<string[]> {
    try {
      const dateKey = getDateKeyAt3AM(date ? new Date(date) : new Date());
      const docId = `${dateKey}_${userId}`;
      const docRef = doc(db, 'checklists', docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return [];
      const data: any = docSnap.data();
      const items = data.items || {};
      return Object.keys(items).filter(k => items[k]);
    } catch (error) {
      console.error('Error fetching marked checklist ids:', error);
      return [];
    }
  }

  static async getChecklistProgress(userId: string, date: string): Promise<ChecklistItem[] | null> {
    try {
      const dateKey = getDateKeyAt3AM(new Date(date));
      const docId = `${dateKey}_${userId}`;
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

  static async listTeamUsers(stateId?: string, coalfieldId?: string, mineId?: string): Promise<UserProfile[]> {
    try {
      let q: any;
      if (stateId && coalfieldId && mineId) {
        q = query(
          collection(db, 'users'),
          where('stateId', '==', stateId),
          where('coalfieldId', '==', coalfieldId),
          where('mineId', '==', mineId),
          orderBy('lastActive', 'desc')
        );
      } else {
        q = query(collection(db, 'users'), orderBy('lastActive', 'desc'));
      }
      const snapshot = await getDocs(q);
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => users.push({ id: doc.id, ...(doc.data() as any) } as UserProfile));
      return users;
    } catch (err) {
      console.error('Error listing team users:', err);
      return [];
    }
  }

  static async getHazardReportCountForUser(userId: string, stateId?: string, coalfieldId?: string, mineId?: string): Promise<number> {
    try {
      // Count in both new and legacy collections, applying optional location filters
      let total = 0;

      // New collection
      const clausesNew: any[] = [where('userId', '==', userId)];
      if (stateId && coalfieldId && mineId) {
        clausesNew.push(where('stateId', '==', stateId), where('coalfieldId', '==', coalfieldId), where('mineId', '==', mineId));
      }
      const qNew = query(collection(db, 'hazard_reports'), ...clausesNew);
      const snapNew = await getDocs(qNew);
      total += snapNew.size;

      // Legacy collection
      const clausesLegacy: any[] = [where('userId', '==', userId)];
      if (stateId && coalfieldId && mineId) {
        clausesLegacy.push(where('stateId', '==', stateId), where('coalfieldId', '==', coalfieldId), where('mineId', '==', mineId));
      }
      const qLegacy = query(collection(db, 'hazardReports'), ...clausesLegacy);
      const snapLegacy = await getDocs(qLegacy);
      total += snapLegacy.size;

      return total;
    } catch (err) {
      console.error('Error counting hazard reports for user:', err);
      return 0;
    }
  }

  static async getChecklistCompletionCountForUserToday(userId: string): Promise<number> {
    try {
      const dateKey = getDateKeyAt3AM(new Date());
      const docId = `${dateKey}_${userId}`;
      const docRef = doc(db, 'checklists', docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return 0;
      const data: any = docSnap.data();
      // Support new schema: items map { checklistId: true }
      if (data.items && typeof data.items === 'object') {
        return Object.keys(data.items).filter(k => !!data.items[k]).length;
      }
      // Fallback to legacy checklist array schema
      if (Array.isArray(data.checklist)) {
        return data.checklist.filter((i: any) => i.completed).length || 0;
      }
      return 0;
    } catch (err) {
      console.error('Error fetching checklist completion count:', err);
      return 0;
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

  // New: Submit hazard report to 'hazard_reports' collection (MVP schema)
  static async submitHazardReportCloud(report: any): Promise<string> {
    try {
      const data = {
        ...report,
        createdAt: serverTimestamp(),
        status: report.status || 'pending',
      };

      // Defensive: ensure location triple exists on the document. If missing, try to backfill
      // from the submitting user's profile (if userId is available). This prevents documents
      // that lack state/coalfield/mine from being created and causing supervisor scoping issues.
      try {
        if ((!data.stateId || !data.coalfieldId || !data.mineId) && data.userId) {
          const profile = await this.getUserProfile(data.userId);
          if (profile) {
            data.stateId = data.stateId || (profile as any).stateId;
            data.stateName = data.stateName || (profile as any).stateName;
            data.coalfieldId = data.coalfieldId || (profile as any).coalfieldId;
            data.coalfieldName = data.coalfieldName || (profile as any).coalfieldName;
            data.mineId = data.mineId || (profile as any).mineId;
            data.mineName = data.mineName || (profile as any).mineName;
          }
        }
      } catch (pfErr) {
        console.warn('Failed to backfill report triple in submitHazardReportCloud:', pfErr);
      }

      const docRef = await addDoc(collection(db, 'hazard_reports'), data);
      return docRef.id;
    } catch (error) {
      console.error('Error submitting hazard report to hazard_reports:', error);
      throw new Error('Failed to submit hazard report');
    }
  }

  static async resolveHazardReport(reportId: string, resolver?: { id?: string; name?: string }): Promise<void> {
    try {
      // Delete the report document instead of marking resolved. Try new collection first,
      // then legacy collection. Keep best-effort and don't throw if one doesn't exist.
      try {
        await deleteDoc(doc(db, 'hazard_reports', reportId));
      } catch (e) {
        // ignore if not present or deletion failed
      }
      try {
        await deleteDoc(doc(db, 'hazardReports', reportId));
      } catch (e) {
        // ignore if not present
      }
    } catch (error) {
      console.error('Error resolving hazard report:', error);
      throw new Error('Failed to resolve hazard report');
    }
  }

  static async createEmergencyAlert(alert: any): Promise<string> {
    try {
      const data = {
        ...alert,
        createdAt: serverTimestamp(),
        status: 'active',
      };
      const docRef = await addDoc(collection(db, 'emergency_alerts'), data);
      return docRef.id;
    } catch (error) {
      console.error('Error creating emergency alert:', error);
      throw new Error('Failed to create emergency alert');
    }
  }

  static async resolveEmergencyAlert(alertId: string, resolver?: { id?: string; name?: string }): Promise<void> {
    try {
      const docRef = doc(db, 'emergency_alerts', alertId);
      await updateDoc(docRef, {
        status: 'resolved',
        resolvedBy: resolver?.name ?? null,
        resolvedById: resolver?.id ?? null,
        resolvedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error resolving emergency alert:', error);
      throw new Error('Failed to resolve emergency alert');
    }
  }

  // Acknowledge an emergency alert (mark as acknowledged but keep record)
  static async acknowledgeEmergencyAlert(alertId: string, acknowledger?: { id?: string; name?: string }): Promise<void> {
    try {
      const docRef = doc(db, 'emergency_alerts', alertId);
      // Remove the emergency alert document when acknowledged by an officer.
      // This keeps the active alerts list clean and matches the desired semantics.
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error acknowledging emergency alert:', error);
      throw new Error('Failed to acknowledge emergency alert');
    }
  }



  static async getHazardReports(userId?: string, stateId?: string, coalfieldId?: string, mineId?: string): Promise<HazardReport[]> {
    try {
      const hazardReportsCollection = collection(db, 'hazardReports');
      let q;

      const clauses: any[] = [];
      if (userId) clauses.push(where('userId', '==', userId));
      if (stateId && coalfieldId && mineId) {
        clauses.push(where('stateId', '==', stateId), where('coalfieldId', '==', coalfieldId), where('mineId', '==', mineId));
      }

      if (clauses.length > 0) {
        q = query(hazardReportsCollection, ...clauses, orderBy('timestamp', 'desc'));
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

  // Delete all user-related data (checklists and hazard reports). Used when a user deletes their account.
  static async deleteAllUserData(userId: string): Promise<void> {
    try {
      if (!userId) return;

      // 1) Delete checklists documents for this user (they are keyed by date_userId or have userId field)
      try {
        // Query by userId field
        const q = query(collection(db, 'checklists'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const deletions: Promise<any>[] = [];
        snapshot.forEach(docSnap => {
          deletions.push(deleteDoc(doc(db, 'checklists', docSnap.id)));
        });
        await Promise.all(deletions);
      } catch (err) {
        console.warn('Error deleting checklist documents for user:', err);
      }

      // 2) Delete new-format hazard_reports
      try {
        const q2 = query(collection(db, 'hazard_reports'), where('userId', '==', userId));
        const snap2 = await getDocs(q2);
        const del2: Promise<any>[] = [];
        snap2.forEach(d => del2.push(deleteDoc(doc(db, 'hazard_reports', d.id))));
        await Promise.all(del2);
      } catch (err) {
        console.warn('Error deleting hazard_reports for user:', err);
      }

      // 3) Delete legacy hazardReports collection items
      try {
        const q3 = query(collection(db, 'hazardReports'), where('userId', '==', userId));
        const snap3 = await getDocs(q3);
        const del3: Promise<any>[] = [];
        snap3.forEach(d => del3.push(deleteDoc(doc(db, 'hazardReports', d.id))));
        await Promise.all(del3);
      } catch (err) {
        console.warn('Error deleting legacy hazardReports for user:', err);
      }

    } catch (error) {
      console.error('Failed to delete all user data:', error);
      throw new Error('Failed to delete user data');
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