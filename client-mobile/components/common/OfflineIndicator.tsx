import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ClayColors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export const OfflineIndicator: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = !!(state.isConnected && state.isInternetReachable);
      setIsConnected(connected);

      if (!connected) {
        // Slide down when offline
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        // Slide up when back online (with delay)
        setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -50,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 2000); // Show "back online" message for 2 seconds
      }
    });

    return unsubscribe;
  }, [slideAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isConnected ? ClayColors.success : ClayColors.warning,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Ionicons
        name={isConnected ? ('wifi' as any) : ('wifi-off' as any)} // Cast to any to suppress type errors
        size={16}
        color={ClayColors.white}
      />
      <Text style={styles.text}>
        {isConnected ? 'Back Online' : 'Working Offline'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  text: {
    color: ClayColors.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});