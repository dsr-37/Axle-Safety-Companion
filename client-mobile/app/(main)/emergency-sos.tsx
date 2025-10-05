import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ClayButton } from '../../components/ui/ClayButton';
import { ClayCard } from '../../components/ui/ClayCard';
import { ClayColors, ClayTheme } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { LocationService } from '../../services/location/locationService';
import { NotificationService } from '../../services/notifications/notificationService';
import { FirestoreService } from '../../services/firebase/firestore';
import { OfflineSyncService } from '../../services/storage/offlineSync';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function EmergencySOSScreen() {
  const { userProfile } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      sendEmergencyAlert();
    }
  }, [countdown]);

  const getCurrentLocation = async () => {
    try {
      const currentLocation = await LocationService.getCurrentLocation();
      setLocation(currentLocation);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const startEmergencyCountdown = () => {
    Alert.alert(
      'Emergency SOS',
      'Are you sure you want to send an emergency alert? This will notify all supervisors and emergency contacts immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: () => setCountdown(5)
        }
      ]
    );
  };

  const cancelEmergency = () => {
    setCountdown(null);
  };

  const sendEmergencyAlert = async () => {
    setIsLoading(true);
    setCountdown(null);

    try {
      // Prepare emergency data
      const emergencyData = {
        userId: userProfile?.id,
        userName: userProfile?.name,
        userRole: userProfile?.role,
        // location scoping
        stateId: userProfile?.stateId,
        stateName: userProfile?.stateName,
        coalfieldId: userProfile?.coalfieldId,
        coalfieldName: userProfile?.coalfieldName,
        mineId: userProfile?.mineId,
        mineName: userProfile?.mineName,
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        } : null,
        timestamp: new Date().toISOString(),
        type: 'emergency_sos',
      };

      // Persist to Firestore so supervisors can see it in real-time
      try {
        const isOnline = await OfflineSyncService.checkInternetConnection();
        if (isOnline) {
          await FirestoreService.createEmergencyAlert(emergencyData);
        } else {
          // enqueue emergency_sos action for later sync
          await OfflineSyncService.addToQueue({ type: 'emergency_sos', data: { payload: emergencyData } });
        }
      } catch (err) {
        console.warn('Failed to persist emergency alert to Firestore or enqueue:', err);
      }

  // Also schedule a local notification on the sender device for confirmation (friendly body)
  await NotificationService.sendEmergencyAlert({ userName: emergencyData.userName, userRole: emergencyData.userRole, location: emergencyData.location });

      // Try to make emergency call if possible
      const emergencyNumber = 'tel:+112'; // Replace with actual emergency number
      const canCall = await Linking.canOpenURL(emergencyNumber);
      if (canCall) {
        Alert.alert(
          'Emergency Alert Sent',
          'Your supervisors have been notified. Would you like to call emergency services?',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Call Emergency',
              onPress: () => Linking.openURL(emergencyNumber)
            }
          ]
        );
      } else {
        Alert.alert(
          'Emergency Alert Sent',
          'Your supervisors and emergency contacts have been notified of your emergency.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      Alert.alert(
        'Alert Failed',
        'Failed to send emergency alert. Please try calling emergency services directly.',
        [
          { text: 'Try Again', onPress: sendEmergencyAlert },
          { text: 'Cancel', onPress: () => router.back() }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.emergencyIcon}>
            <Ionicons name="alert-circle" size={64} color={ClayColors.error} />
          </View>
          <Text style={styles.title}>Emergency SOS</Text>
          <Text style={styles.subtitle}>
            This will immediately notify all supervisors and emergency contacts
          </Text>
        </View>

        {/* Location Info */}
        <ClayCard style={styles.locationCard}>
          <Text style={styles.cardTitle}>Your Location</Text>
          {location ? (
            <View>
              <Text style={styles.locationText}>
                📍 Coordinates: {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
              </Text>
              <Text style={styles.accuracyText}>
                Accuracy: ±{location.coords.accuracy ? Math.round(location.coords.accuracy) : 'N/A'}m
              </Text>
            </View>
          ) : (
            <Text style={styles.loadingText}>Getting your location...</Text>
          )}
        </ClayCard>

        {/* User Info */}
        <ClayCard style={styles.userCard}>
          <Text style={styles.cardTitle}>Your Details</Text>
          <Text style={styles.userInfo}>Name: {userProfile?.name || 'Unknown'}</Text>
          <Text style={styles.userInfo}>Role: {userProfile?.role || 'Unknown'}</Text>
          <Text style={styles.userInfo}>Employee ID: {userProfile?.employeeId || 'N/A'}</Text>
        </ClayCard>

        {/* Countdown or Action */}
        {countdown !== null ? (
          <ClayCard style={[styles.actionCard, styles.countdownCard]}>
            <Text style={styles.cardTitle}>Countdown Initiated</Text>
            <Text style={styles.countdownText}>Emergency alert will send in</Text>
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <ClayButton
              title="Cancel Alert"
              variant="secondary"
              size="medium"
              onPress={cancelEmergency}
              style={styles.cancelButton}
            />
          </ClayCard>
        ) : (
          <ClayCard style={styles.actionCard}>
            <Text style={styles.cardTitle}>Emergency Actions</Text>
            <ClayButton
              title={isLoading ? "Sending Alert..." : "🆘 SEND ALERT"}
              variant="danger"
              size="elarge"
              onPress={startEmergencyCountdown}
              disabled={isLoading}
            />
            <ClayButton
              title="Cancel"
              variant="secondary"
              size="medium"
              onPress={() => router.back()}
            />
          </ClayCard>
        )}

        {/* Emergency Numbers */}
        <ClayCard style={styles.numbersCard}>
          <Text style={styles.cardTitle}>Emergency Numbers</Text>
          <ClayButton
            title="📞 Local Emergency: 112"
            variant="secondary"
            size="small"
            onPress={() => Linking.openURL('tel:+112')}
            style={styles.numberButton}
          />
        </ClayCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ClayColors.coralDark,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 56,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  emergencyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: ClayColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: ClayColors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ClayColors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: ClayColors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  locationCard: {
    padding: 20,
    gap: 12,
  },
  userCard: {
    padding: 20,
    gap: 8,
  },
  actionCard: {
    padding: 24,
    gap: 16,
  },
  countdownCard: {
    alignItems: 'center',
  },
  numbersCard: {
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ClayTheme.textOnDark.primary,
  },
  locationText: {
    fontSize: 14,
    color: ClayTheme.textOnDark.primary,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  accuracyText: {
    fontSize: 12,
    color: ClayTheme.textOnDark.muted,
  },
  loadingText: {
    fontSize: 14,
    color: ClayTheme.textOnDark.secondary,
    fontStyle: 'italic',
  },
  userInfo: {
    fontSize: 14,
    color: ClayTheme.textOnDark.secondary,
  },
  countdownText: {
    fontSize: 16,
    color: ClayTheme.textOnDark.secondary,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: ClayColors.white,
    marginBottom: 16,
  },
  cancelButton: { // <-- ADD THIS STYLE OBJECT
    minWidth: 200,
    maxHeight: 52,
    alignSelf: 'stretch',
  },
  numberButton: {
    alignSelf: 'stretch',
  },
});