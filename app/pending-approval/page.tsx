"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import EliteButton from "@/components/ui/EliteButton";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/");
        return;
      }

      setUserEmail(user.email || "");
      setUserName(user.displayName || "");

      // Listen for status changes in real time
      const unsubscribeDoc = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          setLoading(false);
          if (!snap.exists()) return;

          const data = snap.data();
          const currentStatus = data?.status;
          setStatus(currentStatus);

          if (currentStatus === "approved") {
            const role = data?.role;
            router.replace(`/${role}`);
          }
        },
        () => setLoading(false)
      );

      return () => unsubscribeDoc();
    });

    return () => unsubscribeAuth();
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">

        {status === "rejected" ? (
          <>
            <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-error text-4xl">cancel</span>
            </div>
            <h1 className="font-headline text-4xl font-light text-on-surface">
              Registration Declined
            </h1>
            <p className="font-body text-on-surface-variant text-base leading-relaxed">
              Your registration has been declined by the school administrator.
              Please contact your school directly for assistance.
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-primary-container/20 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-primary text-4xl">hourglass_top</span>
            </div>
            <h1 className="font-headline text-4xl font-light text-on-surface">
              Application Submitted
            </h1>
            <p className="font-body text-on-surface-variant text-base leading-relaxed">
              Your account is pending approval from your school administrator.
              You will be redirected automatically once approved.
            </p>
            {userName && (
              <p className="font-body text-sm text-outline">{userName}</p>
            )}
            {userEmail && (
              <p className="font-body text-sm text-outline">{userEmail}</p>
            )}
            <div className="flex items-center justify-center gap-2 text-xs text-outline">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Waiting for administrator approval
            </div>
          </>
        )}

        <div className="pt-4">
          <EliteButton variant="outlined" onClick={handleSignOut}>
            Sign Out
          </EliteButton>
        </div>
      </div>
    </div>
  );
}
