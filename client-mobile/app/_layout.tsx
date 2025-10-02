import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';
import { OfflineProvider } from '../contexts/OfflineContext';
import { ClayColors } from '../constants/Colors';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    // no-op: removed development global error handler to tidy up debug scaffolding
  }, []);
  return (
    <ErrorBoundary>
      <AuthProvider>
        <UserProvider>
          <OfflineProvider>
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: ClayColors.lightGray,
                },
                headerTintColor: ClayColors.black,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(main)" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="dark" backgroundColor={ClayColors.lightGray} />
          </OfflineProvider>
        </UserProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}