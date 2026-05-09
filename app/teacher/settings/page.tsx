'use client';
import AuthGate from "@/components/layout/AuthGate";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { TEACHER_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import TeacherSettingsContent from "@/components/features/TeacherSettingsContent";

import { useAuthGuard } from '@/lib/hooks/useAuthGuard';

export default function TeacherSettings() {
  useAuthGuard('teacher');
  return (
    <AuthGate requiredRole="teacher">
      <div className="flex min-h-screen mesh-gradient-bg">
        <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
          <TopAppBar title="Settings" subtitle="Preferences" />
          <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full space-y-5">
            <TeacherSettingsContent />
          </main>
        </div>
        <BottomNavBar items={TEACHER_NAV_ITEMS} activeHref="/teacher/settings" />
      </div>
    </AuthGate>
  );
}
