import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { ClayColors, ClayTheme } from '../../constants/Colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  message,
  color = ClayColors.mint
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: ClayTheme.text.secondary,
    textAlign: 'center',
  },
});