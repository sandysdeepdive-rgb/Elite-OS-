"use client";

import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import EliteButton from "@/components/ui/EliteButton";

export default function PendingPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <div className="mesh-gradient min-h-screen flex items-center justify-center p-6 font-body text-deep-charcoal">
      <main className="w-full max-w-[500px] bg-white/90 backdrop-blur-xl rounded-[40px] shadow-xl p-10 md:p-14 text-center space-y-8 border border-white/20">
        <div className="w-20 h-20 bg-petrol/10 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
          <span className="material-symbols-outlined text-[40px] text-petrol">
            schedule
          </span>
        </div>
        
        <div className="space-y-4">
          <h1 className="font-headline text-[32px] font-medium leading-tight text-petrol">
            Application Received
          </h1>
          <p className="text-deep-charcoal/70 font-light leading-relaxed">
            Your registration is currently being reviewed by the school administrator. 
            Access to the dashboards will be available once your account has been approved.
          </p>
        </div>

        <div className="bg-cloud/50 rounded-2xl p-6 border border-white/40">
          <h4 className="text-[12px] uppercase font-bold tracking-widest text-deep-charcoal/40 mb-2">
            Next Steps
          </h4>
          <p className="text-[13px] text-petrol font-medium">
            1. An administrator will verify your credentials.<br/>
            2. You will receive an SMS notification upon approval.<br/>
            3. You can then log in using your email and password.
          </p>
        </div>

        <div className="pt-4 space-y-4">
          <p className="text-[14px] text-deep-charcoal/50">
            Need to sign in with a different account?
          </p>
          <EliteButton 
            variant="outlined" 
            fullWidth 
            onClick={handleLogout}
          >
            Logout & Return to Login
          </EliteButton>
        </div>
      </main>
    </div>
  );
}
