import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.liferecorder.app',
  appName: 'AI生活记录系统',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
