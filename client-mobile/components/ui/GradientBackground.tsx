import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ClayTheme } from '../../constants/Colors';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ children, style }) => {
  return (
    <LinearGradient
      colors={[ClayTheme.gradient.start, ClayTheme.gradient.mid, ClayTheme.gradient.end]}
      start={{ x: 0.05, y: 0.1 }}
      end={{ x: 0.95, y: 0.95 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
