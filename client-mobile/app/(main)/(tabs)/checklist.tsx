import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClayCard } from '../../../components/ui/ClayCard';
import { ClayButton } from '../../../components/ui/ClayButton';
import { ClayCheckbox } from '../../../components/ui/ClayCheckbox';
import { ClayColors, ClayTheme } from '../../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';
import { ROLE_CHECKLISTS, ChecklistItem } from '../../../constants/Checklists';
import { StorageService } from '../../../services/storage/asyncStorage';
import { FirestoreService } from '../../../services/firebase/firestore';
import { OfflineSyncService } from '../../../services/storage/offlineSync';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../../components/ui/GradientBackground';

export default function ChecklistScreen() {
  const { userProfile } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadTodaysChecklist = useCallback(async () => {
    if (!userProfile?.role) return;

    try {
      const today = new Date().toDateString();
      const storageKey = `checklist_${userProfile.id}_${today}`;

      // Try to load saved progress
      const savedChecklist = await StorageService.getItem(storageKey);

      if (savedChecklist) {
        const parsedChecklist = JSON.parse(savedChecklist) as ChecklistItem[];
        setChecklist(parsedChecklist);
        setCompletedCount(parsedChecklist.filter(item => item.completed).length);
      } else {
        // Load fresh checklist for user's role (case-insensitive match). Fallback to 'general'.
        const roleKey = (userProfile.role || '').toString().toLowerCase();
        const roleChecklist = ROLE_CHECKLISTS[roleKey] || ROLE_CHECKLISTS['general'] || [];
        setChecklist([...roleChecklist]);
        setCompletedCount(0);
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.role, userProfile?.id]);

  useEffect(() => {
    loadTodaysChecklist();
  }, [loadTodaysChecklist]);

  const saveChecklistProgress = async (updatedChecklist: ChecklistItem[]) => {
    try {
      const today = new Date().toDateString();
      const storageKey = `checklist_${userProfile?.id}_${today}`;
      await StorageService.setItem(storageKey, JSON.stringify(updatedChecklist));
    } catch (error) {
      console.error('Error saving checklist:', error);
    }
  };

  const toggleChecklistItem = async (itemId: string) => {
    const updatedChecklist = checklist.map(item => {
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    setChecklist(updatedChecklist);
    const newCompletedCount = updatedChecklist.filter(item => item.completed).length;
    setCompletedCount(newCompletedCount);

    // Save progress
    await saveChecklistProgress(updatedChecklist);

    // Persist single-item change to Firestore (optimistic local update above)
    if (!userProfile) return;
    try {
      const toggled = updatedChecklist.find(i => i.id === itemId);
      if (!toggled) return;
      if (toggled.completed) {
        await FirestoreService.markChecklistItem(userProfile.id, itemId);
      } else {
        await FirestoreService.unmarkChecklistItem(userProfile.id, itemId);
      }
    } catch (err) {
      // Log the persistence error and attempt to enqueue for offline sync
      console.warn('Checklist item persistence failed, will attempt to queue:', err);
      try {
        const isCompleted = updatedChecklist.find(i => i.id === itemId)?.completed ?? false;
        await OfflineSyncService.addToQueue({ type: 'checklist_item', data: { userId: userProfile.id, checklistId: itemId, action: isCompleted ? 'mark' : 'unmark' } });
      } catch (queueErr) {
        console.error('Failed to queue checklist action:', queueErr);
      }
    }

    // Show completion message when all items are checked
    if (newCompletedCount === updatedChecklist.length && newCompletedCount > 0) {
      Alert.alert(
        'Checklist Complete! 🎉',
  'Great job! You’ve completed all your safety checks for today.',
        [{ text: 'Awesome!', style: 'default' }]
      );
    }
  };

  const getCompletionPercentage = () => {
    if (checklist.length === 0) return 0;
    return Math.round((completedCount / checklist.length) * 100);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return ClayColors.error;
      case 'medium': return ClayColors.warning;
      case 'low': return ClayColors.success;
      default: return ClayColors.darkGray;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return 'alert-circle';
      case 'medium': return 'warning';
      case 'low': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Ionicons name="refresh" size={32} color={ClayColors.white} />
            <Text style={styles.loadingText}>Loading your checklist...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Daily Safety Checklist</Text>
            <Text style={styles.roleText}>Role: {userProfile?.role || 'Not set'}</Text>
          </View>

          <ClayCard style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Today’s Progress</Text>
              <Text style={styles.progressPercentage}>{getCompletionPercentage()}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${getCompletionPercentage()}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {completedCount} of {checklist.length} items completed
            </Text>
          </ClayCard>

          <View style={styles.checklistContainer}>
            {checklist.map((item) => (
              <ClayCard key={item.id} style={styles.checklistItem}>
                <View style={styles.itemHeader}>
                  <ClayCheckbox
                    value={item.completed}
                    onValueChange={() => toggleChecklistItem(item.id)}
                    color={item.completed ? ClayColors.success : ClayColors.gray}
                  />
                  <View style={styles.itemContent}>
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemTitle, item.completed && styles.completedItemTitle]}>
                        {item.title}
                      </Text>
                      <View style={styles.priorityBadge}>
                        <Ionicons
                          name={getPriorityIcon(item.priority) as any}
                          size={16}
                          color={getPriorityColor(item.priority)}
                        />
                      </View>
                    </View>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    <View style={styles.itemFooter}>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                      <Text style={styles.itemPriority}>{item.priority} priority</Text>
                    </View>
                  </View>
                </View>
              </ClayCard>
            ))}
          </View>

          <View style={styles.actionContainer}>
            {completedCount === checklist.length && checklist.length > 0 ? (
              <ClayCard style={styles.completionCard}>
                <Ionicons name="checkmark-circle" size={48} color={ClayColors.success} />
                <Text style={styles.completionText}>All Done! 🎉</Text>
                <Text style={styles.completionSubtext}>
                  You’ve completed all safety checks for today. Stay safe!
                </Text>
              </ClayCard>
            ) : (
              <ClayButton
                title="Mark All as Complete"
                variant="primary"
                onPress={() => {
                  Alert.alert(
                    'Mark All Complete',
                    'Are you sure you want to mark all remaining items as complete?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Mark Complete',
                        onPress: () => {
                          const allCompleted = checklist.map(item => ({ ...item, completed: true }));
                          setChecklist(allCompleted);
                          setCompletedCount(allCompleted.length);
                          saveChecklistProgress(allCompleted);

                          // Persist bulk marks to Firestore; enqueue if fails
                          (async () => {
                            try {
                              const ids = allCompleted.map(i => i.id);
                              if (userProfile) {
                                // FirestoreService may not have bulk helpers; fallback to parallel single-item calls
                                await Promise.all(ids.map(iid => FirestoreService.markChecklistItem(userProfile.id, iid)));
                              }
                            } catch (err) {
                              console.warn('Bulk mark failed, enqueueing for offline sync:', err);
                              try {
                                await OfflineSyncService.addToQueue({ type: 'checklist', data: { userId: userProfile?.id, date: new Date().toDateString(), checklist: allCompleted } });
                              } catch (queueErr) {
                                console.error('Failed to queue bulk checklist action:', queueErr);
                              }
                            }
                          })();
                        }
                      }
                    ]
                  );
                }}
              />
            )}

            <ClayButton
              title="Reset Checklist"
              variant="secondary"
              style={styles.resetButton}
              onPress={() => {
                Alert.alert(
                  'Reset Checklist',
                  'This will uncheck all items. Are you sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: () => {
                        const resetChecklist = checklist.map(item => ({ ...item, completed: false }));
                        setChecklist(resetChecklist);
                        setCompletedCount(0);
                        saveChecklistProgress(resetChecklist);

                        (async () => {
                            try {
                            const ids = resetChecklist.map(i => i.id);
                            if (userProfile) {
                              // Use parallel single-item unmark calls
                              await Promise.all(ids.map(iid => FirestoreService.unmarkChecklistItem(userProfile.id, iid)));
                            }
                          } catch (err) {
                            console.warn('Bulk reset failed, enqueueing for offline sync:', err);
                            try {
                              await OfflineSyncService.addToQueue({ type: 'checklist', data: { userId: userProfile?.id, date: new Date().toDateString(), checklist: resetChecklist } });
                            } catch (queueErr) {
                              console.error('Failed to queue bulk checklist reset action:', queueErr);
                            }
                          }
                        })();
                      }
                    }
                  ]
                );
              }}
            />
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: ClayTheme.textOnDark.secondary,
    marginTop: 12,
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ClayTheme.textOnDark.primary,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: ClayTheme.textOnDark.secondary,
    textTransform: 'capitalize',
  },
  progressCard: {
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: ClayTheme.textOnDark.primary,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ClayColors.mint,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: ClayColors.mint,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: ClayTheme.textOnDark.secondary,
  },
  checklistContainer: {
    gap: 12,
  },
  checklistItem: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ClayTheme.textOnDark.primary,
    flex: 1,
  },
  completedItemTitle: {
    textDecorationLine: 'line-through',
    color: ClayTheme.textOnDark.muted,
  },
  itemDescription: {
    fontSize: 14,
    color: ClayTheme.textOnDark.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCategory: {
    fontSize: 12,
    color: ClayColors.mint,
    fontWeight: '500',
  },
  itemPriority: {
    fontSize: 12,
    color: ClayTheme.textOnDark.muted,
    textTransform: 'capitalize',
  },
  priorityBadge: {
    marginLeft: 8,
  },
  actionContainer: {
    gap: 12,
  },
  completionCard: {
    alignItems: 'center',
    padding: 32,
  },
  completionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ClayColors.success,
    marginTop: 12,
    marginBottom: 8,
  },
  completionSubtext: {
    fontSize: 14,
    color: ClayTheme.textOnDark.secondary,
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 12,
  },
});