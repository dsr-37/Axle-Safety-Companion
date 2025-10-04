import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

interface BeepPlayerProps {
  playing: boolean;
}

export const BeepPlayer: React.FC<BeepPlayerProps> = ({ playing }) => {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        // correct relative path from components/media -> ../../assets
        await player.replace(require('../../assets/audios/beep.mp3') as any);
        await player.play();
      } catch (err) {
        console.warn('BeepPlayer start failed', err);
      }
    };

    const stop = async () => {
      try {
        await player.pause?.();
      } catch (e) {}
      try {
        await player.replace?.(null);
      } catch (e) {}
    };

    if (playing) {
      start();
    } else {
      stop();
    }

    return () => {
      mounted = false;
    };
  }, [playing]);

  // Loop when sound finishes
  useEffect(() => {
    if (status?.didJustFinish && playing) {
      try {
        player.seekTo(0);
        player.play();
      } catch (e) {
        // ignore
      }
    }
  }, [status?.didJustFinish, playing]);

  return <View />;
};

export default BeepPlayer;
