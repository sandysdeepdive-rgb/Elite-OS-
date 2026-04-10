'use client';
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";

export default function TeacherSettingsContent() {
  const [prefs, setPrefs] = useState({
    gradeReminders: true,
    attendanceAlerts: true,
    messageNotifs: true,
    timetableUpdates: false,
  });
  const [teacherData, setTeacherData] = useState<Record<string,unknown>|null>(null);
  const [saving, setSaving] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return;
      const userData = userDoc.data();

      // Load saved prefs
      if (userData.notifPrefs) setPrefs(userData.notifPrefs);
      if (userData.autoSave !== undefined) setAutoSave(userData.autoSave);

      // Load teacher record
      const schoolDoc = await getDoc(
        doc(db, "schools", userData.schoolId)
      );
      const teacherDoc = await getDoc(
        doc(db, "schools", userData.schoolId, "teachers", user.uid)
      );
      setTeacherData({
        ...(teacherDoc.exists() ? teacherDoc.data() : {}),
        schoolName: schoolDoc.exists() ? schoolDoc.data().name : "",
      });
    });
    return () => unsub();
  }, []);

  const handleSavePrefs = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    await updateDoc(doc(db, "users", user.uid), {
      notifPrefs: prefs,
      autoSave,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Section 1 — Notification Preferences */}
      <GlassCard>
        <h3 className="font-headline text-xl font-light italic
                       text-primary mb-5">
          Notification Preferences
        </h3>
        <div className="space-y-4">
          {[
            { key:"gradeReminders",
              label:"Grade submission reminders",
              sub:"Remind me when grades are due" },
            { key:"attendanceAlerts",
              label:"Attendance alerts",
              sub:"Alert when attendance not marked" },
            { key:"messageNotifs",
              label:"New messages",
              sub:"Notify on new parent messages" },
            { key:"timetableUpdates",
              label:"Timetable updates",
              sub:"Notify when schedule changes" },
          ].map(item => (
            <div key={item.key}
              className="flex items-center justify-between py-3
                         border-b border-outline-variant/20 last:border-0">
              <div>
                <p className="font-body text-sm text-on-surface font-light">
                  {item.label}
                </p>
                <p className="font-body text-xs text-outline font-light mt-0.5">
                  {item.sub}
                </p>
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => setPrefs(prev => ({
                  ...prev,
                  [item.key]: !prev[item.key as keyof typeof prev]
                }))}
                className={`w-12 h-6 rounded-full transition-all
                             duration-200 relative flex-shrink-0
                             ${prefs[item.key as keyof typeof prefs]
                               ? "bg-primary-container"
                               : "bg-surface-container-highest"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full
                                 bg-white shadow-sm transition-all duration-200
                                 ${prefs[item.key as keyof typeof prefs]
                                   ? "left-7" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
        <EliteButton variant="primary" fullWidth
          className="mt-5" loading={saving}
          onClick={handleSavePrefs}>
          Save Preferences
        </EliteButton>
      </GlassCard>

      {/* Section 2 — Teaching Information (read-only) */}
      <GlassCard padding="p-5">
        <h3 className="font-headline text-xl font-light italic
                       text-primary mb-4">
          Teaching Profile
        </h3>
        <div className="space-y-3">
          {[
            { label: "Teacher Code", value: `TR-${teacherData?.teacherCode || "—"}` },
            { label: "Subject", value: (teacherData?.subject as string) || "—" },
            { label: "Assigned Classes",
              value: ((teacherData?.classes as string[]) || []).join(", ") || "—" },
            { label: "School", value: (teacherData?.schoolName as string) || "—" },
          ].map(item => (
            <div key={item.label}
              className="flex items-center justify-between py-2
                         border-b border-outline-variant/20 last:border-0">
              <span className="font-label text-[10px] uppercase
                               tracking-[0.12em] text-outline">
                {item.label}
              </span>
              <span className="font-body text-sm text-on-surface font-light">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Section 3 — App Preferences */}
      <GlassCard padding="p-5">
        <h3 className="font-headline text-xl font-light italic
                       text-primary mb-4">
          App Preferences
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-body text-sm text-on-surface font-light">
                Default Grade View
              </p>
              <p className="font-body text-xs text-outline font-light mt-0.5">
                Show current term by default
              </p>
            </div>
            <select
              className="h-9 bg-surface-container-low rounded-full
                         px-3 font-body text-xs font-light border-none
                         focus:ring-2 focus:ring-primary-container
                         focus:outline-none">
              <option>Current Term</option>
              <option>All Terms</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-2
                          border-t border-outline-variant/20">
            <div>
              <p className="font-body text-sm text-on-surface font-light">
                Auto-save Grades
              </p>
              <p className="font-body text-xs text-outline font-light mt-0.5">
                Save drafts to device automatically
              </p>
            </div>
            <button
              onClick={() => setAutoSave(p => !p)}
              className={`w-12 h-6 rounded-full transition-all
                           duration-200 relative flex-shrink-0
                           ${autoSave
                             ? "bg-primary-container"
                             : "bg-surface-container-highest"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full
                               bg-white shadow-sm transition-all duration-200
                               ${autoSave ? "left-7" : "left-1"}`} />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
