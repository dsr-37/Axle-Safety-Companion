import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { ClayButton } from '../ui/ClayButton';
import { ClayColors, ClayTheme } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface AudioRecorderProps {
  onRecordingComplete: (uri: string) => void;
  style?: any;
}

export const AudioRecorder = forwardRef<any, AudioRecorderProps>(({ onRecordingComplete, style }, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const durationIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // expo-audio recorder & player
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(recordingUri ?? null);
  const playerStatus = useAudioPlayerStatus(player);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch {
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recorder) return;

      setIsRecording(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      await recorder.stop();
      const uri = recorder.uri ?? recorderState?.url ?? null;

      if (uri) {
        setRecordingUri(uri);
        onRecordingComplete(uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const playRecording = async () => {
    try {
      if (!recordingUri) return;
      setIsPlaying(true);
      player.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const stopPlaying = async () => {
    try {
      player.pause();
      setIsPlaying(false);
    } catch {
      // no-op
    }
  };

  const deleteRecording = () => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this voice note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // stop playback if playing
              try {
                if (player && typeof player.pause === 'function') await player.pause();
              } catch {
                // ignore playback pause errors
                console.warn('Failed to pause player while deleting recording');
              }

              // Try to pause playback first
              try {
                if (player && typeof player.pause === 'function') {
                  await player.pause();
                }
              } catch {
                // ignore pause errors
              }

              // Attempt to release the player's source BEFORE clearing our recordingUri state.
              // Some implementations reconcile the audio player's source with the prop used to create it,
              // and clearing the URI first can cause replace() to reject due to a race. We'll swallow
              // replace errors silently (debug) because they are non-fatal for UX.
              try {
                if (player && typeof player.replace === 'function') {
                  const maybePromise: any = (player as any).replace(null);
                  if (maybePromise && typeof maybePromise.then === 'function') {
                    await maybePromise.catch(() => {});
                  }
                }
              } catch {
                // Debug log only; don't surface as a warning to avoid noise in user logs
                // (these errors happen on some platforms when the underlying native player is already torn down)
                console.debug('player.replace rejected while deleting recording (ignored)');
              }

              // Now clear local state
              setRecordingUri(null);
              setRecordingDuration(0);
            } catch {
              console.warn('Error while deleting recording');
            }
          }
        }
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
  }));

  // reflect player state for UI
  useEffect(() => {
    if (playerStatus?.didJustFinish) {
      setIsPlaying(false);
      // reset position so play starts from beginning next time
      player.seekTo(0);
    }
  }, [playerStatus?.didJustFinish]);

  return (
    <View style={[styles.container, style]}>
      {isRecording ? (
        <View style={styles.recordingContainer}>
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording</Text>
            <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
          </View>
          <ClayButton
            title="Stop"
            variant="danger"
            size="medium"
            onPress={stopRecording}
            icon={<Ionicons name="stop" size={16} color={ClayColors.white} />}
            fullWidth={false}
          />
        </View>
      ) : recordingUri ? (
        <View style={styles.playbackContainer}>
          <View style={styles.recordingInfo}>
            <Ionicons name="mic" size={20} color={ClayColors.success} />
            <Text style={styles.recordedText}>Voice note recorded</Text>
            <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
          </View>
          <View style={styles.playbackControls}>
            <ClayButton
              title=""
              variant="secondary"
              size="small"
              onPress={isPlaying ? stopPlaying : playRecording}
              icon={
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={16}
                  color={ClayColors.darkGray}
                />
              }
              fullWidth={false}
              style={styles.playbackButton}
            />
            <ClayButton
              title=""
              variant="secondary"
              size="small"
              onPress={deleteRecording}
              icon={<Ionicons name="trash" size={16} color={ClayColors.error} />}
              style={[styles.deleteButton, styles.playbackButton]}
              fullWidth={false}
            />
          </View>
        </View>
      ) : (
        <View style={styles.initialContainer}>
          <ClayButton
            title="Record Voice Note"
            variant="primary"
            size="large"
            onPress={startRecording}
            icon={<Ionicons name="mic" size={20} color={ClayColors.white} />}
          />
          <Text style={styles.helpText}>
            Tap to record your hazard report. You can speak in any language.
          </Text>
        </View>
      )}
    </View>
  );
});

AudioRecorder.displayName = 'AudioRecorder';

const styles = StyleSheet.create({
  container: { borderRadius: 12, backgroundColor: ClayColors.lightGray, padding: 16 },
  recordingContainer: { alignItems: 'center' },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ClayColors.error, marginRight: 8 },
  recordingText: { fontSize: 16, color: ClayColors.error, fontWeight: '600', marginRight: 8 },
  durationText: { fontSize: 14, color: ClayTheme.text.secondary, fontFamily: 'monospace' },
  playbackContainer: { gap: 12 },
  recordingInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordedText: { fontSize: 14, color: ClayColors.success, fontWeight: '500', flex: 1 },
  playbackControls: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  playbackButton: { flex: 1, maxWidth: 120 },
  deleteButton: { marginLeft: 8 },
  initialContainer: { alignItems: 'center' },
  helpText: { fontSize: 12, color: ClayTheme.text.secondary, textAlign: 'center', marginTop: 8, lineHeight: 16 },
});
