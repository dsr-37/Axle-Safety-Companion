import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { ClayInput } from '../ui/ClayInput';
import { ClayButton } from '../ui/ClayButton';
import { ClayCard } from '../ui/ClayCard';
import { AudioRecorder } from '../media/AudioRecorder';
import { CameraCapture } from '../media/CameraCapture';
import { ClayColors, ClayTheme } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface HazardReportFormProps {
  onSubmit: (reportData: {
    description: string;
    audioUri?: string;
    imageUris: string[];
    videoUris: string[];
  }) => Promise<void>;
  isLoading: boolean;
}

export const HazardReportForm: React.FC<HazardReportFormProps> = ({
  onSubmit,
  isLoading
}) => {
  const [description, setDescription] = useState('');
  const [audioUri, setAudioUri] = useState<string>();
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [videoUris, setVideoUris] = useState<string[]>([]);

  const audioRecorderRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  const handleSubmit = async () => {
    if (!description.trim() && !audioUri && imageUris.length === 0 && videoUris.length === 0) {
      Alert.alert(
        'Missing Information',
        'Please provide at least one form of hazard description (text, voice, or media).'
      );
      return;
    }

    try {
      await onSubmit({
        description: description.trim(),
        audioUri,
        imageUris,
        videoUris
      });
    } catch (error) {
      console.error('Error submitting hazard report:', error);
    }
  };

  const clearForm = () => {
    setDescription('');
    setAudioUri(undefined);
    setImageUris([]);
    setVideoUris([]);
  };

  return (
    <View style={styles.form}>
      {/* Text Description */}
      <ClayCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text" size={20} color={ClayColors.mint} />
          <Text style={styles.sectionTitle}>Describe the Hazard</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          What did you observe? Be specific about location and details.
        </Text>
        <ClayInput
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., Loose rocks near drilling area, exposed electrical wire, gas smell..."
          multiline
          numberOfLines={4}
        />
      </ClayCard>

      {/* Voice Recording */}
      <ClayCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mic" size={20} color={ClayColors.lavender} />
          <Text style={styles.sectionTitle}>Voice Report (Recommended)</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Record your voice note in any language. This helps overcome language barriers.
        </Text>
        <AudioRecorder
          ref={audioRecorderRef}
          onRecordingComplete={setAudioUri}
        />
        {audioUri && (
          <View style={styles.successIndicator}>
            <Ionicons name="checkmark-circle" size={16} color={ClayColors.success} />
            <Text style={styles.successText}>Voice note recorded</Text>
          </View>
        )}
      </ClayCard>

      {/* Photo/Video Capture */}
      <ClayCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="camera" size={20} color={ClayColors.babyBlue} />
          <Text style={styles.sectionTitle}>Visual Evidence</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Take photos or videos to show the hazard clearly.
        </Text>
        <CameraCapture
          ref={cameraRef}
          onImageCapture={(uris) => setImageUris(prev => [...prev, ...uris])}
          onVideoCapture={(uris) => setVideoUris(prev => [...prev, ...uris])}
        />
        {(imageUris.length > 0 || videoUris.length > 0) && (
          <View style={styles.successIndicator}>
            <Ionicons name="checkmark-circle" size={16} color={ClayColors.success} />
            <Text style={styles.successText}>
              {imageUris.length} photo(s), {videoUris.length} video(s) captured
            </Text>
          </View>
        )}
      </ClayCard>

      {/* Submit Actions */}
      <View style={styles.actions}>
        <ClayButton
          title={isLoading ? "Submitting Report..." : "Submit Hazard Report"}
          variant="danger"
          size="large"
          onPress={handleSubmit}
          disabled={isLoading}
          icon={<Ionicons name="alert-circle" size={20} color={ClayColors.white} />}
        />

        <ClayButton
          title="Clear Form"
          variant="secondary"
          size="medium"
          onPress={() => {
            Alert.alert(
              'Clear Form',
              'This will clear all entered information. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: clearForm }
              ]
            );
          }}
          style={styles.clearButton}
        />
      </View>

      <Text style={styles.disclaimer}>
        This report will be sent immediately to your supervisor and safety personnel.
  Include as much detail as possible to help ensure everyone’s safety.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: ClayTheme.text.primary,
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: ClayTheme.text.secondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  successText: {
    fontSize: 12,
    color: ClayColors.success,
    fontWeight: '500',
    marginLeft: 4,
  },
  actions: {
    marginTop: 12,
    marginBottom: 16,
  },
  clearButton: {
    marginTop: 12,
  },
  disclaimer: {
    fontSize: 11,
    color: ClayTheme.text.light,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});