"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import BottomNavBar, { TEACHER_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { useTeacherData } from "@/lib/hooks/useTeacherData";
import { useCollection } from "@/lib/hooks/useSchoolData";

// ─── Types ────────────────────────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
];

type TimetableEntry = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  code: string;
  room: string;
  students: number;
  color: "petrol" | "charcoal" | "taupe" | "muted";
  teacherId: string;
};

const COLOR_MAP = {
  petrol:   { bg: "#2B4D5A", text: "#ffffff", codeBg: "rgba(255,255,255,0.15)" },
  charcoal: { bg: "#141416", text: "#ffffff", codeBg: "rgba(255,255,255,0.12)" },
  taupe:    { bg: "#B5A898", text: "#1b1c19", codeBg: "rgba(0,0,0,0.08)"       },
  muted:    { bg: "#e4e2dd", text: "#41484b", codeBg: "rgba(0,0,0,0.05)"       },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins === 60 ? "1h" : `${mins}m`;
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
  const router = useRouter();
  const [activeDay, setActiveDay] = useState("Fri");
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);

  const { teacherProfile } = useTeacherData();
  const { data: allTimetable, error: timetableError } = useCollection<TimetableEntry>(
    teacherProfile?.schoolId || null, "timetable"
  );

  const teacherTimetable = allTimetable.filter(t => t.teacherId === teacherProfile?.uid);

  const dayEntries = teacherTimetable
    .filter(e => e.day === activeDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const teacherInitials = teacherProfile?.name ? teacherProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "PN";

  // Calculate week summary
  const totalClasses = teacherTimetable.length;
  let totalMinutes = 0;
  teacherTimetable.forEach(t => {
    const [sh, sm] = t.startTime.split(":").map(Number);
    const [eh, em] = t.endTime.split(":").map(Number);
    totalMinutes += (eh * 60 + em) - (sh * 60 + sm);
  });
  const totalHours = Math.round(totalMinutes / 60);
  
  // Estimate total students (unique students across classes would be better, but this is an approximation)
  const totalStudents = teacherTimetable.reduce((sum, t) => sum + (t.students || 0), 0);
  
  // Calculate free slots (assuming 9 slots per day, 5 days = 45 total slots)
  const freeSlots = 45 - totalClasses;

  const WEEK_SUMMARY = [
    { label: "Classes",    value: totalClasses.toString() },
    { label: "Hours",      value: totalHours.toString() },
    { label: "Students",   value: totalStudents.toString() },
    { label: "Free Slots", value: freeSlots.toString()  },
  ];

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <CustomTopAppBar initials={teacherInitials} />
        
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full pt-28 space-y-8">
          <CollectionErrorBanner error={timetableError} />
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
          <div className="bg-[#faf9f4]/60 backdrop-blur-xl rounded-2xl border border-[#c1c7cb]/30 p-2">
            <div className="flex gap-1">
              {DAYS.map(day => {
                const count = teacherTimetable.filter(e => e.day === day).length;
                return (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className="flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all"
                    style={{
                      background: activeDay === day ? "#2B4D5A" : "transparent",
                      color: activeDay === day ? "#ffffff" : "#72787b",
                    }}
                  >
                    <span className="text-sm font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {day}
                    </span>
                    {/* Dot indicators */}
                    <div className="flex gap-[3px] mt-1.5">
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

          {/* Section 4 — Day schedule */}
          <div className="space-y-4">
            <h2 className="text-2xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {activeDay === "Fri" ? "Today" : activeDay} · {dayEntries.length} Classes
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
                  const colors = COLOR_MAP[entry.color] || COLOR_MAP.petrol;
                  const previousEntry = index > 0 ? dayEntries[index - 1] : null;
                  
                  const gapSlots = [];
                  if (previousEntry) {
                    for (const slot of TIME_SLOTS) {
                      if (slot >= previousEntry.endTime && slot < entry.startTime) {
                        gapSlots.push(slot);
                      }
                    }
                  } else {
                    for (const slot of TIME_SLOTS) {
                      if (slot < entry.startTime) {
                        gapSlots.push(slot);
                      }
                    }
                  }

                  return (
                    <div key={entry.id} className="space-y-3">
                      {gapSlots.map(slot => (
                        <div key={slot} className="flex gap-4 items-center opacity-50">
                          <div className="w-14 flex-shrink-0 text-right">
                            <span className="text-[10px] text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>{slot}</span>
                          </div>
                          <div className="flex-1 h-px bg-[#c1c7cb]/30" />
                        </div>
                      ))}
                      <motion.div
                        style={{ animation: `fadeSlideIn 0.3s ${index * 0.07}s ease both` }}
                        className="flex gap-4 items-stretch"
                      >
                      {/* Time column */}
                      <div className="flex flex-col items-end pt-1 w-14 flex-shrink-0">
                        <span className="text-[10px] text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {entry.startTime}
                        </span>
                        <div className="w-px flex-1 my-1 bg-[#c1c7cb]/20 mx-auto" />
                        <span className="text-[10px] text-[#72787b] opacity-60" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {entry.endTime}
                        </span>
                      </div>

                      {/* Class card */}
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="flex-1 rounded-2xl p-5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{ background: colors.bg, boxShadow: "0 4px 20px rgba(20,20,22,0.08)" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div
                              className="text-[10px] rounded-full px-2 py-0.5 w-fit mb-2"
                              style={{
                                fontFamily: "'DM Mono', monospace",
                                background: colors.codeBg,
                                color: colors.text,
                                opacity: 0.85,
                              }}
                            >
                              {entry.code}
                            </div>
                            <h3 className="text-base font-medium" style={{ fontFamily: "'DM Sans', sans-serif", color: colors.text }}>
                              {entry.subject}
                            </h3>
                            <p className="text-sm opacity-70 mt-1" style={{ fontFamily: "'DM Sans', sans-serif", color: colors.text }}>
                              {entry.room}{entry.students > 0 ? ` · ${entry.students} students` : ""}
                            </p>
                          </div>
                          {/* Duration chip */}
                          <div
                            className="text-[10px] px-2 py-1 rounded-xl opacity-60"
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              background: colors.codeBg,
                              color: colors.text,
                            }}
                          >
                            {computeDuration(entry.startTime, entry.endTime)}
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
              <div className="p-6" style={{ background: (COLOR_MAP[selectedEntry.color] || COLOR_MAP.petrol).bg }}>
                <p
                  className="text-[10px] opacity-70 mb-1"
                  style={{ fontFamily: "'DM Mono', monospace", color: (COLOR_MAP[selectedEntry.color] || COLOR_MAP.petrol).text }}
                >
                  {selectedEntry.code}
                </p>
                <h2
                  className="text-3xl"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: (COLOR_MAP[selectedEntry.color] || COLOR_MAP.petrol).text }}
                >
                  {selectedEntry.subject}
                </h2>
              </div>

              {/* Detail rows */}
              <div className="p-6 space-y-4">
                {[
                  { label: "Time", value: `${selectedEntry.startTime} – ${selectedEntry.endTime}` },
                  { label: "Room", value: selectedEntry.room },
                  { label: "Day", value: selectedEntry.day },
                  { label: "Students", value: selectedEntry.students > 0 ? `${selectedEntry.students} enrolled` : "Staff only" },
                  { label: "Duration", value: computeDuration(selectedEntry.startTime, selectedEntry.endTime) },
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
