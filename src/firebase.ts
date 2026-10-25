import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Set VITE_FIREBASE_EMULATORS=true to run against the local Firebase emulators instead of the live project
export const usingEmulators = import.meta.env.VITE_FIREBASE_EMULATORS === 'true';

export { firebaseConfig };
export const app = initializeApp(firebaseConfig);
// Keep a copy of the database on each device: the app opens instantly from it, keeps working
// without signal, and Firestore pushes any changes made offline as soon as the device reconnects.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  // Optional fields left blank (e.g. a shift saved without notes) are skipped instead of failing the save
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);
// Sign-ins are remembered on the device. Only username/password sign-in is used, so the pop-up/redirect
// helper (which loads extra Google scripts) is deliberately left out.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
});

if (usingEmulators) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}
