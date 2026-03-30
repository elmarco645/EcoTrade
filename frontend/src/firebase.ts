import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD1lNKC6OGL8oaZ652J98RCN3-yl7Z7jbc",
  authDomain: "ecotrade-94ab2.firebaseapp.com",
  projectId: "ecotrade-94ab2",
  storageBucket: "ecotrade-94ab2.firebasestorage.app",
  messagingSenderId: "51253187438",
  appId: "1:51253187438:web:0ad28f2c11b27b87e6a77f",
  measurementId: "G-9VF91918TK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
