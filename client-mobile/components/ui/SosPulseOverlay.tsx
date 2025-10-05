import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ClayColors } from '../../constants/Colors';

interface SosPulseOverlayProps {
  visible?: boolean;
}

export default function SosPulseOverlay({ visible }: SosPulseOverlayProps) {
  const auth = useAuth();
  const isVisible = typeof visible === 'boolean' ? visible : auth?.sosPulse;
  const opacity = isVisible ? 0.12 : 0;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.overlay, { opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: ClayColors.babyBlue,
  },
});
