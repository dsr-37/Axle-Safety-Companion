import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClayColors, ClayTheme } from '../../constants/Colors';

interface ClayCheckboxProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
}

export const ClayCheckbox: React.FC<ClayCheckboxProps> = ({
  value,
  onValueChange,
  color = ClayColors.mint,
  size = 'medium',
  disabled = false,
  style
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 20, height: 20, borderRadius: 6 };
      case 'large':
        return { width: 32, height: 32, borderRadius: 10 };
      default:
        return { width: 24, height: 24, borderRadius: 8 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'large': return 22;
      default: return 18;
    }
  };

  const sizeStyles = getSizeStyles();
  const iconSize = getIconSize();

  const checkboxStyle: ViewStyle[] = [
    styles.checkbox,
    sizeStyles,
    value ? { backgroundColor: color, borderColor: color } : { backgroundColor: ClayTheme.surface, borderColor: ClayColors.gray },
    ...(disabled ? [styles.disabled] : []),
    ...(style ? [style] : [])
  ];

  return (
    <TouchableOpacity
      style={checkboxStyle}
      onPress={() => !disabled && onValueChange(!value)}
      activeOpacity={0.8}
      disabled={disabled}
    >
      {value && (
        <Ionicons 
          name="checkmark" 
          size={iconSize} 
          color={ClayColors.white} 
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: ClayColors.gray,
    shadowColor: ClayTheme.shadow.outer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});