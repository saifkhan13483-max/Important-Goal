/**
 * firebase.ts — Firebase SDK initialization
 *
 * Architectural choice: All Firebase services are initialized once here and
 * exported as singletons. Service modules (auth.service.ts, user.service.ts,
 * goals.service.ts, etc.) import from this file — never re-initialize Firebase.
 *
 * Configuration is loaded entirely from environment variables (VITE_ prefix)
 * so no secrets are hardcoded.
 *
 * Services initialized here:
 *   - auth: Firebase Authentication (email/password + Google OAuth)
 *   - db:   Firestore database (primary data store for all user data)
 *
 * File/media uploads are handled by Cloudinary — see lib/cloudinary.ts.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
