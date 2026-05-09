"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import BottomNavBar, { PARENT_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import { useAuthGuard } from '@/lib/hooks/useAuthGuard';
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { useParentData } from "@/lib/hooks/useParentData";
import { useChildCollection } from "@/lib/hooks/useSchoolData";
import { generateReportCardPDF } from "@/lib/utils/generateReportCard";

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

type GradeLetter = "A" | "B" | "C" | "D" | "F";
type Remark = "Excellent" | "Good" | "Satisfactory" | "Needs Improvement" | "Unsatisfactory";

type SubjectResult = {
  subject: string;
  code: string;
  teacher: string;
  score: number;
  grade: GradeLetter;
  remark: Remark;
  prevScore: number; // previous term for trend arrow
};

const GRADE_COLORS: Record<GradeLetter, { text:string; bg:string }> = {
  A: { text:"#2B4D5A", bg:"rgba(43,77,90,0.08)"   },
  B: { text:"#393125", bg:"rgba(57,49,37,0.08)"    },
  C: { text:"#41484b", bg:"rgba(65,72,75,0.08)"    },
  D: { text:"#ba1a1a", bg:"rgba(186,26,26,0.06)"   },
  F: { text:"#ba1a1a", bg:"rgba(186,26,26,0.1)"    },
};

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

