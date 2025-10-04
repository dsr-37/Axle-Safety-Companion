import { Stack } from 'expo-router';
import { ClayColors } from '../../constants/Colors';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="role-selection" options={{ headerShown: false }} />
    </Stack>
  );
}