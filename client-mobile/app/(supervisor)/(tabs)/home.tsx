import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../../components/ui/GradientBackground';
import { ClayCard } from '../../../components/ui/ClayCard';
import { ClayColors, ClayTheme } from '../../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { FirestoreService } from '../../../services/firebase/firestore';
import { LocationService } from '../../../services/location/locationService';
import { NotificationService } from '../../../services/notifications/notificationService';
import SosPulseOverlay from '../../../components/ui/SosPulseOverlay';
import { BeepPlayer } from '../../../components/media/BeepPlayer';
import { ClayButton } from '../../../components/ui/ClayButton';
import { useAudioPlayer } from 'expo-audio';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { setStatusBarBackgroundColor } from 'expo-status-bar';

export default function SupervisorHome() {
  const { userProfile, startSosBeep, stopSosBeep, flashSosPulse } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const lastAlertIds = useRef<Set<string>>(new Set());
  const beepPlayer = useAudioPlayer(null);
  const [silenced, setSilenced] = useState(false);
  const selectionShown = useRef(false);
  const [displayLocation, setDisplayLocation] = useState('Calculating...');
  const [displayDistance, setDisplayDistance] = useState('');

  useEffect(() => {
    // Listen for active emergency alerts
    const q = query(collection(db, 'emergency_alerts'), where('status', '==', 'active'), orderBy('createdAt', 'asc'), limit(10));
    const unsub = onSnapshot(q, async (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      // Keep ascending order (earliest first). Keep only up to limit.
      setAlerts(docs);

      // Detect newly added alerts and notify supervisor devices (only once per id)
      try {
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
                } catch (e) {
                  console.warn('Failed to notify supervisor about new alert:', e);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error handling alert snapshot changes:', err);
      }
    }, (err) => {
      console.warn('Supervisor alerts listener error:', err);
    });

  // Listen for recent hazard reports (latest 6)
    const rQ = query(collection(db, 'hazard_reports'), orderBy('createdAt', 'desc'), limit(6));
    const unsubReports = onSnapshot(rQ, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setRecentReports(items);
    }, (err) => {
      console.warn('Supervisor recent reports listener error:', err);
    });

    return () => {
      unsub();
      unsubReports();
      unloadSound();
    };
  }, []);

  // Leaderboard: top users by safetyScore (realtime)
  useEffect(() => {
    const lbQ = query(collection(db, 'users'), orderBy('safetyScore', 'desc'), limit(6));
    const unsubLb = onSnapshot(lbQ, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      setLeaderboard(list);
    }, (err) => {
      console.warn('Leaderboard listener error:', err);
    });

    return () => { try { unsubLb(); } catch (e) {} };
  }, []);

  // Show details Alert once when an alert is selected (avoid rendering-time Alert calls)
  useEffect(() => {
    if (!selectedAlert) return; // Do nothing if modal is closed

    const calculateDetails = async (a: any) => {
      // --- This is the smart logic from the old alert ---
      let senderLat: number | null = null;
      let senderLon: number | null = null;
      if (a.location) {
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
        } catch (e) {}

        try {
          const supLoc = await LocationService.getCurrentLocation(8000).catch(() => null);
          if (supLoc && supLoc.coords) {
            const km = LocationService.calculateDistance(supLoc.coords.latitude, supLoc.coords.longitude, senderLat, senderLon);
            if (!isNaN(km)) {
              distanceText = `Distance: ${km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(2) + ' km'}`;
            }
          }
        } catch (e) {}
      }
      // --- End of smart logic ---

      // Update our state variables with the results
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
                    <View style={styles.alertLeft}>
                      <Text style={styles.alertName}>{earliest.userName ?? 'Unknown'}</Text>
                      <Text style={styles.alertMeta}>{earliest.userRole ?? ''} • {new Date(earliest.timestamp || earliest.createdAt?.toDate?.() || earliest.createdAt || Date.now()).toLocaleString()}</Text>
                    </View>
                    <View style={styles.alertRight}>
                      <Text style={{ color: ClayColors.white, backgroundColor: ClayColors.coral, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 }}>ACTIVE • {alerts.length}</Text>
                      <ClayButton
                        title="Open"
                        variant="primary"
                        size="small"
                        onPress={() => {
                          // Clicking the active card should stop the beep/pulse and open details
                            setSilenced(true);
                            try {
                              stopSosBeep();
                            } catch (e) {}
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
        </ScrollView>
        {/* Leaderboard */}
        <ClayCard style={[styles.fullWidthCard, { marginBottom: 18, marginLeft: 20, marginRight: 20 }]}>
          <Text style={styles.cardTitle}>Team Leaderboard</Text>
          {leaderboard.length === 0 ? (
            <Text style={styles.cardSubtitle}>No scores yet</Text>
          ) : (
            leaderboard.map((u, idx) => {
              const score = typeof u.safetyScore === 'number' ? u.safetyScore : 0;
              const pct = Math.max(0, Math.min(100, score));
              const isTop = idx === 0;
              return (
                <View key={u.id} style={[styles.lbRow, isTop ? styles.lbTopRow : {}, { backgroundColor: ClayColors.cardGlassBorder, borderRadius: 16 }]}>
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
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  alertLeft: {},
  alertRight: {},
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
  rankCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6B6B7A', alignItems: 'center', justifyContent: 'center' },
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
