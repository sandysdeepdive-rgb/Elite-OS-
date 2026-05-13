"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import BottomNavBar, { TEACHER_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { useTeacherData } from "@/lib/hooks/useTeacherData";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimetableConfig {
  days: string[];
  periods: Period[];
  entries: TimetableEntry[];
  updatedAt: string;
}

interface Period {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

interface TimetableEntry {
  id: string;
  day: string;
  periodId: string;
  subject: string;
  teacher: string;
  class: string;
  room: string;
  colorTag: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins === 60 ? "1h" : `${mins}m`;
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

export default function TeacherTimetablePage() {
  useAuthGuard("teacher");
  const router = useRouter();
  
  const [activeDay, setActiveDay] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<(TimetableEntry & { period: Period }) | null>(null);
  
  const [timetable, setTimetable] = useState<TimetableConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { teacherProfile } = useTeacherData();

  useEffect(() => {
    if (!teacherProfile?.schoolId) return;
    
    const fetchTimetable = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, `schools/${teacherProfile.schoolId}/timetable/config`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().updatedAt) {
          const tt = docSnap.data() as TimetableConfig;
          setTimetable(tt);
          
          // Set initial active day to today or the first day in the timetable if today is not found
          const todayExt = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          if (tt.days.includes(todayExt)) {
            setActiveDay(todayExt);
          } else if (tt.days.length > 0) {
            setActiveDay(tt.days[0]);
          }
        } else {
          setTimetable({ days: [], periods: [], entries: [], updatedAt: new Date().toISOString() });
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err : new Error("Failed to load timetable"));
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimetable();
  }, [teacherProfile?.schoolId]);

  const teacherInitials = teacherProfile?.name ? teacherProfile.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "PN";

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen mesh-gradient-bg">Loading...</div>;
  }

  // Filter entries to only show those for the logged-in teacher
  const teacherTimetable = timetable?.entries.filter(e => e.teacher === teacherProfile?.name || e.teacher === teacherProfile?.uid) || [];
  
  const dayEntries = teacherTimetable
    .filter(e => e.day === activeDay)
    .map(e => ({
      ...e,
      period: timetable?.periods.find(p => p.id === e.periodId)!
    }))
    .filter(e => e.period) // Ensure parent period exists
    .sort((a, b) => a.period.startTime.localeCompare(b.period.startTime));

  // Calculate week summary
  const totalClasses = teacherTimetable.length;
  let totalMinutes = 0;
  
  teacherTimetable.forEach(e => {
    const period = timetable?.periods.find(p => p.id === e.periodId);
    if (period) {
      const [sh, sm] = period.startTime.split(":").map(Number);
      const [eh, em] = period.endTime.split(":").map(Number);
      totalMinutes += (eh * 60 + em) - (sh * 60 + sm);
    }
  });
  
  const totalHours = Math.round(totalMinutes / 60);

  const WEEK_SUMMARY = [
    { label: "Classes",    value: totalClasses.toString() },
    { label: "Hours",      value: totalHours.toString() },
  ];

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <CustomTopAppBar initials={teacherInitials} />
        
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full pt-28 space-y-8">
          <CollectionErrorBanner error={error} />
          {/* Section 1 — Page header */}
          <div>
            <h1 className="text-5xl font-light text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              My Timetable
            </h1>
            <p className="text-base font-light text-[#5f5e60] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {teacherProfile?.subject || "Subject"} · Term 2, 2025
            </p>
          </div>

