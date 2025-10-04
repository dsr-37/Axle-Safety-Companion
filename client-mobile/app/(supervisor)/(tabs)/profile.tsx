import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ClayCard } from '../../../components/ui/ClayCard';
import { ClayButton } from '../../../components/ui/ClayButton';
import { ClayInput } from '../../../components/ui/ClayInput';
import { GradientBackground } from '../../../components/ui/GradientBackground';
import { ClayColors, ClayTheme } from '../../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const SPACING = 20;

export default function SupervisorProfileScreen() {
  const { userProfile, updateUserProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const [editForm, setEditForm] = useState({
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

  const supervisorRoleInfo = {
    icon: 'shield-checkmark-outline',
    title: 'Supervisor',
    description: 'Oversees site safety, manages hazard reports, and monitors team compliance.'
  };

  // Dev helper: recursively wrap any raw string/number children in <Text> to avoid RN console error
  // "Text strings must be rendered within a <Text> component." This preserves original layout
  // and only affects screens during development.
  const SafeTextWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // parentIsText indicates whether the current traversal context is inside a <Text> element
    const wrap = (node: any, key?: any, parentIsText = false): any => {
      if (node === null || node === undefined || typeof node === 'boolean') return node;

      // If node is primitive and we're already inside a Text, it's fine — don't wrap or log
      if ((typeof node === 'string' || typeof node === 'number') && parentIsText) {
        return node;
      }

      if (typeof node === 'string' || typeof node === 'number') {
        // Dev logging to help identify which component is yielding raw text that would otherwise be
        // a direct child of a non-Text element (this is the real problematic case)
        try {
          if ((global as any).__DEV__) {
            const stack = new Error().stack?.split('\n').slice(2, 6).join('\n');
            // eslint-disable-next-line no-console
            console.debug('[SafeTextWrap] wrapping primitive child', { value: String(node), key, stack });
          }
        } catch (e) {
          // ignore logging errors in dev helper
        }
        return <Text key={key}>{String(node)}</Text>;
      }

      if (Array.isArray(node)) return node.map((n, i) => wrap(n, i, parentIsText));

      if (React.isValidElement(node)) {
        // If the element has children, recursively wrap them. Detect if this element is a Text
        // so children inside it are treated as parentIsText = true.
        const props: any = (node as any).props || {};
        const isTextElement = (node.type === Text) || (node.type && (node.type as any).displayName === 'Text');
        const wrappedChildren = props.children ? wrap(props.children, undefined, !!isTextElement) : props.children;
        // Preserve element and props
        return React.cloneElement(node as any, { ...(node as any).props, key: (node as any).key ?? key }, wrappedChildren);
      }

      return node;
    };

    return <>{wrap(children)}</>;
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <SafeTextWrap>
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={80} color={ClayColors.mintProfile} />
            </View>
            <Text style={[styles.userName, { fontSize: 28 }]}>{userProfile?.name || 'Supervisor'}</Text>
            <Text style={[styles.userRole, { fontSize: 18 }]}>{supervisorRoleInfo.title}</Text>
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
                    setEditForm({ phoneNumber: userProfile?.phoneNumber || '' });
                  }
                  setIsEditing(!isEditing);
                }}
              />
            </View>

            {isEditing ? (
              <View style={styles.editForm}>
                {/* ONLY PHONE NUMBER IS EDITABLE */}
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
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{userProfile?.email || 'Not set'}</Text> {/* <-- NOW THIS WILL WORK */}
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { marginTop: -20 }]}>Department</Text>
                  <Text style={styles.infoValue}>{'Site Supervision'}</Text> 
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{userProfile?.phoneNumber || 'Not set'}</Text>
                    </View>
                  </View>
                )}
          </ClayCard>

              </SafeTextWrap>

          <ClayCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { textAlign: 'center', fontSize: 22 }]}>Roles & Responsibilities</Text>
            </View>
            <View style={styles.roleInfo}>
              <View style={styles.roleHeader}>
                <Ionicons name={supervisorRoleInfo.icon as any} size={32} color={ClayColors.mint} />
                <Text style={styles.roleTitle}>{supervisorRoleInfo.title}</Text>
              </View>
              <Text style={[styles.roleDescription, { fontSize: 15 }]}>{supervisorRoleInfo.description}</Text>
            </View>
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
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

// NOTE: Most styles are reused from the original profile screen for consistency
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
    justifyContent: 'space-between',
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
    gap: 16,
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
    marginTop: 12,
    justifyContent: 'space-between',
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