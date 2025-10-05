import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, InteractionManager, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ClayCard } from '../../components/ui/ClayCard';
import { LoginForm } from '../../components/forms/LoginForm';
// auth import intentionally removed; Auth operations are via AuthContext
import { ClayColors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../components/ui/GradientBackground';

export default function LoginScreen() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigatedRef = useRef(false);

  const handleLogin = async (credentials: { email: string; password: string; location?: any }) => {
    setIsLoading(true);
    navigatedRef.current = false;
    try {
      const result = await login(credentials.email, credentials.password, credentials.location);
      InteractionManager.runAfterInteractions(() => {
        try {
          if (!navigatedRef.current) {
            navigatedRef.current = true;
            // small delay to allow auth state propagation and avoid router race conditions
            setTimeout(() => {
              try {
                if (result?.isSupervisor) {
                  // Redirect supervisors to supervisor tabs home. Cast to any because route types
                  // are generated and may not include dynamic group paths in this build step.
                  router.replace('/(supervisor)/(tabs)/home' as any);
                } else {
                  router.replace('/(main)/(tabs)/home');
                }
              } catch {
                console.error('Navigation error after login (delayed):');
              }
            }, 250);
          }
        } catch {
          console.error('Navigation error after login:');
        }
      });
    } catch (error: any) {
      Alert.alert('Login Failed', 'Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} keyboardDismissMode="interactive">
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="shield-checkmark" size={48} color={ClayColors.white} />
              </View>
              <Text style={styles.title}>Mining Safety Companion</Text>
              <Text style={styles.subtitle}>Your safety partner underground</Text>
            </View>

            <ClayCard style={styles.formCard}>
              <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
            </ClayCard>

            <View style={styles.signupRow}>
              <Text style={styles.noAccountText}>New here?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')} activeOpacity={0.7}>
                <Text style={styles.signupButton}>Create an account</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(19, 203, 123, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ClayColors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.78)',
    textAlign: 'center',
  },
  formCard: {
    marginBottom: 20,
    padding: 24,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  noAccountText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: 8,
  },
  signupButton: {
    fontSize: 13,
    color: ClayColors.white,
    fontWeight: '600',
  },
});