import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ClayTheme } from '../constants/Colors';

export default function IndexScreen() {
  const { user, userProfile, loading, profileLoaded } = useAuth();
  useEffect(() => {
    // Only decide route once the auth loading has finished and we've attempted loading a profile.
    if (loading) return;

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    // If we haven't attempted to load the profile yet (profileLoaded === false), stay on spinner.
    if (!profileLoaded) return;

    if (!userProfile?.role) {
      router.replace('/(auth)/role-selection');
    } else if (userProfile?.role === 'supervisor') {
      router.replace('/(supervisor)/(tabs)/home');
    } else {
      router.replace('/(main)/(tabs)/home');
    }
  }, [loading, profileLoaded, user, userProfile]);

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