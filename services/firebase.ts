
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDgwLHb6HPPeP-g6bxZ-BhxIuSvL3b7dyA",
  authDomain: "ideoloop-53c27.firebaseapp.com",
  projectId: "ideoloop-53c27",
  storageBucket: "ideoloop-53c27.firebasestorage.app",
  messagingSenderId: "906427095036",
  appId: "1:906427095036:web:a3e242e764ccee0d408479"
};

// Initialize Firebase (Modular)
const app = initializeApp(firebaseConfig);

// Export instances
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
export const db = getFirestore(app);
