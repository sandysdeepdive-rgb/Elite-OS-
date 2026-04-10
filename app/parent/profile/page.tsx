'use client';

import AuthGate from "@/components/layout/AuthGate";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { PARENT_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import ProfileContent from "@/components/features/ProfileContent";

export default function ParentProfile() {
  return (
    <AuthGate requiredRole="parent">
      <div className="flex min-h-screen mesh-gradient-bg">
        <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
          <TopAppBar title="Profile" subtitle="Account Settings" />
          <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full space-y-5">
            <ProfileContent />
          </main>
        </div>
        <BottomNavBar items={PARENT_NAV_ITEMS} activeHref="/parent/profile" />
      </div>
    </AuthGate>
  );
}
