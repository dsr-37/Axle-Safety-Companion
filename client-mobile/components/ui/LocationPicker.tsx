import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { ClayTheme } from '../../constants/Colors';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

interface LocationSelection {
  stateId?: string;
  stateName?: string;
  coalfieldId?: string;
  coalfieldName?: string;
  mineId?: string;
  mineName?: string;
}

interface Props {
  onChange: (sel: LocationSelection) => void;
  value?: LocationSelection;
}

export const LocationPicker: React.FC<Props> = ({ onChange, value }) => {
  const [states, setStates] = useState<any[]>([]);
  const [coalfields, setCoalfields] = useState<any[]>([]);
  const [mines, setMines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openField, setOpenField] = useState<'state' | 'coalfield' | 'mine' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'locations'));
        const arr: any[] = [];
        snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }));
        setStates(arr);
      } catch {
        console.warn('Failed to load states for LocationPicker');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // when state selected, load its coalfields
    const loadCoalfields = async () => {
      setCoalfields([]);
      setMines([]);
      if (!value?.stateId) return;
      try {
        const snap = await getDocs(collection(db, `locations/${value.stateId}/coalfields` as any));
        const arr: any[] = [];
        snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }));
        setCoalfields(arr);
      } catch {
        console.warn('Failed to load coalfields');
      }
    };
    loadCoalfields();
  }, [value?.stateId]);

  useEffect(() => {
    // when coalfield selected, load mines
    const loadMines = async () => {
      setMines([]);
      if (!value?.stateId || !value?.coalfieldId) return;
      try {
        const snap = await getDocs(collection(db, `locations/${value.stateId}/coalfields/${value.coalfieldId}/mines` as any));
        const arr: any[] = [];
        snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }));
        setMines(arr);
      } catch {
        console.warn('Failed to load mines');
      }
    };
    loadMines();
  }, [value?.coalfieldId, value?.stateId]);

  if (loading) return <ActivityIndicator color={ClayTheme.primary} />;

  const SimpleSelect: React.FC<{
    label: string;
    items: { id: string; name: string }[];
    placeholder?: string;
    selectedId?: string | undefined;
    enabled?: boolean;
    onSelect: (id?: string) => void;
  }> = ({ label, items, placeholder, selectedId, enabled = true, onSelect }) => {
    const selected = items.find(i => i.id === selectedId);
    const fieldKey = label === 'State' ? 'state' : label === 'Coalfield' ? 'coalfield' : 'mine';
    const open = openField === fieldKey;
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={[styles.selectBox, !enabled && styles.disabled]}
          disabled={!enabled}
          onPress={() => setOpenField(open ? null : (fieldKey as any))}
        >
          <Text>{selected?.name ?? placeholder ?? `Select a ${label.toLowerCase()}`}</Text>
        </TouchableOpacity>

        {open ? (
          <View style={styles.dropdownPanel}>
            {items && items.length ? (
              <ScrollView contentContainerStyle={{ paddingVertical: 4 }} nestedScrollEnabled>
                {items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.option}
                    onPress={() => {
                      onSelect(item.id);
                      setOpenField(null);
                    }}
                  >
                    <Text>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ padding: 12 }}>No items</Text>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SimpleSelect
        label="State"
        items={states.map(s => ({ id: s.id, name: s.name }))}
        selectedId={value?.stateId}
        onSelect={(id) => {
          const s = states.find(x => x.id === id);
          onChange({ stateId: id, stateName: s?.name || '', coalfieldId: undefined, coalfieldName: undefined, mineId: undefined, mineName: undefined });
        }}
      />

      <SimpleSelect
        label="Coalfield"
        items={coalfields.map(c => ({ id: c.id, name: c.name }))}
        selectedId={value?.coalfieldId}
        enabled={!!value?.stateId}
        onSelect={(id) => {
          const c = coalfields.find(x => x.id === id);
          onChange({ ...value, coalfieldId: id, coalfieldName: c?.name || '', mineId: undefined, mineName: undefined });
        }}
      />

      <SimpleSelect
        label="Mine"
        items={mines.map(m => ({ id: m.id, name: m.name }))}
        selectedId={value?.mineId}
        enabled={!!value?.coalfieldId}
        onSelect={(id) => {
          const m = mines.find(x => x.id === id);
          onChange({ ...value, mineId: id, mineName: m?.name || '' });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 12 },
  label: { color: ClayTheme.textOnDark.secondary, marginBottom: 6, fontSize: 14, fontWeight: '600' },
  selectBox: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.6)' },
  disabled: { opacity: 0.4 },
  dropdownPanel: { backgroundColor: '#ffffffe8', borderRadius: 12, marginTop: 6, borderWidth: 1, borderColor: '#ddd', maxHeight: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  option: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
});

export default LocationPicker;
