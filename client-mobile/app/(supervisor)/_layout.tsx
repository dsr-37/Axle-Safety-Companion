import { Stack } from 'expo-router';
import { ClayColors } from '../../constants/Colors';

export default function SupervisorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="report/[id]"
        options={{
          title: 'Report Detail',
          headerShown: true,
          presentation: 'card',
          headerStyle: { backgroundColor: '#ffd6e7' },
          headerTintColor: ClayColors.black,
        }}
      />
    </Stack>
  );
}
