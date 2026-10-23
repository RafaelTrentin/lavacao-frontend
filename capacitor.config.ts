import process from 'node:process';
import type { CapacitorConfig } from '@capacitor/cli';

const isAndroidTest = process.env.CAPACITOR_ANDROID_TEST === 'true';

const config: CapacitorConfig = {
  appId: 'br.com.washsync.app',
  appName: 'WashSync',
  webDir: 'dist',
  android: {
    allowMixedContent: isAndroidTest,
  },
};

export default config;