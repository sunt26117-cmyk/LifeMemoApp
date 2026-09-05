import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.liferecorder.app',
  appName: '人生不设限',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
