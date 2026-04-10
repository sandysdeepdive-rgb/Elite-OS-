'use client';
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/config";

interface TopAppBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  variant?: "default" | "transparent" | "chat";
  className?: string;
  // NEW PROPS
  showBrand?: boolean;  // default true — shows E mark + EliteSchool OS
  userInitials?: string; // shows user avatar circle top-right
}

export default function TopAppBar({
  title,
  subtitle,
  showBack = false,
  onBack,
  actions,
  variant = "default",
  className = "",
  showBrand = true,
}: TopAppBarProps) {
  const router = useRouter();
  const [initials, setInitials] = useState("");
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const name = userDoc.data().name || "";
        setInitials(
          name.split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        );
      }
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <>
      <header className={`
        ${variant === "transparent"
          ? "bg-transparent"
          : "bg-[#F4F2ED]/80 dark:bg-[#141416]/80 backdrop-blur-xl"}
        sticky top-0 z-50
        ${variant !== "transparent"
          ? "border-b border-outline-variant/30" : ""}
        px-6 py-4
        flex items-center gap-4
        ${className}
      `}>

        {/* Left slot */}
        {showBack ? (
          <button
            onClick={onBack || (() => router.back())}
            className="w-10 h-10 rounded-full bg-surface-container
                       flex items-center justify-center flex-shrink-0
                       hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[20px]
                             text-on-surface-variant">
              arrow_back
            </span>
          </button>
        ) : showBrand ? (
          // Brand mark — always shown when no back button
          <div className="w-10 h-10 bg-primary-container rounded-[10px]
                          flex flex-col justify-center items-center
                          gap-[3px] flex-shrink-0 shadow-sm">
            <div className="w-5 h-[2.5px] bg-white rounded-full" />
            <div className="w-3.5 h-[2.5px] bg-white rounded-full
                            self-start ml-[7px]" />
            <div className="w-5 h-[2.5px] bg-white rounded-full" />
          </div>
        ) : null}

        {/* Center — title or app name */}
        <div className="flex-1 min-w-0">
          {title ? (
            <>
              <h1 className="font-headline text-[22px] font-light
                             italic tracking-tight text-primary truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="font-label text-[10px] uppercase
                              tracking-[0.15em] text-outline mt-0.5">
                  {subtitle}
                </p>
              )}
            </>
          ) : (
            // Default — show app name when no title
            <span className="font-headline text-[18px] font-light
                             italic tracking-tight text-primary">
              EliteSchool OS
            </span>
          )}
        </div>

        {/* Right slot — actions + user avatar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}

          {/* User initials avatar — always shown */}
          {initials && (
            <div className="relative">
              <button
                onClick={() => setShowLogout(p => !p)}
                className="w-10 h-10 rounded-full bg-primary-container
                           flex items-center justify-center
                           shadow-sm hover:opacity-90 transition-opacity">
                <span className="font-label text-[13px] text-white
                                 font-medium">
                  {initials}
                </span>
              </button>

              {/* Logout dropdown */}
              {showLogout && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowLogout(false)}
                  />
                  <div className="absolute right-0 top-12 z-50
                                  bg-surface-container-lowest
                                  border border-outline-variant/30
                                  rounded-2xl shadow-lg
                                  overflow-hidden min-w-[160px]">
                    <div className="px-4 py-3
                                    border-b border-outline-variant/20">
                      <p className="font-body text-xs text-outline
                                    font-light">
                        Signed in as
                      </p>
                      <p className="font-body text-sm text-on-surface
                                    font-medium mt-0.5 truncate">
                        {initials}
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3
                                 px-4 py-3
                                 hover:bg-surface-container
                                 transition-colors text-left">
                      <span className="material-symbols-outlined
                                       text-[18px] text-outline">
                        logout
                      </span>
                      <span className="font-body text-sm
                                       text-on-surface font-light">
                        Sign Out
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
