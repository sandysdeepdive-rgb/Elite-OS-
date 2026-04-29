'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

interface UserProfile {
  role: "admin" | "teacher" | "parent";
  schoolId: string;
  name: string;
  status: "active" | "pending";
}

export default function AuthGate({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole: "admin" | "teacher" | "parent";
}) {
  const router = useRouter();
  const [status, setStatus] = useState<
    "loading" | "authorized" | "unauthorized" | "pending"
  >("loading");

  useEffect(() => {
    // 4-second fallback — never leave user stuck
    const timeout = setTimeout(() => {
      setStatus("unauthorized");
      router.push("/");
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);

      if (!user) {
        router.push("/");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (!userDoc.exists()) {
          router.push("/");
          return;
        }

        const profile = userDoc.data() as UserProfile;

        if (profile.status === "pending") {
          router.push("/pending");
          return;
        }

        if (profile.role !== requiredRole) {
          // Redirect to correct dashboard
          router.push(`/${profile.role}/dashboard`);
          return;
        }

        setStatus("authorized");
      } catch {
        router.push("/");
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, requiredRole]);

  if (status === "loading") {
    return (
      <div className="min-h-screen mesh-gradient-bg flex items-center
                      justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-container rounded-[10px]
                          flex flex-col justify-center items-center gap-1
                          mx-auto mb-6 animate-pulse">
            <div className="w-6 h-[3px] bg-white rounded-full" />
            <div className="w-4 h-[3px] bg-white rounded-full" />
            <div className="w-6 h-[3px] bg-white rounded-full" />
          </div>
          <p className="font-label text-[10px] uppercase tracking-[0.2em]
                        text-outline">
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
