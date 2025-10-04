import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirestoreService } from '../../../services/firebase/firestore';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
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
    // Subscribe to users collection for realtime updates (adds/updates/removals)
    const usersQuery = query(collection(db, 'users'), orderBy('lastActive', 'desc'));
    const unsub = onSnapshot(usersQuery, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setUsers(list);
    }, (err) => {
      console.warn('Users subscription error:', err);
      // Fallback to one-time fetch if subscription fails
      FirestoreService.listTeamUsers().then(list => setUsers(list)).catch(() => {});
    });

    return () => { try { unsub(); } catch (e) { /* noop */ } };
  }, []);

  const openDetails = async (user: any) => {
    setSelected(user);
    setDetails(null);
    // load immediate values and then subscribe to checklist doc for live updates.
    const reports = await FirestoreService.getHazardReportCountForUser(user.id);
    setDetails({ reports, checklistCount: undefined as any });

    // subscribe to today's checklist doc for this user to update checklistCount live
    const dateKey = (() => {
      const d = new Date();
      const shifted = new Date(d.getTime() - 3 * 60 * 60 * 1000);
      const yyyy = shifted.getFullYear();
      const mm = String(shifted.getMonth() + 1).padStart(2, '0');
      const dd = String(shifted.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    })();

    const docId = `${dateKey}_${user.id}`;
    const docRef = doc(db, 'checklists', docId);

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

    // when modal is closed, unsubscribe - handled by setSelected(null) below via effect
    // store unsubscribe on selected so we can clear it when modal closes
    (user as any).__unsubscribeChecklist = unsubscribe;
  };

  // cleanup snapshot subscription when modal is closed or selected changes
  useEffect(() => {
    return () => {
      // when component unmounts, ensure any active subscription is removed
      if (selected && (selected as any).__unsubscribeChecklist) {
        try { (selected as any).__unsubscribeChecklist(); } catch (e) { /* noop */ }
        delete (selected as any).__unsubscribeChecklist;
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
                <Text style={{ fontSize: 16, marginTop: 8, color: ClayTheme.textOnDark.primary }}>Safety Score: {typeof selected?.safetyScore === 'number' ? `${selected?.safetyScore}%` : '—'}</Text>
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
