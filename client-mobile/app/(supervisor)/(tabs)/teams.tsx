import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirestoreService } from '../../../services/firebase/firestore';
import { doc, onSnapshot, collection, query, orderBy , where } from 'firebase/firestore';

import { checklistDateKeyForNow, msUntilNext0300 } from '../../../services/dateUtils';
import { ROLE_CHECKLISTS } from '../../../constants/Checklists';
import { db } from '../../../firebaseConfig';
import { ClayCard } from '../../../components/ui/ClayCard';
import { ClayButton } from '../../../components/ui/ClayButton';
import { ClayTheme } from '../../../constants/Colors';
import { getTimeAgo } from '../../../utils/dateUtils';
import { GradientBackground } from '../../../components/ui/GradientBackground';
import { useAuth } from '../../../contexts/AuthContext';

export default function SupervisorTeams() {
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [details, setDetails] = useState<{ reports: number; checklistCount: number } | null>(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    // Subscribe to users collection for realtime updates scoped to supervisor's mine when possible
    let q;
    if (userProfile?.stateId && userProfile?.coalfieldId && userProfile?.mineId) {
      q = query(
        collection(db, 'users'),
        where('stateId', '==', userProfile.stateId),
        where('coalfieldId', '==', userProfile.coalfieldId),
        where('mineId', '==', userProfile.mineId),
        orderBy('lastActive', 'desc')
      );
    } else {
      q = query(collection(db, 'users'), orderBy('lastActive', 'desc'));
    }

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setUsers(list);
    }, () => {
      console.warn('Users subscription error:');
      // Fallback to one-time fetch if subscription fails
      FirestoreService.listTeamUsers(userProfile?.stateId, userProfile?.coalfieldId, userProfile?.mineId).then(list => setUsers(list)).catch(() => { });
    });

  return () => { try { unsub(); } catch { } };
  }, [userProfile?.stateId, userProfile?.coalfieldId, userProfile?.mineId]);

    const openDetails = async (user: any) => {
    setSelected(user);
    setDetails(null);
    // load immediate values and then subscribe to checklist doc for live updates.
    // scope report count to supervisor's triple when available
    const reports = await FirestoreService.getHazardReportCountForUser(user.id, userProfile?.stateId, userProfile?.coalfieldId, userProfile?.mineId);
    setDetails({ reports, checklistCount: undefined as any });

    // subscribe to the checklist doc for this user for today to update checklistCount live
    let dateKey = checklistDateKeyForNow();

    let docId = `${dateKey}_${user.id}`;
    let docRef = doc(db, 'checklists', docId);

    const unsubscribe = onSnapshot(docRef, snapshot => {
      if (!snapshot.exists()) {
        setDetails(prev => prev ? { ...prev, checklistCount: 0 } : { reports, checklistCount: 0 });
        return;
      }
      const data: any = snapshot.data();
      const count = data.items && typeof data.items === 'object' ? Object.keys(data.items).filter(k => !!data.items[k]).length : (Array.isArray(data.checklist) ? data.checklist.filter((i: any) => i.completed).length : 0);
      setDetails(prev => prev ? { ...prev, checklistCount: count } : { reports, checklistCount: count });
    }, err => {
      console.warn('Checklist onSnapshot error:', err);
    });

    // store unsubscribe on selected so we can clear it when modal closes
    (user as any).__unsubscribeChecklist = unsubscribe;

    // schedule a rollover resubscribe at next 03:00 so the modal reflects the new day's checklist
    const rolloverTimeout = setTimeout(() => {
      try {
        if ((user as any).__unsubscribeChecklist) {
            try { (user as any).__unsubscribeChecklist(); } catch {
            }
            delete (user as any).__unsubscribeChecklist;
          }
        } catch {
        }
      // resubscribe to new doc
      dateKey = checklistDateKeyForNow();
      docId = `${dateKey}_${user.id}`;
      docRef = doc(db, 'checklists', docId);
      (user as any).__unsubscribeChecklist = onSnapshot(docRef, snapshot => {
        if (!snapshot.exists()) {
          setDetails(prev => prev ? { ...prev, checklistCount: 0 } : { reports, checklistCount: 0 });
          return;
        }
        const data: any = snapshot.data();
        const count = data.items && typeof data.items === 'object' ? Object.keys(data.items).filter(k => !!data.items[k]).length : (Array.isArray(data.checklist) ? data.checklist.filter((i: any) => i.completed).length : 0);
        setDetails(prev => prev ? { ...prev, checklistCount: count } : { reports, checklistCount: count });
      }, err => {
        console.warn('Checklist onSnapshot error:', err);
      });
    }, msUntilNext0300());

    // attach timeout id so cleanup can clear it
    (user as any).__checklistRolloverTimeout = rolloverTimeout;
  };

  // cleanup snapshot subscription when modal is closed or selected changes
  useEffect(() => {
    return () => {
      // when component unmounts, ensure any active subscription is removed
      if (selected) {
        if ((selected as any).__unsubscribeChecklist) {
          try { (selected as any).__unsubscribeChecklist(); } catch { /* noop */ }
          delete (selected as any).__unsubscribeChecklist;
        }
        if ((selected as any).__checklistRolloverTimeout) {
          try { clearTimeout((selected as any).__checklistRolloverTimeout); } catch {}
          delete (selected as any).__checklistRolloverTimeout;
        }
      }
    };
  }, [selected]);

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Teams</Text>
          <Text style={styles.subtitle}>{userProfile?.name ?? 'Supervisor'}</Text>
        </View>

        <FlatList
          contentContainerStyle={{ padding: 18 }}
          data={users}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openDetails(item)}>
              <ClayCard style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={styles.userName}>{item.name || '—'}</Text>
                    <Text style={styles.userRole}>{item.role || 'Worker'}</Text>
                    <Text style={{ color: ClayTheme.textOnDark.muted, marginTop: 4 }}>Safety Score: {typeof item.safetyScore === 'number' ? `${item.safetyScore}%` : '—'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.lastActive}>{getTimeAgo(item.lastActive?.toDate ? item.lastActive.toDate() : item.lastActive || new Date())}</Text>
                  </View>
                </View>
              </ClayCard>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />

        <Modal visible={!!selected} transparent animationType="fade">
          <View style={[styles.backdrop, { backgroundColor: 'rgba(21, 0, 33, 1)', flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
            <View style={styles.detailCard}>
              <Text style={[styles.detailName, { fontSize: 24 }]}>{selected?.name}</Text>
              <Text style={[styles.detailRole, { fontSize: 17 }]}>{selected?.role}</Text>
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 16, marginTop: -2, color: ClayTheme.textOnDark.primary }}>Reports submitted: {details?.reports ?? '…'}</Text>
                <Text style={{ fontSize: 16, marginTop: 8, color: ClayTheme.textOnDark.primary }}>Checklists completed today: {details?.checklistCount ?? '…'}</Text>
                <Text style={{ fontSize: 16, marginTop: 8, color: ClayTheme.textOnDark.primary }}>
                  Safety Score: {(() => {
                    // Prefer stored safetyScore if present and numeric
                    if (typeof selected?.safetyScore === 'number') return `${selected.safetyScore}%`;
                    // Otherwise compute from details if available
                    const c = details?.checklistCount ?? null;
                    const r = details?.reports ?? 0;
                    if (c === null || c === undefined) return '—';
                    const role = (selected?.role || '').toString();
                    const total = ROLE_CHECKLISTS[role]?.length ?? 5;
                    const CHECKLIST_WEIGHT = 0.75;
                    const REPORTS_WEIGHT = 0.25;
                    const REPORTS_CAP = 3;
                    const checklistPct = total > 0 ? (c / total) * 100 : 0;
                    const normalizedReports = Math.max(0, Math.min(1, (r || 0) / REPORTS_CAP));
                    const reportsScore = normalizedReports * 100;
                    const score = Math.round((checklistPct * CHECKLIST_WEIGHT) + (reportsScore * REPORTS_WEIGHT));
                    return `${score}%`;
                  })()}
                </Text>
              </View>
              <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end' }}>
                <ClayButton title="Close" variant="secondary" onPress={() => setSelected(null)} />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: ClayTheme.textOnDark.primary },
  subtitle: { color: ClayTheme.textOnDark.secondary, marginTop: 4 },
  card: { padding: 14, borderRadius: 12 },
  userName: { fontWeight: '700', fontSize: 16, color: ClayTheme.textOnDark.primary },
  userRole: { color: ClayTheme.textOnDark.secondary },
  lastActive: { color: ClayTheme.textOnDark.secondary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  detailCard: { width: '90%', padding: 18, borderRadius: 12, backgroundColor: ClayTheme.glass.surface },
  detailName: { fontSize: 20, fontWeight: '700', color: ClayTheme.textOnDark.primary },
  detailRole: { color: ClayTheme.textOnDark.secondary, marginTop: 6 },
});
