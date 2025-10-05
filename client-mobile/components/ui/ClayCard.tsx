import React, { forwardRef } from 'react';
import { TouchableOpacity, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { ClayTheme } from '../../constants/Colors';

interface ClayCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
}

export const ClayCard = forwardRef<any, ClayCardProps>(
  ({
    children,
    style,
    onPress,
    disabled = false
  }, ref) => {
    const flattenedStyle = style ? StyleSheet.flatten(style as StyleProp<ViewStyle>) || {} : {};

    const {
      padding,
      paddingHorizontal,
      paddingVertical,
      paddingTop,
      paddingBottom,
      paddingLeft,
      paddingRight,
      gap,
      rowGap,
      columnGap,
      ...containerOverrides
    } = flattenedStyle as ViewStyle;

    const cardStyle: StyleProp<ViewStyle>[] = [
      styles.card,
      containerOverrides,
      ...(disabled ? [styles.disabled] : []),
    ];

    const contentStyle: StyleProp<ViewStyle>[] = [
      styles.content,
      padding !== undefined && { padding },
      paddingHorizontal !== undefined && { paddingHorizontal },
      paddingVertical !== undefined && { paddingVertical },
      paddingTop !== undefined && { paddingTop },
      paddingBottom !== undefined && { paddingBottom },
      paddingLeft !== undefined && { paddingLeft },
      paddingRight !== undefined && { paddingRight },
      gap !== undefined && { gap },
      rowGap !== undefined && { rowGap },
      columnGap !== undefined && { columnGap },
    ].filter(Boolean);

    const content = (
      <>
        <View style={styles.backgroundLayer} />
        <View style={styles.overlayLayer} />
  <View style={contentStyle}>{children}</View>
      </>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          ref={ref}
          style={cardStyle}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.9}
        >
          {content}
        </TouchableOpacity>
      );
    }

    return (
      <View ref={ref} style={cardStyle}>
        {content}
      </View>
    );
  }
);

ClayCard.displayName = 'ClayCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    shadowColor: 'rgba(8, 1, 24, 0.32)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 6,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ClayTheme.glass.surface,
    borderWidth: 1,
    borderColor: ClayTheme.glass.border,
    borderRadius: 26,
  },
  overlayLayer: {},
  content: {
    padding: 10,
  },
  disabled: {
    opacity: 0.6,
  },
});