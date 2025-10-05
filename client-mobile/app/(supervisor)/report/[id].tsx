import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Modal , InteractionManager } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClayButton } from '../../../components/ui/ClayButton';
import { ClayCard } from '../../../components/ui/ClayCard';
import { GradientBackground } from '../../../components/ui/GradientBackground';
import { ClayColors, ClayTheme } from '../../../constants/Colors';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { VideoPlayer } from '../../../components/media/VideoPlayer';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { FirestoreService } from '../../../services/firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';

interface MediaItem { url: string; publicId?: string; width?: number; height?: number; bytes?: number; duration?: number; }

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const { userProfile } = useAuth();

  // Predeclare audio related hooks with stable initial null source; once report loads we can replace source via effect.
  const [audioSource, setAudioSource] = useState<string | null>(null);
  const audioPlayer = useAudioPlayer(audioSource);
  const audioStatus = useAudioPlayerStatus(audioPlayer);

  useEffect(() => {
    (async () => {
      try {
        const ref = doc(db, 'hazard_reports', String(id));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as any;
          // If viewer is a supervisor with a triple, enforce that the report belongs to the same triple
          if (userProfile?.stateId && userProfile?.coalfieldId && userProfile?.mineId) {
            if (data.stateId && data.coalfieldId && data.mineId) {
              const mismatch = data.stateId !== userProfile.stateId || data.coalfieldId !== userProfile.coalfieldId || data.mineId !== userProfile.mineId;
              if (mismatch) {
                // Treat as not found to avoid leaking cross-mine data
                setReport(null);
                setLoading(false);
                return;
              }
            }
          }
          setReport(data);
        }
      } catch (err) {
        console.warn('Failed to fetch report detail', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleResolve = async () => {
    if (!report) return;
    setResolving(true);
    try {
      await FirestoreService.resolveHazardReport(report.id, { id: userProfile?.id, name: userProfile?.name });
      // Clear resolving flag before navigating to avoid setState-after-unmount warnings
      setResolving(false);
      // Wait for any ongoing interactions/animations and give a short delay so
      // Firestore listeners in parent screens can process the deletion without
      // causing a view hierarchy race during navigation.
      try {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            try {
              router.replace('/(supervisor)/(tabs)/reports');
            } catch {
              // fallback: try a back navigation
              try { router.back(); } catch { /* swallow */ }
            }
          }, 180);
        });
      } catch {
        // If InteractionManager isn't available for some runtime, fallback to a short timeout
        setTimeout(() => {
          try { router.replace('/(supervisor)/(tabs)/reports'); } catch { try { router.back(); } catch {} }
        }, 220);
      }
    } catch (err) {
      console.warn('Resolve failed', (err as any)?.message || String(err));
      setResolving(false);
    } finally {
    }
  };

  // We defer conditional rendering below to keep hooks order stable.
  let images: MediaItem[] = [];
  let videos: MediaItem[] = [];
  let audio: MediaItem | undefined;
  if (report) {
    images = report.media?.images || [];
    videos = report.media?.videos || [];
    audio = report.media?.audio;
  }

  const [modalVisible, setModalVisible] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (audio?.url) {
      setAudioSource(audio.url);
    } else {
      setAudioSource(null);
    }
  }, [audio?.url]);

  const isPlaying = !!(audioStatus as any)?.playing || !!(audioStatus as any)?.isPlaying;
  const toggleAudio = () => {
    if (!audioSource) return;
    try {
      if (isPlaying) {
        audioPlayer.pause();
      } else {
        audioPlayer.play();
      }
    } catch {
      // swallow
    }
  };

  // When playback finishes, seek back to start so it can be replayed
  useEffect(() => {
    if ((audioStatus as any)?.didJustFinish) {
      try {
        // some players expect seek before replay; reset to 0
        audioPlayer.seekTo(0);
      } catch {
        // ignore
      }
    }
  }, [(audioStatus as any)?.didJustFinish]);

  const formatAudioSeconds = (val?: number | null) => {
    if (val === null || val === undefined) return '0';
    // some audio backends report seconds, some ms. If value looks large (>1000), assume ms.
    const totalSeconds = val > 1000 ? Math.round(val / 1000) : Math.round(val);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center}> 
          <ActivityIndicator color={ClayColors.mint} size="large" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!report) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center}> 
          <Text style={styles.errorText}>Report not found.</Text>
          <ClayButton title="Go Back" variant="secondary" onPress={() => router.back()} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}> 
            <Ionicons name="warning" size={32} color={ClayColors.warning} />
            <Text style={styles.title}>Hazard Report</Text>
            <Text style={styles.meta}>Reported by {report.userName || report.userId} • {formatTime(report.createdAt)}</Text>
          </View>

          <ClayCard style={styles.section}> 
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.body}>{report.description || 'No description provided.'}</Text>
          </ClayCard>

          {!!images.length && (
            <ClayCard style={styles.section}> 
              <Text style={styles.sectionTitle}>Photos ({images.length})</Text>
              <View style={styles.mediaGrid}>
                {images.map((img, idx) => (
                  <TouchableOpacity key={idx} onPress={() => { setModalImageUrl(img.url); setModalVisible(true); }}>
                    <Image source={{ uri: img.url }} style={styles.imageThumb} />
                  </TouchableOpacity>
                ))}
              </View>
            </ClayCard>
          )}

          {!!videos.length && (
            <ClayCard style={styles.section}> 
              <Text style={styles.sectionTitle}>Videos ({videos.length})</Text>
              {videos.map((vid, idx) => (
                <View key={idx} style={{ height: 200, marginTop: idx === 0 ? 12 : 20 }}>
                  <VideoPlayer source={{ uri: vid.url }} resizeMode="cover" />
                </View>
              ))}
            </ClayCard>
          )}

          {audio && (
            <ClayCard style={styles.section}> 
              <Text style={styles.sectionTitle}>Audio Note</Text>
              <View style={styles.audioRow}>
                <ClayButton
                  title={isPlaying ? 'Pause' : 'Play'}
                  variant="primary"
                  size="small"
                  onPress={toggleAudio}
                  icon={<Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={ClayColors.darkGray} />}
                  fullWidth={false}
                  style={{ alignSelf: 'flex-start' }}
                />
                {typeof (audioStatus as any)?.duration === 'number' && (
                  <Text style={styles.audioMeta}>Duration: {formatAudioSeconds((audioStatus as any).duration)}s</Text>
                )}
                {typeof (audioStatus as any).currentTime === 'number' && (
                  <Text style={styles.audioMeta}>{formatAudioSeconds((audioStatus as any).currentTime)}s</Text>
                )}
              </View>
              {(audioStatus as any)?.error && <Text style={styles.errorText}>Audio error</Text>}
            </ClayCard>
          )}

          {report.location && (
            <ClayCard style={styles.section}> 
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.body}>{report.location.latitude?.toFixed(5)}, {report.location.longitude?.toFixed(5)}</Text>
              {report.location.accuracy && (
                <Text style={styles.smallMeta}>Accuracy ±{Math.round(report.location.accuracy)}m</Text>
              )}
            </ClayCard>
          )}

          <View style={{ height: 28 }} />
        {/* Image modal */}
        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            {modalImageUrl ? (
              <Image source={{ uri: modalImageUrl }} style={styles.modalImage} resizeMode="contain" />
            ) : null}
          </View>
        </Modal>
        </ScrollView>

        <View style={[styles.footerActions, { paddingBottom: bottom + 10, backgroundColor: 'rgba(0,0,0,0.02)' }]}> 
          <ClayButton title="Back" variant="secondary" size="medium" onPress={() => router.back()} style={{ flex: 1, marginRight: 12 }} />
          {report.status !== 'resolved' && (
            <ClayButton
              title={resolving ? 'Resolving...' : 'Resolve'}
              variant="primary"
              size="medium"
              onPress={handleResolve}
              disabled={resolving}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

function formatTime(ts: any) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  } catch {
    return 'Unknown';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 96 },
  header: { alignItems: 'flex-start', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '700', color: ClayTheme.textOnDark.primary, marginTop: 8 },
  meta: { fontSize: 12, color: ClayTheme.textOnDark.secondary, marginTop: 4 },
  section: { marginBottom: 18, padding: 16, borderRadius: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: ClayTheme.textOnDark.primary, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 20, color: ClayTheme.textOnDark.secondary },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  imageThumb: { width: 100, height: 100, borderRadius: 12, backgroundColor: ClayColors.darkGray },
  smallMeta: { fontSize: 11, color: ClayTheme.textOnDark.secondary, marginTop: 4 },
  footerActions: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', padding: 18, backgroundColor: 'rgba(0,0,0,0.3)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: ClayTheme.textOnDark.secondary },
  errorText: { fontSize: 16, fontWeight: '600', color: ClayColors.error, marginBottom: 12 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  audioMeta: { fontSize: 11, color: ClayTheme.textOnDark.secondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalCloseButton: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
  modalImage: { width: '100%', height: '80%', borderRadius: 12 },
});
