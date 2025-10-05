import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { ClayColors, ClayTheme } from '../../constants/Colors';

interface ClayInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
  error?: string;
  style?: ViewStyle;
}

export const ClayInput: React.FC<ClayInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  disabled = false,
  error,
  style
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const inputStyle: TextStyle[] = [
    styles.input,
    ...(isFocused ? [styles.inputFocused] : []),
    ...(error ? [styles.inputError] : []),
    ...(disabled ? [styles.inputDisabled] : []),
    ...(multiline ? [styles.inputMultiline] : [])
  ];

  const containerStyle: ViewStyle[] = [
    styles.container,
    ...(style ? [style] : [])
  ];

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        <TextInput
          style={inputStyle}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={ClayTheme.textOnDark.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: ClayTheme.textOnDark.secondary,
    marginBottom: 6,
  },
  inputContainer: {
    borderRadius: 12,
    backgroundColor: ClayTheme.glass.surface,
    borderWidth: 1,
    borderColor: ClayTheme.glass.border,
    shadowColor: 'rgba(28, 4, 63, 0.43)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 16,
    elevation: 2,
    overflow: 'hidden',
  },
  inputContainerError: {
    borderWidth: 1,
    borderColor: ClayColors.error,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: ClayTheme.textOnDark.primary,
    backgroundColor: 'transparent',
    width: '100%',
  },
  inputFocused: {
    borderWidth: 1.5,
    borderColor: ClayTheme.primary,
  },
  inputError: {
    borderColor: ClayColors.error,
  },
  inputDisabled: {
    backgroundColor: ClayColors.gray,
    color: ClayColors.darkGray,
  },
  inputMultiline: {
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: ClayColors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});