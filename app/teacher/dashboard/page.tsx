"use client";

import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { TEACHER_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import AuthGate from "@/components/layout/AuthGate";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { useTeacherData } from "@/lib/hooks/useTeacherData";
import { useCollection } from "@/lib/hooks/useSchoolData";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

interface Student {
  id: string;
  name: string;
  class: string;
  attendance?: string;
}

import { useAuthGuard } from '@/lib/hooks/useAuthGuard';

export default function TeacherDashboardPage() {
  useAuthGuard('teacher');
  const { teacherProfile, loading } = useTeacherData();
  const { data: students, error: studentsError } = useCollection<Student>(
    teacherProfile?.schoolId || null, "students"
  );

  // Filter students to only this teacher's classes
  const myStudents = students.filter(s =>
    teacherProfile?.classes?.includes(s.class)
  );

  // Live metric calculations
  const myClasses    = teacherProfile?.classes?.length || 0;
  const totalStudents = myStudents.length;
  const avgAttendance = myStudents.length > 0
    ? Math.round(myStudents.reduce((sum, s) =>
        sum + parseInt(s.attendance || "0"), 0
      ) / myStudents.length) : 0;

  if (loading) {
    return (
      <ErrorBoundary>
        <AuthGate requiredRole="teacher">
          <div className="flex min-h-screen mesh-gradient-bg items-center justify-center">
            <p className="font-body text-sm text-outline">Loading dashboard...</p>
          </div>
        </AuthGate>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AuthGate requiredRole="teacher">
        <div className="flex min-h-screen mesh-gradient-bg">
          <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
          <TopAppBar title="Dashboard" subtitle="Teacher Portal" />
        
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-10">
          <CollectionErrorBanner error={studentsError} />
          {/* Greeting */}
          <div>
            <h1 className="font-headline text-4xl md:text-5xl font-light italic text-primary">
              Welcome back, {teacherProfile?.name || "Teacher"}
            </h1>
            <p className="font-label text-[10px] md:text-[11px] uppercase tracking-[0.15em] text-outline mt-2 font-mono">
              {teacherProfile?.subject || "Faculty"} • {teacherProfile?.schoolName || "School"}
            </p>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "My Classes", value: myClasses.toString(), icon: "class" },
              { label: "My Students", value: totalStudents.toString(), icon: "groups" },
              { label: "Avg. Attendance", value: `${avgAttendance}%`, icon: "fact_check" },
              { label: "Alerts", value: "0", icon: "notifications_active" },
            ].map((stat, i) => (
              <GlassCard key={i} padding="p-5" showOrb>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px] text-primary-container">
                      {stat.icon}
                    </span>
                  </div>
                </div>
                <p className="font-headline text-3xl font-light text-primary leading-none">
                  {stat.value}
                </p>
                <p className="font-label text-[10px] uppercase tracking-[0.1em] text-outline mt-2 font-mono">
                  {stat.label}
                </p>
              </GlassCard>
            ))}
          </div>

          {/* Daily Schedule */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-headline text-2xl font-light italic text-primary">
                Daily Schedule
              </h2>
              <Link href="/teacher/academics" className="font-label text-[10px] uppercase tracking-[0.1em] text-primary-container hover:underline">
                View Full
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6 md:mx-0 md:px-0">
              <div className="w-full text-center py-8">
                <span className="material-symbols-outlined text-[32px] text-outline/30 mb-2">event_busy</span>
                <p className="font-body text-sm text-outline">No classes scheduled today</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
              <Link href="/teacher/attendance" className="whitespace-nowrap px-5 py-3 rounded-full border border-primary-container/20 text-primary-container font-label text-[10px] uppercase tracking-[0.1em] hover:bg-primary-container hover:text-white transition-all flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">fact_check</span> Take Attendance
              </Link>
              <Link href="/teacher/grades" className="whitespace-nowrap px-5 py-3 rounded-full border border-primary-container/20 text-primary-container font-label text-[10px] uppercase tracking-[0.1em] hover:bg-primary-container hover:text-white transition-all flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">drive_file_rename_outline</span> Update Grades
              </Link>
              <Link href="/teacher/messages" className="whitespace-nowrap px-5 py-3 rounded-full border border-primary-container/20 text-primary-container font-label text-[10px] uppercase tracking-[0.1em] hover:bg-primary-container hover:text-white transition-all flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">campaign</span> Post Announcement
              </Link>
            </div>
          </div>

          {/* Recent Activity Bento */}
          <div>
            <h2 className="font-headline text-2xl font-light italic text-primary mb-5">
              Recent Activity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[180px]">
              
              {/* Wide submissions card */}
              <GlassCard className="md:col-span-2 flex flex-col justify-between group cursor-pointer hover:border-primary-container/40 transition-colors" padding="p-6">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] text-primary-container">groups</span>
                  </div>
                  <span className="font-label text-[10px] uppercase tracking-[0.1em] text-outline">Live</span>
                </div>
                <div>
                  <h3 className="font-headline text-2xl font-light text-primary mb-1">My Students</h3>
                  <p className="font-body text-sm text-on-surface-variant mb-4">{myStudents.length} Students Enrolled</p>
                  
                  {/* Avatar stack */}
                  <div className="flex items-center">
                    <div className="flex -space-x-2">
                      {myStudents.slice(0, 4).map((s, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container-high flex items-center justify-center overflow-hidden">
                          <span className="font-label text-[9px] text-outline">{s.name.split(' ')?.map(n => n[0])?.join('')?.substring(0, 2)?.toUpperCase() || "S"}</span>
                        </div>
                      ))}
                    </div>
                    {myStudents.length > 4 && (
                      <span className="font-label text-[10px] text-outline ml-3">+{myStudents.length - 4} others</span>
                    )}
                  </div>
                </div>
              </GlassCard>

              {/* Empty state card */}
              <GlassCard className="md:col-span-1 flex flex-col items-center justify-center text-center" padding="p-6">
                <span className="material-symbols-outlined text-[32px] text-outline/30 mb-2">history</span>
                <p className="font-body text-sm text-outline">No recent activity</p>
              </GlassCard>

            </div>
          </div>

        </main>
      </div>
      <BottomNavBar items={TEACHER_NAV_ITEMS} activeHref="/teacher/dashboard" />
    </div>
    </AuthGate>
    </ErrorBoundary>
  );
}
