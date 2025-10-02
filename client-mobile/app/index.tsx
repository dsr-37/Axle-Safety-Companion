import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ClayTheme } from '../constants/Colors';

export default function IndexScreen() {
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    // This effect runs only when the loading state changes from true to false
    if (!loading) {
      if (!user) {
        router.replace('/(auth)/login');
      } else if (!userProfile?.role) {
        router.replace('/(auth)/role-selection');
      } else {
        router.replace('/(main)/(tabs)/home');
      }
    }
  }, [loading, user, userProfile]); // Depend on loading, user, and profile

  // While loading, show a spinner and prevent any navigation attempts
  return (
    <View style={styles.container}>
      <LoadingSpinner size="large" message="Authenticating..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ClayTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});