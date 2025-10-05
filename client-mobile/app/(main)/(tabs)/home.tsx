import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GradientBackground } from '../../../components/ui/GradientBackground';
import { ClayButton } from '../../../components/ui/ClayButton';
import { ClayCard } from '../../../components/ui/ClayCard';
import { VideoPlayer } from '../../../components/media/VideoPlayer';
import { useAuth } from '../../../contexts/AuthContext';
import { FirestoreService } from '../../../services/firebase/firestore';
import { ROLE_CHECKLISTS } from '../../../constants/Checklists';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { ClayColors, ClayTheme } from '../../../constants/Colors';
import { SAFETY_VIDEOS, SafetyVideo, getDailyVideo } from '../../../constants/SafetyVideos';

const SPACING = 22;

export default function HomeScreen() {
  const { userProfile } = useAuth();
  const [todayVideo, setTodayVideo] = useState<SafetyVideo>(getDailyVideo());
  const [currentDuration, setCurrentDuration] = useState<number | null>(null);
  const [checklistCompleted, setChecklistCompleted] = useState<number | null>(null);
  const [checklistTotal, setChecklistTotal] = useState<number | null>(null);
  const [reportsCount, setReportsCount] = useState<number | null>(null);
  const checklistRef = useRef<number | null>(null); // stores percentage value for persistence
  const reportsRef = useRef<number | null>(null);
  const safetyWriteTimer = useRef<any>(null);

  useEffect(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const videoIndex = dayOfYear % SAFETY_VIDEOS.length;
    setTodayVideo(SAFETY_VIDEOS[videoIndex]);
  }, []);

  // Fetch user-specific stats (checklist completion % for today and report count)
  useEffect(() => {
    if (!userProfile?.id) return;
    // Helper to compute the checklist dateKey using a 03:00 day boundary
    const computeDateKey = (now = new Date()) => {
      const shifted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const yyyy = shifted.getFullYear();
      const mm = String(shifted.getMonth() + 1).padStart(2, '0');
      const dd = String(shifted.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const computeAndPersist = () => {
      const pct = checklistRef.current;
      const rc = reportsRef.current;
      if (pct === null || rc === null) return; // wait until both available

      // New scoring: checklist has stronger weight, reports contribute modestly
      const CHECKLIST_WEIGHT = 0.75; // 75% weight
      const REPORTS_WEIGHT = 0.25; // 25% weight
      const REPORTS_CAP = 3; // number of reports that saturates full contribution

      const normalizedReports = Math.max(0, Math.min(1, (rc || 0) / REPORTS_CAP));
      const reportsScore = normalizedReports * 100; // 0..100

      const score = Math.round(((pct ?? 0) * CHECKLIST_WEIGHT) + (reportsScore * REPORTS_WEIGHT));

      // debounce writes to avoid rapid updates
      if (safetyWriteTimer.current) clearTimeout(safetyWriteTimer.current);
      safetyWriteTimer.current = setTimeout(() => {
        FirestoreService.updateUserProfile(userProfile.id, { safetyScore: score }).catch(() => {});
      }, 1200);
    };

    // manage checklist subscription and rollover at 03:00
    let checklistUnsub: (() => void) | null = null;
    let rolloverTimer: ReturnType<typeof setTimeout> | null = null;

    const subscribeForDateKey = (dateKey: string) => {
      const checklistDocId = `${dateKey}_${userProfile.id}`;
      const checklistDocRef = doc(db, 'checklists', checklistDocId);
      // unsubscribe previous if any
        if (checklistUnsub) {
          try { checklistUnsub(); } catch {}
          checklistUnsub = null;
        }
  checklistUnsub = onSnapshot(checklistDocRef, (snap) => {
        if (!snap.exists()) {
          const role = (userProfile.role || '').toString();
          const total = ROLE_CHECKLISTS[role]?.length ?? 5;
          setChecklistCompleted(0);
          setChecklistTotal(total);
          checklistRef.current = 0;
          computeAndPersist();
          return;
        }
        const data: any = snap.data();
        let completed = 0;
        if (data.items && typeof data.items === 'object') {
          completed = Object.keys(data.items).filter(k => !!data.items[k]).length;
        } else if (Array.isArray(data.checklist)) {
          completed = data.checklist.filter((i: any) => i.completed).length;
        }
        const role = (userProfile.role || '').toString();
        const total = ROLE_CHECKLISTS[role]?.length ?? 5;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        setChecklistCompleted(completed);
        setChecklistTotal(total);
        checklistRef.current = pct; // used for scoring
        computeAndPersist();
      }, () => {
        console.warn('Checklist onSnapshot error:');
      });
    };

    const scheduleRollover = () => {
      if (rolloverTimer) {
        clearTimeout(rolloverTimer as any);
        rolloverTimer = null;
      }
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 3, 0, 5, 0); // a small 5s buffer
      if (now >= next) {
        next.setDate(next.getDate() + 1);
      }
      const ms = next.getTime() - now.getTime();
      rolloverTimer = setTimeout(() => {
        try {
          const newKey = computeDateKey(new Date());
          subscribeForDateKey(newKey);
        } catch (_e) {
          console.warn('Failed to rollover checklist subscription:', _e);
        }
        // schedule next day's rollover
        scheduleRollover();
      }, ms);
    };

    // initial subscribe
    const initialKey = computeDateKey(new Date());
    subscribeForDateKey(initialKey);
    scheduleRollover();

    const reportsQuery = query(collection(db, 'hazard_reports'), where('userId', '==', userProfile.id));
    const unsubReports = onSnapshot(reportsQuery, (snap) => {
      setReportsCount(snap.size);
      reportsRef.current = snap.size;
      computeAndPersist();
    }, (err) => { console.warn('Reports onSnapshot error:', err); });

    return () => {
      try { if (checklistUnsub) checklistUnsub(); } catch {}
      try { unsubReports(); } catch {}
      try { if (rolloverTimer) clearTimeout(rolloverTimer as any) } catch {}
      if (safetyWriteTimer.current) clearTimeout(safetyWriteTimer.current);
    };
  }, [userProfile?.id]);

  const handleEmergencySOS = () => {
    Alert.alert(
      'Emergency SOS',
      'Are you sure you want to send an emergency alert to your supervisor?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: () => router.push('/emergency-sos'),
        },
      ]
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.header}>
            <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
            <Text style={styles.userName}>{userProfile?.name || 'Worker'}</Text>
            <Text style={styles.userRole}>{userProfile?.role || 'Crew Member'}</Text>
          </View>

          <ClayCard style={styles.fullWidthCard}>
            <ClayButton
              title="🆘 Emergency SOS"
              variant="danger"
              size="elarge"
              onPress={handleEmergencySOS}
              icon={<Ionicons name="alert-circle" size={24} color={ClayColors.white} />}
            />
          </ClayCard>

          <ClayCard style={styles.fullWidthCard}>
            <Text style={[styles.cardTitle, { fontSize: 20 }]}>Report a Hazard</Text>
            <Text style={[styles.cardSubtitle, { fontSize: 14 }]}>Help keep everyone safe</Text>
            <ClayButton
              title="Report Now"
              variant="primary"
              size="large"
              onPress={() => router.push('/hazard-report')}
              icon={<Ionicons name="warning" size={22} color={ClayColors.white} />}
            />
          </ClayCard>

          <ClayCard style={styles.fullWidthCard}>
            <Text style={[styles.cardTitle, { fontSize: 20 }]}>Today’s Safety Tasks</Text>
            <Text style={[styles.cardSubtitle, { fontSize: 14 }]}>Complete your daily safety checklist</Text>
            <ClayButton
              title="View Checklist"
              variant="secondary"
              onPress={() => router.push('/(main)/(tabs)/checklist')}
              icon={<Ionicons name="checkmark-circle" size={20} color={ClayColors.white} />}
            />
          </ClayCard>

          <ClayCard style={styles.fullWidthCard}>
            <Text style={[styles.cardTitle, { fontSize: 20 }]}>Safety Short of the Day</Text>
            <Text style={[styles.cardSubtitle, { fontSize: 14 }]}>{todayVideo.title}</Text>
            <View>
              <VideoPlayer
                source={todayVideo.source}
                style={styles.videoPlayer}
                shouldPlay={false}
                isLooping={false}
                useNativeControls
                onDurationChange={(sec) => setCurrentDuration(sec)}
              />
              {currentDuration != null && (
                <Text style={[styles.cardSubtitle, { marginTop: 8 }]}>
                  Duration: {Math.floor(currentDuration / 60)}:{String(Math.round(currentDuration % 60)).padStart(2, '0')}
                </Text>
              )}
            </View>
          </ClayCard>

          <ClayCard style={styles.statsCard}>
            <Text style={[styles.cardTitle, { fontSize: 20 }]}>Your Safety Score</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{checklistCompleted === null || checklistTotal === null ? '—' : `${checklistCompleted}/${checklistTotal}`}</Text>
                <Text style={styles.statLabel}>Checklists Complete</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{reportsCount === null ? '—' : String(reportsCount)}</Text>
                <Text style={styles.statLabel}>Reports Done</Text>
              </View>
            </View>
          </ClayCard>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: SPACING,
    paddingVertical: SPACING + 12,
    gap: SPACING,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  greeting: {
    fontSize: 24,
    color: ClayTheme.textOnDark.secondary,
  },
  userName: {
    fontSize: 30,
    fontWeight: '700',
    color: ClayTheme.textOnDark.primary,
  },
  userRole: {
    fontSize: 18,
    color: ClayTheme.textOnDark.secondary,
    textTransform: 'capitalize',
  },
  fullWidthCard: {
    alignItems: 'stretch',
    gap: 16,
  },
  cardTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: ClayTheme.textOnDark.primary,
  },
  cardSubtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: ClayTheme.textOnDark.secondary,
  },
  videoPlayer: {
    textAlign: 'center',
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statsCard: {
    textAlign: 'center',
    gap: 16,
  },
  statsRow: {
    textAlign: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 2,
    alignItems: 'center',
  },
  statNumber: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: ClayColors.white,
  },
  statLabel: {
    alignItems: 'center',
    fontSize: 12,
    color: ClayTheme.textOnDark.muted,
  },
});