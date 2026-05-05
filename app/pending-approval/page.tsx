"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import EliteButton from "@/components/ui/EliteButton";

export default function PendingApproval() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserName(user.displayName || "User");
        setUserEmail(user.email || "");
      } else {
        router.push("/");
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const checkStatus = async () => {
      if (!auth.currentUser) return;
      const docRef = doc(db, "users", auth.currentUser.uid);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const status = snap.data().status;
          if (status === "approved") {
            const role = snap.data().role;
            const routes: Record<string, string> = {
              admin: "/admin/dashboard",
              teacher: "/teacher/dashboard",
              parent: "/parent/dashboard",
            };
            router.push(routes[role] || "/");
          } else if (status === "rejected") {
            // Optional: Handle rejected state if needed.
            // signOut(auth);
            // router.push("/?error=rejected");
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    const interval = setInterval(checkStatus, 30000); // 30s
    checkStatus(); // Initial check

    return () => clearInterval(interval);
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-6 relative overflow-hidden font-body text-deep-charcoal">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 bg-cloud">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 grain-overlay"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-petrol/5 rounded-full blur-[150px]"></div>
      </div>

      <main className="w-full max-w-lg bg-white/90 backdrop-blur-xl rounded-[40px] shadow-[0_32px_64px_rgba(20,20,22,0.08)] p-12 text-center border border-white/20 relative z-10">
        <div className="mx-auto w-20 h-20 bg-petrol/10 rounded-full flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-[40px] text-petrol">
            hourglass_empty
          </span>
        </div>

        <h1 className="font-headline text-4xl text-petrol tracking-tight mb-4">
          Application Submitted
        </h1>

        <p className="text-deep-charcoal/70 font-light leading-relaxed mb-8">
          Your account is pending approval from your school administrator. You&apos;ll be able to log in once approved. This usually takes less than 24 hours.
        </p>

        <div className="bg-cloud p-6 rounded-2xl mb-8 border border-outline-variant/10">
          <p className="font-medium text-petrol mb-1">{userName}</p>
          <p className="text-sm text-deep-charcoal/60 font-mono tracking-wide">{userEmail}</p>
        </div>

        <EliteButton
          onClick={handleSignOut}
          variant="outlined"
          className="w-full h-14 tracking-widest text-xs uppercase"
        >
          Sign Out
        </EliteButton>
      </main>
    </div>
  );
}
