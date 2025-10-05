import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ClayCard } from '../../../components/ui/ClayCard';
import { ClayButton } from '../../../components/ui/ClayButton';
import { ClayInput } from '../../../components/ui/ClayInput';
import { GradientBackground } from '../../../components/ui/GradientBackground';
import { ClayColors, ClayTheme } from '../../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
// Use the legacy FileSystem import to avoid the deprecation warning for
// getContentUriAsync while keeping the existing API surface. This avoids
// pulling in new filesystem APIs or extra dependencies right now.
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

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
    } catch {
      console.error('Failed to update profile');
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
            } catch {
              console.error('Failed to logout');
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
             
            console.debug('[SafeTextWrap] wrapping primitive child', { value: String(node), key, stack });
          }
        } catch {
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
              title="Guidelines"
              variant="primary"
              onPress={async () => {
                // Open bundled PDF (assets/documents/rules.pdf) in external PDF app
                // Strategy (no new deps):
                // 1. Ensure we have a stable file path inside the app cache (cacheDirectory).
                // 2. On Android, ask FileSystem for a content:// URI for that cached file and open it.
                // 3. On iOS, attempt Linking.openURL(fileUri).
                // 4. If any step fails, show a helpful Alert that explains where the file is cached.
                try {
                  const asset = Asset.fromModule(require('../../../assets/documents/rules.pdf'));
                  // Ensure the asset is downloaded first. Some devices may not populate localUri.
                  await asset.downloadAsync();

                  // Prefer the localUri if available; otherwise, copy/download into cacheDirectory
                  let localPath = asset.localUri ?? asset.uri;

                  // If the resolved URI is remote (http) or missing, explicitly download to cache
                  const filename = 'rules.pdf';
                  const cachedDest = FileSystem.cacheDirectory + filename;

                  if (!localPath || localPath.startsWith('http') || localPath.indexOf('file:') === -1) {
                    try {
                      // downloadAsync will write into the app cache directory
                      const res = await FileSystem.downloadAsync(asset.uri, cachedDest);
                      localPath = res.uri;
                    } catch (dlErr) {
                      console.warn('PDF download to cache failed, falling back to asset URI', dlErr);
                      // leave localPath as-is (asset.uri) and continue
                    }
                  }

                  // Now we should have a file:// path (localPath) pointing into app storage
                  if (Platform.OS === 'android') {
                    try {
                      // Use FileSystem.getContentUriAsync on the cached file so external apps can read it.
                      const contentUri = await FileSystem.getContentUriAsync(localPath);
                      const can = await Linking.canOpenURL(contentUri);
                      if (can) {
                        await Linking.openURL(contentUri);
                        return;
                      }
                      // If Linking reports it cannot open, continue to fallback
                    } catch (err) {
                      // getContentUriAsync is not guaranteed to succeed on every device or file path.
                      console.warn('getContentUriAsync/openURL failed for PDF:', err);
                    }

                    // If we reach here, opening via content URI didn't work — show friendly guidance
                    Alert.alert(
                      'Open PDF',
                      'Unable to open PDF directly on this device. The file has been saved to the app cache at:\n\n' +
                        `${cachedDest}\n\n` +
                        'You can open it using a file manager or install a PDF viewer app.'
                    );
                    return;
                  }

                  // iOS / other: try opening the local file:// URI
                  try {
                    const can = await Linking.canOpenURL(localPath);
                    if (can) {
                      await Linking.openURL(localPath);
                    } else {
                      Alert.alert('Open PDF', 'No app available to open PDFs on this device.');
                    }
                  } catch (err) {
                    console.error('Failed to open rules PDF (final):', err);
                    Alert.alert('Open PDF', 'Unable to open the PDF.');
                  }
                } catch (err) {
                  console.error('Failed to open rules PDF:', err);
                  Alert.alert('Open PDF', 'Unable to open the PDF.');
                }
              }}
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