import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';
import { OfflineProvider } from '../contexts/OfflineContext';
import { ClayColors } from '../constants/Colors';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useEffect } from 'react';
import SosPulseOverlay from '../components/ui/SosPulseOverlay';

export default function RootLayout() {
  useEffect(() => {
    // no-op: removed development global error handler to tidy up debug scaffolding
  }, []);
  return (
    <ErrorBoundary>
      <AuthProvider>
        <UserProvider>
          <OfflineProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(main)" />
            </Stack>
            <StatusBar style="dark" backgroundColor={ClayColors.lightGray} />
            <SosPulseOverlay />
          </OfflineProvider>
        </UserProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}