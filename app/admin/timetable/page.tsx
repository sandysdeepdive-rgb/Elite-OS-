"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";
import EliteInput from "@/components/ui/EliteInput";
import { useSchoolData } from "@/lib/hooks/useSchoolData";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const PERIODS = [
  { time: "08:00", type: "lesson" },
  { time: "09:00", type: "lesson" },
  { time: "10:00", type: "lesson" },
  { time: "BREAK", type: "break", label: "Short Break" },
  { time: "11:00", type: "lesson" },
  { time: "12:00", type: "lesson" },
  { time: "LUNCH", type: "break", label: "Lunch Break" },
  { time: "14:00", type: "lesson" },
  { time: "15:00", type: "lesson" },
  { time: "16:00", type: "lesson" },
] as const;

const MOCK_CLASSES_LIST = [
  "S.1A", "S.1B", "S.2A", "S.2B",
  "S.3A", "S.3B", "S.4A", "S.4B",
  "S.5A", "S.5B", "S.6A", "S.6B",
];

const MOCK_TEACHERS_LIST = [
  { id: "t1", name: "Mr. Ssemwogerere John", code: "01" },
  { id: "t2", name: "Ms. Nakiganda Ruth", code: "02" },
  { id: "t3", name: "Mr. Ochieng David", code: "03" },
  { id: "t4", name: "Ms. Apio Christine", code: "04" },
  { id: "t5", name: "Mr. Mugisha Robert", code: "05" },
];

interface TimetableEntry {
  subject: string;
  teacherCode: string;
  room: string;
  teacherId: string;
}

type TimetableData = Record<string, TimetableEntry>;

const INITIAL_TIMETABLE: TimetableData = {
  "S.4A-0-0": { subject: "ENG", teacherCode: "03", room: "Room 12", teacherId: "t3" },
  "S.4A-0-1": { subject: "MATH", teacherCode: "02", room: "Room 8", teacherId: "t2" },
  "S.4A-0-4": { subject: "PHY", teacherCode: "01", room: "Lab 1", teacherId: "t1" },
  "S.4A-0-5": { subject: "BIO", teacherCode: "04", room: "Lab 2", teacherId: "t4" },
  "S.4B-0-0": { subject: "MATH", teacherCode: "02", room: "Room 8", teacherId: "t2" },
  "S.4B-0-1": { subject: "ENG", teacherCode: "03", room: "Room 12", teacherId: "t3" },
  "S.5A-0-4": { subject: "PHY", teacherCode: "01", room: "Lab 1", teacherId: "t1" },
  "S.5A-0-5": { subject: "CHEM", teacherCode: "05", room: "Lab 3", teacherId: "t5" },
};

import { useAuthGuard } from '@/lib/hooks/useAuthGuard';

