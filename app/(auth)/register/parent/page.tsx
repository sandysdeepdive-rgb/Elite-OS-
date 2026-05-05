"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { sanitizeText, sanitizeEmail } from "@/lib/utils/sanitize";

export default function ParentSignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [studentId, setStudentId] = useState("");
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

    let userCredential;
    try {
      // Step 3 — Create Firebase Auth account
      userCredential = await createUserWithEmailAndPassword(
        auth, sanitizeEmail(email), password
      );
    } catch (authError: any) {
      const newAttempts = attempts + 1;
      localStorage.setItem('reg_attempts', newAttempts.toString());
      if (newAttempts >= 5) {
        localStorage.setItem('reg_timeout', (Date.now() + 15 * 60000).toString());
      }
      setError(getAuthErrorMessage(authError.code));
      setLoading(false);
      return;
    }

    const uid = userCredential.user.uid;

    try {
      const { collection, query, where, getDocs, doc, setDoc } = await import("firebase/firestore");
      
      const schoolCodeUpper = schoolId.trim().toUpperCase();
      const schoolsSnap = await getDocs(query(collection(db, "schools"), where("schoolCode", "==", schoolCodeUpper)));
      
      if (schoolsSnap.empty) {
        await deleteUser(userCredential.user);
        setError("Invalid school code");
        setLoading(false);
        return;
      }
      
      const matchedSchoolId = schoolsSnap.docs[0].id;

      // Verify student ID
      const studentIdUpper = studentId.trim().toUpperCase();
      const studentSnap = await getDocs(query(collection(db, "schools", matchedSchoolId, "students"), where("id", "==", studentIdUpper)));
      
      const linkedStudentId = studentSnap.empty ? studentIdUpper : studentSnap.docs[0].id;

      await setDoc(doc(db, "users", uid), {
        uid,
        email: sanitizeEmail(email),
        name: fullName,
        role: "parent",
        schoolId: matchedSchoolId,
        schoolCode: schoolCodeUpper,
        status: "pending",
        linkedId: linkedStudentId,
        phone: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setSubmitted(true);
      router.push("/pending-approval");

    } catch (err: any) {
      await deleteUser(userCredential.user);
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-background font-body text-charcoal min-h-screen relative overflow-x-hidden">
      <div className="grain-texture"></div>
      <div className="mesh-gradient absolute inset-0 pointer-events-none"></div>

      {/* Header (Shared Component: TopAppBar style) */}
      <header className="fixed top-0 left-0 w-full z-40 bg-stone-100/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-200/40 transition-colors active:scale-90 duration-200"
        >
          <span className="material-symbols-outlined text-teal-900" data-icon="arrow_back">
            arrow_back
          </span>
        </button>
        <div className="brand-mark shadow-sm w-10 h-10 bg-primary-container flex flex-col items-center justify-center gap-[3px] rounded-[10px]">
          <div className="brand-bar w-5 h-[2px] bg-white rounded-full"></div>
          <div className="brand-bar w-3.5 h-[2px] bg-white rounded-full mr-auto ml-1.5"></div>
          <div className="brand-bar w-5 h-[2px] bg-white rounded-full"></div>
        </div>
        <div className="w-10"></div> {/* Spacer for balance */}
      </header>

      <main className="relative z-10 pt-32 pb-20 px-6 max-w-xl mx-auto">
        {/* Title Section */}
        <section className="mb-12">
          <h1 className="font-headline text-5xl md:text-6xl text-primary leading-tight tracking-tight mb-4">
            Parental Engagement
          </h1>
          <p className="text-taupe text-lg md:text-xl font-light max-w-sm">
            Connect with your student&apos;s academic journey.
          </p>
        </section>

        {/* Registration Form */}
        {submitted ? (
          <div className="text-center py-8 bg-surface-container-low rounded-lg p-8 md:p-12 shadow-sm border border-outline-variant/15">
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
            <div className="space-y-6">
              {/* Field Group: Personal */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest text-taupe font-medium px-4">
                    Full Name
                  </label>
                  <input
                    className="w-full h-14 bg-surface-container-low border-none rounded-full px-6 focus:ring-1 focus:ring-primary-container text-charcoal placeholder:text-stone-400"
                    placeholder="Johnathan Doe"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest text-taupe font-medium px-4">
                    Email Address
                  </label>
                  <input
                    className="w-full h-14 bg-surface-container-low border-none rounded-full px-6 focus:ring-1 focus:ring-primary-container text-charcoal placeholder:text-stone-400"
                    placeholder="j.doe@institution.edu"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Field Group: Academic Links (Asymmetric Layout Hint) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-4">
                    <label className="block text-[10px] uppercase tracking-widest text-taupe font-medium">
                      School Code
                    </label>
                    <span className="text-[8px] text-primary/60 italic">(Required)</span>
                  </div>
                  <input
                    className="w-full h-14 bg-surface-container-low border-none rounded-full px-6 focus:ring-1 focus:ring-primary-container font-technical text-sm text-charcoal placeholder:text-stone-300 uppercase"
                    placeholder="SCH-000"
                    type="text"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-4">
                    <label className="block text-[10px] uppercase tracking-widest text-taupe font-medium">
                      Student ID
                    </label>
                    <span className="text-[8px] text-primary/60 italic">(Required)</span>
                  </div>
                  <input
                    className="w-full h-14 bg-surface-container-low border-none rounded-full px-6 focus:ring-1 focus:ring-primary-container font-technical text-sm text-charcoal placeholder:text-stone-300 uppercase"
                    placeholder="STU-12345"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-[10px] uppercase tracking-widest text-taupe font-medium px-4">
                  Password
                </label>
                <div className="relative">
                  <input
                    className="w-full h-14 bg-surface-container-low border-none rounded-full px-6 focus:ring-1 focus:ring-primary-container text-charcoal placeholder:text-stone-400"
                    placeholder="••••••••••••"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-400"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-sm" data-icon="visibility">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Verification Card (Tonal Layering) */}
            <div className="bg-surface-container-high rounded-lg p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <span
                  className="material-symbols-outlined text-primary-container"
                  data-icon="verified_user"
                >
                  verified_user
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-primary">Academic Linkage</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  By providing a valid Student ID, you gain real-time access to attendance, grades, and direct messaging with faculty.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4">
              <button
                className="w-full h-16 bg-primary-container text-on-primary rounded-full font-medium text-lg shadow-xl shadow-primary-container/20 hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading ? "Registering..." : "Link Student & Register"}
              </button>
            </div>

            <p className="text-center text-xs text-taupe mt-8">
              Already have a parental account?{" "}
              <Link
                className="text-primary font-semibold underline underline-offset-4"
                href="/"
              >
                Log in
              </Link>
            </p>
          </form>
        )}
      </main>

      {/* Decorative Element (Asymmetric) */}
      <div className="hidden lg:block fixed right-[-5%] top-[20%] w-[400px] h-[600px] opacity-10 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Architectural detail of a classic university hallway with high arched ceilings and soft shadows"
          className="w-full h-full object-cover rounded-[100px] grayscale"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPYMP_fZ05KJqw_Z4MHnxqV9phFQiA10_xb4Vh5n4kMxrRi2GyyEoeaTARoqQA74L3y4L1JiO3UsCcLY2DY5gjQ4qptJqodZ--rh0_n74KTCi093muciEpxEsfLwA9QucRQ7KEcFH87rfI4XV0cjfVE_Th4qCRtUPQG_XMbfRNkZANhwpvNQtrVRNySEIuZLSwkWLkWfuhMvhXlC3jhH6wCZbA4D5C67W4t3tjmBT6Nz9h7Xiwj0IltmoTCY8_2us4fKEFhaAzYzhx"
        />
      </div>
    </div>
  );
}
