
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { toast } from "sonner";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBImW_34XwrloXxMu3cvJIMpK74OGBEX30",
  authDomain: "sponge-hydration.firebaseapp.com",
  projectId: "sponge-hydration",
  storageBucket: "sponge-hydration.appspot.com",
  messagingSenderId: "549723847202",
  appId: "1:549723847202:web:1db2b27a559b43d255a87b",
  measurementId: "G-H3G6KSR0RT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export interface AuthUser {
  id: string;
  email: string | null;
}

class FirebaseService {
  async login(email: string, password: string): Promise<AuthUser | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      return {
        id: user.uid,
        email: user.email
      };
    } catch (error: any) {
      const errorMessage = error.message || "Authentication failed";
      toast.error(errorMessage);
      return null;
    }
  }

  async logout(): Promise<boolean> {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }

  getCurrentUser(): AuthUser | null {
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.uid,
      email: user.email
    };
  }
}

export const firebaseService = new FirebaseService();
