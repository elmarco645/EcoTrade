import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

// Inline Firebase config (provided)
export const firebaseInlineConfig = {
  apiKey: "AIzaSyDbhO1g-okFY_lUT0oz__Ibvc5ssLsWZzk",
  authDomain: "gen-lang-client-0307452548.firebaseapp.com",
  projectId: "gen-lang-client-0307452548",
  storageBucket: "gen-lang-client-0307452548.firebasestorage.app",
  messagingSenderId: "222319348224",
  appId: "1:222319348224:web:cceb1738b753d0875666e5",
};

const config = {
  ...firebaseConfig,
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || firebaseInlineConfig.apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || firebaseInlineConfig.authDomain,
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || firebaseInlineConfig.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || firebaseInlineConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || firebaseInlineConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId || firebaseInlineConfig.appId,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
};

// Initialize Firebase
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId);
const storage = getStorage(app);

export { app, auth, db, storage };
