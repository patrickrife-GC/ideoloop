import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore 
} from "firebase/firestore";
import { 
  getStorage 
} from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBJN0Tgt8nc1LTCyNYSWmJ4XsPq1LKza18",
  authDomain: "ideoloop-webapp.firebaseapp.com",
  projectId: "ideoloop-webapp",
  storageBucket: "ideoloop-webapp.firebasestorage.app",
  messagingSenderId: "259434637786",
  appId: "1:259434637786:web:c0828d61cf830d4e49b8e3"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
auth.useDeviceLanguage();

// Resolve once Firebase finishes initial auth state check.
export const authReady = new Promise<void>((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, () => {
    unsubscribe();
    resolve();
  });
});

// Firestore (needed for storageService)
export const db = getFirestore(app);

// Storage (your uploads expect this)
export const storage = getStorage(app);

// Functions (server proxy)
export const functions = getFunctions(app, "us-central1");
