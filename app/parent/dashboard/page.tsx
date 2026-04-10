"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import BottomNavBar, { PARENT_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import AuthGate from "@/components/layout/AuthGate";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { useParentData } from "@/lib/hooks/useParentData";
import { useChildCollection } from "@/lib/hooks/useSchoolData";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  termFee: number;
  amountPaid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
  lastPayment: string;
}

interface Report {
  id: string;
  studentId: string;
  class: string;
  subject: string;
  score: number;
  letterGrade: string;
  remarks: string;
  teacherId: string;
  teacherName: string;
  term: string;
  year: string;
}

// ─── Types & Mock Data ────────────────────────────────────────────────────────

type FeeStatus = "paid" | "partial" | "overdue" | "unpaid";

const FEE_STATUS_STYLES: Record<FeeStatus, { bg: string; text: string; label: string }> = {
  paid:    { bg: "rgba(43,77,90,0.1)",  text: "#2B4D5A", label: "Paid in Full" },
  partial: { bg: "rgba(181,168,152,0.2)", text: "#393125", label: "Partially Paid" },
  overdue: { bg: "rgba(186,26,26,0.08)", text: "#ba1a1a", label: "Overdue" },
  unpaid:  { bg: "rgba(186,26,26,0.08)", text: "#ba1a1a", label: "Unpaid" },
};

