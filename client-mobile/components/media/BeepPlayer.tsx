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
    const start = async () => {
      try {
        // correct relative path from components/media -> ../../assets
        if (player && typeof player.replace === 'function') {
          try {
            await player.replace(require('../../assets/audios/beep.mp3') as any);
          } catch {
            // Debug only; some platforms may reject replace when player isn't ready
            console.debug('BeepPlayer.replace rejected (ignored)');
          }
        }
        try { await player.play(); } catch { /* ignore play errors */ }
      } catch {
        console.warn('BeepPlayer start failed');
      }
    };

      const stop = async () => {
      try {
        await player.pause?.();
      } catch {}
      try {
        if (player && typeof player.replace === 'function') {
          try {
            await player.replace(null);
      } catch {
        // Debug only — ignore expected replace failures during teardown
        console.debug('BeepPlayer.replace(null) rejected (ignored)');
          }
        }
  } catch {}
    };

    if (playing) {
      start();
    } else {
      stop();
    }

    return () => {
      // noop cleanup
    };
  }, [playing]);

  // Loop when sound finishes
  useEffect(() => {
    if (status?.didJustFinish && playing) {
      try {
        player.seekTo(0);
        player.play();
      } catch {
        // ignore
      }
    }
  }, [status?.didJustFinish, playing]);

  return <View />;
};

export default BeepPlayer;
