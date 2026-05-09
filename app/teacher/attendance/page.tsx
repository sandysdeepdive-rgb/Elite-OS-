"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import BottomNavBar, { TEACHER_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { useTeacherData } from "@/lib/hooks/useTeacherData";
import { useCollection } from "@/lib/hooks/useSchoolData";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { SMS } from "@/lib/utils/sms";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = "present" | "absent" | "late" | "unset";

interface Student {
  id: string;
  name: string;
  initials: string;
  status: AttendanceStatus;
  class: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  date: string;
  status: AttendanceStatus;
  teacherId: string;
  timestamp: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["#123643","#2B4D5A","#41484b","#72787b","#393125"];

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function TopAppBar({ initials }: { initials: string }) {
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
          {initials}
        </div>
      </div>
    </header>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

import { useAuthGuard } from '@/lib/hooks/useAuthGuard';

export default function TeacherAttendancePage() {
  useAuthGuard('teacher');
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeClass, setActiveClass] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { teacherProfile } = useTeacherData();
  const { data: allStudents, error: studentsError } = useCollection<{id: string, name: string, class: string}>(
    teacherProfile?.schoolId || null, "students"
  );
  const { data: attendanceRecords, error: attendanceError } = useCollection<AttendanceRecord>(
    teacherProfile?.schoolId || null, "attendance"
  );

  const anyError = studentsError || attendanceError;

  const todayLabel = formatDate(currentDate);

  // Set initial selected class
  useEffect(() => {
    if (teacherProfile?.classes && teacherProfile.classes.length > 0 && !activeClass) {
      setActiveClass(teacherProfile.classes[0]);
    }
  }, [teacherProfile, activeClass]);

  // Load students and their attendance for the selected date and class
  useEffect(() => {
    if (!activeClass || !allStudents) return;

    const classStudents = allStudents.filter(s => s.class === activeClass);
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Get attendance records for this class and date
    const dayRecords = attendanceRecords.filter(r => 
      r.class === activeClass && r.date === dateString
    );

    const mappedStudents = classStudents.map(s => {
      const record = dayRecords.find(r => r.studentId === s.id);
      
      // Check local storage for unsaved changes
      const localKey = `attendance_${activeClass}_${dateString}_${s.id}`;
      const localStatus = localStorage.getItem(localKey) as AttendanceStatus | null;

      return {
        id: s.id,
        name: s.name,
        initials: s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        status: localStatus || (record ? record.status : "unset"),
        class: s.class
      };
    });

    // Sort alphabetically
    mappedStudents.sort((a, b) => a.name.localeCompare(b.name));
    setStudents(mappedStudents);
    
    // Check if all are marked and saved in firestore
    const allMarked = mappedStudents.every(s => s.status !== "unset");
    const allSaved = mappedStudents.every(s => dayRecords.some(r => r.studentId === s.id && r.status === s.status));
    setSubmitted(allMarked && allSaved && mappedStudents.length > 0);

  }, [activeClass, currentDate, allStudents, attendanceRecords]);

  const presentCount = students.filter(s => s.status === "present").length;
  const absentCount  = students.filter(s => s.status === "absent").length;
  const lateCount    = students.filter(s => s.status === "late").length;
  const markedCount  = students.filter(s => s.status !== "unset").length;
  const unmarkedCount = students.length - markedCount;

  function setStatus(id: string, status: AttendanceStatus) {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    setSubmitted(false);
    
    // Save to local storage immediately
    const dateString = currentDate.toISOString().split('T')[0];
    const localKey = `attendance_${activeClass}_${dateString}_${id}`;
    localStorage.setItem(localKey, status);
  }

  function markAll(status: AttendanceStatus) {
    setStudents(prev => prev.map(s => ({ ...s, status })));
    setSubmitted(false);
    
    // Save all to local storage
    const dateString = currentDate.toISOString().split('T')[0];
    students.forEach(s => {
      const localKey = `attendance_${activeClass}_${dateString}_${s.id}`;
      if (status === "unset") {
        localStorage.removeItem(localKey);
      } else {
        localStorage.setItem(localKey, status);
      }
    });
  }

  async function handleSubmit() {
    if (markedCount < students.length || !teacherProfile?.schoolId) return;
    setIsSubmitting(true);
    
    try {
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Save all marked students to Firestore
      const promises = students
        .filter(s => s.status !== "unset")
        .map(s => {
          const docId = `${s.id}-${dateString}`;
          return setDoc(
            doc(db, "schools", teacherProfile.schoolId, "attendance", docId),
            {
              studentId: s.id,
              studentName: s.name,
              class: activeClass,
              date: dateString,
              status: s.status,
              teacherId: teacherProfile.uid,
              timestamp: serverTimestamp()
            },
            { merge: true }
          );
        });
        
      await Promise.all(promises);

      // Clear local storage for these records
      students.forEach(s => {
        const localKey = `attendance_${activeClass}_${dateString}_${s.id}`;
        localStorage.removeItem(localKey);
      });

      // Send SMS to parents of absent/late students
      for (const student of students) {
        if (student.status === "absent" || student.status === "late") {
          const fullStudent = allStudents?.find(s => s.id === student.id);
          if (fullStudent && (fullStudent as any).parentContact) {
            await SMS.attendanceAlert({
              parentName:  (fullStudent as any).parentName || "Parent",
              parentPhone: (fullStudent as any).parentContact,
              studentName: student.name,
              status: student.status,
              schoolName:  teacherProfile?.schoolName || "EliteSchool's",
            });
          }
        }
      }

      setSubmitted(true);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("Error saving attendance:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const teacherInitials = teacherProfile?.name ? teacherProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "PN";

  // Calculate recent sessions from live data
  const recentSessionsMap = new Map<string, { dateStr: string, date: string, code: string, present: number, total: number }>();
  
  attendanceRecords.filter(r => r.teacherId === teacherProfile?.uid).forEach(r => {
    const key = `${r.date}_${r.class}`;
    if (!recentSessionsMap.has(key)) {
      recentSessionsMap.set(key, {
        dateStr: r.date,
        date: new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        code: r.class,
        present: 0,
        total: 0
      });
    }
    const session = recentSessionsMap.get(key)!;
    session.total += 1;
    if (r.status === "present" || r.status === "late") {
      session.present += 1;
    }
  });

  const RECENT_SESSIONS = Array.from(recentSessionsMap.values())
    .sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime())
    .slice(0, 5);

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar initials={teacherInitials} />
        
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full pt-28 space-y-8">
          <CollectionErrorBanner error={anyError} />
          {/* Section 1 — Page header */}
          <div>
            <h1 className="text-5xl font-light text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Attendance
            </h1>
            <p className="text-[#5f5e60] font-light mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {todayLabel} · Mark register for your active classes.
            </p>
          </div>

          {/* Section 2 — Class selector */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 pb-1">
            {teacherProfile?.classes?.map(cls => {
              const isActive = activeClass === cls;
              return (
                <button
                  key={cls}
                  onClick={() => setActiveClass(cls)}
                  className={`flex-shrink-0 rounded-2xl px-5 py-3 transition-all active:scale-95 text-left ${
                    isActive
                      ? "bg-[#2B4D5A] text-white shadow-md"
                      : "bg-white/70 border border-[#c1c7cb]/20 text-[#5f5e60] hover:bg-white/90"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-widest opacity-80 mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>{cls}</p>
                  <p className="text-sm font-medium truncate max-w-[140px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{teacherProfile?.subject || "Subject"}</p>
                  <p className="text-[10px] opacity-60 mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>--:--</p>
                </button>
              );
            })}
            {(!teacherProfile?.classes || teacherProfile.classes.length === 0) && (
              <p className="text-sm text-[#5f5e60]">No classes assigned.</p>
            )}
          </div>

          {/* Section 3 — Active class summary strip */}
          <div className="bg-[#faf9f4]/60 backdrop-blur-xl rounded-2xl border border-[#c1c7cb]/30 p-4 flex items-center justify-between">
            <div className="flex-1 text-center px-2">
              <span className="text-3xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{presentCount}</span>
              <p className="text-[9px] uppercase tracking-widest text-[#72787b] mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>Present</p>
            </div>
            <div className="w-px h-8 bg-[#c1c7cb]/30 self-center" />
            <div className="flex-1 text-center px-2">
              <span className="text-3xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{absentCount}</span>
              <p className="text-[9px] uppercase tracking-widest text-[#72787b] mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>Absent</p>
            </div>
            <div className="w-px h-8 bg-[#c1c7cb]/30 self-center" />
            <div className="flex-1 text-center px-2">
              <span className="text-3xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{lateCount}</span>
              <p className="text-[9px] uppercase tracking-widest text-[#72787b] mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>Late</p>
            </div>
            <div className="w-px h-8 bg-[#c1c7cb]/30 self-center" />
            <div className="flex-1 text-center px-2">
              <span className="text-3xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{unmarkedCount}</span>
              <p className="text-[9px] uppercase tracking-widest text-[#72787b] mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>Unmarked</p>
            </div>
          </div>

          {/* Section 4 — Mark All row */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#5f5e60]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {markedCount} of {students.length} marked
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => markAll("present")}
                className="px-4 py-1.5 rounded-full border border-[#2B4D5A] text-[#2B4D5A] text-[10px] uppercase tracking-widest hover:bg-[#2B4D5A]/10 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
              >
                Mark All Present
              </button>
              <button
                onClick={() => markAll("unset")}
                className="px-4 py-1.5 rounded-full border border-[#ba1a1a]/40 text-[#ba1a1a] text-[10px] uppercase tracking-widest hover:bg-[#ba1a1a]/10 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Section 5 — Student register */}
          <div className="bg-[#faf9f4]/60 backdrop-blur-xl rounded-2xl border border-[#c1c7cb]/30 overflow-hidden">
            <div className="divide-y divide-[#c1c7cb]/10">
              {students.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[#72787b] text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>No students found for this class.</p>
                </div>
              ) : (
                students.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.3 }}
                    className="flex items-center justify-between px-5 py-4 hover:bg-[#f0eee9]/50 transition-colors"
                  >
                    {/* Left: avatar initials + name */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-semibold"
                        style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length], fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {student.initials}
                      </div>
                      <span className="text-sm text-[#1b1c19]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{student.name}</span>
                    </div>

                    {/* Right: 3-button toggle group */}
                    <div className="flex gap-1.5">
                      {(["present", "late", "absent"] as const).map(s => {
                        const isActive = student.status === s;
                        let activeBg = "";
                        if (s === "present") activeBg = "#2B4D5A";
                        else if (s === "late") activeBg = "#51473a";
                        else if (s === "absent") activeBg = "#ba1a1a";

                        return (
                          <button
                            key={s}
                            onClick={() => setStatus(student.id, s)}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-medium uppercase transition-all active:scale-90"
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              background: isActive ? activeBg : "#e4e2dd",
                              color: isActive ? "#ffffff" : "#72787b",
                              boxShadow: isActive ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                            }}
                            title={s.charAt(0).toUpperCase() + s.slice(1)}
                          >
                            {s === "present" ? "P" : s === "late" ? "L" : "A"}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Section 7 — Recent Sessions */}
          <div className="pt-4">
            <h2 className="text-2xl text-[#2B4D5A] italic" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Recent Sessions</h2>
            <div className="space-y-3 mt-4">
              {RECENT_SESSIONS.length > 0 ? (
                RECENT_SESSIONS.map((session, i) => (
                  <div key={i} className="bg-[#faf9f4]/60 backdrop-blur-xl rounded-2xl border border-[#c1c7cb]/30 px-5 py-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#72787b] uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>{session.date}</span>
                      <p className="text-sm font-medium text-[#1b1c19] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{session.code}</p>
                    </div>
                    {/* Attendance ratio bar + fraction */}
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-[#e4e2dd] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2B4D5A] rounded-full"
                          style={{ width: `${(session.present / session.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#5f5e60] tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {session.present}/{session.total}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-[32px] text-outline/30 mb-2">history</span>
                  <p className="font-body text-sm text-outline">No recent sessions</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Section 6 — Submit bar */}
      <div className="fixed bottom-[88px] left-0 right-0 z-40 px-6 max-w-5xl mx-auto">
        <div className="bg-[#faf9f4]/90 backdrop-blur-xl border border-[#c1c7cb]/30 shadow-lg flex justify-between items-center px-5 py-4 rounded-2xl">
          <div>
            <p className="text-sm font-medium text-[#1b1c19]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Submit Register — {activeClass}
            </p>
            <p className="text-[10px] text-[#72787b] uppercase tracking-widest mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
              {presentCount} present · {absentCount} absent · {lateCount} late
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={markedCount < students.length || isSubmitting}
            className="px-6 py-2.5 rounded-full text-[10px] uppercase tracking-widest transition-all font-bold"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              background: markedCount < students.length || isSubmitting
                ? "rgba(43,77,90,0.4)"
                : submitted
                ? "#4A6741"
                : "#2B4D5A",
              color: markedCount < students.length || isSubmitting ? "rgba(255,255,255,0.7)" : "#ffffff",
              cursor: markedCount < students.length || isSubmitting ? "not-allowed" : "pointer",
              boxShadow: markedCount < students.length || isSubmitting ? "none" : "0 4px 12px rgba(43,77,90,0.2)",
            }}
          >
            {isSubmitting ? "Saving..." : submitted ? "✓ Submitted" : "Submit Register"}
          </button>
        </div>
      </div>

      <BottomNavBar items={TEACHER_NAV_ITEMS} activeHref="/teacher/attendance" onNavigate={(href) => router.push(href)} />
    </div>
  );
}
