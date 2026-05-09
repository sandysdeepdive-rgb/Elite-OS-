'use client';
import { useState } from "react";
import AuthGate from "@/components/layout/AuthGate";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { PARENT_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import { useAuthGuard } from '@/lib/hooks/useAuthGuard';
import GlassCard from "@/components/ui/GlassCard";
import Badge from "@/components/ui/Badge";
import { useParentData } from "@/lib/hooks/useParentData";
import { useCollection } from "@/lib/hooks/useSchoolData";

interface TimetableEntry {
  id: string;
  classId: string;
  subject: string;
  teacherCode: string;
  teacherId: string;
  room: string;
  day: number;      // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
  period: number;   // index into PERIODS array
}

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const PERIODS = [
  { time:"08:00", type:"lesson" },
  { time:"09:00", type:"lesson" },
  { time:"10:00", type:"lesson" },
  { time:"BREAK", type:"break" },
  { time:"11:00", type:"lesson" },
  { time:"12:00", type:"lesson" },
  { time:"LUNCH", type:"break" },
  { time:"14:00", type:"lesson" },
  { time:"15:00", type:"lesson" },
  { time:"16:00", type:"lesson" },
];

function ParentTimetableContent() {
  const { parentProfile, studentRecord, loading } = useParentData();
  const { data: timetable } = useCollection<TimetableEntry>(
    parentProfile?.schoolId || null, "timetable"
  );

  // Filter timetable to child's class only
  const classTimetable = timetable.filter(t =>
    t.classId === studentRecord?.class
  );

  // Default active day to today (0=Mon...4=Fri)
  const todayIndex = Math.min(
    Math.max(new Date().getDay() - 1, 0), 4
  );
  const [activeDay, setActiveDay] = useState(todayIndex);

  // Get entry for a specific period on active day
  const getEntry = (periodIndex: number) =>
    classTimetable.find(t =>
      t.day === activeDay && t.period === periodIndex
    ) || null;

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="Timetable" subtitle="Class Schedule" />
        <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full space-y-6">
          
          {/* Section 1 — Header */}
          <div>
            <h2 className="font-headline text-3xl font-light italic text-primary">
              Class Timetable
            </h2>
            <p className="font-label text-[10px] uppercase tracking-[0.15em]
                          text-outline mt-1">
              {studentRecord?.name || "Your Child"} ·{" "}
              {studentRecord?.class || "—"} · Term 2, 2025
            </p>
          </div>

          {/* Section 2 — Day selector */}
          <GlassCard padding="p-2">
            <div className="flex gap-1">
              {DAYS.map((day, i) => (
                <button key={day} onClick={() => setActiveDay(i)}
                  className={`flex-1 py-2.5 rounded-xl font-label
                              text-[11px] uppercase tracking-[0.08em]
                              transition-all duration-200
                              ${activeDay === i
                                ? "bg-primary-container text-white shadow-sm"
                                : "text-outline hover:bg-surface-container"}`}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Section 3 — Today's summary card */}
          {(() => {
            const todayLessons = classTimetable.filter(
              t => t.day === activeDay
            );
            return todayLessons.length > 0 ? (
              <GlassCard padding="p-4" showOrb>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label text-[10px] uppercase
                                   tracking-[0.12em] text-outline">
                      {DAYS[activeDay]}
                    </p>
                    <p className="font-headline text-2xl font-light
                                   text-primary mt-0.5">
                      {todayLessons.length} Lessons
                    </p>
                  </div>
                  <Badge variant="active" dot>Scheduled</Badge>
                </div>
              </GlassCard>
            ) : null;
          })()}

          {/* Section 4 — Period list */}
          {classTimetable.length > 0 ? (
            <div className="space-y-2">
              {PERIODS.map((period, pi) => {
                if (period.type === "break") {
                  return (
                    <div key={pi}
                      className="flex items-center gap-4 py-2 px-4">
                      <span className="font-label text-[10px] uppercase
                                       tracking-[0.08em] text-on-tertiary-container
                                       w-14 flex-shrink-0">
                        {period.time}
                      </span>
                      <div className="flex-1 h-px bg-outline-variant/20" />
                      <span className="font-label text-[10px] uppercase
                                       tracking-[0.08em] text-on-tertiary-container">
                        {period.time === "BREAK" ? "Short Break" : "Lunch"}
                      </span>
                    </div>
                  );
                }

                const entry = getEntry(pi);

                return (
                  <GlassCard key={pi} padding="p-4">
                    <div className="flex items-center gap-4">
                      {/* Time */}
                      <div className="w-14 flex-shrink-0 text-center">
                        <p className="font-mono text-[11px] text-outline
                                      leading-tight">
                          {period.time}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-10 bg-outline-variant/30
                                      flex-shrink-0" />

                      {/* Content */}
                      {entry ? (
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-body text-sm font-medium
                                          text-on-surface">
                              {entry.subject}
                              <sup className="font-mono text-[9px]
                                              text-outline ml-1">
                                {entry.teacherCode}
                              </sup>
                            </p>
                          </div>
                          {entry.room && (
                            <p className="font-label text-[10px] text-outline
                                          mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined
                                               text-[12px]">
                                location_on
                              </span>
                              {entry.room}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="font-body text-sm text-outline
                                      font-light flex-1">
                          Free period
                        </p>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            /* Empty state — no timetable published */
            !loading && (
              <GlassCard padding="p-12">
                <div className="text-center">
                  <span className="material-symbols-outlined text-[48px]
                                   text-outline/30 block mb-3">
                    calendar_month
                  </span>
                  <p className="font-headline text-2xl font-light italic
                                text-primary mb-2">
                    No timetable yet
                  </p>
                  <p className="font-body text-sm text-outline font-light">
                    Your child&apos;s class schedule will appear here
                    once the administrator publishes the timetable
                  </p>
                </div>
              </GlassCard>
            )
          )}
        </main>
      </div>
      <BottomNavBar items={PARENT_NAV_ITEMS} activeHref="/parent/timetable" />
    </div>
  );
}

export default function ParentTimetable() {
  useAuthGuard('parent');
  return (
    <AuthGate requiredRole="parent">
      <ParentTimetableContent />
    </AuthGate>
  );
}
