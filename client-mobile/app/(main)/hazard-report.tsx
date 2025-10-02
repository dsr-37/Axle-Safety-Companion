import React, { useState, useRef } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ClayButton } from '../../components/ui/ClayButton';
import { ClayCard } from '../../components/ui/ClayCard';
import { ClayInput } from '../../components/ui/ClayInput';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { AudioRecorder } from '../../components/media/AudioRecorder';
import { CameraCapture } from '../../components/media/CameraCapture';
import { ClayColors, ClayTheme } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as Location from 'expo-location';

interface HazardReport {
  id: string;
  userId: string;
  description: string;
  audioUri?: string;
  imageUris: string[];
  videoUris: string[];
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: Date;
  status: 'pending' | 'reviewed' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

const SPACING = 20;

export default function HazardReportScreen() {
  const { userProfile } = useAuth();
  const [description, setDescription] = useState('');
  const [audioUri, setAudioUri] = useState<string>();
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [videoUris, setVideoUris] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject>();

  const audioRecorderRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  React.useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required for hazard reporting');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleSubmitReport = async () => {
    if (!description.trim() && !audioUri && imageUris.length === 0 && videoUris.length === 0) {
      Alert.alert('Missing Information', 'Please provide at least one form of hazard description');
      return;
    }

    setIsSubmitting(true);

    try {
      const report: Partial<HazardReport> = {
        userId: userProfile?.id,
        description: description.trim(),
        audioUri,
        imageUris,
        videoUris,
        location: currentLocation ? {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy ?? 0, // Default to 0 if null
        } : undefined,
        timestamp: new Date(),
        status: 'pending',
        priority: determinePriority(description), // AI would analyze this in production
      };

      // TODO: Upload files to Firebase Storage
      // TODO: Save report to Firestore
      // TODO: Send notification to supervisors
      // For now, simulate success
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate upload

      Alert.alert(
        'Report Submitted',
        'Your hazard report has been submitted successfully. Safety personnel will be notified immediately.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Submission Failed', 'Please try again or contact your supervisor directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const determinePriority = (text: string): 'low' | 'medium' | 'high' | 'critical' => {
    const criticalKeywords = ['fire', 'explosion', 'collapse', 'injury', 'emergency'];
    const highKeywords = ['gas', 'electrical', 'fall', 'toxic', 'dangerous'];
    const mediumKeywords = ['leak', 'crack', 'loose', 'damaged', 'broken'];

    const lowerText = text.toLowerCase();
    
    if (criticalKeywords.some(keyword => lowerText.includes(keyword))) return 'critical';
    if (highKeywords.some(keyword => lowerText.includes(keyword))) return 'high';
    if (mediumKeywords.some(keyword => lowerText.includes(keyword))) return 'medium';
    
    return 'low';
  };

  const handleImageCapture = (uris: string[]) => {
    setImageUris(prev => [...prev, ...uris]);
  };

  const handleVideoCapture = (uris: string[]) => {
    setVideoUris(prev => [...prev, ...uris]);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.header}>
            <Ionicons name="warning" size={32} color={ClayColors.warning} />
            <Text style={styles.title}>Report Hazard</Text>
            <Text style={styles.subtitle}>Help keep everyone safe</Text>
          </View>

        {/* Text Description */}
        <ClayCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Describe the Hazard</Text>
          <Text style={styles.sectionSubtitle}>What did you observe? (Optional)</Text>
          <ClayInput
            placeholder="e.g., Loose rocks near drilling area, electrical wire exposed..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.textInput}
          />
        </ClayCard>

        {/* Voice Recording */}
        <ClayCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Voice Note</Text>
          <Text style={styles.sectionSubtitle}>Record your report (recommended)</Text>
          <AudioRecorder
            ref={audioRecorderRef}
            onRecordingComplete={(uri) => setAudioUri(uri)}
            style={styles.audioRecorder}
          />
          {audioUri && (
            <Text style={styles.successText}>✓ Voice note recorded</Text>
          )}
        </ClayCard>

        {/* Photo/Video Capture */}
        <ClayCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Visual Evidence</Text>
          <Text style={styles.sectionSubtitle}>Take photos or videos of the hazard</Text>
          <CameraCapture
            ref={cameraRef}
            onImageCapture={handleImageCapture}
            onVideoCapture={handleVideoCapture}
            style={styles.camera}
          />
          {(imageUris.length > 0 || videoUris.length > 0) && (
            <Text style={styles.successText}>
              ✓ {imageUris.length} photo(s), {videoUris.length} video(s) captured
            </Text>
          )}
        </ClayCard>

        {/* Location Info */}
        {currentLocation && (
          <ClayCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.locationText}>
              📍 GPS coordinates will be included with your report
            </Text>
            <Text style={styles.coordinatesText}>
              {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
            </Text>
          </ClayCard>
        )}

        {/* Submit Button */}
        <ClayCard style={styles.submitCard}>
          <ClayButton
            title={isSubmitting ? "Submitting..." : "Submit Hazard Report"}
            variant="danger"
            size="large"
            onPress={handleSubmitReport}
            disabled={isSubmitting}
            icon={<Ionicons name="send" size={20} color={ClayColors.white} />}
          />
          <Text style={styles.submitNote}>
            This report will be sent immediately to your supervisor and safety personnel.
          </Text>
        </ClayCard>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: SPACING,
    paddingTop: SPACING + 8,
    paddingBottom: SPACING * 3,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ClayTheme.textOnDark.primary,
  },
  subtitle: {
    fontSize: 16,
    color: ClayTheme.textOnDark.secondary,
  },
  sectionCard: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: ClayTheme.textOnDark.primary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: ClayTheme.textOnDark.secondary,
  },
  textInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  audioRecorder: {
    marginVertical: 8,
  },
  camera: {
    marginVertical: 8,
  },
  successText: {
    color: ClayColors.success,
    fontWeight: '500',
    marginTop: 8,
  },
  locationText: {
    fontSize: 14,
    color: ClayTheme.textOnDark.secondary,
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 12,
    color: ClayTheme.textOnDark.muted,
    fontFamily: 'monospace',
  },
  submitCard: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'stretch',
    gap: 16,
  },
  submitNote: {
    fontSize: 12,
    color: ClayTheme.textOnDark.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});