// src/lib/firebase.ts
"use client"; // client-only module

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// só inicializa no browser
const isBrowser = typeof window !== "undefined";

export const app = isBrowser
  ? (getApps().length ? getApp() : initializeApp(cfg as any))
  : undefined;

export const auth: Auth | undefined = isBrowser ? getAuth(app!) : undefined;
export const db: Firestore | undefined = isBrowser ? getFirestore(app!) : undefined;
