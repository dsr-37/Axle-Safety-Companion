import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="hazard-report" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="emergency-sos" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}