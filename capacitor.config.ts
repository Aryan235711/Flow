import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flow.wellness',
  appName: 'Flow Wellness',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#020617'
  },
  server: {
    url: 'https://flow-si70.onrender.com',
    cleartext: false
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#020617',
    scheme: 'flow'
  }
};

export default config;
