import { UserProfile, UserInsight, SessionRecord, GeneratedResult, InterviewStyle, UserPlan, VoiceProfile } from "../types";
import { storage, db } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, query, orderBy, increment, writeBatch } from "firebase/firestore";
import { User } from "firebase/auth";

const STORAGE_KEY_PREFIX = 'ideoloop_user_';

// Admin email addresses - these users get admin role
const ADMIN_EMAILS = ['patrickrife@gmail.com'];

// --- UTILITY: Deep Sanitize ---
// Firestore crashes if any field is 'undefined'. This recursively turns undefined -> null.
const deepSanitize = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(deepSanitize);
    }
    
    const sanitized: any = {};
    for (const key in obj) {
        sanitized[key] = deepSanitize(obj[key]);
    }
    return sanitized;
};

export const storageService = {
  // Retrieve profile + full session history from Firestore
  syncFirebaseUser: async (fbUser: User): Promise<UserProfile> => {
    const uid = fbUser.uid;
    const userRef = doc(db, "users", uid);
    
    let userData: any = null;

    try {
        // 1. Try to fetch from Cloud
        const userSnapshot = await getDoc(userRef);
        userData = userSnapshot.exists() ? userSnapshot.data() : null;
    } catch (e: any) {
        console.warn("Firestore sync failed (Offline or Permission):", e.message);
        // If offline, we proceed with null userData, triggering a robust fallback below
    }

    // Default structure (for new users OR offline fallback)
    if (!userData) {
        const isAdmin = fbUser.email && ADMIN_EMAILS.includes(fbUser.email);
        userData = {
            uid: uid,
            name: fbUser.displayName || 'Creator',
            email: fbUser.email || '',
            photoUrl: fbUser.photoURL || null,
            joinedAt: Date.now(),
            lastLogin: Date.now(),
            interactionCount: 0,
            plan: 'FREE',
            isGuest: fbUser.isAnonymous,
            role: isAdmin ? 'admin' : 'user'
        };

        // Only try to write if we think we might be online (catch error if not)
        try {
             await setDoc(userRef, deepSanitize(userData), { merge: true });
        } catch(e) { console.warn("Could not cache user profile to cloud (Offline)"); }
    } else {
        // Update lastLogin for existing users
        try {
            await updateDoc(userRef, { lastLogin: Date.now() });
            userData.lastLogin = Date.now();
        } catch(e) { console.warn("Could not update lastLogin"); }
    }

    // 2. DATA RESCUE: Check Local Storage for "Stranded" sessions
    try {
        const localDataRaw = localStorage.getItem(STORAGE_KEY_PREFIX + uid);
        if (localDataRaw) {
            const localData = JSON.parse(localDataRaw);
            if (localData.history && Array.isArray(localData.history) && localData.history.length > 0) {
                const batch = writeBatch(db);
                let migrationCount = 0;
                
                for (const session of localData.history) {
                    const sessionRef = doc(db, "users", uid, "sessions", session.id);
                    batch.set(sessionRef, deepSanitize(session), { merge: true });
                    migrationCount++;
                }
                
                if (migrationCount > 0) {
                    await batch.commit();
                    // Clear local history after successful migration
                    localStorage.removeItem(STORAGE_KEY_PREFIX + uid);
                }
            }
        }
    } catch (e) {
        console.warn("Migration skipped:", e);
    }

    // 3. Fetch Full Session History
    let history: SessionRecord[] = [];
    try {
        const sessionsRef = collection(db, "users", uid, "sessions");
        const q = query(sessionsRef, orderBy("timestamp", "desc"));
        const sessionsSnapshot = await getDocs(q);
        history = sessionsSnapshot.docs.map(doc => doc.data() as SessionRecord);
    } catch (e) {
        console.warn("Could not fetch sessions (Offline).");
    }

    // Check admin status (might need to update for existing users)
    const isAdmin = fbUser.email && ADMIN_EMAILS.includes(fbUser.email);
    const role = isAdmin ? 'admin' : (userData.role || 'user');

    // Update role in Firestore if it changed
    if (userData.role !== role) {
        try {
            await updateDoc(userRef, { role });
        } catch(e) { console.warn("Could not update role"); }
    }

    return {
        id: userData.uid,
        name: userData.name,
        email: userData.email,
        photoUrl: userData.photoUrl || null,
        joinedAt: userData.joinedAt,
        insights: userData.insights || [],
        history: history,
        interactionCount: userData.interactionCount,
        lastLogin: userData.lastLogin,
        isGuest: userData.isGuest,
        plan: userData.plan || 'FREE',
        voiceProfile: userData.voiceProfile || undefined,
        role: role
    };
  },

  updateUserInsights: async (uid: string, newInsights: UserInsight[]) => {
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, {
            lastActive: Date.now(),
            interactionCount: increment(1)
        });
    } catch (e) { console.error("Update insights failed", e); }
  },

  uploadVideo: async (uid: string, blob: Blob): Promise<string> => {
      try {
        const filename = `sessions/${uid}/${Date.now()}.webm`;
        const storageRef = ref(storage, filename);
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
      } catch (e) {
          console.error("Upload failed", e);
          throw e;
      }
  },

  // Upload base64 image to Firebase Storage and return public URL
  uploadImage: async (uid: string, base64Data: string, assetType: string): Promise<string> => {
      try {
        // Extract the base64 data (remove data:image/png;base64, prefix)
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new Error("Invalid base64 string");
        }

        const mimeType = matches[1];
        const base64Content = matches[2];

        // Convert base64 to Blob
        const byteCharacters = atob(base64Content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        // Upload to Storage
        const ext = mimeType.split('/')[1] || 'png';
        const filename = `images/${uid}/${Date.now()}_${assetType.replace(/\s+/g, '_')}.${ext}`;
        const storageRef = ref(storage, filename);
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        return downloadUrl;
      } catch (e) {
          console.error("Image upload failed", e);
          throw e;
      }
  },

  // --- PROGRESSIVE SAVING (Prevents Data Loss) ---

  // Step 1: Create the placeholder immediately after recording
  createPendingSession: async (uid: string, style: InterviewStyle) => {
      const newSession: SessionRecord = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          style: style,
          transcription: "Processing...",
          insights: [],
          socialAssets: [],
          videoUrl: undefined
      };
      
      const sessionRef = doc(db, "users", uid, "sessions", newSession.id);
      
      // Use Deep Sanitize to prevent "undefined" crashes
      await setDoc(sessionRef, deepSanitize(newSession));
      
      // Update User Aggregate
      const userRef = doc(db, "users", uid);
      updateDoc(userRef, { totalSessions: increment(1), lastSessionAt: Date.now() }).catch(() => {});

      return newSession;
  },

  // Step 2, 3, 4: Update the session as data becomes available (Audio URL, Transcript, Images)
  updateSession: async (uid: string, sessionId: string, updates: Partial<SessionRecord>) => {
      const sessionRef = doc(db, "users", uid, "sessions", sessionId);
      
      // Sanitize partial updates too
      await setDoc(sessionRef, deepSanitize(updates), { merge: true });
      
      // Return the full updated doc (simulated) for UI state
      const snap = await getDoc(sessionRef);
      return snap.data() as SessionRecord;
  },

  // Fetch a single session fresh from Firestore
  getSession: async (uid: string, sessionId: string): Promise<SessionRecord | null> => {
      try {
          const sessionRef = doc(db, "users", uid, "sessions", sessionId);
          const snap = await getDoc(sessionRef);
          if (snap.exists()) {
              return snap.data() as SessionRecord;
          }
          return null;
      } catch (e) {
          console.error("Failed to fetch session", e);
          return null;
      }
  },

  // --- VOICE PROFILE (Onboarding Interview) ---
  saveVoiceProfile: async (uid: string, voiceProfile: VoiceProfile): Promise<void> => {
      const userRef = doc(db, "users", uid);
      try {
          await updateDoc(userRef, {
              voiceProfile: deepSanitize(voiceProfile),
              lastActive: Date.now()
          });
      } catch (e) {
          console.error("Save voice profile failed", e);
          throw e;
      }
  },

  // --- ADMIN FUNCTIONS ---
  getAllUsers: async () => {
      try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, orderBy("lastLogin", "desc"));
          const querySnapshot = await getDocs(q);
          return querySnapshot.docs.map(doc => doc.data());
      } catch (e) {
          console.error("Admin fetch failed", e);
          return [];
      }
  }
};