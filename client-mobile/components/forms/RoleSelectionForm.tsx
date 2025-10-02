import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ClayCard } from '../ui/ClayCard';
import { ClayColors, ClayTheme } from '../../constants/Colors';
import { WORKER_ROLES } from '../../constants/Roles';
import { Ionicons } from '@expo/vector-icons';

interface RoleSelectionFormProps {
  onRoleSelect: (roleId: string) => void;
  selectedRole?: string;
}

export const RoleSelectionForm: React.FC<RoleSelectionFormProps> = ({
  onRoleSelect,
  selectedRole
}) => {
  return (
    <View style={styles.container}>
  <Text style={styles.title}>What’s Your Role?</Text>
      <Text style={styles.subtitle}>
        Select your job role to get personalized safety checklists and content
      </Text>

      <ScrollView style={styles.rolesList} showsVerticalScrollIndicator={false}>
        {WORKER_ROLES.map((role) => (
          <ClayCard
            key={role.id}
            style={StyleSheet.flatten([
              styles.roleCard,
              selectedRole === role.id && styles.selectedRole
            ])}
            onPress={() => onRoleSelect(role.id)}
          >
            <View style={styles.roleContent}>
              <View style={styles.roleIcon}>
                <Ionicons 
                  name={role.icon as any} 
                  size={28} 
                  color={selectedRole === role.id ? ClayColors.white : ClayColors.mint} 
                />
              </View>
              <View style={styles.roleInfo}>
                <Text style={[
                  styles.roleTitle,
                  selectedRole === role.id && styles.selectedRoleTitle
                ]}>
                  {role.title}
                </Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </View>
              {selectedRole === role.id && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color={ClayColors.white} />
                </View>
              )}
            </View>
          </ClayCard>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ClayTheme.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: ClayTheme.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  rolesList: {
    flex: 1,
  },
  roleCard: {
    marginBottom: 12,
    padding: 16,
  },
  selectedRole: {
    backgroundColor: ClayColors.mint,
    borderWidth: 2,
    borderColor: ClayColors.mintDark,
  },
  roleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ClayColors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: ClayTheme.text.primary,
    marginBottom: 4,
  },
  selectedRoleTitle: {
    color: ClayColors.white,
  },
  roleDescription: {
    fontSize: 12,
    color: ClayTheme.text.secondary,
    lineHeight: 16,
  },
  checkmark: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});