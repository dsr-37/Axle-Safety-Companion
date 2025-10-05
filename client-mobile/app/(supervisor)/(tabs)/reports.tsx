import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../../components/ui/GradientBackground';
import { ClayCard } from '../../../components/ui/ClayCard';
import { ClayButton } from '../../../components/ui/ClayButton';
import { ClayTheme } from '../../../constants/Colors';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { FirestoreService } from '../../../services/firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const PRIORITY_COLORS = {
  high: { start: '#ff6b6b', end: '#ff8a80' },
  medium: { start: '#ffb86b', end: '#ffd18f' },
  low: { start: '#ffd86b', end: '#ffe7a3' },
};

function timeAgo(isoOrDate: any) {
  const d = isoOrDate?.toDate ? isoOrDate.toDate() : new Date(isoOrDate || Date.now());
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SupervisorReports() {
  const [reports, setReports] = useState<any[]>([]);
  const { userProfile } = useAuth();

  useEffect(() => {
    // Subscribe to both the new and legacy hazard report collections and merge results
    let qNew;
    let qLegacy;
    if (userProfile?.stateId && userProfile?.coalfieldId && userProfile?.mineId) {
      qNew = query(
        collection(db, 'hazard_reports'),
        where('status', '==', 'pending'),
        where('stateId', '==', userProfile.stateId),
        where('coalfieldId', '==', userProfile.coalfieldId),
        where('mineId', '==', userProfile.mineId),
        orderBy('createdAt', 'asc')
      );
      qLegacy = query(
        collection(db, 'hazardReports'),
        where('status', '==', 'pending'),
        where('stateId', '==', userProfile.stateId),
        where('coalfieldId', '==', userProfile.coalfieldId),
        where('mineId', '==', userProfile.mineId),
        orderBy('timestamp', 'asc')
      );
    } else {
      qNew = query(collection(db, 'hazard_reports'), where('status', '==', 'pending'), orderBy('createdAt', 'asc'));
      qLegacy = query(collection(db, 'hazardReports'), where('status', '==', 'pending'), orderBy('timestamp', 'asc'));
    }

    const handleSnapshot = (snap: any, accum: Map<string, any>) => {
      snap.forEach((d: any) => {
        accum.set(d.id, { id: d.id, ...(d.data() as any) });
      });
    };

    const unsubNew = onSnapshot(qNew, (snapshot) => {
      const map = new Map<string, any>();
      handleSnapshot(snapshot, map);
      // also try to include latest from legacy snapshot by reading current reports state
      // (we'll merge in unsubLegacy updates separately)
      setReports(Array.from(map.values()));
    }, () => console.warn('Reports listener (new) error:'));

    const unsubLegacy = onSnapshot(qLegacy, (snapshot) => {
      // merge legacy into existing reports preserving newest ordering
      const legacyItems: any[] = [];
      snapshot.forEach((d) => legacyItems.push({ id: d.id, ...d.data() }));
      setReports((prev) => {
        // create a map of prev by id then overlay legacy items
        const byId = new Map(prev.map((r) => [r.id, r]));
        legacyItems.forEach((li) => byId.set(li.id, li));
        return Array.from(byId.values()).sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
          return ta - tb;
        });
      });
  }, () => console.warn('Reports listener (legacy) error:'));

    return () => {
      try { unsubNew(); } catch { /* noop */ }
      try { unsubLegacy(); } catch { /* noop */ }
    };
  }, [userProfile?.stateId, userProfile?.coalfieldId, userProfile?.mineId]);

  const priorityFor = (createdAt: any) => {
    const d = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt || Date.now());
    const ageHours = (Date.now() - d.getTime()) / (1000 * 60 * 60);
    if (ageHours >= 12) return 'high';
    if (ageHours >= 2) return 'medium';
    return 'low';
  };



  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Reports</Text>
          <Text style={styles.sub}>Review pending hazard reports</Text>
        </View>

        <FlatList
          contentContainerStyle={{ padding: 18 }}
          data={reports}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const pr = priorityFor(item.createdAt);
            const colors = PRIORITY_COLORS[pr as keyof typeof PRIORITY_COLORS];
            return (
              <ClayCard style={styles.card}>
                <View style={styles.cardInner}>
                  {/* Priority gradient overlay behind content */}
                  <LinearGradient
                    pointerEvents="none"
                    colors={[
                      `${colors.start}99`,
                      `${colors.end}00`, // transparent
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.priorityOverlay}
                  />
                  <View style={styles.midCol}>
                    <Text style={styles.priorityLabel}>{pr === 'high' ? 'High Priority' : pr === 'medium' ? 'Medium Priority' : 'Low Priority'}</Text>
                    <Text style={styles.title}>{item.title || item.summary || 'Hazard reported'}</Text>
                    <Text style={[styles.meta, { fontSize: 14, flex:1 }]}>Reported by: {item.userName || item.userId} • {timeAgo(item.createdAt)}</Text>
                  </View>
                  <View style={styles.rightCol}>
                    <ClayButton
                      title="View Report"
                      variant="secondary"
                      size="small"
                      fullWidth={false}
                      onPress={() => router.push(`/(supervisor)/report/${item.id}` as any)}
                    />
                  </View>
                </View>
              </ClayCard>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 12, alignItems: 'center' },
  greeting: { fontSize: 28, fontWeight: '700', color: ClayTheme.textOnDark.primary },
  sub: { color: ClayTheme.textOnDark.secondary, marginTop: 6, fontSize: 16 },
  card: { borderRadius: 18, padding: 18 },
  cardInner: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  midCol: { flex:1, paddingHorizontal: 14, paddingLeft: 10 },
  rightCol: { width: 110, alignItems: 'center' },
  priorityBadge: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  priorityLabel: { fontSize: 12, color: ClayTheme.textOnDark.primary, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', marginTop: 4, color: ClayTheme.textOnDark.primary },
  meta: { fontSize: 12, color: ClayTheme.textOnDark.secondary, marginTop: 6 },
  priorityOverlay: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    left: -8,
    right: 0,
    borderRadius: 16,
  },
});
