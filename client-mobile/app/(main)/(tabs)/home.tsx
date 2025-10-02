import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GradientBackground } from '../../../components/ui/GradientBackground';
import { ClayButton } from '../../../components/ui/ClayButton';
import { ClayCard } from '../../../components/ui/ClayCard';
import { VideoPlayer } from '../../../components/media/VideoPlayer';
import { useAuth } from '../../../contexts/AuthContext';
import { ClayColors, ClayTheme } from '../../../constants/Colors';
import { SAFETY_VIDEOS, SafetyVideo, getDailyVideo } from '../../../constants/SafetyVideos';

const SPACING = 22;

export default function HomeScreen() {
  const { userProfile } = useAuth();
  const [todayVideo, setTodayVideo] = useState<SafetyVideo>(getDailyVideo());
  const [currentDuration, setCurrentDuration] = useState<number | null>(null);

  useEffect(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const videoIndex = dayOfYear % SAFETY_VIDEOS.length;
    setTodayVideo(SAFETY_VIDEOS[videoIndex]);
  }, []);

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
                <Text style={styles.statNumber}>98%</Text>
                <Text style={styles.statLabel}>Checklists Complete</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>3</Text>
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