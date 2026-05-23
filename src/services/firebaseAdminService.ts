import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../config.js';

let firebaseApp: App | null = null;

const getFirebaseApp = (): App => {
  if (firebaseApp) return firebaseApp;
  if (getApps().length > 0) {
    firebaseApp = getApps()[0]!;
    return firebaseApp;
  }

  firebaseApp = initializeApp({
    credential: cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey
    })
  });

  return firebaseApp;
};

export const verifyFirebaseIdToken = async (idToken: string) => {
  const app = getFirebaseApp();
  return getAuth(app).verifyIdToken(idToken);
};
