import { Stack } from 'expo-router';
import { ClayColors } from '../../constants/Colors';

export default function AuthLayout() {
  return (
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
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Login',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="role-selection" 
        options={{ 
          title: 'Select Role',
          headerBackVisible: false 
        }} 
      />
    </Stack>
  );
}