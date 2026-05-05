'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

import { UserRole, UserStatus } from "@/lib/types";

interface UserProfile {
  role: UserRole;
  schoolId: string;
  name: string;
  status: UserStatus;
}

export default function AuthGate({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole: UserRole;
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
        
        let data: any = { valid: false, reason: "no_profile" };
        if (userDoc.exists()) {
          const u = userDoc.data();
          if (u.status !== "approved") {
            data = { valid: false, reason: "not_approved" };
          } else if (u.role !== requiredRole) {
            data = { valid: false, reason: "wrong_role", redirectRole: u.role };
          } else {
            data = { valid: true };
          }
        }

        if (data.valid) {
          setStatus("authorized");
        } else {
          if (data.reason === "not_approved") {
            setStatus("pending");
            router.push("/pending-approval");
          } else if (data.reason === "wrong_role" && data.redirectRole) {
            setStatus("unauthorized");
            router.push(`/${data.redirectRole}/dashboard`);
          } else {
            setStatus("unauthorized");
            router.push("/");
          }
        }
      } catch (err) {
        setStatus("unauthorized");
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
