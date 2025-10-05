import React, { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Text, ScrollView, InteractionManager } from 'react-native';
import { SignupForm } from '../../components/forms/SignupForm';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { ClayCard } from '../../components/ui/ClayCard';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { ClayColors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigatedRef = useRef(false);
  const [supervisorHint, setSupervisorHint] = useState<string | null>(null);
  const supervisorCheckTimeout = useRef<any>(null);

  const handleSignup = async (data: { name: string; email: string; password: string; location?: any }) => {
    setIsLoading(true);
    try {
      navigatedRef.current = false;
      // register should accept optional metadata including location and supervisor flag
      const { FirestoreService } = await import('../../services/firebase/firestore');
      try {
        // Optional supervisor lookup - we don't need local variable here; registration result will indicate supervisor
        await FirestoreService.getSupervisorDocByEmail(data.email).catch(() => null);
      } catch {
        console.warn('Supervisor lookup during signup failed');
      }
      const result = await register(data.name, data.email, data.password, data.location);

      // if supervisor, ensure mine doc gets this email added
      if (result?.isSupervisor && data.location?.stateId && data.location?.coalfieldId && data.location?.mineId) {
        try {
          await FirestoreService.addSupervisorEmailToMine(data.location.stateId, data.location.coalfieldId, data.location.mineId, data.email);
        } catch {
          console.warn('Failed to add supervisor email to mine doc');
        }
      }
      InteractionManager.runAfterInteractions(() => {
            try {
              if (!navigatedRef.current) {
                navigatedRef.current = true;
                setTimeout(() => {
                  try {
                    if (result?.isSupervisor) {
                      router.replace('/(supervisor)/(tabs)/home' as any);
                    } else {
                      router.replace('/(auth)/role-selection');
                    }
                  } catch {
                    console.error('Navigation error after signup (delayed):');
                  }
                }, 250);
              }
            } catch {
              console.error('Navigation error after signup:');
            }
      });
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Unable to create account');
    } finally {
      setIsLoading(false);
    }
  };

    const onEmailChange = async (email: string) => {
      // debounce rapid typing
      if (supervisorCheckTimeout.current) clearTimeout(supervisorCheckTimeout.current);
      supervisorCheckTimeout.current = setTimeout(async () => {
        try {
          const { FirestoreService } = await import('../../services/firebase/firestore');
          const sup = await FirestoreService.getSupervisorDocByEmail(email);
          if (sup) {
            setSupervisorHint(`This email is registered as a supervisor`);
          } else {
            setSupervisorHint(null);
          }
        } catch {
          console.warn('Supervisor lookup failed:');
          setSupervisorHint(null);
        }
      }, 350);
    };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="person-add" size={48} color={ClayColors.white} />
              </View>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Let’s get you set up. You’ll choose a role after this step.</Text>
            </View>

            <ClayCard style={styles.formCard}>
              <SignupForm onSubmit={handleSignup} isLoading={isLoading} onEmailChange={onEmailChange} />
              {supervisorHint ? (
                <Text style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8, textAlign: 'center' }}>{supervisorHint}</Text>
              ) : null}
            </ClayCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 20, paddingVertical: 32 },
  keyboardView: { flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ClayColors.white,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.78)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 32, justifyContent: 'center' },
  formCard: { marginTop: 8, padding: 24, width: '100%' },
});
