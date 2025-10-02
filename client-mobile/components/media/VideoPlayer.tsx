import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useVideoPlayer, VideoView, type VideoPlayer as ExpoVideoPlayer, type VideoSource } from 'expo-video';
import { useEvent } from 'expo';
import { ClayButton } from '../ui/ClayButton';
import { ClayColors, ClayTheme } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface VideoPlayerProps {
  source: VideoSource;
  style?: any;
  shouldPlay?: boolean;
  isLooping?: boolean;
  useNativeControls?: boolean;
  resizeMode?: 'contain' | 'cover' | 'fill';
  onDurationChange?: (seconds: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  source,
  style,
  shouldPlay = false,
  isLooping = false,
  useNativeControls = true,
  resizeMode = 'contain',
  onDurationChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [source]);

  const player = useVideoPlayer(source, (player: ExpoVideoPlayer) => {
    player.loop = isLooping;
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  });

  // Track player status/loading/error
  const { status, error: playerError } = useEvent(player, 'statusChange', {
    status: player.status,
    error: undefined as any,
  });
  const { isPlaying: playing } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });
  const { duration } = player;
  useEffect(() => {
    setIsPlaying(!!playing);
  }, [playing]);

  useEffect(() => {
    setIsLoading(status === 'loading');
  }, [status]);

  useEffect(() => {
    if (playerError?.message) {
      setError('Failed to load video');
    } else {
      setError(null);
    }
  }, [playerError?.message]);

  useEffect(() => {
    if (typeof duration === 'number' && duration > 0) {
      onDurationChange?.(duration);
    }
  }, [duration, onDurationChange]);

  const contentFit = useMemo(() => resizeMode ?? 'contain', [resizeMode]);

  const handlePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={useNativeControls}
        contentFit={contentFit}
        onFirstFrameRender={() => setIsLoading(false)}
      />

      {isLoading && !error && (
        <View style={[styles.overlay, styles.loadingContainer]}>
          <Ionicons name="refresh" size={32} color={ClayColors.mint} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}

      {error && (
        <View style={[styles.overlay, styles.errorContainer]}>
          <Text style={[styles.errorText, { fontSize: 20 }]}>Failed to load video</Text>
          <ClayButton
            title="Retry"
            variant="secondary"
            size="vsmall"
            fullWidth={false}
            onPress={() => {
              setError(null);
              setIsLoading(true);
            }}
            style={{ alignSelf: 'center' }}
          />
        </View>
      )}
      
      {!useNativeControls && (
        <View style={styles.customControls}>
          <ClayButton
            title={isPlaying ? "" : ""}
            variant="primary"
            size="small"
            fullWidth={false}
            onPress={handlePlayPause}
            icon={
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={24} 
                color={ClayColors.white} 
              />
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: ClayColors.black,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '95%',
    height: '100%',
    alignSelf: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 18, 32, 0.72)',
    gap: 12,
    padding: 16,
  },
  loadingContainer: {
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: ClayTheme.textOnDark.secondary,
  },
  errorContainer: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  errorText: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 14,
    color: ClayColors.error,
    textAlign: 'center',
  },
  customControls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});