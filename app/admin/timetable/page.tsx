"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";
import EliteInput from "@/components/ui/EliteInput";
import { useSchoolData } from "@/lib/hooks/useSchoolData";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";

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

const DEFAULT_TIMETABLE: TimetableConfig = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  periods: [
    { id: crypto.randomUUID(), label: "Period 1", startTime: "08:00", endTime: "08:40", isBreak: false },
    { id: crypto.randomUUID(), label: "Period 2", startTime: "08:40", endTime: "09:20", isBreak: false },
    { id: crypto.randomUUID(), label: "Break",    startTime: "09:20", endTime: "09:40", isBreak: true  },
    { id: crypto.randomUUID(), label: "Period 3", startTime: "09:40", endTime: "10:20", isBreak: false },
    { id: crypto.randomUUID(), label: "Period 4", startTime: "10:20", endTime: "11:00", isBreak: false },
    { id: crypto.randomUUID(), label: "Period 5", startTime: "11:00", endTime: "11:40", isBreak: false },
    { id: crypto.randomUUID(), label: "Lunch",    startTime: "11:40", endTime: "12:20", isBreak: true  },
    { id: crypto.randomUUID(), label: "Period 6", startTime: "12:20", endTime: "13:00", isBreak: false },
    { id: crypto.randomUUID(), label: "Period 7", startTime: "13:00", endTime: "13:40", isBreak: false },
  ],
  entries: [],
  updatedAt: new Date().toISOString()
};