          {/* Section 2 — Week summary strip */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {WEEK_SUMMARY.map(s => (
              <div
                key={s.label}
                className="rounded-2xl px-5 py-3 bg-white/70 border border-[#c1c7cb]/15 flex-shrink-0 text-center min-w-[80px]"
              >
                <span className="text-3xl font-light text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {s.value}
                </span>
                <p className="text-[9px] uppercase tracking-widest text-[#72787b] mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Section 3 — Day selector tabs */}
          {timetable && timetable.days.length > 0 && (
            <div className="bg-[#faf9f4]/60 backdrop-blur-xl rounded-2xl border border-[#c1c7cb]/30 p-2">
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {timetable.days.map(day => {
                  const count = teacherTimetable.filter(e => e.day === day).length;
                  return (
                    <button
                      key={day}
                      onClick={() => setActiveDay(day)}
                      className="flex-1 min-w-[60px] flex flex-col items-center py-2.5 rounded-xl transition-all"
                      style={{
                        background: activeDay === day ? "#2B4D5A" : "transparent",
                        color: activeDay === day ? "#ffffff" : "#72787b",
                      }}
                    >
                      <span className="text-sm font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {day.substring(0, 3)}
                      </span>
                      {/* Dot indicators */}
                      <div className="flex gap-[3px] mt-1.5 h-1">
                        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                          <div
                            key={i}
                            className="w-1 h-1 rounded-full"
                            style={{ background: activeDay === day ? "rgba(255,255,255,0.6)" : "#c1c7cb" }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4 — Day schedule */}
          <div className="space-y-4">
            <h2 className="text-2xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {activeDay === new Date().toLocaleDateString('en-US', { weekday: 'long' }) ? "Today" : activeDay} · {dayEntries.length} Classes
            </h2>

            {dayEntries.length === 0 ? (
              <div className="bg-[#faf9f4]/60 backdrop-blur-xl rounded-2xl border border-[#c1c7cb]/30 text-center py-16">
                <p className="text-2xl italic text-[#72787b]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  No classes scheduled
                </p>
                <p className="text-sm text-[#72787b] mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Free day — no teaching obligations.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayEntries.map((entry, index) => {
                  const previousEntry = index > 0 ? dayEntries[index - 1] : null;
                  
                  // Extremely basic gap detection between periods
                  let hasGap = false;
                  if (previousEntry && timetable) {
                   const pIdx1 = timetable.periods.findIndex(p => p.id === previousEntry.periodId);
                   const pIdx2 = timetable.periods.findIndex(p => p.id === entry.periodId);
                   if (pIdx2 - pIdx1 > 1) hasGap = true;
                  }

                  return (
                    <div key={entry.id} className="space-y-3">
                      {hasGap && (
                        <div className="flex gap-4 items-center opacity-50">
                          <div className="w-14 flex-shrink-0 text-right">
                            <span className="text-[10px] text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>--</span>
                          </div>
                          <div className="flex-1 h-px bg-[#c1c7cb]/30" />
                          <span className="text-[10px] text-[#72787b] pr-4 uppercase tracking-widest font-label">Gap / Break</span>
                        </div>
                      )}
                      
                      <motion.div
                        style={{ animation: `fadeSlideIn 0.3s ${index * 0.07}s ease both` }}
                        className="flex gap-4 items-stretch"
                      >
                        {/* Time column */}
                        <div className="flex flex-col items-end pt-1 w-14 flex-shrink-0">
                          <span className="text-[10px] text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>
                            {entry.period.startTime}
                          </span>
                          <div className="w-px flex-1 my-1 bg-[#c1c7cb]/20 mx-auto" />
                          <span className="text-[10px] text-[#72787b] opacity-60" style={{ fontFamily: "'DM Mono', monospace" }}>
                            {entry.period.endTime}
                          </span>
                        </div>

                        {/* Class card */}
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="flex-1 rounded-2xl p-5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                          style={{ background: entry.colorTag, boxShadow: "0 4px 20px rgba(20,20,22,0.08)" }}
                        >
                          <div className="flex items-start justify-between gap-3 text-white">
                            <div className="flex-1">
                              <div
                                className="text-[10px] rounded-full px-2 py-0.5 w-fit mb-2"
                                style={{
                                  fontFamily: "'DM Mono', monospace",
                                  background: "rgba(255,255,255,0.2)",
                                }}
                              >
                                {entry.class}
                              </div>
                              <h3 className="text-base font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                {entry.subject}
                              </h3>
                              <p className="text-sm opacity-90 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                {entry.room}
                              </p>
                            </div>
                            {/* Duration chip */}
                            <div
                              className="text-[10px] px-2 py-1 rounded-xl opacity-80"
                              style={{
                                fontFamily: "'DM Mono', monospace",
                                background: "rgba(255,255,255,0.15)",
                              }}
                            >
                              {computeDuration(entry.period.startTime, entry.period.endTime)}
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomNavBar items={TEACHER_NAV_ITEMS} activeHref="/teacher/timetable" onNavigate={(href) => router.push(href)} />

      {/* Section 5 — Detail modal */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-[#141416]/40 backdrop-blur-sm"
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: "#fbf9f4", boxShadow: "0 32px 64px rgba(20,20,22,0.18)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Colored header band */}
              <div className="p-6 text-white" style={{ background: selectedEntry.colorTag }}>
                <p
                  className="text-[10px] opacity-80 mb-1"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  {selectedEntry.class} · {selectedEntry.period.label}
                </p>
                <h2
                  className="text-3xl"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {selectedEntry.subject}
                </h2>
              </div>

              {/* Detail rows */}
              <div className="p-6 space-y-4">
                {[
                  { label: "Time", value: `${selectedEntry.period.startTime} – ${selectedEntry.period.endTime}` },
                  { label: "Room", value: selectedEntry.room || "TBA" },
                  { label: "Day", value: selectedEntry.day },
                  { label: "Duration", value: computeDuration(selectedEntry.period.startTime, selectedEntry.period.endTime) },
                ].map(row => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center border-b border-[#c1c7cb]/15 pb-4 last:border-0 last:pb-0"
                  >
                    <span className="text-[10px] uppercase tracking-widest text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {row.label}
                    </span>
                    <span className="text-sm text-[#1b1c19]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Close button */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="w-full py-3 rounded-full text-sm font-medium transition-transform active:scale-95"
                  style={{ background: "#2B4D5A", color: "#ffffff", fontFamily: "'DM Sans', sans-serif" }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