export default function ParentReportsPage() {
  useAuthGuard('parent');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"report"|"analysis">("report");

  const { parentProfile, studentRecord, loading } = useParentData();
  const { data: reports, error: reportsError } = useChildCollection<Report>(
    parentProfile?.schoolId || null, "reports", studentRecord?.id || null
  );
  const { data: attendance } = useChildCollection<any>(
    parentProfile?.schoolId || null, "attendance", studentRecord?.id || null
  );

  const childReports = reports;

  const RESULTS: SubjectResult[] = childReports.map(r => ({
    subject: r.subject,
    code: r.subject.substring(0, 3).toUpperCase() + "-101",
    teacher: r.teacherName,
    score: r.score,
    grade: r.letterGrade as GradeLetter,
    remark: (r.remarks as Remark) || "Good",
    prevScore: r.score,
  }));

  const avgScore  = RESULTS.length > 0 ? Math.round(RESULTS.reduce((s,r) => s+r.score, 0) / RESULTS.length) : 0;
  const avgPrev   = RESULTS.length > 0 ? Math.round(RESULTS.reduce((s,r) => s+r.prevScore, 0) / RESULTS.length) : 0;
  const topSubject = RESULTS.length > 0 ? [...RESULTS].sort((a,b) => b.score-a.score)[0] : null;
  const position  = 7; // mock class position
  const classSize = 31;

  const insights = [
    {
      label: "Overall Average",
      value: `${avgScore}%`,
      delta: `${avgScore >= avgPrev ? "+" : ""}${avgScore - avgPrev}% vs last term`,
      up: avgScore >= avgPrev,
    },
    {
      label: "Strongest Subject",
      value: topSubject?.grade || "—",
      sub: topSubject?.subject || "—",
    },
    {
      label: "Class Position",
      value: `${position}`,
      sub: `Out of ${classSize} students`,
    },
    {
      label: "Subjects Passed",
      value: `${RESULTS.filter(r => r.score >= 50).length}/${RESULTS.length}`,
      sub: "Above 50% threshold",
    },
  ];

  const gradeCounts = ["A","B","C","D","F"].map(g => ({
    grade: g as GradeLetter,
    count: RESULTS.filter(r => r.grade === g).length,
  }));

  const parentInitials = parentProfile?.name ? parentProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "PN";

  const childAttendance = attendance;
  const presentCount = childAttendance.filter((a: any) => a.status === "present").length;
  const absentCount = childAttendance.filter((a: any) => a.status === "absent").length;
  const lateCount = childAttendance.filter((a: any) => a.status === "late").length;
  const total = childAttendance.length;
  const attendancePct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  const handleDownloadReport = () => {
    if (!studentRecord || !parentProfile) return;
  
    generateReportCardPDF({
      studentName:   studentRecord.name,
      studentId:     studentRecord.id,
      class:         studentRecord.class,
      term:          "Term 2",
      year:          "2025",
      schoolName:    parentProfile.schoolName || "EliteSchool's",
      grades:        childReports.map(r => ({
        subject:     r.subject,
        score:       r.score,
        letterGrade: r.letterGrade,
        remarks:     r.remarks,
      })),
      attendance: {
        present:    presentCount,
        absent:     absentCount,
        late:       lateCount,
        percentage: attendancePct,
      },
      generatedAt: new Date().toLocaleDateString("en-UG", {
        day:"2-digit", month:"short", year:"numeric"
      }),
    });
  };

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
    <div className="flex min-h-screen mesh-gradient-bg">
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <CustomTopAppBar initials={parentInitials} />
        
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full pt-28 space-y-8">
          <CollectionErrorBanner error={reportsError} />
          {/* Section 1 — Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-5xl font-light text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Report Card
              </h1>
              <p className="text-base font-light text-[#5f5e60] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {studentRecord?.name || "Your Child"} · {studentRecord?.class || "—"} · Term 2, 2025
              </p>
            </div>
            <button
              onClick={handleDownloadReport}
              disabled={childReports.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#2B4D5A]/30 text-[#2B4D5A] text-sm hover:bg-[#2B4D5A]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download Report Card
            </button>
          </div>

          {/* Section 2 — Tab selector */}
          <div className="rounded-2xl p-1.5 flex gap-1 w-fit" style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(193,199,203,0.15)" }}>
            {(["report","analysis"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all capitalize"
                style={{
                  background: activeTab === t ? "#2B4D5A" : "transparent",
                  color: activeTab === t ? "#ffffff" : "#72787b",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                {t === "report" ? "Report Card" : "Performance Analysis"}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          {activeTab === "report" && (
            <div className="space-y-6">
              {/* Sub-section A — Student summary strip */}
              <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background:"#123643" }}>
                <div className="flex items-center gap-4 mb-6">
                  {/* Avatar + name/class */}
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 text-white text-xl flex items-center justify-center flex-shrink-0" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {studentRecord?.name?.split(' ')?.map(n => n[0])?.join('')?.substring(0, 2)?.toUpperCase() || "—"}
                  </div>
                  <div>
                    <h2 className="text-2xl text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{studentRecord?.name || "Your Child"}</h2>
                    <p className="text-sm text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>{studentRecord?.class || "—"} · {studentRecord?.id || "—"}</p>
                  </div>
                </div>
                {/* 4 stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label:"Avg Score",  value:`${avgScore}%`              },
                    { label:"Position",   value:`${position}/${classSize}`  },
                    { label:"Top Subject",value:topSubject?.code || "—"             },
                    { label:"Term",       value:"Term 2"                    },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.07)" }}>
                      <span className="text-2xl text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{s.value}</span>
                      <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-section B — Subjects table */}
              <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(193,199,203,0.15)" }}>
                {/* Column header row */}
                <div className="grid grid-cols-[1fr_60px_52px_auto] md:grid-cols-[1fr_80px_60px_160px_auto] px-5 py-3 gap-4"
                  style={{ borderBottom:"1px solid rgba(193,199,203,0.12)", background:"rgba(240,238,233,0.5)" }}>
                  {["Subject","Score","Grade","Remark",""].map(h => (
                    <span key={h} className={`text-[9px] text-[#72787b] uppercase tracking-widest ${h === "" ? "hidden md:block" : ""}`} style={{ fontFamily: "'DM Mono', monospace" }}>{h}</span>
                  ))}
                </div>

                {/* Subject rows */}
                <div className="divide-y divide-[#c1c7cb]/10">
                  {childReports.length === 0 && (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-[48px] text-[#2B4D5A]/30 block mb-3">
                        description
                      </span>
                      <p className="text-2xl font-light italic text-[#2B4D5A] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        No reports yet
                      </p>
                      <p className="text-sm text-[#72787b] font-light" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Report cards will appear here once teachers submit grades
                      </p>
                    </div>
                  )}
                  {RESULTS.map((r, i) => {
                    const trend = r.score - r.prevScore;
                    return (
                      <motion.div key={r.code}
                        style={{ animation:`fadeSlideIn 0.3s ${i*0.06}s ease both` }}
                        className="grid grid-cols-[1fr_60px_52px_auto] md:grid-cols-[1fr_80px_60px_160px_auto] px-5 py-4 gap-4 items-center">

                        {/* Subject name + teacher */}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1b1c19] truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{r.subject}</p>
                          <p className="text-xs text-[#72787b] truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{r.teacher}</p>
                        </div>

                        {/* Score + trend arrow */}
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-[#1b1c19]" style={{ fontFamily: "'DM Mono', monospace" }}>{r.score}</span>
                          <span style={{ fontSize:"14px", color: trend > 0 ? "#2B4D5A" : trend < 0 ? "#ba1a1a" : "#72787b" }}>
                            {trend > 0 ? "↑" : trend < 0 ? "↓" : "–"}
                          </span>
                        </div>

                         {/* Grade badge */}
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: GRADE_COLORS[r.grade]?.bg || "rgba(65,72,75,0.08)" }}>
                          <span className="text-sm font-medium" style={{ fontFamily: "'DM Mono', monospace", color: GRADE_COLORS[r.grade]?.text || "#41484b" }}>{r.grade}</span>
                        </div>

                        {/* Remark (hidden on mobile) */}
                        <span className="hidden md:block text-xs truncate" style={{ color: GRADE_COLORS[r.grade]?.text || "#41484b", fontFamily:"'DM Sans', sans-serif" }}>
                          {r.remark}
                        </span>

                        {/* Code badge */}
                        <span className="text-[9px] px-2 py-1 rounded-full justify-self-end" style={{ background:"#f0eee9", color:"#72787b", fontFamily:"'DM Mono', monospace" }}>
                          {r.code}
                        </span>

                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-section C — Remarks */}
              {/* Removed mock remarks section */}
            </div>
          )}

          {activeTab === "analysis" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sub-section A — Score comparison bar chart */}
                <div className="rounded-2xl p-6" style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(193,199,203,0.15)" }}>
                  <h2 className="text-2xl text-[#2B4D5A] mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Subject Scores</h2>
                  <p className="text-sm text-[#72787b] mb-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>This term vs previous term</p>

                  <div className="space-y-4">
                    {RESULTS.map((r, i) => (
                      <div key={r.code}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-xs text-[#1b1c19] truncate pr-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{r.subject}</span>
                          <span className="text-xs text-[#2B4D5A] flex-shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>{r.score}/100</span>
                        </div>
                        {/* Current term bar */}
                        <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background:"#e4e2dd" }}>
                          <motion.div
                            initial={{ width:0 }}
                            animate={{ width:`${r.score}%` }}
                            transition={{ delay: i*0.08, duration:0.6, ease:[0.22,1,0.36,1] }}
                            className="h-full rounded-full"
                            style={{ background:"#2B4D5A" }} />
                        </div>
                        {/* Previous term bar */}
                        <div className="h-1 rounded-full overflow-hidden" style={{ background:"#e4e2dd" }}>
                          <motion.div
                            initial={{ width:0 }}
                            animate={{ width:`${r.prevScore}%` }}
                            transition={{ delay: i*0.08 + 0.1, duration:0.6, ease:[0.22,1,0.36,1] }}
                            className="h-full rounded-full"
                            style={{ background:"#B5A898" }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-5 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background:"#2B4D5A" }} />
                      <span className="text-[9px] text-[#72787b] uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>This Term</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background:"#B5A898" }} />
                      <span className="text-[9px] text-[#72787b] uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>Previous Term</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Sub-section B — 4 insight cards */}
                  <div className="grid grid-cols-2 gap-4">
                    {insights.map((stat, i) => (
                      <div key={i} className="bg-[#faf9f4]/60 backdrop-blur-xl rounded-2xl border border-[#c1c7cb]/30 p-5 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-20 h-20 bg-[#2B4D5A]/5 rounded-full blur-xl pointer-events-none"></div>
                        <p className="text-[10px] uppercase tracking-widest text-[#72787b] mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {stat.label}
                        </p>
                        <p className="text-3xl font-light text-[#2B4D5A] leading-none mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          {stat.value}
                        </p>
                        {stat.delta ? (
                          <p className="text-[9px]" style={{ fontFamily: "'DM Mono', monospace", color: stat.up ? "#4A6741" : "#ba1a1a" }}>
                            {stat.delta}
                          </p>
                        ) : (
                          <p className="text-xs text-[#5f5e60] font-light truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {stat.sub}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Sub-section C — Grade distribution row */}
                  <div>
                    <h2 className="text-2xl text-[#2B4D5A] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Grade Distribution</h2>
                    <div className="flex gap-3 flex-wrap">
                      {gradeCounts.map(gc => (
                        <div key={gc.grade} className="flex flex-col items-center px-5 py-4 rounded-2xl min-w-[64px] flex-1 sm:flex-none"
                          style={{ background: gc.count > 0 ? GRADE_COLORS[gc.grade as GradeLetter].bg : "#f0eee9" }}>
                          <span className="text-3xl font-light mb-1"
                            style={{ fontFamily: "'Cormorant Garamond', serif", color: gc.count > 0 ? GRADE_COLORS[gc.grade as GradeLetter].text : "#c1c7cb" }}>
                            {gc.grade}
                          </span>
                          <span className="text-[9px] text-[#72787b] uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>
                            {gc.count} subj
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      <BottomNavBar items={PARENT_NAV_ITEMS} activeHref="/parent/reports" onNavigate={(href) => router.push(href)} />
    </div>
  );
}
