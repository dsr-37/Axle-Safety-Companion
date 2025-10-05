import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { ClayInput } from '../ui/ClayInput';
import { ClayButton } from '../ui/ClayButton';
import { ClayColors } from '../../constants/Colors';
import { validateEmail } from '../../utils/validationUtils';
import LocationPicker from '../ui/LocationPicker';

interface Props {
  onSubmit: (data: { name: string; email: string; password: string; location: any }) => void;
  isLoading: boolean;
  onEmailChange?: (email: string) => void;
}

export const SignupForm: React.FC<Props> = ({ onSubmit, isLoading, onEmailChange }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [location, setLocation] = useState<any>();
  const [isSupervisorCandidate, setIsSupervisorCandidate] = useState(false);
  const [aadhaarDisplay, setAadhaarDisplay] = useState('');
  const [aadhaarRaw, setAadhaarRaw] = useState('');
  const [aadhaarValid, setAadhaarValid] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const emailCheckTimer = useRef<any>(null);

  const validate = () => {
    const e: any = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!validateEmail(email)) e.email = 'Please enter a valid email';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!location || !location.stateId || !location.coalfieldId || !location.mineId) {
      Alert.alert('Location Required', 'Please select State → Coalfield → Mine');
      return false;
    }
    // If supervisor candidate, require Aadhaar (visual-only MVP)
    if (isSupervisorCandidate && !aadhaarValid) {
      Alert.alert('Aadhaar Required', 'Please enter a 12-digit Aadhaar number to proceed (MVP visual only).');
      return false;
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const first = Object.values(e).find(v => !!v) as string | undefined;
      if (first) Alert.alert('Validation', first);
      return false;
    }
    return true;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit({ name, email, password, location: location as any });
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (onEmailChange) onEmailChange(text);
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    emailCheckTimer.current = setTimeout(async () => {
      try {
        const { FirestoreService } = await import('../../services/firebase/firestore');
        const sup = await FirestoreService.getSupervisorDocByEmail(text).catch(() => null);
        setIsSupervisorCandidate(!!sup);
      } catch {
        setIsSupervisorCandidate(false);
      }
    }, 350);
  };

  const onAadhaarChange = (text: string) => {
    const digits = (text.match(/\d/g) || []).join('').slice(0, 12);
    setAadhaarRaw(digits);
    const groups = digits.match(/.{1,4}/g) || [];
    setAadhaarDisplay(groups.join(' '));
    setAadhaarValid(digits.length === 12);
  };

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Create account</Text>
  <LocationPicker value={location} onChange={setLocation} />
  {/* location validation is shown via Alert to provide consistent UX */}
      <ClayInput label="Full Name" value={name} onChangeText={setName} error={errors.name} />
  <ClayInput label="Email" value={email} onChangeText={handleEmailChange} error={errors.email} keyboardType="email-address" />
      {isSupervisorCandidate && (
        <View style={{ marginTop: 10 }}>
          <ClayInput
            label="Aadhaar (MVP visual only)"
            value={aadhaarDisplay}
            onChangeText={onAadhaarChange}
            placeholder="1234 5678 9012"
            keyboardType={'numeric'}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 12, color: aadhaarValid ? '#4CAF50' : '#FFC107' }}>
              {aadhaarValid ? 'Aadhaar format looks good' : 'Enter 12 digits (visual only)'}
            </Text>
            {aadhaarValid ? <Text style={{ color: '#4CAF50' }}>✓</Text> : null}
          </View>
        </View>
      )}
      <ClayInput label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry />
      {showOtp ? (
        <>
          <ClayInput label="Enter OTP" value={otp} onChangeText={setOtp} keyboardType="numeric" />
          <ClayButton title={isLoading ? 'Verifying...' : 'Verify OTP'} onPress={() => {
            if (!/^[0-9]{4,6}$/.test(otp)) return Alert.alert('OTP', 'Please enter the one-time code (4-6 digits).');
            submit();
          }} disabled={isLoading || !location} variant="primary" />
        </>
      ) : (
        <ClayButton title={isLoading ? 'Creating...' : 'Sign Up'} onPress={() => { if (!showOtp) { setShowOtp(true); } else submit(); }} disabled={isLoading || !location} variant="primary" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  form: { width: '100%' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: ClayColors.white, textAlign: 'center' },
});
