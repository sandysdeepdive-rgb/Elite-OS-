"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  GraduationCap,
  MessageSquare,
  Settings,
  BarChart3,
  BookOpen,
  FlaskConical,
  FileText,
  ChevronRight,
  Download,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import BottomNavBar, { TEACHER_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { useTeacherData } from "@/lib/hooks/useTeacherData";
import { useTeacherStudents, useTeacherReports } from "@/lib/hooks/useSchoolData";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { SMS } from "@/lib/utils/sms";

// ─── Types ────────────────────────────────────────────────────────────────────

type GradeStatus = "pending" | "up-to-date" | "to-grade";

interface Student {
  id: string;
  name: string;
  initials: string;
  score: string;
  saved: boolean;
  class: string;
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

interface ClassEntry {
  id: string;
  code: string;
  name: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  status: GradeStatus;
  statusLabel: string;
  statusMeta: string;
  students: Student[];
  graded: number;
  total: number;
}



const STATUS_STYLES: Record<GradeStatus, { bg: string; text: string; icon: React.ElementType }> = {
  pending: { bg: "rgba(186,26,26,0.08)", text: "#ba1a1a", icon: AlertCircle },
  "up-to-date": { bg: "rgba(43,77,90,0.08)", text: "#2B4D5A", icon: CheckCircle2 },
  "to-grade": { bg: "rgba(57,49,37,0.08)", text: "#393125", icon: Clock },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGradeColor(score: string): string {
  const n = parseInt(score, 10);
  if (isNaN(n)) return "#72787b";
  if (n >= 80) return "#2B4D5A";
  if (n >= 60) return "#393125";
  return "#ba1a1a";
}

function getLetterGrade(score: string): string {
  const n = parseInt(score, 10);
  if (isNaN(n) || score === "") return "—";
  if (n >= 90) return "A";
  if (n >= 80) return "B";
  if (n >= 70) return "C";
  if (n >= 60) return "D";
  return "F";
}

const calculateLetterGrade = (score: number): string => {
  if (score >= 80) return "D1";
  if (score >= 75) return "D2";
  if (score >= 70) return "C3";
  if (score >= 65) return "C4";
  if (score >= 60) return "C5";
  if (score >= 55) return "C6";
  if (score >= 50) return "P7";
  if (score >= 45) return "P8";
  return "F9";
};

const calculateGPA = (score: number) => {
  if (score >= 80) return 4.0;
  if (score >= 75) return 3.7;
  if (score >= 70) return 3.3;
  if (score >= 65) return 3.0;
  if (score >= 60) return 2.7;
  if (score >= 55) return 2.3;
  if (score >= 50) return 2.0;
  if (score >= 45) return 1.7;
  return 1.0;
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

function TopAppBar() {
  return (
    <header
      className="fixed top-0 w-full z-50"
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
          PN
        </div>
      </div>
    </header>
  );
}

// ─── Grade Entry Row (expandable) ─────────────────────────────────────────────

function ClassRow({
  entry,
  index,
  onSave,
}: {
  entry: ClassEntry;
  index: number;
  onSave: (classId: string, studentId: string, score: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(entry.students.map((s) => [s.id, s.score]))
  );
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(entry.students.map((s) => [s.id, s.saved]))
  );
  const [justSaved, setJustSaved] = useState<Record<string, boolean>>({});

  const statusStyle = STATUS_STYLES[entry.status];
  const StatusIcon = statusStyle.icon;
  const Icon = entry.icon;
  const pct = entry.total > 0 ? Math.round((entry.graded / entry.total) * 100) : 0;

  function handleScoreChange(studentId: string, val: string) {
    // Only allow numbers 0-100
    const cleaned = val.replace(/[^0-9]/g, "").slice(0, 3);
    const num = parseInt(cleaned, 10);
    const final = cleaned === "" ? "" : String(Math.min(100, num));
    setScores((prev) => ({ ...prev, [studentId]: final }));
    setSaved((prev) => ({ ...prev, [studentId]: false }));
  }

  function handleSave(studentId: string) {
    const score = scores[studentId];
    if (score === "") return;
    setSaved((prev) => ({ ...prev, [studentId]: true }));
    setJustSaved((prev) => ({ ...prev, [studentId]: true }));
    onSave(entry.id, studentId, score);
    // Persist to localStorage
    const key = `grades_${entry.id}_${studentId}`;
    localStorage.setItem(key, score);
    setTimeout(() => setJustSaved((prev) => ({ ...prev, [studentId]: false })), 1800);
  }

  // Load from localStorage on mount
  useEffect(() => {
    entry.students.forEach((s) => {
      const key = `grades_${entry.id}_${s.id}`;
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setScores((prev) => ({ ...prev, [s.id]: stored }));
        setSaved((prev) => ({ ...prev, [s.id]: true }));
      }
    });
  }, [entry.id, entry.students]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
      style={{
        borderBottom: "1px solid rgba(193,199,203,0.15)",
      }}
    >
      {/* Row Header */}
      <button
        className="w-full text-left px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
        style={{ background: "transparent" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(240,238,233,0.5)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Left: icon + class info */}
        <div className="flex items-center gap-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: entry.iconBg }}
          >
            <Icon size={22} style={{ color: entry.iconColor }} />
          </div>
          <div>
            <p
              className="text-lg leading-none mb-1"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                color: "#1b1c19",
              }}
            >
              {entry.code}
            </p>
            <p
              className="text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "#5f5e60" }}
            >
              {entry.name}
            </p>
          </div>
        </div>

        {/* Right: status + progress bar + expand caret */}
        <div className="flex items-center gap-6">
          {/* Progress */}
          <div className="hidden md:block">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-28 h-1 rounded-full overflow-hidden"
                style={{ background: "#e4e2dd" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: "#2B4D5A" }}
                />
              </div>
              <span
                className="text-[10px]"
                style={{ fontFamily: "'DM Mono', monospace", color: "#72787b" }}
              >
                {entry.graded}/{entry.total}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: statusStyle.bg }}
          >
            <StatusIcon size={12} style={{ color: statusStyle.text }} />
            <span
              className="text-[10px] font-medium tracking-wide uppercase"
              style={{ fontFamily: "'DM Mono', monospace", color: statusStyle.text }}
            >
              {entry.statusLabel}
            </span>
          </div>

          {/* Caret */}
          <ChevronRight
            size={18}
            style={{
              color: "#72787b",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.25s",
            }}
          />
        </div>
      </button>

      {/* Expanded: student grade rows */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="px-6 pb-5 pt-1 space-y-3"
              style={{ borderTop: "1px solid rgba(193,199,203,0.1)", background: "rgba(250,249,244,0.6)" }}
            >
              {/* Column labels */}
              <div className="flex items-center justify-between px-2 mb-2">
                <span
                  className="text-[9px] uppercase tracking-widest"
                  style={{ fontFamily: "'DM Mono', monospace", color: "#72787b" }}
                >
                  Student
                </span>
                <span
                  className="text-[9px] uppercase tracking-widest"
                  style={{ fontFamily: "'DM Mono', monospace", color: "#72787b" }}
                >
                  Score / 100 · Grade
                </span>
              </div>

              {entry.students.map((student, si) => {
                const score = scores[student.id] ?? "";
                const isSaved = saved[student.id];
                const flash = justSaved[student.id];
                const letter = getLetterGrade(score);
                const gradeColor = getGradeColor(score);

                return (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: si * 0.04, duration: 0.3 }}
                    className="flex items-center justify-between px-3 py-3 rounded-xl"
                    style={{
                      background: flash
                        ? "rgba(43,77,90,0.06)"
                        : "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(193,199,203,0.12)",
                      transition: "background 0.4s",
                    }}
                  >
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                        style={{
                          background: ["#123643", "#2B4D5A", "#41484b", "#72787b", "#393125"][si % 5],
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {student.initials}
                      </div>
                      <span
                        className="text-sm"
                        style={{ fontFamily: "'DM Sans', sans-serif", color: "#1b1c19" }}
                      >
                        {student.name}
                      </span>
                    </div>

                    {/* Input + letter + save */}
                    <div className="flex items-center gap-3">
                      {/* Letter grade chip */}
                      <span
                        className="w-7 text-center text-sm font-semibold tabular-nums"
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          color: gradeColor,
                          opacity: score ? 1 : 0.3,
                        }}
                      >
                        {letter}
                      </span>

                      {/* Score input */}
                      <input
                        type="text"
                        inputMode="numeric"
                        value={score}
                        placeholder="—"
                        onChange={(e) => handleScoreChange(student.id, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSave(student.id)}
                        className="w-16 text-center text-sm rounded-full py-1.5 px-2 transition-all outline-none"
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          background: "#f0eee9",
                          border: isSaved
                            ? "1px solid rgba(43,77,90,0.25)"
                            : "1px solid rgba(193,199,203,0.3)",
                          color: "#1b1c19",
                        }}
                        onFocus={(e) =>
                          ((e.target as HTMLInputElement).style.boxShadow =
                            "0 0 0 2px rgba(43,77,90,0.25)")
                        }
                        onBlur={(e) =>
                          ((e.target as HTMLInputElement).style.boxShadow = "none")
                        }
                      />

                      {/* Save button */}
                      <button
                        onClick={() => handleSave(student.id)}
                        disabled={score === ""}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                        style={{
                          background: flash
                            ? "rgba(43,77,90,0.15)"
                            : isSaved
                            ? "rgba(43,77,90,0.08)"
                            : score
                            ? "#2B4D5A"
                            : "#e4e2dd",
                        }}
                        title="Save grade"
                      >
                        {flash ? (
                          <CheckCircle2 size={14} style={{ color: "#2B4D5A" }} />
                        ) : (
                          <ChevronRight
                            size={14}
                            style={{
                              color: score && !isSaved ? "#ffffff" : "#72787b",
                            }}
                          />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {entry.students.length === 0 && (
                <p
                  className="text-sm text-center py-4"
                  style={{ color: "#72787b", fontFamily: "'DM Sans', sans-serif" }}
                >
                  All grades submitted.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function TeacherGradesPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const { teacherProfile } = useTeacherData();
  const { data: students, error: studentsError } = useTeacherStudents<Student>(
    teacherProfile?.schoolId || null, teacherProfile?.classes
  );
  const { data: reports, error: reportsError } = useTeacherReports<Report>(
    teacherProfile?.schoolId || null, teacherProfile?.uid || null
  );

  const anyError = studentsError || reportsError;

  // Filter reports to only this teacher's submissions
  const myReports = reports.filter(r =>
    r.teacherId === teacherProfile?.uid
  );

  // My students across all assigned classes
  const myStudents = students.filter(s =>
    teacherProfile?.classes?.includes(s.class)
  );

  // Live calculations
  const gradedCount = myReports.length;

  const avgScore = myReports.length > 0
    ? Math.round(
        myReports.reduce((sum, r) => sum + (r.score || 0), 0)
        / myReports.length
      ) : 0;

  const classGPA = myReports.length > 0
    ? (myReports.reduce((sum, r) =>
        sum + calculateGPA(r.score || 0), 0
      ) / myReports.length).toFixed(2)
    : "0.00";

  // Total assessments expected =
  // students × subjects teacher teaches
  const totalExpected = myStudents.length *
    (teacherProfile?.classes?.length || 1);

  const pendingCount = Math.max(0, totalExpected - gradedCount);

  const submissionRate = totalExpected > 0
    ? Math.round((gradedCount / totalExpected) * 100)
    : 0;

  const STATS = [
    { label: "CLASS AVG", value: classGPA, sub: "GPA across all subjects" },
    { label: "SUBMISSION", value: `${submissionRate}%`, sub: "On-time rate this term" },
    { label: "GRADED", value: String(gradedCount), sub: `Of ${totalExpected} total assessments` },
    { label: "PENDING", value: String(pendingCount), sub: "Require entry" },
  ];

  // Map classes to ClassEntry format
  const classOptions = teacherProfile?.classes || [];
  
  const classes: ClassEntry[] = classOptions.map((className, index) => {
    const classStudents = students.filter(s => s.class === className);
    
    // Get reports for this class and subject
    const classReports = reports.filter(r => 
      r.class === className && r.subject === teacherProfile?.subject
    );
    
    const mappedStudents = classStudents.map(s => {
      const report = classReports.find(r => r.studentId === s.id);
      return {
        id: s.id,
        name: s.name,
        initials: s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        score: report ? String(report.score) : "",
        saved: !!report,
        class: s.class
      };
    });

    const graded = mappedStudents.filter(s => s.saved).length;
    const total = mappedStudents.length;
    
    let status: GradeStatus = "pending";
    let statusLabel = `${total - graded} Pending Review`;
    if (total === 0) {
      status = "up-to-date";
      statusLabel = "Up to Date";
    } else if (graded === total) {
      status = "up-to-date";
      statusLabel = "Up to Date";
    } else if (graded === 0) {
      status = "to-grade";
      statusLabel = `${total} to Grade`;
    }

    return {
      id: className,
      code: className,
      name: teacherProfile?.subject || "Subject",
      icon: [BarChart3, FlaskConical, BookOpen, FileText][index % 4],
      iconBg: ["rgba(43,77,90,0.08)", "rgba(57,49,37,0.06)", "rgba(114,120,123,0.08)", "rgba(43,77,90,0.05)"][index % 4],
      iconColor: ["#2B4D5A", "#393125", "#72787b", "#41484b"][index % 4],
      status,
      statusLabel,
      statusMeta: "Due soon",
      students: mappedStudents,
      graded,
      total
    };
  });

  const handleSave = async (classId: string, studentId: string, score: string) => {
    if (!teacherProfile?.schoolId) return;
    setSaving(true);

    try {
      await setDoc(
        doc(db, "schools", teacherProfile.schoolId,
                "reports", `${studentId}-${classId}-${teacherProfile.subject}`),
        {
          studentId,
          class: classId,
          subject: teacherProfile.subject,
          score: Number(score),
          letterGrade: calculateLetterGrade(Number(score)),
          remarks: "",
          teacherId: teacherProfile.uid,
          teacherName: teacherProfile.name,
          term: "Term 2",
          year: "2025",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveCount((prev) => prev + 1);

      // Notify parents of graded students
      const student = students.find(s => s.id === studentId);
      if (student && (student as any).parentContact) {
        await SMS.gradePosted({
          parentName:  (student as any).parentName || "Parent",
          parentPhone: (student as any).parentContact,
          studentName: student.name,
          subject:     teacherProfile.subject || "Subject",
          score:       Number(score),
          letterGrade: calculateLetterGrade(Number(score)),
          schoolName:  teacherProfile?.schoolName || "EliteSchool's",
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("Error saving grade:", error);
      alert("Missing or insufficient permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar />
        
        <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full pt-28">
          <CollectionErrorBanner error={anyError} />
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-headline text-4xl md:text-5xl font-light italic text-primary">
              Gradebook
            </h1>
            <p className="font-label text-[10px] md:text-[11px] uppercase tracking-[0.15em] text-outline mt-2 font-mono">
              Term 2, 2025 • Continuous Assessment
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column: Main Content */}
            <div className="flex-1 space-y-8">
              {/* Stats strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {STATS.map((stat, i) => (
                  <div key={i} className="bg-surface-container-lowest/70 backdrop-blur-xl rounded-2xl border border-outline-variant/30 p-5 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-primary-container/5 rounded-full blur-xl pointer-events-none"></div>
                    <p className="font-headline text-3xl font-light text-primary leading-none mb-2">
                      {stat.value}
                    </p>
                    <p className="font-label text-[10px] uppercase tracking-[0.1em] text-outline font-mono">
                      {stat.label}
                    </p>
                    <p className="font-body text-xs text-on-surface-variant font-light mt-1">
                      {stat.sub}
                    </p>
                  </div>
                ))}
              </div>

              {/* Active Classes List */}
              <div className="bg-surface-container-lowest/70 backdrop-blur-xl rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-outline-variant/20 flex items-center justify-between">
                  <h2 className="font-headline text-2xl font-light italic text-primary">
                    Active Classes
                  </h2>
                  <div className="flex gap-2 bg-surface-container-low p-1 rounded-full">
                    {["Current Term", "Archived"].map((tab, i) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(i)}
                        className={`px-4 py-1.5 rounded-full font-label text-[10px] uppercase tracking-[0.1em] transition-all ${
                          activeTab === i
                            ? "bg-primary-container text-white shadow-sm"
                            : "text-outline hover:text-on-surface"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col">
                  {classes.length === 0 ? (
                    <p className="text-center text-outline text-sm py-8">No classes assigned.</p>
                  ) : (
                    classes.map((cls, i) => (
                      <ClassRow key={cls.id} entry={cls} index={i} onSave={handleSave} />
                    ))
                  )}
                </div>
                
                {/* Hint bar */}
                <div className="px-6 py-3 bg-surface-container-low/50 border-t border-outline-variant/10 flex items-center justify-between">
                  <p className="font-body text-xs text-outline flex items-center gap-1.5">
                    <Zap size={14} className="text-primary-container" />
                    Grades auto-save to local storage
                  </p>
                  {saveCount > 0 && (
                    <span className="font-label text-[10px] text-primary-container uppercase tracking-widest animate-pulse">
                      {saveCount} saved
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-full lg:w-80 space-y-6 flex-shrink-0">
              {/* Quick Entry */}
              <div className="bg-surface-container-lowest/70 backdrop-blur-xl rounded-2xl border border-outline-variant/30 p-6">
                <h3 className="font-headline text-xl font-light italic text-primary mb-4">
                  Recent Assessment
                </h3>
                {myReports.length > 0 ? (
                  <>
                    <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 mb-4">
                      <p className="font-label text-[10px] uppercase tracking-[0.1em] text-outline mb-1">{myReports[0]?.class || "N/A"}</p>
                      <p className="font-body text-sm font-medium text-on-surface">{myReports[0]?.subject || "Assessment"}</p>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-label text-[10px] uppercase tracking-[0.1em] text-outline">Progress</span>
                      <span className="font-label text-[10px] text-primary-container">{gradedCount}/{totalExpected} Graded</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden mb-5">
                      <div className="h-full bg-primary-container rounded-full" style={{ width: `${totalExpected ? (gradedCount / totalExpected) * 100 : 0}%` }} />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-[32px] text-outline/30 mb-2">assignment</span>
                    <p className="font-body text-sm text-outline">No recent assessments</p>
                  </div>
                )}
              </div>

              {/* Grade Analysis CTA */}
              <div className="bg-[#123643] text-white rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-4 relative z-10">
                  <Download size={20} className="text-white/90" />
                </div>
                <h3 className="font-headline text-xl font-light text-white mb-2 relative z-10">
                  Grade Analysis
                </h3>
                <p className="font-body text-xs text-white/70 mb-5 relative z-10 leading-relaxed">
                  Download a comprehensive PDF report of your class performance across all subjects.
                </p>
                <button className="w-full py-2.5 rounded-full bg-white text-[#123643] font-label text-[10px] uppercase tracking-[0.1em] font-bold hover:bg-white/90 transition-colors relative z-10">
                  Download Report
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
      <BottomNavBar items={TEACHER_NAV_ITEMS} activeHref="/teacher/grades" />
    </div>
  );
}