const COLOR_PRESETS = [
  "#2B4D5A", "#B5A898", "#416371", "#72787b",
  "#9abdcc", "#c3b6a5", "#141416", "#ba1a1a"
];

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function AdminTimetablePage() {
  useAuthGuard("admin");
  const { schoolId, schoolName, loading } = useSchoolData();

  const [timetable, setTimetable] = useState<TimetableConfig | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  
  const [classesList, setClassesList] = useState<{ id: string; className: string }[]>([]);
  const [teachersList, setTeachersList] = useState<{ id: string; name: string }[]>([]);
  const [activeClassFilter, setActiveClassFilter] = useState("All");

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Panel states
  const [cellEdit, setCellEdit] = useState<{ day: string; periodId: string; entry: TimetableEntry | null } | null>(null);
  const [cellForm, setCellForm] = useState<TimetableEntry>({
    id: "", day: "", periodId: "", subject: "", teacher: "", class: "", room: "", colorTag: COLOR_PRESETS[0]
  });

  const [newDayForm, setNewDayForm] = useState("");
  const [newPeriodForm, setNewPeriodForm] = useState({ label: "", startTime: "", endTime: "", isBreak: false });

  useEffect(() => {
    if (!schoolId) return;

    const fetchData = async () => {
      setIsLoadingClasses(true);
      try {
        // Fetch classes
        const classSnap = await getDocs(collection(db, `schools/${schoolId}/classes`));
        const classes = classSnap.docs.map(d => ({ id: d.id, className: d.data().className }));
        setClassesList(classes);

        // Fetch teachers
        const teacherSnap = await getDocs(collection(db, `schools/${schoolId}/teachers`));
        const teachers = teacherSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
        setTeachersList(teachers);

        // Fetch timetable config
        const docRef = doc(db, `schools/${schoolId}/timetable/config`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().updatedAt) {
          setTimetable(docSnap.data() as TimetableConfig);
        } else {
          setTimetable(JSON.parse(JSON.stringify(DEFAULT_TIMETABLE)));
        }
      } catch (error) {
        console.error("Error fetching timetable data:", error);
        toast.error("Failed to load timetable data");
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchData();
  }, [schoolId]);

  const conflicts = (() => {
    if (!timetable) return [];
    const clashList: string[] = [];
    timetable.days.forEach(day => {
      timetable.periods.forEach(p => {
        if (p.isBreak) return;
        const entriesInSlot = timetable.entries.filter(e => e.day === day && e.periodId === p.id);
        const teachersInSlot = entriesInSlot.map(e => e.teacher).filter(Boolean);
        const distinctTeachers = new Set(teachersInSlot);
        if (teachersInSlot.length !== distinctTeachers.size) {
          // Find the duplicate teacher
          const counts: Record<string, number> = {};
          teachersInSlot.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
          Object.keys(counts).forEach(t => {
            if (counts[t] > 1) {
              const classesClashing = entriesInSlot.filter(e => e.teacher === t).map(e => e.class).join(" and ");
              clashList.push(`${t} is double-booked on ${day} ${p.label} (${classesClashing})`);
            }
          });
        }
      });
    });
    return Array.from(new Set(clashList)); // Unique conflicts
  })();

  const handleSaveToFirestore = async () => {
    if (!schoolId || !timetable) return;
    setIsSaving(true);
    const toastId = toast.loading("Saving timetable...");
    
    try {
      const configRef = doc(db, `schools/${schoolId}/timetable/config`);
      const updatedTimetable = { ...timetable, updatedAt: new Date().toISOString() };
      await setDoc(configRef, updatedTimetable, { merge: true });
      setTimetable(updatedTimetable);
      setHasUnsavedChanges(false);
      setIsEditMode(false);
      toast.success("Timetable saved successfully", { id: toastId });
    } catch (error) {
      console.error("Failed to save timetable:", error);
      toast.error("Failed to save. Your changes are preserved — try again.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEditMode = () => {
    if (isEditMode && hasUnsavedChanges) {
      toast("You have unsaved changes. Discard them?", {
        action: {
          label: "Discard",
          onClick: () => {
            setIsEditMode(false);
            setHasUnsavedChanges(false);
            // Re-fetch to discard
            window.location.reload(); 
          }
        },
        cancel: {
          label: "Cancel",
          onClick: () => {}
        }
      });
      return;
    }
    setIsEditMode(!isEditMode);
    setCellEdit(null);
  };

  // Grid Cell Operations
  const handleCellClick = (day: string, periodId: string) => {
    if (!isEditMode) return;
    if (!timetable) return;

    const existingEntry = timetable.entries.find(e => e.day === day && e.periodId === periodId && (activeClassFilter === "All" || e.class === activeClassFilter));
    
    setCellEdit({ day, periodId, entry: existingEntry || null });
    if (existingEntry) {
      setCellForm({ ...existingEntry });
    } else {
      setCellForm({
        id: crypto.randomUUID(),
        day,
        periodId,
        subject: "",
        teacher: "",
        class: activeClassFilter !== "All" ? activeClassFilter : "",
        room: "",
        colorTag: COLOR_PRESETS[0]
      });
    }
  };

  const handleSaveCell = () => {
    if (!timetable) return;
    if (!cellForm.subject || !cellForm.class) {
      toast.error("Subject and Class are required.");
      return;
    }
    const newEntries = [...timetable.entries];
    if (cellEdit?.entry) {
      const idx = newEntries.findIndex(e => e.id === cellEdit.entry!.id);
      if (idx !== -1) newEntries[idx] = { ...cellForm };
    } else {
      newEntries.push({ ...cellForm });
    }
    setTimetable({ ...timetable, entries: newEntries });
    setHasUnsavedChanges(true);
    setCellEdit(null);
  };

  const handleDeleteEntry = (entryId: string) => {
    toast("Are you sure you want to delete this lesson?", {
      action: {
        label: "Confirm",
        onClick: () => {
          if (!timetable) return;
          setTimetable({ ...timetable, entries: timetable.entries.filter(e => e.id !== entryId) });
          setHasUnsavedChanges(true);
          setCellEdit(null);
        }
      },
      cancel: { label: "Undo", onClick: () => {} }
    });
  };

  // Days Operations
  const handleAddDay = () => {
    if (!timetable || !newDayForm.trim()) return;
    if (!timetable.days.includes(newDayForm.trim())) {
      setTimetable({ ...timetable, days: [...timetable.days, newDayForm.trim()] });
      setHasUnsavedChanges(true);
    }
    setNewDayForm("");
  };

  const handleRemoveDay = (day: string) => {
    if (!timetable) return;
    setTimetable({
      ...timetable,
      days: timetable.days.filter(d => d !== day),
      entries: timetable.entries.filter(e => e.day !== day)
    });
    setHasUnsavedChanges(true);
  };

  const setPresetDays = (preset: string[]) => {
    if (!timetable) return;
    setTimetable({
      ...timetable,
      days: preset,
      entries: timetable.entries.filter(e => preset.includes(e.day))
    });
    setHasUnsavedChanges(true);
  };

  // Reordering Arrays
  const moveItem = <T,>(list: T[], index: number, direction: 'up' | 'down') => {
    const newList = [...list];
    if (direction === 'up' && index > 0) {
      const temp = newList[index];
      newList[index] = newList[index - 1];
      newList[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = newList[index];
      newList[index] = newList[index + 1];
      newList[index + 1] = temp;
    }
    return newList;
  };

  const handleMoveDay = (index: number, direction: 'up' | 'down') => {
    if (!timetable) return;
    setTimetable({ ...timetable, days: moveItem(timetable.days, index, direction) });
    setHasUnsavedChanges(true);
  };

  const handleMovePeriod = (index: number, direction: 'up' | 'down') => {
    if (!timetable) return;
    setTimetable({ ...timetable, periods: moveItem(timetable.periods, index, direction) });
    setHasUnsavedChanges(true);
  };

  // Periods Operations
  const handleAddPeriod = () => {
    if (!timetable || !newPeriodForm.label || !newPeriodForm.startTime || !newPeriodForm.endTime) {
      toast.error("Please fill in all period fields");
      return;
    }
    setTimetable({
      ...timetable,
      periods: [...timetable.periods, { ...newPeriodForm, id: crypto.randomUUID() }]
    });
    setHasUnsavedChanges(true);
    setNewPeriodForm({ label: "", startTime: "", endTime: "", isBreak: false });
  };

  const handleRemovePeriod = (periodId: string) => {
    if (!timetable) return;
    const entriesInPeriod = timetable.entries.filter(e => e.periodId === periodId);
    if (entriesInPeriod.length > 0) {
      toast(`Deleting this period will remove ${entriesInPeriod.length} lessons. Confirm?`, {
        action: {
          label: "Confirm",
          onClick: () => {
            setTimetable({
              ...timetable,
              periods: timetable.periods.filter(p => p.id !== periodId),
              entries: timetable.entries.filter(e => e.periodId !== periodId)
            });
            setHasUnsavedChanges(true);
          }
        },
        cancel: { label: "Cancel", onClick: () => {} }
      });
    } else {
      setTimetable({
        ...timetable,
        periods: timetable.periods.filter(p => p.id !== periodId)
      });
      setHasUnsavedChanges(true);
    }
  };

  if (loading || isLoadingClasses || !timetable) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body, main, table { background: white !important; color: black !important; }
          @page { size: landscape; margin: 1cm; }
          .print-cell { background: transparent !important; }
        }
      ` }} />
      <datalist id="teachers-list">
        {teachersList.map(t => <option key={t.id} value={t.name} />)}
      </datalist>
      <datalist id="classes-list">
        {classesList.map(c => <option key={c.id} value={c.className} />)}
      </datalist>

      <div className="flex min-h-screen mesh-gradient-bg">
        <div className="no-print">
          <AdminSidebar activeHref="/admin/timetable" />
        </div>
        <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
          <div className="no-print">
            <TopAppBar title="Timetable Manager" subtitle="Manage School Schedules" />
          </div>

          <main className="flex-1 px-6 py-8 mx-auto w-full max-w-full space-y-6">
            
            {/* Section 1 — Top toolbar */}
            <div className="flex items-center justify-between gap-4 flex-wrap no-print">
              <div>
                <h2 className="font-headline text-3xl font-light italic text-primary">
                  Timetable Manager
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {conflicts.length > 0 && (
                  <button 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-error/10 text-error font-label text-xs font-medium border border-error/20"
                    onClick={() => {
                      toast.error("Conflicts found: \n" + conflicts.join("\n"), { duration: 5000 });
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    {conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""}
                  </button>
                )}

                <select 
                  className="bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm rounded-lg px-3 py-2 font-label"
                  value={activeClassFilter}
                  onChange={e => setActiveClassFilter(e.target.value)}
                >
                  <option value="All">All Classes</option>
                  {classesList.map(c => (
                    <option key={c.id} value={c.className}>{c.className}</option>
                  ))}
                </select>

                <EliteButton variant={isEditMode ? "primary" : "outlined"} size="sm" onClick={handleToggleEditMode}>
                  <span className="material-symbols-outlined text-[16px] mr-1.5">edit</span>
                  {isEditMode ? "Exit Edit Mode" : "Edit Mode"}
                </EliteButton>
                
                {isEditMode && (
                  <EliteButton variant="primary" size="sm" onClick={handleSaveToFirestore} disabled={!hasUnsavedChanges || isSaving}>
                    <span className="material-symbols-outlined text-[16px] mr-1.5">save</span>
                    Save Changes
                  </EliteButton>
                )}

                <EliteButton variant="outlined" size="sm" onClick={() => window.print()}>
                  <span className="material-symbols-outlined text-[16px] mr-1.5">print</span>
                  Print / Export
                </EliteButton>
              </div>
            </div>

            {/* Section 2 — Timetable Grid */}
            <GlassCard padding="p-0" className="overflow-x-auto w-full">
              <table className="w-full min-w-[800px] border-collapse bg-surface-container-lowest">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                    <th className="px-4 py-3 text-left w-36 font-label text-[11px] uppercase tracking-[0.1em] text-outline border-r border-outline-variant/20">
                      Time
                    </th>
                    {timetable.days.map(day => (
                      <th key={day} className="px-4 py-3 text-center min-w-[150px] font-label text-[11px] uppercase tracking-[0.1em] text-outline">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timetable.periods.map((period) => {
                    if (period.isBreak) {
                      return (
                        <tr key={period.id} className="border-b border-outline-variant/15 bg-surface-container/30">
                          <td className="px-4 py-2 border-r border-outline-variant/20 font-mono text-[11px] text-outline text-center">
                            {period.startTime} - {period.endTime}
                            <div className="font-label text-[10px] mt-0.5">{period.label}</div>
                          </td>
                          <td colSpan={timetable.days.length} className="px-4 py-3 text-center font-label text-[10px] uppercase tracking-[0.2em] text-outline/60">
                            BREAK
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={period.id} className="border-b border-outline-variant/15 hover:bg-surface-container/20">
                        <td className="px-4 py-3 border-r border-outline-variant/20 font-mono text-[11px] text-outline">
                          <div className="font-label text-[11px] text-on-surface mb-0.5">{period.label}</div>
                          {period.startTime} - {period.endTime}
                        </td>
                        
                        {timetable.days.map(day => {
                          const entriesForCell = timetable.entries.filter(e => e.day === day && e.periodId === period.id && (activeClassFilter === "All" || e.class === activeClassFilter));
                          
                          return (
                            <td key={`${day}-${period.id}`} className="p-2 border-r border-outline-variant/15 last:border-0 align-top h-full">
                              <div className="flex flex-col gap-2 min-h-[60px]">
                                {entriesForCell.length > 0 ? (
                                  entriesForCell.map(entry => (
                                    <div 
                                      key={entry.id} 
                                      onClick={() => handleCellClick(day, period.id)}
                                      className={`print-cell relative group rounded-lg p-2 border-l-4 transition-all ${isEditMode ? 'cursor-pointer hover:opacity-80' : ''}`}
                                      style={{ backgroundColor: hexToRgba(entry.colorTag, 0.15), borderLeftColor: entry.colorTag }}
                                    >
                                      <div className="font-label text-[11px] font-bold text-on-surface break-words leading-tight">
                                        {entry.subject}
                                      </div>
                                      <div className="font-body text-[10px] text-on-surface-variant mt-1 leading-tight">
                                        {entry.teacher}
                                      </div>
                                      <div className="flex justify-between items-center mt-1">
                                        <div className="font-mono text-[9px] text-outline">
                                          {entry.class}
                                        </div>
                                        <div className="font-body text-[9px] text-outline">
                                          {entry.room}
                                        </div>
                                      </div>
                                      
                                      {isEditMode && (
                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 no-print">
                                          <button className="w-5 h-5 rounded hover:bg-white/50 text-outline flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[12px]">edit</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  isEditMode && (
                                    <button 
                                      onClick={() => handleCellClick(day, period.id)}
                                      className="w-full h-full min-h-[60px] rounded-lg border border-dashed border-outline-variant/40 flex items-center justify-center hover:border-primary-container/40 hover:bg-primary-container/5 transition-all group no-print"
                                    >
                                      <span className="material-symbols-outlined text-[18px] text-outline/30 group-hover:text-primary-container/50">add</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </GlassCard>

            {/* Section 3 — Edit Mode Panels */}
            {isEditMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
                
                {/* Panel A — Manage Days */}
                <GlassCard padding="p-5" className="flex flex-col gap-4">
                  <h3 className="font-headline text-xl text-primary mb-2">Manage Days</h3>
                  
                  <div className="flex gap-2">
                    <EliteInput 
                      placeholder="e.g. Saturday" 
                      value={newDayForm}
                      onChange={e => setNewDayForm(e.target.value)}
                      onKeyDown={e => { if(e.key === "Enter") handleAddDay(); }}
                    />
                    <EliteButton variant="primary" onClick={handleAddDay}>Add</EliteButton>
                  </div>

                  <div className="flex gap-2 mb-2 flex-wrap">
                    <button onClick={() => setPresetDays(["Monday","Tuesday","Wednesday","Thursday","Friday"])} className="text-xs px-2 py-1 bg-surface-container rounded font-label text-outline hover:text-on-surface">Mon-Fri</button>
                    <button onClick={() => setPresetDays(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"])} className="text-xs px-2 py-1 bg-surface-container rounded font-label text-outline hover:text-on-surface">Mon-Sat</button>
                    <button onClick={() => setPresetDays(["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"])} className="text-xs px-2 py-1 bg-surface-container rounded font-label text-outline hover:text-on-surface">Sun-Sat</button>
                  </div>

                  <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                    {timetable.days.map((day, ix) => (
                      <li key={day} className="flex justify-between items-center p-2 rounded-lg bg-surface-container border border-outline-variant/20">
                        <span className="font-label text-sm text-on-surface">{day}</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleMoveDay(ix, 'up')} disabled={ix === 0} className="w-6 h-6 flex items-center justify-center text-outline hover:text-primary disabled:opacity-30"><span className="material-symbols-outlined text-[16px]">arrow_upward</span></button>
                          <button onClick={() => handleMoveDay(ix, 'down')} disabled={ix === timetable.days.length - 1} className="w-6 h-6 flex items-center justify-center text-outline hover:text-primary disabled:opacity-30"><span className="material-symbols-outlined text-[16px]">arrow_downward</span></button>
                          <button onClick={() => handleRemoveDay(day)} className="w-6 h-6 flex items-center justify-center text-error/70 hover:text-error"><span className="material-symbols-outlined text-[16px]">close</span></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </GlassCard>

                {/* Panel B — Manage Periods */}
                <GlassCard padding="p-5" className="flex flex-col gap-4">
                  <h3 className="font-headline text-xl text-primary mb-2">Manage Periods</h3>
                  
                  <div className="space-y-2 bg-surface-container-low p-3 rounded-xl border border-outline-variant/30">
                    <EliteInput placeholder="Label (e.g. Period 1, Break)" value={newPeriodForm.label} onChange={e => setNewPeriodForm({...newPeriodForm, label: e.target.value})} />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase font-label text-outline">Start Form</label>
                        <EliteInput type="time" placeholder="08:00" value={newPeriodForm.startTime} onChange={e => setNewPeriodForm({...newPeriodForm, startTime: e.target.value})} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] uppercase font-label text-outline">End Form</label>
                        <EliteInput type="time" placeholder="08:40" value={newPeriodForm.endTime} onChange={e => setNewPeriodForm({...newPeriodForm, endTime: e.target.value})} />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 font-label text-sm text-on-surface py-1 cursor-pointer">
                      <input type="checkbox" checked={newPeriodForm.isBreak} onChange={e => setNewPeriodForm({...newPeriodForm, isBreak: e.target.checked})} className="rounded text-primary-container focus:ring-primary-container" />
                      Is Break
                    </label>
                    <EliteButton variant="primary" fullWidth onClick={handleAddPeriod}>Add Period</EliteButton>
                  </div>

                  <ul className="space-y-2 max-h-[250px] overflow-y-auto">
                    {timetable.periods.map((p, ix) => (
                      <li key={p.id} className="flex justify-between items-center p-2 rounded-lg bg-surface-container border border-outline-variant/20">
                        <div>
                          <p className="font-label text-sm text-on-surface leading-none">{p.label}</p>
                          <p className="font-mono text-[10px] text-outline mt-1">{p.startTime} - {p.endTime}</p>
                        </div>
                        <div className="flex gap-1 ml-4">
                          <button onClick={() => handleMovePeriod(ix, 'up')} disabled={ix === 0} className="w-6 h-6 flex items-center justify-center text-outline hover:text-primary disabled:opacity-30"><span className="material-symbols-outlined text-[16px]">arrow_upward</span></button>
                          <button onClick={() => handleMovePeriod(ix, 'down')} disabled={ix === timetable.periods.length - 1} className="w-6 h-6 flex items-center justify-center text-outline hover:text-primary disabled:opacity-30"><span className="material-symbols-outlined text-[16px]">arrow_downward</span></button>
                          <button onClick={() => handleRemovePeriod(p.id)} className="w-6 h-6 flex items-center justify-center text-error/70 hover:text-error"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </GlassCard>

                {/* Panel C — Cell Settings */}
                <GlassCard padding="p-5" className="flex flex-col gap-4">
                  <h3 className="font-headline text-xl text-primary mb-2">Cell Settings</h3>
                  {cellEdit ? (
                    <div className="space-y-3">
                      <div className="flex gap-2 mb-2 font-label text-[11px] uppercase tracking-widest text-outline">
                        <span className="bg-surface-container px-2 py-1 rounded">{cellEdit.day}</span>
                        <span className="bg-surface-container px-2 py-1 rounded">{timetable.periods.find(p => p.id === cellEdit.periodId)?.label}</span>
                      </div>
                      
                      <div>
                        <label className="text-[10px] uppercase font-label text-outline mb-1 block">Subject</label>
                        <EliteInput placeholder="e.g. Mathematics" value={cellForm.subject} onChange={e => setCellForm({...cellForm, subject: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-label text-outline mb-1 block">Class</label>
                          <input list="classes-list" placeholder="e.g. S.1A" className="w-full h-11 bg-[transparent] border-b border-outline-variant/40 font-body text-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors py-2 px-1 placeholder:text-outline/50" value={cellForm.class} onChange={e => setCellForm({...cellForm, class: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-label text-outline mb-1 block">Room</label>
                          <EliteInput placeholder="e.g. Room 12" value={cellForm.room} onChange={e => setCellForm({...cellForm, room: e.target.value})} />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-label text-outline mb-1 block">Teacher</label>
                        <input list="teachers-list" placeholder="Teacher name" className="w-full h-11 bg-[transparent] border-b border-outline-variant/40 font-body text-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors py-2 px-1 placeholder:text-outline/50" value={cellForm.teacher} onChange={e => setCellForm({...cellForm, teacher: e.target.value})} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-label text-outline mb-2 block">Color Tag</label>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_PRESETS.map(hex => (
                            <button
                              key={hex}
                              onClick={() => setCellForm({...cellForm, colorTag: hex})}
                              className={`w-8 h-8 rounded-full border-2 transition-transform ${cellForm.colorTag === hex ? 'scale-110 border-on-surface' : 'border-transparent'}`}
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                          <div className="ml-2 border-l border-outline-variant/30 pl-2">
                            <input 
                              type="color" 
                              value={cellForm.colorTag}
                              onChange={e => setCellForm({...cellForm, colorTag: e.target.value})}
                              className="w-8 h-8 rounded cursor-pointer"
                              title="Custom Color"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-3">
                        <EliteButton variant="primary" fullWidth onClick={handleSaveCell}>Save Cell</EliteButton>
                        {cellEdit.entry && (
                          <EliteButton variant="outlined" onClick={() => handleDeleteEntry(cellEdit.entry!.id)}>
                            <span className="material-symbols-outlined text-[16px] text-error">delete</span>
                          </EliteButton>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center p-6 border-2 border-dashed border-outline-variant/30 rounded-xl bg-surface-container-lowest/50">
                      <p className="font-body text-sm text-outline">Click any cell in the grid to add or edit a lesson.</p>
                    </div>
                  )}
                </GlassCard>

              </div>
            )}
          </main>
        </div>
        
        <div className="no-print">
          <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/timetable" />
        </div>
      </div>
    </>
  );
}
