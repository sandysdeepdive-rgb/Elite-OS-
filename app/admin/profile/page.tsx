'use client';

import AuthGate from "@/components/layout/AuthGate";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import ProfileContent from "@/components/features/ProfileContent";

import { useAuthGuard } from '@/lib/hooks/useAuthGuard';

export default function AdminProfile() {
  useAuthGuard('admin');
  return (
    <AuthGate requiredRole="admin">
      <div className="flex min-h-screen mesh-gradient-bg">
        <AdminSidebar activeHref="/admin/profile" />
        <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
          <TopAppBar title="Profile" subtitle="Account Settings" />
          <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full space-y-5">
            <ProfileContent />
          </main>
        </div>
        <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/profile" />
      </div>
    </AuthGate>
  );
}
