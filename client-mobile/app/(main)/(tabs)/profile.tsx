import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ClayCard } from '../../../components/ui/ClayCard';
import { ClayButton } from '../../../components/ui/ClayButton';
import { ClayInput } from '../../../components/ui/ClayInput';
import { ClayModal } from '../../../components/ui/ClayModal';
import { GradientBackground } from '../../../components/ui/GradientBackground';
import { ClayColors, ClayTheme } from '../../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';
import { WORKER_ROLES } from '../../../constants/Roles';
import { Ionicons } from '@expo/vector-icons';

const SPACING = 20;

export default function ProfileScreen() {
  const { userProfile, updateUserProfile, logout, deleteAccount } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: userProfile?.name || '',
    employeeId: userProfile?.employeeId || '',
    phoneNumber: userProfile?.phoneNumber || '',
  });

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile(editForm);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Failed to logout', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Role can no longer be changed from profile. Users must delete account and re-signup.

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmDelete = () => setDeleteModalVisible(true);

  const performDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount(deletePassword);
      // Show success and navigate to signup after 250ms
      Alert.alert('Account Deleted', 'Your account has been deleted. You will be redirected to Sign Up.');
      setTimeout(() => router.replace('/(auth)/signup'), 250);
    } catch (err: any) {
      console.error('Delete account failed', err);
      Alert.alert('Delete Failed', err.message || 'Unable to delete account. Please check your password and try again.');
    } finally {
      setIsDeleting(false);
      setDeletePassword('');
      setDeleteModalVisible(false);
    }
  };

  const getRoleInfo = () => {
    return WORKER_ROLES.find(role => role.id === userProfile?.role);
  };

  const roleInfo = getRoleInfo();

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={80} color={ClayColors.mintProfile} />
            </View>
            <Text style={[styles.userName, { fontSize: 28 }]}>{userProfile?.name || 'Worker'}</Text>
            <Text style={[styles.userRole, { fontSize: 18 }]}>{roleInfo?.title || userProfile?.role || 'Crew Member'}</Text>
          </View>

          <ClayCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { textAlign: 'center', fontSize: 22 }]}>Personal Information</Text>
            <ClayButton
              title={isEditing ? 'Cancel' : 'Edit'}
              variant="primary"
              size="small"
              fullWidth={false}
              style={styles.sectionAction}
              onPress={() => {
                if (isEditing) {
                  setEditForm({
                    name: userProfile?.name || '',
                    employeeId: userProfile?.employeeId || '',
                    phoneNumber: userProfile?.phoneNumber || '',
                  });
                }
                setIsEditing(!isEditing);
              }}
            />
          </View>

            {isEditing ? (
              <View style={styles.editForm}>
                <ClayInput
                  label="Full Name"
                  value={editForm.name}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                  placeholder="Enter your full name"
                />
                <ClayInput
                  label="Employee ID"
                  value={editForm.employeeId}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, employeeId: text }))}
                  placeholder="Enter your employee ID"
                />
                <ClayInput
                  label="Phone Number"
                  value={editForm.phoneNumber}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, phoneNumber: text }))}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
                <ClayButton
                  title="Save Changes"
                  variant="primary"
                  onPress={handleSaveProfile}
                  style={styles.saveButton}
                />
              </View>
            ) : (
              <View style={styles.infoList}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Full Name</Text>
                  <Text style={styles.infoValue}>{userProfile?.name || 'Not set'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Employee ID</Text>
                  <Text style={styles.infoValue}>{userProfile?.employeeId || 'Not set'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{userProfile?.phoneNumber || 'Not set'}</Text>
                </View>
              </View>
            )}
          </ClayCard>

          <ClayCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { textAlign: 'center', fontSize: 22 }]}>Roles & Responsibilities</Text>
          </View>
          
          {roleInfo && (
            <View style={styles.roleInfo}>
              <View style={styles.roleHeader}>
                <Ionicons name={roleInfo.icon as any} size={32} color={ClayColors.mint} />
                <Text style={styles.roleTitle}>{roleInfo.title}</Text>
              </View>
              <Text style={[styles.roleDescription, { fontSize: 15 }]}>{roleInfo.description}</Text>
            </View>
          )}
          <Text style={[styles.roleNotice, { marginTop: -2, fontSize: 13 }]}>
            To change your role you must delete your account and sign up again with the same email.
          </Text>
        </ClayCard>

          <ClayCard style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { textAlign: 'center', fontSize: 22 }]}>App Preferences</Text>
          
          <View style={styles.preferenceList}>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceTitle}>Notification</Text>
                <Text style={styles.preferenceDescription}>Daily reminders and alerts</Text>
              </View>
              <ClayButton
                title="Settings"
                variant="primary"
                size="small"
                fullWidth={false}
                style={styles.inlineAction}
                onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon.')}
              />
            </View>

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceTitle}>Language</Text>
                <Text style={styles.preferenceDescription}>App language preference</Text>
              </View>
              <ClayButton
                title="English"
                variant="primary"
                size="small"
                fullWidth={false}
                style={styles.inlineAction}
                onPress={() => Alert.alert('Coming Soon', 'Multiple languages will be available soon.')}
              />
            </View>

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceTitle}>Offline Mode</Text>
                <Text style={styles.preferenceDescription}>Data usage and sync settings</Text>
              </View>
              <ClayButton
                title="Auto"
                variant="primary"
                size="small"
                fullWidth={false}
                style={styles.inlineAction}
                onPress={() => Alert.alert('Coming Soon', 'Offline settings will be available soon.')}
              />
            </View>
          </View>
          </ClayCard>

          <ClayCard style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { textAlign: 'center', fontSize: 22 }]}>App Information</Text>
          
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>2.0.0</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Build By</Text>
              <Text style={styles.infoValue}>Team: Crowd-Sync</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>{new Date().toLocaleDateString()}</Text>
            </View>
          </View>

          <View style={styles.appActions}>
            <ClayButton
              title="Help & Support"
              variant="primary"
              onPress={() => Alert.alert('Help', 'Contact your supervisor or IT support for assistance.')}
              style={styles.appActionButton}
            />
            <ClayButton
              title="About"
              variant="primary"
              onPress={() => Alert.alert('About', 'Mining Safety Companion v1.0\nBuilt for miner safety and productivity.')}
              style={styles.appActionButton}
            />
          </View>
          </ClayCard>

          <ClayCard style={styles.logoutCard}>
            <ClayButton
              title="Logout"
              variant="secondary"
              size="medium"
              onPress={handleLogout}
              icon={<Ionicons name="log-out" size={20} color={ClayColors.white} />}
            />
          </ClayCard>
          <ClayCard style={[styles.logoutCard, { marginTop: 8 }] }>
            <ClayButton
              title="Delete Account"
              variant="danger"
              size="medium"
              onPress={confirmDelete}
              icon={<Ionicons name="trash" size={18} color={ClayColors.white} />}
            />
          </ClayCard>

          {deleteModalVisible && (
            <ClayModal visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)}>
              <View style={{ gap: 12, backgroundColor: '#272727ff', padding: 25, borderRadius: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: ClayTheme.textOnDark.primary }}>Delete Account</Text>
                <Text style={{ color: ClayTheme.textOnDark.secondary }}>This action is permanent. To delete your account, confirm by entering your password below.</Text>
                <ClayInput label="Password" value={deletePassword} onChangeText={setDeletePassword} secureTextEntry />
                <View style={{ flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <ClayButton title="Cancel" variant="secondary" onPress={() => setDeleteModalVisible(false)} />
                  <ClayButton title={isDeleting ? 'Deleting...' : 'Delete'} variant="danger" onPress={performDelete} />
                </View>
              </View>
            </ClayModal>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: SPACING,
    paddingTop: SPACING + 8,
    paddingBottom: SPACING * 3,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: ClayTheme.textOnDark.primary,
  },
  userRole: {
    fontSize: 16,
    color: ClayTheme.textOnDark.secondary,
    textTransform: 'capitalize',
  },
  sectionCard: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 20,
  },
  sectionHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  sectionAction: {
    alignSelf: 'flex-end',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ClayTheme.textOnDark.primary,
    flex: 1,
  },
  editForm: {
    gap: 12,
  },
  saveButton: {
    marginTop: 4,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: ClayTheme.textOnDark.muted,
  },
  infoValue: {
    fontSize: 16,
    color: ClayTheme.textOnDark.primary,
    fontWeight: '600',
  },
  roleInfo: {
    gap: 12,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ClayTheme.textOnDark.primary,
  },
  roleDescription: {
    fontSize: 14,
    color: ClayTheme.textOnDark.secondary,
    lineHeight: 20,
  },
  roleNotice: {
    marginTop: 8,
    fontSize: 12,
    color: ClayTheme.textOnDark.muted,
    lineHeight: 18,
  },
  preferenceList: {
    gap: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inlineAction: {
    alignSelf: 'flex-end',
  },
  preferenceInfo: {
    flex: 1,
    gap: 4,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ClayTheme.textOnDark.primary,
  },
  preferenceDescription: {
    fontSize: 12,
    color: ClayTheme.textOnDark.muted,
  },
  appActions: {
    flexDirection: 'column',
    gap: 12,
  },
  appActionButton: {
    flex: 1,
  },
  logoutCard: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 16,
    alignItems: 'stretch',
  },
});