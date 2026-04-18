export const Theme = {
  // 🌑 STEALTH (Night Mode - Default)
  dark: {
    background: '#0A0A0A',
    surface: '#1A1A1A',      // Cards & Inputs
    primary: '#FF3B30',      // Safety Red
    accent: '#00FF00',       // Detection Green
    textPrimary: '#FFFFFF',
    textSecondary: '#888888',
    border: '#333333',
    status: 'light-content'
  },

  // ☀️ HIGH-VIZ (Day Mode - Sunlight Visibility)
  light: {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    primary: '#FF3B30',
    accent: '#34C759',
    textPrimary: '#000000',
    textSecondary: '#666666',
    border: '#D1D1D6',
    status: 'dark-content'
  },

  // 🤖 CYBER (HUD Mode - Tech Aesthetic)
  cyber: {
    background: '#00050A',
    surface: '#001A26',
    primary: '#00D4FF',      // Electric Blue
    accent: '#FF00F5',       // Neon Pink
    textPrimary: '#E0F7FA',
    textSecondary: '#4FC3F7',
    border: '#00D4FF',
    status: 'light-content'
  },

  // Consistent Spacing System
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // Consistent Typography
  fonts: {
    heading: { fontSize: 24, fontWeight: 'bold' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 1 },
  }
};