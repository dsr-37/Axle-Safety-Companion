import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, View, FlatList, ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ClayCard } from '../../../components/ui/ClayCard';
import { ClayButton } from '../../../components/ui/ClayButton';
import { GradientBackground } from '../../../components/ui/GradientBackground';
import { VideoPlayer } from '../../../components/media/VideoPlayer';
import { ClayColors, ClayTheme } from '../../../constants/Colors';
import { SAFETY_VIDEOS, SafetyVideo, getDailyVideo } from '../../../constants/SafetyVideos';

const { width } = Dimensions.get('window');
const SPACING = 20;
const VIDEO_WIDTH = width - SPACING * 2;
const VIDEO_HEIGHT = (VIDEO_WIDTH * 9) / 16;

export default function InsightsScreen() {
  const [todayVideo, setTodayVideo] = useState<SafetyVideo>(getDailyVideo());
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentDuration, setCurrentDuration] = useState<number | null>(null);

  useEffect(() => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 0).getTime();
    const dayOfYear = Math.floor((Date.now() - startOfYear) / 86400000);
    const videoIndex = dayOfYear % SAFETY_VIDEOS.length;

    setTodayVideo(SAFETY_VIDEOS[videoIndex]);
    setCurrentVideoIndex(videoIndex);
  }, []);

  const playNextVideo = () => {
    const nextIndex = (currentVideoIndex + 1) % SAFETY_VIDEOS.length;
    setCurrentVideoIndex(nextIndex);
    setTodayVideo(SAFETY_VIDEOS[nextIndex]);
  };

  const playPreviousVideo = () => {
    const previousIndex = currentVideoIndex === 0
      ? SAFETY_VIDEOS.length - 1
      : currentVideoIndex - 1;

    setCurrentVideoIndex(previousIndex);
    setTodayVideo(SAFETY_VIDEOS[previousIndex]);
  };

  const selectVideo = (video: SafetyVideo, index: number) => {
    setTodayVideo(video);
    setCurrentVideoIndex(index);
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'equipment':
        return ClayColors.babyBlue;
      case 'procedures':
        return ClayColors.mintProfile;
      case 'emergency':
        return ClayColors.coral;
      case 'general':
        return ClayColors.mint;
      default:
        return ClayColors.gray;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'equipment':
        return 'construct';
      case 'procedures':
        return 'list';
      case 'emergency':
        return 'alert-circle';
      case 'general':
        return 'information-circle';
      default:
        return 'play-circle';
    }
  };

  const header = useMemo(() => (
    <View>
      <View style={styles.header}>
        <Ionicons name="play-circle" size={80} color={ClayColors.mintProfile} />
        <Text style={[styles.title, { fontSize: 28 }]}>Insights</Text>
        <Text style={[styles.subtitle, { fontSize: 18, marginBottom: 10 }]}>Daily safety videos and quick insights</Text>
        <View style={{ height: 2 }} />
      </View>

      <ClayCard style={styles.featuredCard}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: getCategoryColor(todayVideo.category) },
            ]}
          >
            <Ionicons
              name={getCategoryIcon(todayVideo.category) as any}
              size={16}
              color={ClayColors.white}
            />
            <Text style={styles.categoryText}>{todayVideo.category}</Text>
          </View>
          <Text style={styles.durationText}>
            {currentDuration != null
              ? `${Math.floor(currentDuration / 60)}:${String(Math.round(currentDuration % 60)).padStart(2, '0')}`
              : '—:—'}
          </Text>
        </View>

        <VideoPlayer
          source={todayVideo.source}
          style={[styles.videoPlayer, { width: VIDEO_WIDTH, height: VIDEO_HEIGHT }]}
          shouldPlay={false}
          isLooping={false}
          useNativeControls
          onDurationChange={(sec) => setCurrentDuration(sec)}
        />

        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>{todayVideo.title}</Text>
          <Text style={styles.videoDescription}>{todayVideo.description}</Text>
        </View>

        <View style={styles.videoControls}>
          <ClayButton
            title="Previous"
            variant="danger"
            size="small"
            fullWidth={false}
            style={styles.controlButton}
            onPress={playPreviousVideo}
            icon={<Ionicons name="play-back" size={16} color={ClayColors.white} />}
          />
          <ClayButton
            title="Next"
            variant="primary"
            size="small"
            fullWidth={false}
            style={styles.controlButton}
            onPress={playNextVideo}
            icon={<Ionicons name="play-forward" size={16} color={ClayColors.white} />}
          />
        </View>
      </ClayCard>

      <View style={[styles.playlistHeader, { marginTop: 18 }]}>
        <Text style={[styles.playlistTitle, { fontSize: 24 }]}>All Insights</Text>
        <Text style={[styles.playlistSubtitle, { fontSize: 16 }]}>
          {SAFETY_VIDEOS.length} videos available
        </Text>
      </View>
    </View>
  ), [todayVideo, currentVideoIndex]);

  const footer = (
    <ClayCard style={styles.statsCard}>
      <Text style={styles.statsTitle}>Your Progress</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{currentVideoIndex + 1}</Text>
          <Text style={styles.statLabel}>Current Video</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{SAFETY_VIDEOS.length}</Text>
          <Text style={styles.statLabel}>Total Videos</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {Math.round(((currentVideoIndex + 1) / SAFETY_VIDEOS.length) * 100)}%
          </Text>
          <Text style={styles.statLabel}>Progress</Text>
        </View>
      </View>
    </ClayCard>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={SAFETY_VIDEOS}
          keyExtractor={(item) => item.id}
          extraData={currentVideoIndex}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item, index }: ListRenderItemInfo<SafetyVideo>) => {
            const isActive = index === currentVideoIndex;
            return (
              <ClayCard
                style={[styles.playlistItem, isActive && styles.activePlaylistItem]}
                onPress={() => selectVideo(item, index)}
              >
                <View style={styles.playlistItemContent}>
                  <View style={styles.playlistItemLeft}>
                    <View
                      style={[
                        styles.playlistIcon,
                        { backgroundColor: getCategoryColor(item.category) },
                      ]}
                    >
                      <Ionicons
                        name={isActive ? 'pause' : 'play'}
                        size={18}
                        color={ClayColors.white}
                      />
                    </View>
                    <View style={styles.playlistItemInfo}>
                      <Text
                        style={[
                          styles.playlistItemTitle,
                          isActive && styles.activePlaylistItemTitle,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.playlistItemCategory}>
                        {item.category}
                      </Text>
                    </View>
                  </View>
                  {isActive && (
                    <Ionicons name="volume-high" size={20} color={ClayColors.mint} />
                  )}
                </View>
              </ClayCard>
            );
          }}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: SPACING,
    paddingTop: SPACING + 8,
    paddingBottom: SPACING * 2,
    gap: 18,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: ClayTheme.textOnDark.primary,
  },
  subtitle: {
    fontSize: 16,
    color: ClayTheme.textOnDark.secondary,
    textAlign: 'center',
  },
  featuredCard: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  categoryText: {
    color: ClayColors.white,
    marginLeft: 8,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  durationText: {
    color: ClayTheme.textOnDark.secondary,
    fontWeight: '500',
  },
  videoPlayer: {
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  videoInfo: {
    gap: 6,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ClayTheme.textOnDark.primary,
  },
  videoDescription: {
    fontSize: 14,
    color: ClayTheme.textOnDark.secondary,
    lineHeight: 20,
  },
  videoControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  controlButton: {
    flexGrow: 1,
    flexBasis: '48%',
  },
  playlistHeader: {
    gap: 4,
  },
  playlistTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ClayTheme.textOnDark.primary,
  },
  playlistSubtitle: {
    fontSize: 12,
    color: ClayTheme.textOnDark.muted,
  },
  playlist: {
    marginTop: 4,
  },
  playlistItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: ClayTheme.glass.border,
  },
  playlistItemSpacing: {
    marginBottom: 12,
  },
  activePlaylistItem: {
    borderColor: ClayColors.mint,
    borderWidth: 4,
    borderRadius: 30,
    backgroundColor: ClayTheme.glass.strong,
  },
  playlistItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playlistItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  playlistIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistItemInfo: {
    justifyContent: 'center',
    flex: 1,
    gap: 2,
  },
  playlistItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: ClayTheme.textOnDark.primary,
  },
  activePlaylistItemTitle: {},
  playlistItemCategory: {
    fontSize: 12,
    color: ClayTheme.textOnDark.secondary,
  },
  statsCard: {
    marginTop: 14,
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ClayTheme.textOnDark.primary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: ClayColors.white,
  },
  statLabel: {
    fontSize: 12,
    color: ClayTheme.textOnDark.muted,
  },
});
