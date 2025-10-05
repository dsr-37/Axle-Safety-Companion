import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { ClayInput } from '../ui/ClayInput';
import { ClayButton } from '../ui/ClayButton';
import { ClayColors } from '../../constants/Colors';
import { validateEmail } from '../../utils/validationUtils';
import LocationPicker from '../ui/LocationPicker';

interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string; location: any }) => void;
  isLoading: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSupervisorCandidate, setIsSupervisorCandidate] = useState(false);
  const [aadhaarDisplay, setAadhaarDisplay] = useState('');
  const [aadhaarRaw, setAadhaarRaw] = useState('');
  const [aadhaarValid, setAadhaarValid] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<{ emailOrPhone?: string; password?: string }>({});
  const [location, setLocation] = useState<any>();
  const emailCheckTimer = useRef<any>(null);

  const validateForm = () => {
    const newErrors: { emailOrPhone?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.emailOrPhone = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.emailOrPhone = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!location || !location.stateId || !location.coalfieldId || !location.mineId) {
      Alert.alert('Location Required', 'Please select your State → Coalfield → Mine before signing in');
      return false;
    }

    // If supervisor candidate, require Aadhaar (visual-only MVP)
    if (isSupervisorCandidate && !aadhaarValid) {
      Alert.alert('Aadhaar Required', 'Please enter a 12-digit Aadhaar number to proceed.');
      return false;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      // Show first error as Alert for smooth UX
      const first = Object.values(newErrors).find(v => !!v) as string | undefined;
      if (first) Alert.alert('Validation', first);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Show OTP step first (MVP fake OTP)
    if (!showOtp) {
      setShowOtp(true);
      return;
    }

    // OTP entered -> proceed
    if (showOtp) {
      if (!/^[0-9]{6}$/.test(otp)) {
        Alert.alert('Invalid OTP', 'Please enter a correct one-time code');
        return;
      }
      onSubmit({ email, password, location: location as any });
    }
  };

  const checkSupervisorEmail = async (value: string) => {
    if (!value || !value.includes('@')) {
      setIsSupervisorCandidate(false);
      return;
    }
    try {
      const { FirestoreService } = await import('../../services/firebase/firestore');
      const sup = await FirestoreService.getSupervisorDocByEmail(value).catch(() => null);
      setIsSupervisorCandidate(!!sup);
    } catch {
      setIsSupervisorCandidate(false);
    }
  };

  const onEmailChange = (text: string) => {
    setEmail(text);
    if (errors.emailOrPhone) setErrors(prev => ({ ...prev, emailOrPhone: undefined }));
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    emailCheckTimer.current = setTimeout(() => checkSupervisorEmail(text.trim()), 350);
  };

  const onAadhaarChange = (text: string) => {
    // keep only digits
    const digits = (text.match(/\d/g) || []).join('').slice(0, 12);
    setAadhaarRaw(digits);
    // format into groups of 4
    const groups = digits.match(/.{1,4}/g) || [];
    const display = groups.join(' ');
    setAadhaarDisplay(display);
    setAadhaarValid(digits.length === 12);
  };

  return (
    <View style={styles.form}>
  <Text style={styles.formTitle}>Welcome Back</Text>
  <Text style={styles.formSubtitle}>Sign in to access your safety dashboard</Text>

  <LocationPicker value={location} onChange={setLocation} />
  {/* if user hasn't selected location, the validation will present a message on the email field */}

      <ClayInput
        label="Email"
        value={email}
        onChangeText={onEmailChange}
        placeholder="you@example.com"
        keyboardType="email-address"
        error={errors.emailOrPhone}
      />

      {isSupervisorCandidate && (
        <View style={{ marginTop: 10 }}>
          <ClayInput
            label="Aadhaar"
            value={aadhaarDisplay}
            onChangeText={onAadhaarChange}
            keyboardType={'numeric'}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 14, paddingBottom: 16, marginTop: -14, fontWeight: '500', color: aadhaarValid ? '#4CAF50' : '#fdd551ff' }}>
              {aadhaarValid ? 'Aadhaar Verified' : 'Aadhaar Incorrect'}
            </Text>
            {aadhaarValid ? <Text style={{ fontSize: 15, paddingRight: 16, marginTop: -16, fontWeight: '800', color: '#4CAF50' }}>✓</Text> : null}
          </View>
        </View>
      )}

      <ClayInput
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errors.password) {
            setErrors(prev => ({ ...prev, password: undefined }));
          }
        }}
        placeholder="Enter your password"
        secureTextEntry
        error={errors.password}
      />

      {showOtp ? (
        <>
          <ClayInput label="Enter OTP" value={otp} onChangeText={setOtp} keyboardType="numeric" />
          <ClayButton
            title={isLoading ? 'Verifying...' : 'Verify OTP'}
            variant="primary"
            size="large"
            onPress={handleSubmit}
            disabled={isLoading || !location}
            style={styles.submitButton}
          />
        </>
      ) : (
        <ClayButton
          title={isLoading ? "Signing In..." : "Sign In"}
          variant="primary"
          size="large"
          onPress={handleSubmit}
          disabled={isLoading || !location}
          style={styles.submitButton}
        />
      )}

      <Text style={styles.helpText}>
        Need help? Contact your supervisor or IT support.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    width: '100%',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: ClayColors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.82)',
    textAlign: 'center',
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  helpText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});