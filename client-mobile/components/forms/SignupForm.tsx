import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClayInput } from '../ui/ClayInput';
import { ClayButton } from '../ui/ClayButton';
import { ClayColors } from '../../constants/Colors';
import { validateEmail } from '../../utils/validationUtils';

interface Props {
  onSubmit: (data: { name: string; email: string; password: string }) => void;
  isLoading: boolean;
  onEmailChange?: (email: string) => void;
}

export const SignupForm: React.FC<Props> = ({ onSubmit, isLoading, onEmailChange }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    const e: any = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!validateEmail(email)) e.email = 'Please enter a valid email';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit({ name, email, password });
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (onEmailChange) onEmailChange(text);
  };

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Create account</Text>
      <ClayInput label="Full name" value={name} onChangeText={setName} error={errors.name} />
  <ClayInput label="Email" value={email} onChangeText={handleEmailChange} error={errors.email} keyboardType="email-address" />
      <ClayInput label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry />

      <ClayButton title={isLoading ? 'Creating...' : 'Sign Up'} onPress={submit} disabled={isLoading} variant="primary" />
    </View>
  );
};

const styles = StyleSheet.create({
  form: { width: '100%' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: ClayColors.white, textAlign: 'center' },
});
