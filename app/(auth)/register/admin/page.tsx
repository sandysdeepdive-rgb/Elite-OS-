"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import EliteButton from "@/components/ui/EliteButton";
import { sanitizeText, sanitizeEmail } from "@/lib/utils/sanitize";
import { toast } from "sonner";

export default function AdminSignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (!fullName.trim() || !email.trim() || !password || !schoolName.trim() || !schoolCode.trim()) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (!/^[a-zA-Z0-9-]{3,20}$/.test(schoolCode.trim())) {
      setError("School code must be 3–20 characters, letters, numbers, and hyphens only.");
      setLoading(false);
      return;
    }

    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(
        auth, sanitizeEmail(email), password
      );
    } catch (authError: unknown) {
      const code = authError instanceof Error
        ? (authError as { code?: string }).code || ""
        : "";
      setError(getAuthErrorMessage(code));
      setLoading(false);
      return;
    }

    const uid = userCredential.user.uid;

    try {
      const res = await fetch("/api/auth/register-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-secret": process.env.NEXT_PUBLIC_API_SECRET!,
        },
        body: JSON.stringify({
          uid,
          email: sanitizeEmail(email),
          name: sanitizeText(fullName),
          schoolName: sanitizeText(schoolName),
          schoolCode: schoolCode.trim().toUpperCase(),
          phone: null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        await deleteUser(userCredential.user);
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      toast.success("School registered successfully! Welcome to EliteSchool OS.");
      router.push("/admin");

    } catch {
      await deleteUser(userCredential.user);
      setError("Registration failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background font-body text-on-surface min-h-screen relative flex flex-col">
      {/* Grain and Mesh Texture Overlays */}
      <div className="fixed inset-0 signature-mesh z-0"></div>
      <div className="fixed inset-0 grain-overlay z-10"></div>

      {/* Top Navigation Anchor */}
      <header className="relative z-20 flex justify-between items-center w-full px-6 py-8 md:px-12">
        <button
          onClick={() => router.back()}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container-high transition-colors active:scale-90 duration-200"
        >
          <span className="material-symbols-outlined text-primary">arrow_back</span>
        </button>

        {/* Brand Mark "E" */}
        <div className="w-12 h-12 bg-primary rounded-[10px] flex flex-col justify-center items-center gap-1 shadow-sm">
          <div className="h-0.5 w-6 bg-surface-container-lowest"></div>
          <div className="h-0.5 w-[16px] mr-[8px] bg-surface-container-lowest"></div>
          <div className="h-0.5 w-6 bg-surface-container-lowest"></div>
        </div>
        <div className="w-12"></div> {/* Spacer for balance */}
      </header>

      <main className="relative z-20 flex-grow flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-lg">
          {/* Header Section */}
          <div className="mb-12 text-center md:text-left">
            <h1 className="font-headline text-5xl md:text-6xl text-on-surface tracking-tight leading-none mb-4">
              Create Admin Account
            </h1>
            <p className="font-body text-on-secondary-container text-lg max-w-md">
              Establish institutional oversight for your school.
            </p>
          </div>

          {/* Signup Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="text-error text-sm text-center bg-error/10 py-2 rounded-lg">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 gap-6">
              {/* Full Name */}
              <div className="group">
                <label className="block font-label text-[10px] uppercase tracking-widest text-on-secondary-container mb-2 ml-4">
                  Full Name
                </label>
                <input
                  className="w-full h-14 px-6 bg-surface-container-low border-none rounded-full focus:ring-1 focus:ring-primary-container text-on-surface placeholder:text-on-secondary-container/40 transition-all"
                  placeholder="Dr. Julian Sterling"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {/* School Name & Code Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block font-label text-[10px] uppercase tracking-widest text-on-secondary-container mb-2 ml-4">
                    School Name
                  </label>
                  <input
                    className="w-full h-14 px-6 bg-surface-container-low border-none rounded-full focus:ring-1 focus:ring-primary-container text-on-surface placeholder:text-on-secondary-container/40 transition-all"
                    placeholder="Elite Academy"
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>
                <div className="group">
                  <label className="block font-label text-[10px] uppercase tracking-widest text-on-secondary-container mb-2 ml-4">
                    School Code
                  </label>
                  <input
                    className="w-full h-14 px-6 bg-surface-container-low border-none rounded-full focus:ring-1 focus:ring-primary-container text-on-surface placeholder:text-on-secondary-container/40 transition-all"
                    placeholder="ELITE-001"
                    type="text"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="group">
                <label className="block font-label text-[10px] uppercase tracking-widest text-on-secondary-container mb-2 ml-4">
                  Institutional Email
                </label>
                <input
                  className="w-full h-14 px-6 bg-surface-container-low border-none rounded-full focus:ring-1 focus:ring-primary-container text-on-surface placeholder:text-on-secondary-container/40 transition-all"
                  placeholder="admin@institution.edu"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Password Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group relative">
                  <label className="block font-label text-[10px] uppercase tracking-widest text-on-secondary-container mb-2 ml-4">
                    Password
                  </label>
                  <input
                    className="w-full h-14 px-6 bg-surface-container-low border-none rounded-full focus:ring-1 focus:ring-primary-container text-on-surface placeholder:text-on-secondary-container/40 transition-all"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 bottom-4 text-on-secondary-container/40 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
                <div className="group">
                  <label className="block font-label text-[10px] uppercase tracking-widest text-on-secondary-container mb-2 ml-4">
                    Confirm Password
                  </label>
                  <input
                    className="w-full h-14 px-6 bg-surface-container-low border-none rounded-full focus:ring-1 focus:ring-primary-container text-on-surface placeholder:text-on-secondary-container/40 transition-all"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Terms/Notice */}
            <p className="text-[11px] text-on-secondary-container/60 px-4 leading-relaxed">
              By registering, you acknowledge your authority to manage institutional data and
              agree to our{" "}
              <a className="underline underline-offset-2 hover:text-primary transition-colors" href="#">
                Digital Governance Policy
              </a>
              .
            </p>

            {/* CTA Button */}
            <EliteButton
              className="w-full h-16 text-lg mt-8"
              type="submit"
              loading={loading}
            >
              Register as Admin
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </EliteButton>
          </form>

          {/* Footer Link */}
          <div className="mt-12 text-center">
            <p className="font-body text-sm text-on-secondary-container">
              Already have an account?
              <Link
                className="text-primary-container font-medium hover:underline underline-offset-4 ml-1"
                href="/"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Aesthetic Decorative Element (Asymmetric Intent) */}
      <div className="fixed bottom-0 right-0 p-12 hidden lg:block z-10 pointer-events-none">
        <div className="w-64 h-64 opacity-20 transform rotate-12 bg-primary/20 rounded-xl filter grayscale contrast-125 border border-primary/30"></div>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-px w-8 bg-on-tertiary-container/30"></div>
          <span className="font-technical text-[10px] text-on-tertiary-container uppercase tracking-[0.2em]">
            Auth Module 2.0.4
          </span>
        </div>
      </div>

      {/* Background Support (Bottom corner gradient for depth) */}
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-tertiary-fixed/30 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
  );
}
