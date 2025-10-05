import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { ChecklistItem } from '../../types/common';
import { FirestoreService } from '../../services/firebase/firestore';
import { OfflineSyncService } from '../../services/storage/offlineSync';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  items: ChecklistItem[]; // master list of checklist items for the role
}

export const UserChecklist: React.FC<Props> = ({ items }) => {
  const { userProfile } = useAuth();
  const [markedIds, setMarkedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userProfile) return;
      try {
        const ids = await FirestoreService.getMarkedChecklistIds(userProfile.id);
        if (!mounted) return;
        const map: Record<string, boolean> = {};
        ids.forEach(id => (map[id] = true));
        setMarkedIds(map);
      } catch {
          console.warn('Failed to load marked ids:');
        } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userProfile]);

  const toggle = async (item: ChecklistItem) => {
    if (!userProfile) return;
    const currently = !!markedIds[item.id];
    const next = !currently;
    // optimistic UI
    setMarkedIds(prev => ({ ...prev, [item.id]: next }));

    try {
      if (next) {
        await FirestoreService.markChecklistItem(userProfile.id, item.id);
      } else {
        await FirestoreService.unmarkChecklistItem(userProfile.id, item.id);
      }
    } catch {
      // enqueue for offline sync
      try {
        await OfflineSyncService.addToQueue({ type: 'checklist_item', data: { userId: userProfile.id, checklistId: item.id, action: next ? 'mark' : 'unmark' } });
      } catch {
        console.error('Failed to queue checklist action');
      }
    }
  };

  if (loading) return <ActivityIndicator />;

  return (
    <FlatList
      data={items}
      keyExtractor={i => i.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => toggle(item)}>
          <View style={[styles.checkbox, markedIds[item.id] ? styles.checked : null]}>
            {markedIds[item.id] ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>{item.title}</Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
          </View>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  checkbox: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checked: { backgroundColor: '#2fb56a', borderColor: '#2fb56a' },
  checkMark: { color: '#fff', fontWeight: '700' },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  desc: { fontSize: 13, color: '#666' },
});
