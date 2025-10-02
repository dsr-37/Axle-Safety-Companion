import { Stack } from 'expo-router';
import { ClayColors } from '../../constants/Colors';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: ClayColors.lightGray,
        },
        headerTintColor: ClayColors.black,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="hazard-report" 
        options={{ 
          title: 'Report Hazard',
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="emergency-sos" 
        options={{ 
          title: 'Emergency SOS',
          presentation: 'modal',
          headerStyle: {
            backgroundColor: ClayColors.coral,
          },
          headerTintColor: ClayColors.white,
        }} 
      />
    </Stack>
  );
}