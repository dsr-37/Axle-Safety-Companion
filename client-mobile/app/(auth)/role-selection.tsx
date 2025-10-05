import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ClayButton } from '../../components/ui/ClayButton';
import { ClayCard } from '../../components/ui/ClayCard';
import { ClayColors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { WORKER_ROLES } from '../../constants/Roles';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../components/ui/GradientBackground';

export default function RoleSelectionScreen() {
  const { updateUserProfile } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileCTA, setShowProfileCTA] = useState(false);

  const handleRoleSelection = async () => {
    if (!selectedRole) {
      Alert.alert('Role Required', 'Please select your role to continue.');
      return;
    }

    setIsLoading(true);
    try {
      await updateUserProfile({ role: selectedRole });
      // Show a safe confirmation CTA — user will tap to go to Profile. This avoids navigation races.
      setShowProfileCTA(true);
    } catch {
      Alert.alert('Error', 'Failed to update role. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goToProfile = () => {
    try {
      setShowProfileCTA(false);
      router.replace('/(main)/(tabs)/home');
    } catch (err) {
      console.error('Failed to navigate to profile from CTA:', err);
      Alert.alert('Navigation Error', 'Unable to open profile. Please try from the app menu.');
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Ionicons name="person-circle" size={48} color={ClayColors.white} />
            </View>
            <Text style={styles.title}>Select Your Role</Text>
            <Text style={styles.subtitle}>Choose your job role for personalized safety checklists.</Text>
          </View>

          <View style={styles.rolesContainer}>
            {WORKER_ROLES.map((role) => (
              <ClayCard
                key={role.id}
                style={StyleSheet.flatten([
                  styles.roleCard,
                  selectedRole === role.id && styles.selectedRoleCard
                ])}
                onPress={() => setSelectedRole(role.id)}
              >
                <View style={styles.roleHeader}>
                  <Ionicons
                    name={role.icon as any}
                    size={32}
                    color={selectedRole === role.id ? ClayColors.mintLight : ClayColors.white}
                  />
                  <Text
                    style={[
                      styles.roleTitle,
                      selectedRole === role.id && styles.selectedRoleTitle
                    ]}
                  >
                    {role.title}
                  </Text>
                </View>
                <Text style={styles.roleDescription}>{role.description}</Text>
                {selectedRole === role.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color={ClayColors.success} />
                  </View>
                )}
              </ClayCard>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <ClayButton
              title={isLoading ? "Setting up..." : "Continue"}
              variant="primary"
              size="large"
              onPress={handleRoleSelection}
              disabled={!selectedRole || isLoading}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
      <Modal visible={showProfileCTA} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Role updated</Text>
            <Text style={styles.modalMessage}>Role Saved. Redirect to Home?</Text>
            <View style={{ width: '100%', marginTop: 12 }}>
              <ClayButton title="Go to Home" onPress={goToProfile} />
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ClayColors.white,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.78)',
    textAlign: 'center',
    lineHeight: 22,
  },
  rolesContainer: {
    marginBottom: 32,
  },
  roleCard: {
    marginBottom: 16,
    padding: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  selectedRoleCard: {
    borderWidth: 2,
    borderColor: ClayColors.mintLight,
    backgroundColor: 'rgba(58, 217, 177, 0.15)',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: ClayColors.white,
    marginLeft: 12,
  },
  selectedRoleTitle: {
    color: ClayColors.mintLight,
  },
  roleDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 20,
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  buttonContainer: {
    paddingBottom: 32,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: ClayColors.white,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ClayColors.black,
  },
  modalMessage: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(0,0,0,0.8)',
    textAlign: 'center',
  },
});