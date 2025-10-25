import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, googleProvider } from "../lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  User,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from "firebase/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  // Passwordless Email Link flow
  sendEmailLink: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Complete Email Link sign-in if the current URL is a sign-in link
  useEffect(() => {
    async function tryCompleteEmailLink() {
      try {
        if (isSignInWithEmailLink(auth, window.location.href)) {
          // Retrieve the email we stored when sending the link
          let email = window.localStorage.getItem("emailForSignIn") || "";
          if (!email) {
            // As a fallback, ask the user for their email (must match the one the link was sent to)
            email = window.prompt("Please confirm your email for sign-in") || "";
          }
          if (email) {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem("emailForSignIn");
            // Clean the URL so query params (oobCode, apiKey, etc.) don't stick around
            const { origin, pathname } = window.location;
            window.history.replaceState({}, "", origin + pathname);
          }
        }
      } catch (e) {
        console.error("Email link sign-in failed", e);
      }
    }
    tryCompleteEmailLink();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async signIn() {
      await signInWithPopup(auth, googleProvider);
    },
    async signOut() {
      await fbSignOut(auth);
    },
    async sendEmailLink(email: string) {
      const actionCodeSettings = {
        // After clicking the email link, return to the dedicated auth page
        url: `${window.location.origin}/auth`,
        handleCodeInApp: true,
        // If you set up iOS/Android apps, include these:
        // iOS: { bundleId: "com.example.ios" },
        // android: { packageName: "com.example.app", installApp: true, minimumVersion: "12" },
        // Optionally set a custom Dynamic Links domain if configured in Firebase Hosting
        // dynamicLinkDomain: "example.page.link",
      } as const;

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Store email locally so we can complete sign-in without asking again
      window.localStorage.setItem("emailForSignIn", email);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
