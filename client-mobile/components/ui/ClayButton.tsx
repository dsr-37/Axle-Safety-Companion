import React, { forwardRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ClayColors, ClayTheme } from '../../constants/Colors';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'vsmall' | 'small' | 'medium' | 'large' | 'elarge';

interface ClayButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

const SIZE_PRESETS: Record<ButtonSize, { paddingHorizontal: number; paddingVertical: number; minHeight: number; borderRadius: number; fontSize: number; minWidth: number; }> = {
  vsmall: { paddingHorizontal: 12, paddingVertical: 6, minHeight: 30, borderRadius: 12, fontSize: 12, minWidth: 80 },
  small: { paddingHorizontal: 16, paddingVertical: 10, minHeight: 38, borderRadius: 18, fontSize: 14, minWidth: 96 },
  medium: { paddingHorizontal: 22, paddingVertical: 12, minHeight: 48, borderRadius: 20, fontSize: 16, minWidth: 132 },
  large: { paddingHorizontal: 28, paddingVertical: 16, minHeight: 56, borderRadius: 24, fontSize: 18, minWidth: 200 },
  elarge: { paddingHorizontal: 28, paddingVertical: 40, minHeight: 64, borderRadius: 28, fontSize: 22, minWidth: 240 },
};

const getVariantColors = (variant: ButtonVariant): [string, string] => {
  switch (variant) {
    case 'secondary':
      return [ClayColors.lavenderLight, ClayColors.lavender];
    case 'danger':
      return [ClayColors.coral, ClayColors.coralDark];
    case 'primary':
    default:
      return [ClayColors.mint, ClayColors.mintDark];
  }
};

export const ClayButton = forwardRef<any, ClayButtonProps>(
  ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    icon,
    style,
    fullWidth = true,
  }, ref) => {
    const {
      paddingHorizontal,
      paddingVertical,
      minHeight,
      borderRadius,
      fontSize,
      minWidth,
    } = SIZE_PRESETS[size];
    const colors = getVariantColors(variant);
  const computedMinWidth = fullWidth ? Math.max(minWidth, 160) : minWidth;

    return (
      <TouchableOpacity
        ref={ref}
        activeOpacity={0.86}
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.wrapper,
          fullWidth ? styles.fullWidth : styles.autoWidth,
          { borderRadius, minHeight, minWidth: computedMinWidth },
          disabled && styles.wrapperDisabled,
          style,
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            fullWidth ? styles.gradientFull : styles.gradientAuto,
            {
              paddingHorizontal,
              paddingVertical,
              borderRadius,
              minHeight,
              opacity: disabled ? 0.65 : 1,
            },
          ]}
        >
          <View style={styles.content}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text
              style={[
                styles.text,
                { fontSize },
                disabled && styles.disabledText,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
);

ClayButton.displayName = 'ClayButton';

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    elevation: 3,
    shadowColor: ClayTheme.shadow.outer,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  wrapperDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  fullWidth: {
    alignSelf: 'stretch',
    minWidth: 160,
  },
  autoWidth: {
    alignSelf: 'flex-start',
    minWidth: 0,
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientFull: {
    width: '100%',
    flexGrow: 1,
  },
  gradientAuto: {
    width: 'auto',
    flexGrow: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    fontWeight: '600',
    color: ClayColors.white,
    textAlign: 'center',
  },
  disabledText: {
    color: 'rgba(255, 255, 255, 0.82)',
  },
  iconContainer: {
    marginRight: 8,
  },
});