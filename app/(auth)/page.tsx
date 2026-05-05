"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { signInWithGoogle } from "@/lib/google-auth";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check for existing session on load
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          let data: any = { valid: false, reason: "no_profile" };
          if (userDoc.exists()) {
            const u = userDoc.data();
            if (u.status !== "approved") {
              data = { valid: false, reason: "not_approved" };
            } else {
              data = { valid: true, role: u.role, schoolId: u.schoolId };
            }
          }
          if (data.valid) {
            const routes: any = {
              admin:   "/admin/dashboard",
              teacher: "/teacher/dashboard",
              parent:  "/parent/dashboard",
            };
            router.push(routes[data.role] || "/");
            return;
          } else if (data.reason === "not_approved") {
            router.push("/pending-approval");
            return;
          }
        } catch (e) {
          console.error("Session check failed", e);
        }
      }
      setCheckingSession(false);
    });
    return () => unsub();
  });

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      setResetError("Please enter your email address.");
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-not-found" ||
          code === "auth/invalid-email") {
        setResetError("No account found with this email.");
      } else {
        setResetError("Failed to send reset email. Try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Rate limiting check
    const attempts = parseInt(localStorage.getItem('login_attempts') || '0', 10);
    const timeout = parseInt(localStorage.getItem('login_timeout') || '0', 10);
    
    if (timeout > Date.now()) {
      const minutesLeft = Math.ceil((timeout - Date.now()) / 60000);
      setError(`Too many attempts. Please try again in ${minutesLeft} minutes.`);
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, email, password
      );

      const { doc, getDoc } = await import("firebase/firestore");
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      let data: any = { valid: false, reason: "no_profile" };
      if (userDoc.exists()) {
        const u = userDoc.data();
        if (u.status !== "approved") {
          data = { valid: false, reason: "not_approved" };
        } else {
          data = { valid: true, role: u.role, schoolId: u.schoolId };
        }
      }

      if (!data.valid && data.reason !== "not_approved") {
        setError("Account not configured. Contact your administrator.");
        await auth.signOut();
        return;
      }

      if (data.reason === "not_approved") {
        router.push("/pending-approval");
        return;
      }

      // Route based on role
      const routes: any = {
        admin:   "/admin/dashboard",
        teacher: "/teacher/dashboard",
        parent:  "/parent/dashboard",
      };

      // Reset login attempts on success
      localStorage.removeItem('login_attempts');
      localStorage.removeItem('login_timeout');

      router.push(routes[data.role] || "/");

    } catch (err: any) {
      const newAttempts = attempts + 1;
      localStorage.setItem('login_attempts', newAttempts.toString());
      if (newAttempts >= 5) {
        localStorage.setItem('login_timeout', (Date.now() + 15 * 60000).toString());
      }

      const code = err?.code;
      if (code === "auth/invalid-credential" ||
          code === "auth/user-not-found" ||
          code === "auth/wrong-password") {
        setError("Incorrect email or password.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/user-disabled") {
        setError("This account has been disabled.");
      } else if (code === "permission-denied") {
        setError("Access denied. Please contact your administrator.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait and try again.");
      } else {
        setError(`Login failed. Please try again. ${err?.message || ''}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const user = await signInWithGoogle();

      const { doc, getDoc } = await import("firebase/firestore");
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      let data: any = { exists: false };
      if (userDoc.exists()) {
        const uData = userDoc.data();
        data = { exists: true, status: uData.status, role: uData.role };
      }

      if (data.exists && data.status === 'approved') {
        const routes: any = {
          admin: "/admin/dashboard",
          teacher: "/teacher/dashboard",
          parent: "/parent/dashboard",
        };
        router.push(routes[data.role] || "/");
      } else if (data.exists && data.status === 'pending') {
        router.push('/pending-approval');
      } else if (data.exists && data.status === 'rejected') {
        setError("Your account application was rejected. Please contact the administrator.");
      } else {
        // New Google user — collect role + school info
        sessionStorage.setItem('google_pending_uid', user.uid);
        sessionStorage.setItem('google_pending_email', user.email!);
        sessionStorage.setItem('google_pending_name', user.displayName!);
        router.push('/auth/google-setup');
      }
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        return; // User cancelled
      }
      toast.error('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="mesh-gradient min-h-screen flex items-center justify-center font-body text-petrol">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-petrol/20 border-t-petrol rounded-full animate-spin"></div>
          <p className="text-sm font-light tracking-widest uppercase">Checking Session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-gradient min-h-screen flex items-center justify-center p-6 font-body text-deep-charcoal relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="fixed top-20 left-20 hidden lg:block opacity-[0.05]">
        <h2 className="font-headline text-[160px] text-petrol select-none leading-none -rotate-12">
          Elite
        </h2>
      </div>
      <div className="fixed bottom-20 right-20 hidden lg:block">
        <div className="flex flex-col items-end space-y-2">
          <span className="font-mono text-[10px] text-deep-charcoal/40 tracking-[0.3em] uppercase font-bold">
            System Status
          </span>
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
            <span className="w-2 h-2 rounded-full bg-petrol animate-pulse"></span>
            <span className="font-mono text-[11px] text-petrol font-medium">
              Core Modules Operational
            </span>
          </div>
        </div>
      </div>

      {/* Background Image with Tonal Layering */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-cloud"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-petrol/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-deep-charcoal/5 rounded-full blur-[100px]"></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="w-full h-full object-cover opacity-[0.04] mix-blend-multiply"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-se-ZjEcS4qQkcUVjRUybXgX66dESIh696WJ4o8YwX-7CU22mUPTKE3wflnGx2iGfu5yU7h3YBGjr_DTvSEOPA_5x2kvte74kGmnjfzgHB0GlWP9MX1LdsV3BnGKkOzjbfN_jAANYAI0OoAN0sh-ksPlcAHLZCSXysa1ySK8BwfkoIwjZldDpeIVvR0zPjH7nqL5uZ4N5ezxtQw0vxjEWmbynGu7EfXjrSx1OiPhYriAAMFU6xSdg18HZoSF1URaJxwPlvQohMqIa"
        />
      </div>

      {/* Login Shell */}
      <main className="w-full max-w-[440px] bg-white/90 backdrop-blur-xl rounded-[40px] shadow-[0_32px_64px_rgba(20,20,22,0.08)] overflow-hidden flex flex-col items-center p-10 md:p-14 relative z-10 border border-white/20">
        {/* Brand Mark "E" */}
        <div className="mb-10 flex flex-col items-center justify-center w-14 h-14 bg-petrol rounded-2xl p-3 shadow-lg shadow-petrol/20">
          <div className="w-full h-[3px] bg-cloud mb-1.5 rounded-full"></div>
          <div className="w-[70%] h-[3px] bg-cloud mb-1.5 self-start rounded-full"></div>
          <div className="w-full h-[3px] bg-cloud rounded-full"></div>
        </div>

        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="font-headline text-[36px] font-medium leading-tight tracking-tight text-petrol">
            Welcome to EliteSchool
          </h1>
          <p className="text-deep-charcoal/60 font-light text-sm mt-2 tracking-wide uppercase">
            Institutional Access Portal
          </p>
        </header>

        {/* Form */}
        <form className="w-full space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-error text-sm text-center bg-error/10 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label
              className="block text-[10px] uppercase tracking-[0.2em] font-bold text-deep-charcoal/40 px-6"
              htmlFor="email"
            >
              Email Address
            </label>
            <div className="relative">
              <input
                className="w-full px-8 py-4 bg-cloud border-none rounded-pill text-sm font-light focus:ring-2 focus:ring-petrol/10 placeholder:text-outline-variant transition-all outline-none"
                id="email"
                name="email"
                placeholder="e.g. name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="block text-[10px] uppercase tracking-[0.2em] font-bold text-deep-charcoal/40 px-6"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                className="w-full px-8 py-4 bg-cloud border-none rounded-pill text-sm font-light focus:ring-2 focus:ring-petrol/10 placeholder:text-outline-variant transition-all outline-none"
                id="password"
                name="password"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-outline-variant hover:text-deep-charcoal transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              className="w-full bg-petrol text-cloud rounded-pill py-4 px-6 text-sm font-medium tracking-[0.1em] uppercase shadow-xl shadow-petrol/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </div>
        </form>

        <div className="w-full relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-petrol/10" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold">
            <span className="bg-white/95 px-4 text-deep-charcoal/40">or</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 border border-petrol/10 rounded-pill bg-white hover:bg-cloud active:scale-[0.98] transition-all font-body text-sm text-petrol font-medium tracking-wide disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          Continue with Google
        </button>

        {/* Footer Actions */}
        <footer className="mt-8 flex flex-col items-center space-y-6 w-full">
          <button
            onClick={() => setShowForgotModal(true)}
            className="text-[13px] text-petrol/60 hover:text-petrol
                       transition-colors font-medium tracking-wide"
          >
            Forgot password?
          </button>
          <div className="flex items-center gap-3 w-full">
            <div className="h-[1px] flex-1 bg-deep-charcoal/5"></div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-deep-charcoal/30 font-bold whitespace-nowrap">
              Authorized Users Only
            </span>
            <div className="h-[1px] flex-1 bg-deep-charcoal/5"></div>
          </div>
          <div className="pt-2">
            <p className="text-[13px] text-deep-charcoal/60">
              Don&apos;t have an account?
              <Link
                className="text-petrol font-bold ml-1 hover:underline underline-offset-4"
                href="/register"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </footer>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center
                        justify-center p-6 bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white/95 backdrop-blur-xl
                          rounded-[28px] p-8
                          shadow-[0_32px_64px_rgba(20,20,22,0.12)]">
            {!resetSent ? (
              <>
                <h3 className="font-headline text-2xl font-medium
                               tracking-tight text-petrol mb-2">
                  Reset Password
                </h3>
                <p className="font-body text-sm text-deep-charcoal/60
                              font-light mb-6 leading-relaxed">
                  Enter your email address and we will send you
                  a link to reset your password.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase
                                      tracking-[0.2em] font-bold
                                      text-deep-charcoal/40 px-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-6 py-4 bg-cloud border-none
                                 rounded-full text-sm font-light
                                 focus:ring-2 focus:ring-petrol/10
                                 outline-none transition-all"
                    />
                  </div>
                  {resetError && (
                    <p className="font-body text-xs text-red-500
                                  text-center">{resetError}</p>
                  )}
                  <button
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="w-full bg-petrol text-cloud rounded-full
                               py-4 text-sm font-medium tracking-[0.1em]
                               uppercase shadow-xl shadow-petrol/20
                               hover:brightness-110 active:scale-[0.98]
                               transition-all disabled:opacity-50">
                    {resetLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                  <button
                    onClick={() => {
                      setShowForgotModal(false);
                      setResetEmail("");
                      setResetError("");
                    }}
                    className="w-full font-body text-sm text-deep-charcoal/50
                               hover:text-deep-charcoal transition-colors py-2">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-petrol/10
                                flex items-center justify-center
                                mx-auto mb-5">
                  <span className="material-symbols-outlined text-[32px]
                                   text-petrol">
                    mark_email_read
                  </span>
                </div>
                <h3 className="font-headline text-2xl font-medium
                               text-petrol mb-2">
                  Check Your Email
                </h3>
                <p className="font-body text-sm text-deep-charcoal/60
                              font-light mb-6 leading-relaxed">
                  We sent a password reset link to{" "}
                  <strong className="font-medium text-deep-charcoal">
                    {resetEmail}
                  </strong>
                </p>
                <button
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetSent(false);
                    setResetEmail("");
                  }}
                  className="w-full bg-petrol text-cloud rounded-full
                             py-4 text-sm font-medium tracking-[0.1em]
                             uppercase">
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
