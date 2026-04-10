'use client';
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";

export default function ParentSettingsContent() {
  const [prefs, setPrefs] = useState({
    gradeNotifs: true,
    feeReminders: true,
    attendanceAlerts: true,
    messageNotifs: true,
    eventReminders: false,
  });
  const [studentData, setStudentData] = useState<Record<string,unknown>|null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return;
      const userData = userDoc.data();

      // Load saved prefs
      if (userData.notifPrefs) setPrefs(userData.notifPrefs);

      // Load student record
      if (userData.schoolId && userData.studentId) {
        const studentDoc = await getDoc(
          doc(db, "schools", userData.schoolId, "students", userData.studentId)
        );
        if (studentDoc.exists()) {
          setStudentData({ id: studentDoc.id, ...studentDoc.data() });
        }
      }
    });
    return () => unsub();
  }, []);

  const handleSavePrefs = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    await updateDoc(doc(db, "users", user.uid), {
      notifPrefs: prefs,
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
            { key:"gradeNotifs",
              label:"Grade notifications",
              sub:"Notify when grades are posted" },
            { key:"feeReminders",
              label:"Fee payment reminders",
              sub:"Remind before payment deadlines" },
            { key:"attendanceAlerts",
              label:"Attendance alerts",
              sub:"Alert when child is absent or late" },
            { key:"messageNotifs",
              label:"New messages",
              sub:"Notify on new messages from school" },
            { key:"eventReminders",
              label:"Event reminders",
              sub:"Remind about upcoming school events" },
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

      {/* Section 2 — Linked Student Info (read-only) */}
      <GlassCard padding="p-5">
        <h3 className="font-headline text-xl font-light italic
                       text-primary mb-4">
          Linked Student
        </h3>
        <div className="flex items-center gap-4 p-4 rounded-xl
                        bg-surface-container-low">
          <div className="w-12 h-12 rounded-full bg-primary-container/10
                          flex items-center justify-center flex-shrink-0">
            <span className="font-label text-[14px] text-primary-container">
              {(studentData?.name as string)?.charAt(0) || "S"}
            </span>
          </div>
          <div>
            <p className="font-body text-sm font-medium text-on-surface">
              {(studentData?.name as string) || "—"}
            </p>
            <p className="font-body text-xs text-outline font-light mt-0.5">
              {(studentData?.class as string) || "—"} · ID: {(studentData?.id as string) || "—"}
            </p>
          </div>
        </div>
        <p className="font-body text-xs text-outline font-light mt-3 px-1">
          To change your linked student contact
          your school administrator.
        </p>
      </GlassCard>
    </div>
  );
}
