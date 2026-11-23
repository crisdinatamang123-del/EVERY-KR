import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

const appletConfigPath = path.resolve(import.meta.dirname, 'firebase-applet-config.json');
const appletConfig = fs.existsSync(appletConfigPath)
  ? JSON.parse(fs.readFileSync(appletConfigPath, 'utf-8'))
  : {
      projectId: 'everykr',
      appId: '1:926172198407:web:eb679714ecb801edd99ca2',
      apiKey: 'AIzaSyAgJyMMBxCO6GZgSsh7a6xMolDs7JzTscQ',
      authDomain: 'everykr.firebaseapp.com',
      firestoreDatabaseId: 'ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f',
      storageBucket: 'everykr.firebasestorage.app',
      messagingSenderId: '926172198407',
      measurementId: 'G-FPCP0M668Y'
    };

// Ensure process.env.VITE_FIREBASE_* never contains malformed "KEY=VALUE" or legacy "wecare-crm-505612" secrets
process.env.VITE_FIREBASE_API_KEY = appletConfig.apiKey;
process.env.VITE_FIREBASE_AUTH_DOMAIN = appletConfig.authDomain;
process.env.VITE_FIREBASE_PROJECT_ID = appletConfig.projectId;
process.env.VITE_FIREBASE_STORAGE_BUCKET = appletConfig.storageBucket;
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = appletConfig.messagingSenderId;
process.env.VITE_FIREBASE_APP_ID = appletConfig.appId;
process.env.VITE_FIREBASE_MEASUREMENT_ID = appletConfig.measurementId;
process.env.VITE_FIREBASE_DATABASE_ID = appletConfig.firestoreDatabaseId;

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(appletConfig.apiKey),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(appletConfig.authDomain),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(appletConfig.projectId),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(appletConfig.storageBucket),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(appletConfig.messagingSenderId),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(appletConfig.appId),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(appletConfig.measurementId),
      'import.meta.env.VITE_FIREBASE_DATABASE_ID': JSON.stringify(appletConfig.firestoreDatabaseId),
    },
    resolve: {
      dedupe: ['react', 'react-dom', 'three'],
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-router-dom',
        '@react-three/fiber',
        'three',
        'three/addons/controls/OrbitControls.js',
        'three/addons/environments/RoomEnvironment.js',
        'topojson-client',
        'lucide-react',
        'react-markdown',
        'remark-gfm',
        'xlsx',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
      ],
    },
    build: {
      sourcemap: false,
      emptyOutDir: true,
      chunkSizeWarningLimit: 1600,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
