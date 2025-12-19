import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pdf-editor-pro.app',
  appName: 'PDF Editor Pro',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#ffffffff',
      showSpinner: false,
    },
    Geolocation: {
      permissions: ['geolocation']
    }
  }
};

export default config;