function formatUGX(amount: number): string {
  return "UGX " + amount.toLocaleString("en-UG");
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function CustomTopAppBar({ initials }: { initials: string }) {
  return (
    <header
      className="fixed top-0 w-full z-40"
      style={{
        background: "rgba(244,242,237,0.88)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(193,199,203,0.2)",
      }}
    >
      <div className="flex justify-between items-center px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <button
            className="w-10 h-10 rounded-[10px] flex flex-col justify-center items-center gap-[3px] active:scale-95 transition-transform"
            style={{ background: "#2B4D5A" }}
          >
            <span className="w-5 h-[2px] bg-white rounded-full" />
            <span className="w-[14px] h-[2px] bg-white rounded-full self-start ml-[3px]" />
            <span className="w-5 h-[2px] bg-white rounded-full" />
          </button>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500,
              fontSize: "1.2rem",
              color: "#141416",
              letterSpacing: "-0.01em",
            }}
          >
            EliteSchool OS
          </span>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium select-none border-2"
          style={{
            background: "#123643",
            borderColor: "rgba(43,77,90,0.3)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParentDashboardPage() {
  const router = useRouter();

  const { parentProfile, studentRecord, loading } = useParentData();
  const { data: fees, error: feesError } = useChildCollection<FeeRecord>(
    parentProfile?.schoolId || null, "fees", studentRecord?.id || null
  );
  const { data: reports, error: reportsError } = useChildCollection<Report>(
    parentProfile?.schoolId || null, "reports", studentRecord?.id || null
  );
  const { data: attendance } = useChildCollection<any>(
    parentProfile?.schoolId || null, "attendance", studentRecord?.id || null
  );

  // This child's fee record
  const childFee = fees[0];

  // This child's latest report
  const childReports = reports;
  const latestGrade = childReports.length > 0
    ? childReports[0].letterGrade : "—";
  const avgScore = childReports.length > 0
    ? Math.round(
        childReports.reduce((s, r) =>
          s + (r.score || 0), 0
        ) / childReports.length
      ) : 0;

  // Calculate attendance percentage
  const childAttendance = attendance;
  const attendancePct = childAttendance.length > 0
    ? Math.round(
        childAttendance.filter(a =>
          a.status === "present"
        ).length / childAttendance.length * 100
      ) : parseInt(studentRecord?.attendance || "0");

  const QUICK_STATS = [
    { label: "Avg Score",   value: `${avgScore}%`,          sub: "Across all subjects"  },
    { label: "Attendance",  value: `${attendancePct}%`,     sub: `Current term` },
    { label: "Alerts",      value: `0`,  sub: "Unread notifications" },
  ];

  const parentInitials = parentProfile?.name ? parentProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "PN";

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient-bg
                      flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-container
                          rounded-[10px] flex flex-col
                          justify-center items-center gap-1
                          mx-auto mb-4 animate-pulse">
            <div className="w-6 h-[3px] bg-white rounded-full" />
            <div className="w-4 h-[3px] bg-white rounded-full" />
            <div className="w-6 h-[3px] bg-white rounded-full" />
          </div>
          <p className="font-label text-[10px] uppercase
                        tracking-[0.2em] text-outline">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthGate requiredRole="parent">
        <div className="flex min-h-screen mesh-gradient-bg">
          <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
          <CustomTopAppBar initials={parentInitials} />
        
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full pt-28 space-y-8">
          <CollectionErrorBanner error={feesError || reportsError} />
          {/* Section 1 — Page header (greeting) */}
          <section>
            <h1 className="text-5xl font-light text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Hello, <span className="italic">{parentProfile?.name?.split(" ")[0] || "Parent"}</span>
            </h1>
            <p className="text-base font-light text-[#5f5e60] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · Tracking {studentRecord?.name || "Your Child"}
            </p>
          </section>

          {/* Section 2 — Child identity card */}
          <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "#123643" }}>
            {/* Ghost orb top-right */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", filter: "blur(20px)" }} />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-[#2B4D5A]/30 border border-white/20 text-white text-lg flex items-center justify-center flex-shrink-0" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {studentRecord?.name?.split(' ')?.map(n => n[0])?.join('')?.substring(0, 2)?.toUpperCase() || "—"}
                </div>
                <div>
                  <p className="text-[9px] text-white/50 uppercase tracking-widest mb-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
                    Enrolled Student
                  </p>
                  <h2 className="text-2xl text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {studentRecord?.name || "Your Child"}
                  </h2>
                  <p className="text-sm text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {studentRecord?.class || "—"} · {studentRecord?.id || "—"}
                  </p>
                </div>
              </div>
              {/* Year badge */}
              <div className="sm:text-right flex-shrink-0">
                <span className="text-[9px] text-white/40 uppercase block" style={{ fontFamily: "'DM Mono', monospace" }}>Since</span>
                <span className="text-3xl text-white/80" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {studentRecord?.enrollmentDate ? new Date(studentRecord.enrollmentDate).getFullYear() : new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {/* Section 3 — Fee summary card */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(193,199,203,0.15)",
                         boxShadow: "0 8px 24px rgba(20,20,22,0.04)" }}>

                {/* Header row */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4"
                  style={{ borderBottom: "1px solid rgba(193,199,203,0.12)" }}>
                  <h2 className="text-2xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Fee Balance</h2>
                  <span className="text-[9px] px-3 py-1 rounded-full uppercase tracking-widest" style={{ ...FEE_STATUS_STYLES[childFee?.status || "unpaid"], fontFamily: "'DM Mono', monospace" }}>
                    {FEE_STATUS_STYLES[childFee?.status || "unpaid"]?.label || "Unpaid"}
                  </span>
                </div>

                {/* Balance + progress */}
                <div className="px-6 py-5">
                  {/* Big balance figure */}
                  <p className="text-[9px] text-[#72787b] uppercase tracking-widest mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Outstanding Balance</p>
                  <span className="text-5xl font-light text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {formatUGX(childFee?.balance || 0)}
                  </span>
                  <p className="text-xs text-[#72787b] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Due End of Term
                  </p>

                  {/* Progress bar */}
                  <div className="mt-5 mb-3">
                    <div className="flex justify-between text-[10px] mb-2"
                      style={{ fontFamily: "'DM Mono', monospace", color: "#72787b" }}>
                      <span>Paid: {formatUGX(childFee?.amountPaid || 0)}</span>
                      <span>Total: {formatUGX(childFee?.termFee || 0)}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "#e4e2dd" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.round(((childFee?.amountPaid || 0) / (childFee?.termFee || 1)) * 100)}%`,
                          background: "#2B4D5A",
                        }} />
                    </div>
                  </div>

                  {/* Pay now button */}
                  <button className="w-full mt-4 py-3 rounded-full text-sm font-medium text-white hover:opacity-90 transition-opacity active:scale-95"
                    style={{ background: "#2B4D5A", fontFamily: "'DM Sans', sans-serif" }}>
                    Make Payment
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {/* Section 4 — Stats row (3 chips) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {QUICK_STATS.map((stat, i) => (
                  <div key={i} className="bg-[#faf9f4]/60 backdrop-blur-xl rounded-2xl border border-[#c1c7cb]/30 p-5 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-[#2B4D5A]/5 rounded-full blur-xl pointer-events-none"></div>
                    <p className="text-3xl font-light text-[#2B4D5A] leading-none mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      {stat.value}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {stat.label}
                    </p>
                    <p className="text-xs text-[#5f5e60] font-light mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {stat.sub}
                    </p>
                  </div>
                ))}
              </div>

              {/* Section 5 — Recent grades */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Recent Grades</h2>
                  <button className="text-[10px] text-[#72787b] uppercase tracking-widest hover:text-[#2B4D5A] transition-colors" style={{ fontFamily: "'DM Mono', monospace" }}>View All</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {childReports.slice(0, 4).map((g, i) => (
                    <motion.div key={g.id}
                      style={{ animation: `fadeSlideIn 0.3s ${i * 0.06}s ease both`, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(193,199,203,0.15)" }}
                      className="rounded-2xl px-5 py-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-[#72787b] uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>{g.subject}</p>
                        <p className="text-sm font-medium text-[#1b1c19] truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{g.subject}</p>
                        <p className="text-xs text-[#72787b]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{g.teacherName}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className="text-3xl font-light"
                          style={{ fontFamily: "'Cormorant Garamond', serif", color: g.score >= 80 ? "#2B4D5A" : g.score >= 60 ? "#393125" : "#ba1a1a" }}>
                          {g.letterGrade}
                        </span>
                        <p className="text-[10px] text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>{g.score}/100</p>
                      </div>
                    </motion.div>
                  ))}
                  {childReports.length === 0 && (
                    <div className="col-span-1 md:col-span-2 text-center py-6 text-sm text-[#72787b]">
                      No grades posted yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 6 — Alerts + Upcoming events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alerts */}
            <div>
              <h2 className="text-2xl text-[#2B4D5A] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Notifications</h2>
              <div className="rounded-2xl overflow-hidden divide-y divide-[#c1c7cb]/10"
                style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(193,199,203,0.15)" }}>
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-[32px] text-outline/30 mb-2">notifications_off</span>
                  <p className="font-body text-sm text-outline">No notifications yet</p>
                </div>
              </div>
            </div>

            {/* Upcoming events */}
            <div>
              <h2 className="text-2xl text-[#2B4D5A] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Upcoming Events</h2>
              <div className="rounded-2xl p-6 space-y-4"
                style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(193,199,203,0.15)" }}>
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-[32px] text-outline/30 mb-2">event_busy</span>
                  <p className="font-body text-sm text-outline">No upcoming events</p>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      <BottomNavBar items={PARENT_NAV_ITEMS} activeHref="/parent/dashboard" onNavigate={(href) => router.push(href)} />
    </div>
    </AuthGate>
    </ErrorBoundary>
  );
}
