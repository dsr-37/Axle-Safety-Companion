export const ClayColors = {
  // Material-inspired palette (subtle, vivid accents)
  lavender: '#655ce0ff', // secondary (was lavender)
  lavenderLight: '#8aa0f4ff',
  lavenderDark: '#493e90ff',

  mint: '#00b57fff', // primary (was mint)
  mintLight: '#71f5c5e2',
  mintDark: '#038376ff',
  mintProfile: '#06bf24ff',

  babyBlue: '#3B82F6', // accent
  babyBlueLight: '#60A5FA',
  babyBlueDark: '#1E40AF',

  cream: '#faf8edff',
  creamDark: '#d4cdb6ff',

  coral: '#f35151ff', // semantic/error
  coralDark: '#dc2929ff',

  // Neutral tones
  white: '#FFFFFF',
  lightGray: '#dddfe1ff',
  gray: '#b5bbbfff',
  darkGray: '#374151',
  black: '#0B1220',
  purple: '#a033d7ff',

  // Semantic
  success: '#57d02fff',
  warning: '#f4a722ff',
  error: '#f9540eff',
  info: '#2563EB',

  // Shadow / highlight helpers
  shadowLight: 'rgba(255, 255, 255, 0.85)',
  shadowDark: 'rgba(2, 6, 23, 0.08)',
  gradientStart: '#2b024dff',
  gradientMid: '#2e0355ff',
  gradientEnd: '#3e1073b8',
  cardGlass: 'rgba(255, 255, 255, 0.35)',
  cardGlassStrong: 'rgba(255, 255, 255, 0.44)',
  cardGlassHighlight: 'rgba(255, 255, 255, 0.5)',
};

export const ClayTheme = {
  background: ClayColors.lightGray,
  surface: ClayColors.white,
  primary: ClayColors.mint,
  secondary: ClayColors.lavender,
  accent: ClayColors.babyBlue,
  text: {
    primary: ClayColors.black,
    secondary: ClayColors.darkGray,
    light: ClayColors.gray,
  },
  textOnDark: {
    primary: 'rgba(255, 255, 255, 1)',
    secondary: 'rgba(255, 255, 255, 0.82)',
    muted: 'rgba(255, 255, 255, 0.61)',
  },
  border: ClayColors.gray,
  shadow: {
    outer: ClayColors.shadowDark,
    inner: ClayColors.shadowLight,
  },
  gradient: {
    start: ClayColors.gradientStart,
    mid: ClayColors.gradientMid,
    end: ClayColors.gradientEnd,
  },
  glass: {
    surface: ClayColors.cardGlass,
    border: ClayColors.cardGlassStrong,
    highlight: ClayColors.cardGlassHighlight,
  },
};