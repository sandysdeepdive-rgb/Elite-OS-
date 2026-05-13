"use client";
import { useState, useEffect } from "react";
import AuthGate from "@/components/layout/AuthGate";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { PARENT_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import GlassCard from "@/components/ui/GlassCard";
import Badge from "@/components/ui/Badge";
import { useParentData } from "@/lib/hooks/useParentData";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

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

function ParentTimetableContent() {
  const { parentProfile, studentRecord, loading: parentLoading } = useParentData();
  
  const [timetable, setTimetable] = useState<TimetableConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState("");

  useEffect(() => {
    if (!parentProfile?.schoolId) return;
    
    const fetchTimetable = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, `schools/${parentProfile.schoolId}/timetable/config`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().updatedAt) {
          const tt = docSnap.data() as TimetableConfig;
          setTimetable(tt);
          
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
        console.error("Failed to load timetable", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimetable();
  }, [parentProfile?.schoolId]);

  // Filter timetable to child's class only
  const classEntries = timetable?.entries.filter(t => t.class === studentRecord?.class) || [];

  // Get entry for a specific period on active day
  const getEntry = (periodId: string) =>
    classEntries.find(t => t.day === activeDay && t.periodId === periodId) || null;

  if (parentLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen mesh-gradient-bg">Loading...</div>;
  }

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
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mt-1">
              {studentRecord?.name || "Your Child"} ·{" "}
              {studentRecord?.class || "—"} · Term 2, 2025
            </p>
          </div>

          {/* Section 2 — Day selector */}
          {timetable && timetable.days.length > 0 && (
            <GlassCard padding="p-2">
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {timetable.days.map((day) => (
                  <button key={day} onClick={() => setActiveDay(day)}
                    className={`flex-1 min-w-[60px] py-2.5 rounded-xl font-label
                                text-[11px] uppercase tracking-[0.08em]
                                transition-all duration-200
                                ${activeDay === day
                                  ? "bg-primary-container text-white shadow-sm"
                                  : "text-outline hover:bg-surface-container"}`}>
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Section 3 — Today's summary card */}
          {(() => {
            const todayLessons = classEntries.filter(t => t.day === activeDay);
            return todayLessons.length > 0 ? (
              <GlassCard padding="p-4" showOrb>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-[0.12em] text-outline">
                      {activeDay}
                    </p>
                    <p className="font-headline text-2xl font-light text-primary mt-0.5">
                      {todayLessons.length} Lessons
                    </p>
                  </div>
                  <Badge variant="active" dot>Scheduled</Badge>
                </div>
              </GlassCard>
            ) : null;
          })()}

          {/* Section 4 — Period list */}
          {timetable && timetable.periods.length > 0 && timetable.entries.length > 0 ? (
            <div className="space-y-2">
              {timetable.periods.map((period) => {
                if (period.isBreak) {
                  return (
                    <div key={period.id} className="flex items-center gap-4 py-2 px-4">
                      <span className="font-label text-[10px] uppercase tracking-[0.08em] text-on-tertiary-container w-14 flex-shrink-0 text-right">
                        {period.startTime}
                      </span>
                      <div className="flex-1 h-px bg-outline-variant/20" />
                      <span className="font-label text-[10px] uppercase tracking-[0.08em] text-on-tertiary-container">
                        {period.label}
                      </span>
                    </div>
                  );
                }

                const entry = getEntry(period.id);

                return (
                  <GlassCard key={period.id} padding="p-0" className="overflow-hidden">
                    <div className="flex items-stretch min-h-[72px]">
                      {/* Color Tag Indicator */}
                      <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: entry ? entry.colorTag : 'transparent' }} />
                      
                      <div className="flex flex-1 items-center gap-4 p-4">
                        {/* Time */}
                        <div className="w-14 flex-shrink-0 text-right">
                          <p className="font-mono text-[11px] text-outline leading-tight">{period.startTime}</p>
                          <p className="font-mono text-[9px] text-outline/50 leading-tight mt-1">{period.endTime}</p>
                        </div>

                        {/* Divider */}
                        <div className="w-px self-stretch bg-outline-variant/30 flex-shrink-0" />

                        {/* Content */}
                        {entry ? (
                          <div className="flex-1 py-1">
                            <div className="flex items-center gap-2">
                              <p className="font-body text-sm font-medium text-on-surface">
                                {entry.subject}
                              </p>
                            </div>
                            <div className="flex justify-between items-center mt-0.5">
                              {entry.teacher && (
                                <p className="font-label text-[10px] text-outline flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">person</span>
                                  {entry.teacher}
                                </p>
                              )}
                              {entry.room && (
                                <p className="font-label text-[10px] text-outline flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">location_on</span>
                                  {entry.room}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="font-body text-sm text-outline font-light flex-1 py-1">
                            Free / Study period
                          </p>
                        )}
                      </div>
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
                  <span className="material-symbols-outlined text-[48px] text-outline/30 block mb-3">
                    calendar_month
                  </span>
                  <p className="font-headline text-2xl font-light italic text-primary mb-2">
                    No timetable yet
                  </p>
                  <p className="font-body text-sm text-outline font-light">
                    Your child&apos;s class schedule will appear here once the administrator publishes the timetable
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
  useAuthGuard("parent");
  return (
    <AuthGate requiredRole="parent">
      <ParentTimetableContent />
    </AuthGate>
  );
}
