import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClayInput } from '../ui/ClayInput';
import { ClayButton } from '../ui/ClayButton';
import { ClayColors } from '../../constants/Colors';
import { validateEmail } from '../../utils/validationUtils';

interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string }) => void;
  isLoading: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ emailOrPhone?: string; password?: string }>({});

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({ email, password });
    }
  };

  return (
    <View style={styles.form}>
  <Text style={styles.formTitle}>Welcome Back</Text>
  <Text style={styles.formSubtitle}>Sign in to access your safety dashboard</Text>

      <ClayInput
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (errors.emailOrPhone) {
            setErrors(prev => ({ ...prev, emailOrPhone: undefined }));
          }
        }}
  placeholder="you@example.com"
        keyboardType="email-address"
        error={errors.emailOrPhone}
      />

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

      <ClayButton
        title={isLoading ? "Signing In..." : "Sign In"}
        variant="primary"
        size="large"
        onPress={handleSubmit}
        disabled={isLoading}
        style={styles.submitButton}
      />

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