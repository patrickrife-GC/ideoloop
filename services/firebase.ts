import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider 
} from "firebase/auth";
import { 
  getFirestore 
} from "firebase/firestore";
import { 
  getStorage 
} from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBJN0Tgt8nc1LTCyNYSWmJ4XsPq1LKza18",
  authDomain: "ideoloop-webapp.firebaseapp.com",
  projectId: "ideoloop-webapp",
  storageBucket: "ideoloop-webapp.appspot.com",
  messagingSenderId: "259434637786",
  appId: "1:259434637786:web:c0828d61cf830d4e49b8e3"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
auth.useDeviceLanguage();

// Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Firestore (needed for storageService)
export const db = getFirestore(app);

// Storage (your uploads expect this)
export const storage = getStorage(app);