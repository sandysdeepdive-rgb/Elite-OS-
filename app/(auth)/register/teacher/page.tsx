"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { handleFirestoreError, OperationType } from "@/lib/firebase/errors";
import { sanitizeText, sanitizeEmail } from "@/lib/utils/sanitize";

export default function TeacherSignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Rate limiting check
    const attempts = parseInt(localStorage.getItem('reg_attempts') || '0', 10);
    const timeout = parseInt(localStorage.getItem('reg_timeout') || '0', 10);
    
    if (timeout > Date.now()) {
      const minutesLeft = Math.ceil((timeout - Date.now()) / 60000);
      setError(`Too many attempts. Please try again in ${minutesLeft} minutes.`);
      setLoading(false);
      return;
    }

    try {
      // Step 1 — Validate school code exists
      const schoolQuery = query(
        collection(db, "schools"),
        where("schoolCode", "==", schoolId.trim().toUpperCase())
      );
      
      let schoolSnap;
      try {
        schoolSnap = await getDocs(schoolQuery);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, "schools");
        return; // handleFirestoreError throws, but TS needs return
      }

      if (schoolSnap.empty) {
        setError("Invalid school code. Contact your administrator.");
        setLoading(false);
        return;
      }

      const schoolDoc  = schoolSnap.docs[0];
      const schoolIdDoc   = schoolDoc.id;
      const schoolName = schoolDoc.data().name;

      // Step 2 — Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth, sanitizeEmail(email), password
      );
      const uid = userCredential.user.uid;

      try {
        // Step 3 — Write user profile as pending
        await setDoc(doc(db, "users", uid), {
          name: sanitizeText(fullName),
          email: sanitizeEmail(email),
          role: "teacher",
          schoolId: schoolIdDoc,
          schoolName,
          schoolCode: sanitizeText(schoolId.toUpperCase()),
          linkedId: null,
          status: "pending",
          createdAt: serverTimestamp(),
        });

        // Step 4 — Write to pendingUsers subcollection
        // so Admin Approvals page can see it
        await setDoc(
          doc(db, "schools", schoolIdDoc, "pendingUsers", uid),
          {
            uid,
            name: sanitizeText(fullName),
            email: sanitizeEmail(email),
            role: "teacher",
            schoolCode: sanitizeText(schoolId.toUpperCase()),
            status: "pending",
            registeredAt: new Date().toLocaleDateString("en-UG", {
              day: "2-digit", month: "short",
              year: "numeric", hour: "2-digit", minute: "2-digit",
            }),
            createdAt: serverTimestamp(),
          }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid} or schools/${schoolIdDoc}/pendingUsers/${uid}`);
      }

      // Step 6 — Route to pending page (Keep them signed in so they see their status)
      router.push("/pending");

    } catch (err: any) {
      const newAttempts = attempts + 1;
      localStorage.setItem('reg_attempts', newAttempts.toString());
      if (newAttempts >= 5) {
        localStorage.setItem('reg_timeout', (Date.now() + 15 * 60000).toString());
      }

      const code = err?.code;
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (code === "auth/operation-not-allowed") {
        setError("Email/Password authentication is not enabled in Firebase.");
      } else if (code === "permission-denied") {
        setError("Database permission denied. Check Firestore rules.");
      } else {
        setError(err?.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-charcoal font-body min-h-screen selection:bg-petrol/20">
      <div className="grain-overlay"></div>
      <div className="mesh-gradient min-h-screen flex flex-col">
        {/* Header: TopAppBar logic */}
        <header className="fixed top-0 left-0 w-full z-40 bg-stone-100/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center shadow-sm shadow-stone-900/5">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-200/40 transition-colors active:scale-90 duration-200"
          >
            <span className="material-symbols-outlined" data-icon="arrow_back">
              arrow_back
            </span>
          </button>
          {/* Branded "E" mark */}
          <div className="w-10 h-10 bg-primary-container flex flex-col items-center justify-center gap-[3px] rounded-[10px] shadow-sm">
            <div className="w-5 h-[2px] bg-white rounded-full"></div>
            <div className="w-[14px] h-[2px] bg-white rounded-full self-start ml-[7px]"></div>
            <div className="w-5 h-[2px] bg-white rounded-full"></div>
          </div>
          <div className="w-10"></div> {/* Spacer for symmetry */}
        </header>

        <main className="flex-grow flex items-center justify-center px-6 pt-24 pb-12">
          <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-16 items-start">
            {/* Left Column: Branding & Content */}
            <section className="space-y-6 lg:pt-12">
              <h1 className="font-headline text-5xl md:text-7xl font-light tracking-tight text-primary leading-[1.1]">
                Teacher Registration
              </h1>
              <p className="text-taupe text-lg md:text-xl font-light max-w-md leading-relaxed">
                Join your academic faculty and manage your classes.
              </p>
              <div className="hidden md:block relative mt-12 rounded-xl overflow-hidden aspect-video shadow-2xl shadow-charcoal/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="minimalist professor study with antique desk and soft afternoon sunlight"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyaBKxwB1-IN09SiOqBN-TQU1KDW5o3nAqfR9E3666xKM7ds-5LliVWRQgKIfFh2oWUX0Jvld6a40tITna3egICXDJwFFLpdWjrsNl0mTH4vFaxRBAMk5Cmtgpw9MDg1EOHmW_WSfpQS0trSFYIbZqTOTYdNe68FpkwkCKT7PRuGsT_YtV98AEis7KofR5NXH4hKf62IR9dueFHLbfW9Enz1yQq0TrFa20jGt_jNs9qrGkis0UBaVSGkNcH0YCfhhreV3kw0vaA83r"
                />
                <div className="absolute inset-0 bg-petrol/10 mix-blend-multiply"></div>
              </div>
            </section>

            {/* Right Column: Registration Form */}
            <section className="bg-surface-container-low rounded-lg p-8 md:p-12 shadow-sm border border-outline-variant/15">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-[32px] text-primary-container">
                      schedule
                    </span>
                  </div>
                  <h2 className="font-headline text-3xl font-light italic text-primary mb-3">
                    Registration Submitted
                  </h2>
                  <p className="font-body text-sm text-on-surface-variant font-light leading-relaxed mb-8 max-w-sm mx-auto">
                    Your application has been sent to the school administrator.
                    You will receive access once it is approved.
                  </p>
                  <button
                    onClick={() => router.push("/")}
                    className="font-body text-sm text-primary-container font-medium hover:underline"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form className="space-y-8" onSubmit={handleSubmit}>
                  {error && (
                    <div className="text-error text-sm text-center bg-error/10 py-2 rounded-lg">
                      {error}
                    </div>
                  )}
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-medium uppercase tracking-widest text-taupe ml-4">
                      Full Name
                    </label>
                    <input
                      className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-petrol h-14 px-6 rounded-full text-charcoal placeholder:text-taupe/50 transition-all font-light"
                      placeholder="Dr. Julian Thorne"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  {/* School ID (Required) */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-medium uppercase tracking-widest text-taupe ml-4 flex items-center gap-2">
                      School Code
                      <span className="inline-block w-1 h-1 bg-error rounded-full"></span>
                    </label>
                    <div className="relative">
                      <span
                        className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-taupe/60 text-lg"
                        data-icon="badge"
                      >
                        badge
                      </span>
                      <input
                        className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-petrol h-14 pl-14 pr-6 rounded-full text-charcoal font-mono placeholder:text-taupe/50 transition-all uppercase"
                        placeholder="SCH-000"
                        required
                        type="text"
                        value={schoolId}
                        onChange={(e) => setSchoolId(e.target.value)}
                      />
                    </div>
                    <p className="text-[11px] text-taupe ml-4 font-light italic">
                      Required for faculty verification.
                    </p>
                  </div>

                  {/* Faculty Email */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-medium uppercase tracking-widest text-taupe ml-4">
                      Faculty Email
                    </label>
                    <input
                      className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-petrol h-14 px-6 rounded-full text-charcoal placeholder:text-taupe/50 transition-all font-light"
                      placeholder="thorne.j@institution.edu"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-medium uppercase tracking-widest text-taupe ml-4">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-petrol h-14 px-6 rounded-full text-charcoal placeholder:text-taupe/50 transition-all"
                        placeholder="••••••••••••"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-taupe hover:text-charcoal transition-colors"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <span
                          className="material-symbols-outlined text-xl"
                          data-icon="visibility_off"
                        >
                          {showPassword ? "visibility" : "visibility_off"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-4">
                    <button
                      className="w-full bg-primary-container text-white h-14 rounded-full font-medium tracking-wide shadow-lg shadow-petrol/20 hover:bg-primary transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "Registering..." : "Register as Teacher"}
                      {!loading && (
                        <span
                          className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform"
                          data-icon="arrow_forward"
                        >
                          arrow_forward
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-4">
                    <span className="text-sm text-taupe font-light">
                      Already part of the faculty?
                    </span>
                    <Link
                      className="text-sm text-petrol font-medium hover:underline decoration-petrol/30 underline-offset-4"
                      href="/"
                    >
                      Sign In
                    </Link>
                  </div>
                </form>
              )}
            </section>
          </div>
        </main>

        {/* Contextual Footer Metadata */}
        <footer className="p-8 mt-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-taupe tracking-widest uppercase">
          <div className="flex gap-8">
            <a className="hover:text-charcoal transition-colors" href="#">
              Privacy Protocol
            </a>
            <a className="hover:text-charcoal transition-colors" href="#">
              Faculty Guidelines
            </a>
          </div>
          <div className="font-mono opacity-60">System Ver. 2.4.0-ACADEMIC</div>
        </footer>
      </div>
    </div>
  );
}
