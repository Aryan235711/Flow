import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flow.wellness',
  appName: 'Flow Wellness',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#020617'
  }
};

export default config;
