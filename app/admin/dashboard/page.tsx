'use client';

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import MetricCard from "@/components/ui/MetricCard";
import Badge from "@/components/ui/Badge";
import AuthGate from "@/components/layout/AuthGate";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { useSchoolData, useCollection } from "@/lib/hooks/useSchoolData";
import { auth, db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { toast } from "sonner";

interface ActivityItem {
  id: string | number;
  title: string;
  time: string;
  icon: string;
}

interface AnnouncementItem {
  id: string | number;
  title: string;
  category: string;
  time: string;
}

const ACTIVITY: ActivityItem[] = [];
const ANNOUNCEMENTS: AnnouncementItem[] = [];

function NotificationBell() {
  return (
    <button className="relative p-2 rounded-full hover:bg-surface-container transition-colors">
      <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-petrol rounded-full border-2 border-surface-container-lowest"></span>
    </button>
  );
}

import ErrorBoundary from "@/components/ui/ErrorBoundary";

export default function AdminDashboard() {
  const [dateString, setDateString] = useState("");
  const { schoolId, schoolName, adminName, authError, loading: schoolLoading } = useSchoolData();
  
  const { data: students, error: studentsError } = useCollection<any>(schoolId, "students");
  const { data: teachers, error: teachersError } = useCollection<any>(schoolId, "teachers");
  const { data: classes, error: classesError } = useCollection<any>(schoolId, "classes");
  const { data: fees, error: feesError } = useCollection<any>(schoolId, "fees");

  const anyError = studentsError || teachersError || classesError || feesError;

  // Live calculations
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalClasses  = classes.length;

  const paidFees    = fees.filter(f => f.status === "paid").length;
  const feeRate     = fees.length > 0
    ? Math.round((paidFees / fees.length) * 100) : 0;

  const attendanceRate = students.length > 0
    ? Math.round(
        students.reduce((sum, s) =>
          sum + parseInt(s.attendance || "0"), 0
        ) / students.length
      ) : 0;

  useEffect(() => {
    const today = new Date();
    setTimeout(() => {
      setDateString(today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, 0);
  }, []);

  // Task 4 — Self-healing check for missing schoolId
  useEffect(() => {
    const repairAccount = async () => {
      if (auth.currentUser && !schoolId && !schoolLoading && !authError) {
        try {
          // Attempt to find a school where this user is the admin
          const schoolsRef = collection(db, "schools");
          const q = query(schoolsRef, where("adminUid", "==", auth.currentUser.uid));
          const snap = await getDocs(q);
          
          if (!snap.empty) {
            const foundSchoolId = snap.docs[0].id;
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
              schoolId: foundSchoolId
            });
            toast.success("Account repaired: School connection restored.");
            // Reload to pick up changes
            window.location.reload();
          }
        } catch (err) {
          console.warn("Self-healing failed:", err);
        }
      }
    };
    repairAccount();
  }, [schoolId, schoolLoading, authError]);

  return (
    <ErrorBoundary>
      <AuthGate requiredRole="admin">
        <div className="flex min-h-screen mesh-gradient-bg">
          <AdminSidebar
            activeHref="/admin/dashboard"
          />
        <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
          <TopAppBar 
            title="Dashboard" 
            subtitle="Overview" 
            actions={<NotificationBell />}
          />
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-8">
          <CollectionErrorBanner error={authError || anyError} />
          
          {authError === 'account_setup_incomplete' && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-6">
              <p className="text-orange-800 text-sm">
                <strong>Setup Warning:</strong> Your authentication was successful but your admin profile is missing or corrupted. 
                Please contact support if this persists.
              </p>
            </div>
          )}

          {/* Section 1: Greeting */}
          <section>
            <h1 className="font-headline text-4xl italic font-light text-primary">
              Good morning, {adminName}.
            </h1>
            <p className="font-body text-sm text-on-surface-variant mt-2">
              {dateString}
            </p>
          </section>

          {/* Section 2: Metrics Grid */}
          <section className="grid grid-cols-2 gap-4">
            <MetricCard 
              label="Attendance Rate"
              value={attendanceRate} 
              suffix="%" 
              percent={attendanceRate}
              subtitle="School-wide average" 
            />
            <MetricCard 
              label="Fee Collection"
              value={feeRate} 
              suffix="%" 
              percent={feeRate}
              subtitle="Term 2 fee collection" 
            />
            <MetricCard 
              label="Total Teachers"
              value={totalTeachers} 
              suffix="" 
              percent={70}
              subtitle="Active staff" 
            />
            <MetricCard 
              label="Total Students"
              value={totalStudents} 
              suffix="" 
              percent={80}
              subtitle="Enrolled this term" 
            />
          </section>

          {/* Section 3: Quick Stats */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Total Students", value: String(totalStudents), icon: "school" },
              { label: "Total Teachers", value: String(totalTeachers), icon: "person" },
              { label: "Active Classes", value: String(totalClasses), icon: "class" },
            ].map((stat, idx) => (
              <GlassCard key={idx} padding="p-5" className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
                <div>
                  <p className="font-headline text-2xl font-light text-primary leading-none mb-1">
                    {stat.value}
                  </p>
                  <p className="font-label text-[10px] uppercase tracking-[0.1em] text-outline">
                    {stat.label}
                  </p>
                </div>
              </GlassCard>
            ))}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Section 4: Recent Activity */}
            <section className="lg:col-span-2">
              <GlassCard padding="p-6" className="h-full">
                <h2 className="font-headline text-xl font-light italic text-primary mb-6">
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {ACTIVITY.length === 0 ? (
                    <p className="font-body text-sm text-outline font-light text-center py-8">
                      No recent activity
                    </p>
                  ) : (
                    ACTIVITY.map((activity, idx) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.4 }}
                        className="flex items-start gap-4 pb-4 border-b border-outline-variant/30 last:border-0 last:pb-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                            {activity.icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm text-on-surface truncate">
                            {activity.title}
                          </p>
                          <p className="font-label text-[10px] text-outline mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </GlassCard>
            </section>

            <div className="space-y-6">
              {/* Section 5: AI Insights */}
              <section>
                <GlassCard padding="p-6" showOrb>
                  <h2 className="font-headline text-xl font-light italic text-primary mb-4">
                    AI Insights
                  </h2>
                  <div className="flex flex-col gap-3">
                    <Badge variant="pending" className="w-fit">At-Risk Students</Badge>
                    <Badge variant="unpaid" className="w-fit">Fees Below Target</Badge>
                    <Badge variant="active" className="w-fit">Staff Optimal</Badge>
                  </div>
                </GlassCard>
              </section>

              {/* Section 6: Bulletin Board */}
              <section>
                <GlassCard padding="p-6">
                  <h2 className="font-headline text-xl font-light italic text-primary mb-4">
                    Bulletin Board
                  </h2>
                  <div className="space-y-4">
                    {ANNOUNCEMENTS.length === 0 ? (
                      <p className="font-body text-sm text-outline font-light text-center py-8">
                        No announcements yet
                      </p>
                    ) : (
                      ANNOUNCEMENTS.map((announcement) => (
                        <div key={announcement.id} className="p-3 rounded-xl bg-surface-container-low">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-label text-[9px] uppercase tracking-[0.1em] text-primary-container bg-primary-container/10 px-2 py-0.5 rounded-full">
                              {announcement.category}
                            </span>
                            <span className="font-label text-[10px] text-outline">
                              {announcement.time}
                            </span>
                          </div>
                          <p className="font-body text-sm text-on-surface">
                            {announcement.title}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>
              </section>
            </div>
          </div>
        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/dashboard" />
    </div>
    </AuthGate>
    </ErrorBoundary>
  );
}
