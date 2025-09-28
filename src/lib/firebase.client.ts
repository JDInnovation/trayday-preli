// src/lib/firebase.client.ts
import { getApps, getApp, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Lê variáveis expostas ao cliente (Next: prefixo NEXT_PUBLIC_)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Estes podem existir em server e client sem problemas
export const auth = getAuth(app);
export const db = getFirestore(app);

// Storage só existe no browser; em SSR devolvemos null (tipado como any)
export const storage: ReturnType<typeof getStorage> = ((): any => {
  try {
    if (typeof window === "undefined") return null;
    return getStorage(app);
  } catch {
    return null;
  }
})();

export { app };