export default function AdminTimetablePage() {
  useAuthGuard('admin');
  const { schoolId, schoolName, adminName, loading } = useSchoolData();
  const [activeDay, setActiveDay] = useState(0);
  const [timetable, setTimetable] = useState<TimetableData>(INITIAL_TIMETABLE);
  const [addEntry, setAddEntry] = useState<{ cls: string; dayIndex: number; periodIndex: number } | null>(null);
  const [editEntry, setEditEntry] = useState<{ cls: string; dayIndex: number; periodIndex: number; entry: TimetableEntry } | null>(null);
  const [entryForm, setEntryForm] = useState({ subject: "", teacherId: "", teacherCode: "", room: "" });
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetDay, setCopyTargetDay] = useState<number>(0);

  const getTimetableEntry = (cls: string, day: number, period: number) =>
    timetable[`${cls}-${day}-${period}`] || null;

  const clearEntry = (cls: string, day: number, period: number) => {
    setTimetable((prev) => {
      const next = { ...prev };
      delete next[`${cls}-${day}-${period}`];
      return next;
    });
  };

  const detectClash = (
    teacherId: string,
    dayIndex: number,
    periodIndex: number,
    excludeKey?: string
  ): string | null => {
    for (const [key, entry] of Object.entries(timetable)) {
      if (key === excludeKey) continue;
      const [, d, p] = key.split("-");
      if (
        entry.teacherId === teacherId &&
        parseInt(d) === dayIndex &&
        parseInt(p) === periodIndex
      ) {
        const [clashClass] = key.split("-");
        return `CLASH DETECTED — TR-${entry.teacherCode} already assigned to ${clashClass} at this period`;
      }
    }
    return null;
  };

  let clashWarning: string | null = null;
  if (entryForm.teacherId) {
    const target = addEntry || editEntry;
    if (target) {
      const excludeKey = editEntry
        ? `${editEntry.cls}-${editEntry.dayIndex}-${editEntry.periodIndex}`
        : undefined;
      clashWarning = detectClash(
        entryForm.teacherId,
        target.dayIndex,
        target.periodIndex,
        excludeKey
      );
    }
  }

  const handleSaveEntry = () => {
    if (!entryForm.subject || !entryForm.teacherId || clashWarning) return;
    const target = addEntry || editEntry;
    if (!target) return;
    const key = `${target.cls}-${target.dayIndex}-${target.periodIndex}`;
    setTimetable((prev) => ({
      ...prev,
      [key]: {
        subject: entryForm.subject,
        teacherCode: entryForm.teacherCode,
        room: entryForm.room || "TBA",
        teacherId: entryForm.teacherId,
      },
    }));
    setAddEntry(null);
    setEditEntry(null);
    setEntryForm({ subject: "", teacherId: "", teacherCode: "", room: "" });
  };

  const handleCopyDay = () => {
    if (copyTargetDay === activeDay) return;
    
    setTimetable(prev => {
      const next = { ...prev };
      // Remove existing entries for target day
      for (const key of Object.keys(next)) {
        const [, d] = key.split("-");
        if (parseInt(d) === copyTargetDay) {
          delete next[key];
        }
      }
      // Copy entries from active day to target day
      for (const [key, entry] of Object.entries(prev)) {
        const [cls, d, p] = key.split("-");
        if (parseInt(d) === activeDay) {
          next[`${cls}-${copyTargetDay}-${p}`] = { ...entry };
        }
      }
      return next;
    });
    setShowCopyModal(false);
  };

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <AdminSidebar
        activeHref="/admin/timetable"
      />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="Timetable" subtitle="Master Schedule Builder" />
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Section 1 — Page header with actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-headline text-3xl font-light italic text-primary">
                Master Schedule Builder
              </h2>
              <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mt-1">
                Term 2, 2025 — Monday to Friday
              </p>
            </div>
            <div className="flex gap-3">
              <EliteButton variant="outlined" size="sm" onClick={() => setShowCopyModal(true)}>
                <span className="material-symbols-outlined text-[16px] mr-1.5">
                  content_copy
                </span>
                Copy Day
              </EliteButton>
              <EliteButton
                variant="primary"
                size="sm"
                onClick={() => setShowPublishModal(true)}
              >
                <span className="material-symbols-outlined text-[16px] mr-1.5">
                  publish
                </span>
                Publish
              </EliteButton>
            </div>
          </div>

          {/* Section 2 — Day selector tabs */}
          <GlassCard padding="p-2">
            <div className="flex gap-1">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(i)}
                  className={`flex-1 py-2.5 rounded-xl font-label text-[11px] uppercase tracking-[0.1em] transition-all duration-200 ${
                    activeDay === i
                      ? "bg-primary-container text-white shadow-sm"
                      : "text-outline hover:bg-surface-container"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Section 3 — Timetable grid */}
          <GlassCard padding="p-0" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                {/* Header row — periods */}
                <thead>
                  <tr className="border-b border-outline-variant/30">
                    <th className="w-20 px-4 py-3 text-left sticky left-0 bg-surface-container-low/90 backdrop-blur-sm border-r border-outline-variant/20">
                      <span className="font-label text-[10px] uppercase tracking-[0.1em] text-outline">
                        Class
                      </span>
                    </th>
                    {PERIODS.map((p) => (
                      <th
                        key={p.time}
                        className={`px-3 py-3 text-center min-w-[100px] font-label text-[10px] uppercase tracking-[0.08em] ${
                          p.type === "break"
                            ? "text-on-tertiary-container bg-surface-container/50"
                            : "text-outline"
                        }`}
                      >
                        {p.time}
                        {p.type === "break" && (
                          <div className="text-[8px] text-on-tertiary-container/60 mt-0.5 normal-case tracking-normal">
                            {p.label}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Body rows — class streams */}
                <tbody>
                  {MOCK_CLASSES_LIST.map((cls) => (
                    <tr
                      key={cls}
                      className="border-b border-outline-variant/15 last:border-0 hover:bg-surface-container/30 transition-colors"
                    >
                      {/* Class name — sticky left */}
                      <td className="px-4 py-2 sticky left-0 bg-surface-container-lowest/90 backdrop-blur-sm border-r border-outline-variant/20">
                        <span className="font-headline text-lg font-light text-primary">
                          {cls}
                        </span>
                      </td>

                      {/* Period cells */}
                      {PERIODS.map((period, pi) => {
                        if (period.type === "break") {
                          return (
                            <td
                              key={pi}
                              className="px-2 py-2 bg-surface-container/30 text-center"
                            >
                              <span className="font-label text-[9px] text-on-tertiary-container/50 uppercase">
                                —
                              </span>
                            </td>
                          );
                        }

                        const entry = getTimetableEntry(cls, activeDay, pi);

                        return (
                          <td key={pi} className="px-2 py-2">
                            {entry ? (
                              // Filled cell
                              <div
                                className="relative group bg-primary-container/8 border border-primary-container/20 rounded-xl p-2 cursor-pointer hover:bg-primary-container/15 transition-all"
                                onClick={() => {
                                  setEditEntry({
                                    cls,
                                    dayIndex: activeDay,
                                    periodIndex: pi,
                                    entry,
                                  });
                                  setEntryForm({
                                    subject: entry.subject,
                                    teacherId: entry.teacherId,
                                    teacherCode: entry.teacherCode,
                                    room: entry.room,
                                  });
                                }}
                              >
                                <div className="font-label text-[11px] text-primary-container font-medium tracking-[0.04em]">
                                  {entry.subject}
                                  <sup className="text-[8px] ml-0.5 opacity-70">
                                    {entry.teacherCode}
                                  </sup>
                                </div>
                                <div className="font-label text-[9px] text-outline mt-0.5">
                                  {entry.room}
                                </div>
                                {/* Delete on hover */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearEntry(cls, activeDay, pi);
                                  }}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-error/10 hover:bg-error/20 flex items-center justify-center transition-all"
                                >
                                  <span className="material-symbols-outlined text-[10px] text-error">
                                    close
                                  </span>
                                </button>
                              </div>
                            ) : (
                              // Empty cell — click to add
                              <button
                                onClick={() => {
                                  setAddEntry({
                                    cls,
                                    dayIndex: activeDay,
                                    periodIndex: pi,
                                  });
                                  setEntryForm({ subject: "", teacherId: "", teacherCode: "", room: "" });
                                }}
                                className="w-full h-14 rounded-xl border border-dashed border-outline-variant/40 flex items-center justify-center hover:border-primary-container/40 hover:bg-primary-container/5 transition-all group"
                              >
                                <span className="material-symbols-outlined text-[18px] text-outline/30 group-hover:text-primary-container/50 transition-colors">
                                  add
                                </span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/timetable" />

      {/* Add/Edit Entry Modal */}
      {(addEntry || editEntry) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm" padding="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-headline text-2xl font-light italic text-primary">
                  {editEntry ? "Edit Lesson" : "Assign Lesson"}
                </h3>
                <p className="font-label text-[10px] uppercase tracking-[0.1em] text-outline mt-0.5">
                  {addEntry?.cls || editEntry?.cls} —{" "}
                  {
                    PERIODS[
                      addEntry?.periodIndex ?? editEntry?.periodIndex ?? 0
                    ].time
                  }
                </p>
              </div>
              <button
                onClick={() => {
                  setAddEntry(null);
                  setEditEntry(null);
                }}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">
                  Subject
                </label>
                <select
                  value={entryForm.subject}
                  onChange={(e) =>
                    setEntryForm((p) => ({ ...p, subject: e.target.value }))
                  }
                  className="w-full h-11 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                >
                  <option value="">Select subject...</option>
                  {[
                    "ENG", "MATH", "PHY", "CHEM", "BIO", "GEO", "HIS", "CRE", "LIT", "ICT",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Teacher */}
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">
                  Teacher
                </label>
                <select
                  value={entryForm.teacherId}
                  onChange={(e) => {
                    const t = MOCK_TEACHERS_LIST.find(
                      (t) => t.id === e.target.value
                    );
                    setEntryForm((p) => ({
                      ...p,
                      teacherId: e.target.value,
                      teacherCode: t?.code || "",
                    }));
                  }}
                  className="w-full h-11 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                >
                  <option value="">Select teacher...</option>
                  {MOCK_TEACHERS_LIST.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (TR-{t.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Clash warning */}
              {clashWarning && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-error/8 border border-error/20">
                  <span className="material-symbols-outlined text-[18px] text-error flex-shrink-0 mt-0.5">
                    warning
                  </span>
                  <p className="font-body text-xs text-error leading-relaxed">
                    {clashWarning}
                  </p>
                </div>
              )}

              {/* Room */}
              <EliteInput
                label="Room / Location"
                placeholder="e.g. Room 12, Lab 1, Hall A"
                value={entryForm.room}
                onChange={(e) =>
                  setEntryForm((p) => ({ ...p, room: e.target.value }))
                }
              />

              <div className="flex gap-3 pt-2">
                <EliteButton
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    setAddEntry(null);
                    setEditEntry(null);
                  }}
                >
                  Cancel
                </EliteButton>
                <EliteButton
                  variant="primary"
                  fullWidth
                  onClick={handleSaveEntry}
                  disabled={!!clashWarning}
                >
                  {editEntry ? "Update" : "Assign"}
                </EliteButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Publish confirmation modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm" padding="p-6">
            <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[24px] text-primary-container">
                publish
              </span>
            </div>
            <h3 className="font-headline text-xl font-light text-primary text-center mb-2">
              Publish Timetable?
            </h3>
            <p className="font-body text-sm text-on-surface-variant font-light text-center mb-6 leading-relaxed">
              This will make the timetable visible to all teachers and parents.
              All staff will be notified.
            </p>
            <div className="flex gap-3">
              <EliteButton
                variant="outlined"
                fullWidth
                onClick={() => setShowPublishModal(false)}
              >
                Cancel
              </EliteButton>
              <EliteButton
                variant="primary"
                fullWidth
                onClick={() => setShowPublishModal(false)}
              >
                Publish Now
              </EliteButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Copy Day Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm" padding="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-headline text-2xl font-light italic text-primary">
                  Copy Day
                </h3>
                <p className="font-label text-[10px] uppercase tracking-[0.1em] text-outline mt-0.5">
                  Copy {DAYS[activeDay]} to another day
                </p>
              </div>
              <button
                onClick={() => setShowCopyModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">
                  Target Day
                </label>
                <select
                  value={copyTargetDay}
                  onChange={(e) => setCopyTargetDay(parseInt(e.target.value))}
                  className="w-full h-11 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                >
                  {DAYS.map((day, i) => (
                    <option key={day} value={i} disabled={i === activeDay}>
                      {day} {i === activeDay ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-error/10 border border-error/20">
                <span className="material-symbols-outlined text-[18px] text-error flex-shrink-0 mt-0.5">
                  warning
                </span>
                <p className="font-body text-xs text-error leading-relaxed">
                  This will overwrite any existing entries on the target day.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <EliteButton
                  variant="outlined"
                  fullWidth
                  onClick={() => setShowCopyModal(false)}
                >
                  Cancel
                </EliteButton>
                <EliteButton
                  variant="primary"
                  fullWidth
                  onClick={handleCopyDay}
                  disabled={copyTargetDay === activeDay}
                >
                  Copy
                </EliteButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
