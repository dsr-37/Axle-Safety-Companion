import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../../components/ui/GradientBackground';
import { ClayCard } from '../../../components/ui/ClayCard';
import { ClayColors, ClayTheme } from '../../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { msUntilNext0300 } from '../../../services/dateUtils';
import { db } from '../../../firebaseConfig';
import { FirestoreService } from '../../../services/firebase/firestore';
import { LocationService } from '../../../services/location/locationService';
import { NotificationService } from '../../../services/notifications/notificationService';
import { ROLE_CHECKLISTS } from '../../../constants/Checklists';
import SosPulseOverlay from '../../../components/ui/SosPulseOverlay';
import { BeepPlayer } from '../../../components/media/BeepPlayer';
import { ClayButton } from '../../../components/ui/ClayButton';
import Ionicons from '@expo/vector-icons/build/Ionicons';

export default function SupervisorHome() {
  const { userProfile, startSosBeep, stopSosBeep, flashSosPulse } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const lastAlertIds = useRef<Set<string>>(new Set());
  const prevAlertsCount = useRef<number>(0);
  const [silenced, setSilenced] = useState(false);
  const [displayLocation, setDisplayLocation] = useState('Calculating...');
  const [displayDistance, setDisplayDistance] = useState('');

  useEffect(() => {
    // Listen for active emergency alerts scoped to this supervisor's mine when possible
    let q;
    if (userProfile?.stateId && userProfile?.coalfieldId && userProfile?.mineId) {
      q = query(
        collection(db, 'emergency_alerts'),
        where('status', '==', 'active'),
        where('stateId', '==', userProfile.stateId),
        where('coalfieldId', '==', userProfile.coalfieldId),
        where('mineId', '==', userProfile.mineId),
        orderBy('createdAt', 'asc'),
        limit(10)
      );
    } else {
      q = query(collection(db, 'emergency_alerts'), where('status', '==', 'active'), orderBy('createdAt', 'asc'), limit(10));
    }
    const unsub = onSnapshot(q, async (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      // Keep ascending order (earliest first). Keep only up to limit.
      setAlerts(docs);

      // If alerts went to zero, clear seen ids so future 0->1 transitions re-alert
      try {
        const prevCount = prevAlertsCount.current ?? 0;
        const curCount = docs.length;
        if (curCount === 0) {
          // Clear seen ids
          try { lastAlertIds.current.clear(); } catch { lastAlertIds.current = new Set(); }
          prevAlertsCount.current = 0;
        }

        // If previous count was 0 and we now have at least one alert, always trigger pulse+beep
        if (prevCount === 0 && curCount > 0) {
          // Reset silenced so the system will beep/pulse for the new active alert
          try { setSilenced(false); } catch {}
          try {
            const first = docs[0];
            const title = '🆘 Emergency Alert';
            const body = `${first.userName || 'Unknown'} • ${first.userRole || ''} — Tap to view`;
            await NotificationService.scheduleLocal(title, body);
          } catch {
            // ignore notification scheduling errors
          }
          try {
            flashSosPulse();
            await startSosBeep();
          } catch (e) {
            console.warn('Failed to trigger global sos on 0->1 transition:', e);
          }
        }

        // Update stored previous count
        prevAlertsCount.current = docs.length;

        // Detect newly added alerts and notify supervisor devices (only once per id)
        const changes = snapshot.docChanges();
        for (const change of changes) {
          if (change.type === 'added') {
            const id = change.doc.id;
            if (!lastAlertIds.current.has(id)) {
              lastAlertIds.current.add(id);
              const data: any = change.doc.data();
              // Run global visual/audio alerts for supervisors (unless silenced)
              if (!silenced) {
                try {
                  const title = '🆘 Emergency Alert';
                  const body = `${data.userName || 'Unknown'} • ${data.userRole || ''} — Tap to view`;
                  await NotificationService.scheduleLocal(title, body);
                  // Trigger pulse and beep via AuthContext so it's app-wide
                  flashSosPulse();
                  await startSosBeep();
                  } catch {
                    console.warn('Failed to notify supervisor about new alert');
                  }
              }
            }
          }
        }
          } catch {
        console.warn('Error handling alert snapshot changes:');
      }
    }, () => {
      console.warn('Supervisor alerts listener error:');
    });

    // Listen for recent hazard reports (merge new + legacy collections) latest 6
    const buildClauses = (extra: any[] = []) => {
      const clauses: any[] = [...extra, where('status', '==', 'pending')];
      if (userProfile?.stateId && userProfile?.coalfieldId && userProfile?.mineId) {
        clauses.push(where('stateId', '==', userProfile.stateId));
        clauses.push(where('coalfieldId', '==', userProfile.coalfieldId));
        clauses.push(where('mineId', '==', userProfile.mineId));
      }
      return clauses;
    };

    const qNew = query(collection(db, 'hazard_reports'), ...buildClauses(), orderBy('createdAt', 'desc'), limit(6));
    const unsubNew = onSnapshot(qNew, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data(), _src: 'new' }));
      setRecentReports(prev => {
        const map = new Map(prev.map(i => [i.id, i]));
        for (const it of items) map.set(it.id, it);
        return Array.from(map.values()).sort((a, b) => (b.createdAt?.toMillis?.() ?? b.createdAt ?? 0) - (a.createdAt?.toMillis?.() ?? a.createdAt ?? 0)).slice(0, 6);
      });
  }, () => console.warn('Supervisor new reports listener error:'));

    const qLegacy = query(collection(db, 'hazardReports'), ...buildClauses(), orderBy('createdAt', 'desc'), limit(6));
    const unsubLegacy = onSnapshot(qLegacy, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data(), _src: 'legacy' }));
      setRecentReports(prev => {
        const map = new Map(prev.map(i => [i.id, i]));
        for (const it of items) map.set(it.id, it);
        return Array.from(map.values()).sort((a, b) => (b.createdAt?.toMillis?.() ?? b.createdAt ?? 0) - (a.createdAt?.toMillis?.() ?? a.createdAt ?? 0)).slice(0, 6);
      });
  }, () => console.warn('Supervisor legacy reports listener error:'));

    // cleanup
    const cleanup = () => {
      try { unsubNew(); } catch { }
      try { unsubLegacy(); } catch { }
    };

    return () => {
      try { unsub(); } catch { }
      try { cleanup(); } catch { }
      unloadSound();
    };
  }, [userProfile?.stateId, userProfile?.coalfieldId, userProfile?.mineId]);

  // Leaderboard: top users by safetyScore (realtime)
  useEffect(() => {
    let unsubLb: any = null;
    const subscribeLeaderboard = () => {
      // Build leaderboard query scoped to supervisor's triple when available
      let lbQ;
      if (userProfile?.stateId && userProfile?.coalfieldId && userProfile?.mineId) {
        lbQ = query(
          collection(db, 'users'),
          where('stateId', '==', userProfile.stateId),
          where('coalfieldId', '==', userProfile.coalfieldId),
          where('mineId', '==', userProfile.mineId),
          orderBy('safetyScore', 'desc'),
          limit(6)
        );
      } else {
        lbQ = query(collection(db, 'users'), orderBy('safetyScore', 'desc'), limit(6));
      }

      if (unsubLb) {
        try { unsubLb(); } catch {
        }
        unsubLb = null;
      }
      unsubLb = onSnapshot(lbQ, (snap) => {
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
        setLeaderboard(list);
      }, () => {
        console.warn('Leaderboard listener error:');
      });
    };

    subscribeLeaderboard();

    // schedule a resubscribe at 03:00 so leaderboard reflects daily checklist rollovers
    const rollover = setTimeout(() => {
      subscribeLeaderboard();
    }, msUntilNext0300());

  return () => { try { if (unsubLb) unsubLb(); } catch {} try { clearTimeout(rollover); } catch {} };
  }, [userProfile?.stateId, userProfile?.coalfieldId, userProfile?.mineId]);

  // Show details Alert once when an alert is selected (avoid rendering-time Alert calls)
  useEffect(() => {
    if (!selectedAlert) return; // Do nothing if modal is closed

    const calculateDetails = async (a: any) => {
      let senderLat: number | null = null;
      let senderLon: number | null = null;
      if (a?.location) {
        if (a.location.coords) {
          senderLat = a.location.coords.latitude;
          senderLon = a.location.coords.longitude;
        } else if (typeof a.location.latitude === 'number' && typeof a.location.longitude === 'number') {
          senderLat = a.location.latitude;
          senderLon = a.location.longitude;
        } else if (typeof a.location.lat === 'number' && typeof a.location.lon === 'number') {
          senderLat = a.location.lat;
          senderLon = a.location.lon;
        }
      }

      let locationText = 'Unknown';
      let distanceText = '';
      if (senderLat !== null && senderLon !== null) {
        locationText = `${senderLat.toFixed(5)}, ${senderLon.toFixed(5)}`;
        try {
          const addr = await LocationService.getAddressFromCoordinates(senderLat, senderLon);
          if (addr) locationText = `${locationText} (${addr})`;
        } catch {
          // ignore address lookup errors
        }

        try {
          const supLoc = await LocationService.getCurrentLocation(8000).catch(() => null);
          if (supLoc && supLoc.coords) {
            const km = LocationService.calculateDistance(supLoc.coords.latitude, supLoc.coords.longitude, senderLat, senderLon);
            if (!isNaN(km)) {
              distanceText = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;
            }
          }
        } catch {
          console.warn('Failed to compute distance/address for alert:');
        }
      }

      setDisplayLocation(locationText);
      setDisplayDistance(distanceText);
    };

    calculateDetails(selectedAlert);
  }, [selectedAlert]);
  // No local audio asset; rely on scheduleLocal (NotificationService) to play system sound.

  const unloadSound = async () => {};

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
        <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
  <Text style={styles.userName}>{userProfile?.name || 'Supervisor'}</Text>
  <Text style={styles.userRole}>{userProfile?.role === 'supervisor' ? 'Supervisor' : (userProfile?.role || 'Role')}</Text>
        </View>
            <ClayCard style={[styles.fullWidthCard, { marginBottom: 20 }]}>
            <Text style={styles.cardTitle}>Active Emergency SOS</Text>
            {alerts.length === 0 ? (
              <Text style={[styles.cardSubtitle, { textAlign: 'center', fontSize: 15 }]}>No active alerts</Text>
            ) : (
              // Show a single clickable card representing the earliest active alert with a badge for count
              (() => {
                const earliest = alerts[0];
                return (
                  <View style={styles.alertRow}>
                    <View style={styles.alertCenter}>
                      <Text style={{ color: ClayColors.white, backgroundColor: ClayColors.coral, textAlign: 'center', paddingVertical: 10, borderRadius: 18, marginBottom: 10 }}>ACTIVE • {alerts.length}</Text>
                      <ClayButton
                        title="Open"
                        variant="primary"
                        size="medium"
                        onPress={() => {
                          // Clicking the active card should stop the beep/pulse and open details
                            setSilenced(true);
                            try {
                              stopSosBeep();
                            } catch {
                            }
                            // open details modal
                            setSelectedAlert(earliest);
                        }}
                      />
                    </View>
                  </View>
                );
              })()
            )}
            </ClayCard>
            {alerts.length > 0 && !silenced && <SosPulseOverlay visible={true} />}
            {alerts.length > 0 && !silenced && <BeepPlayer playing={true} />}

            {/* SOS Detail Modal (invoke Alert once from useEffect when selectedAlert changes) */}

            <ClayCard style={styles.fullWidthCard}>
            <Text style={styles.cardTitle}>Recent Reports</Text>
            {recentReports.length === 0 ? (
              <Text style={styles.cardSubtitle}>No recent reports</Text>
            ) : (
              recentReports.map((item) => (
              <View key={item.id} style={styles.reportRow}>
                <View style={styles.reportInnerRow}>
                <Ionicons name="alert-circle" size={40} color={ClayColors.warning} style={{ width: 42, height: 42, marginRight: 6, marginLeft: 12 }} />
                <View>
                  <Text style={[styles.reportTitle, { fontSize: 15 }]}>{item.title || item.summary || 'Hazard report'}</Text>
                  <Text style={[styles.reportMeta, { fontSize: 13 }]}>{item.userName || item.userId} • {new Date(item.createdAt?.toDate?.() || item.createdAt || Date.now()).toLocaleString()}</Text>
                </View>
                </View>
              </View>
              ))
            )}
            </ClayCard>
            {/* Leaderboard */}
            <ClayCard style={[styles.fullWidthCard, { gap: 2, marginTop: 20 }]}>
              <Text style={styles.cardTitle}>Team Leaderboard</Text>
              {leaderboard.length === 0 ? (
                <Text style={[styles.cardSubtitle, { textAlign: 'center' }]}>No scores yet</Text>
              ) : (
                leaderboard.map((u, idx) => {
                  // const score unused; compute fallback percent below
                  // If safetyScore not present, compute a fallback from available fields
                  const computeSafetyScoreFromCounts = (userObj: any) => {
                    if (typeof userObj.safetyScore === 'number') return userObj.safetyScore;
                    // try to use checklistCount if present on object, otherwise fallback to 0
                    const checklistCount = userObj.checklistCount ?? null;
                    const reports = userObj.reports ?? 0;
                    const role = (userObj.role || '').toString();
                    const total = ROLE_CHECKLISTS[role]?.length ?? 5;
                    const CHECKLIST_WEIGHT = 0.75;
                    const REPORTS_WEIGHT = 0.25;
                    const REPORTS_CAP = 3;
                    const checklistPct = checklistCount === null ? 0 : (total > 0 ? (checklistCount / total) * 100 : 0);
                    const normalizedReports = Math.max(0, Math.min(1, (reports || 0) / REPORTS_CAP));
                    const reportsScore = normalizedReports * 100;
                    return Math.round((checklistPct * CHECKLIST_WEIGHT) + (reportsScore * REPORTS_WEIGHT));
                  };

                  const pct = Math.max(0, Math.min(100, computeSafetyScoreFromCounts(u)));
                  const isTop = idx === 0;
                  return (
                    <View key={u.id} style={[styles.lbRow, isTop ? styles.lbTopRow : {}, { backgroundColor: ClayColors.cardGlassBorder, borderRadius: 16, marginTop: idx === 0 ? 0 : 8, marginBottom: 8 }]}>
                      <View style={styles.lbLeft}>
                        <View style={[styles.rankCircle, isTop ? styles.rankTopCircle : {}]}>
                          {isTop ? <Ionicons name="star" size={18} color="#fff" /> : <Text style={styles.rankText}>{idx + 1}</Text>}
                        </View>
                        <View style={{ marginLeft: 12 }}>
                          <Text style={[styles.lbName, { fontSize: 17 }]}>{u.name || '—'}</Text>
                          <Text style={[styles.lbRole, { fontSize: 12 }]}>{u.role || 'Worker'}</Text>
                        </View>
                      </View>
                      <View style={styles.lbRight}>
                        <Text style={styles.lbScore}>{pct}%</Text>
                        <View style={[styles.progressBarBackground, { backgroundColor: ClayColors.cardGlassHighlight }]}>
                          <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: pct >= 75 ? '#35C759' : pct >= 50 ? '#FFB020' : '#FF4D4F' }]} />
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ClayCard>
        </ScrollView>
        {selectedAlert && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={!!selectedAlert}
          onRequestClose={() => {
            setSelectedAlert(null);
          }}>
          <View style={styles.modalContainer}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Emergency SOS</Text>

              {/* Using your existing logic to display details */}
              <Text style={styles.modalText}>From: {selectedAlert.userName || 'Unknown'}</Text>
              <Text style={styles.modalText}>Role: {selectedAlert.userRole || ''}</Text>
              <Text style={styles.modalText}>
                Time: {new Date(selectedAlert.timestamp || selectedAlert.createdAt?.toDate?.() || selectedAlert.createdAt || Date.now()).toLocaleString()}
              </Text>
              {/* Note: We are not calculating location/distance here for simplicity, but it can be added back */}
              <Text style={styles.modalText}>Location: {displayLocation}</Text>
              <Text style={styles.modalText}>{displayDistance}</Text>
              
              <View style={styles.modalButtonRow}>
                <ClayButton
                  title="Acknowledge"
                  variant="primary" // Or choose a different variant
                  onPress={async () => {
                    // This is the same logic from your old 'Acknowledge' button
                    try {
                      await FirestoreService.acknowledgeEmergencyAlert(selectedAlert.id, { id: userProfile?.id, name: userProfile?.name });
                    } catch (err) {
                      console.warn('Acknowledge error', err);
                    }
                    setSelectedAlert(null); // Close the modal
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 22 },
  header: { alignItems: 'center', marginBottom: 30 },
  greeting: { fontSize: 30, color: ClayTheme.textOnDark.secondary, marginBottom: 10 },
  userName: { fontSize: 34, fontWeight: '700', color: ClayTheme.textOnDark.primary, marginBottom: 5 },
  userRole: { fontSize: 18, color: ClayTheme.textOnDark.secondary },
  fullWidthCard: { alignItems: 'stretch', paddingVertical: 25 },
  cardTitle: { textAlign: 'center', fontSize: 20, fontWeight: '700', color: ClayTheme.textOnDark.primary, marginBottom: 14, marginTop: -10 },
  cardSubtitle: { color: ClayTheme.textOnDark.secondary },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  alertLeft: {},
  alertCenter: { marginLeft: 70 },
  alertName: { fontWeight: '700', color: ClayTheme.textOnDark.primary },
  alertMeta: { color: ClayTheme.textOnDark.secondary, fontSize: 12 },
  reportRow: { paddingVertical: 8 },
  reportInnerRow: { flexDirection: 'row', alignItems: 'center' },
  reportTitle: { fontWeight: '600', color: ClayTheme.textOnDark.primary },
  reportMeta: { color: ClayTheme.textOnDark.secondary, fontSize: 12 },
  // Leaderboard styles
  lbRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 6 },
  lbTopRow: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, paddingVertical: 12 },
  lbLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rankCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#06ba7bff', alignItems: 'center', justifyContent: 'center' },
  rankTopCircle: { backgroundColor: '#d34fffff' },
  rankText: { color: '#fff', fontWeight: '700' },
  lbName: { fontWeight: '700', color: ClayTheme.textOnDark.primary },
  lbRole: { color: ClayTheme.textOnDark.secondary, fontSize: 12 },
  lbRight: { flex: 1, alignItems: 'flex-end' },
  lbScore: { color: ClayColors.white, fontWeight: '700', marginBottom: 6 },
  progressBarBackground: { width: 120, height: 8, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 6 },
// Add these to your styles object
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent black background
  },
  modalView: {
    margin: 20,
    backgroundColor: '#4E4E5A', // A dark grey, change as needed
    borderRadius: 20,
    padding: 25,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%', // The modal takes up 90% of the screen width
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    color: '#E0E0E0', // Light grey text
    marginBottom: 8,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
  },
});

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};
