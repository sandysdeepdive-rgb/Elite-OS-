"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";
import EliteInput from "@/components/ui/EliteInput";
import { useSchoolData } from "@/lib/hooks/useSchoolData";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { SMS } from "@/lib/utils/sms";

// Mock Data
const mockSchool = { name: "Elite Academy" };
const mockAdmin = { name: "Admin User" };

const SETTINGS_TABS = [
  { label: "School Profile", icon: "account_balance" },
  { label: "Term Settings", icon: "calendar_month" },
  { label: "Fee Structure", icon: "payments" },
  { label: "School Code", icon: "vpn_key" },
  { label: "Notifications", icon: "sms" },
];

const MOCK_FEE_STRUCTURE = [
  { level: "Senior 1 & 2", classes: "S.1A, S.1B, S.2A, S.2B", amount: 700000 },
  { level: "Senior 3 & 4", classes: "S.3A, S.3B, S.4A, S.4B", amount: 850000 },
  { level: "Senior 5 & 6", classes: "S.5A, S.5B, S.6A, S.6B", amount: 950000 },
];

export default function AdminSettingsPage() {
  const { schoolId, schoolName, adminName } = useSchoolData();
  const [activeTab, setActiveTab] = useState(0);
  const [schoolCode, setSchoolCode] = useState("Loading...");
  const [copySuccess, setCopySuccess] = useState(false);
  const [profileForm, setProfileForm] = useState({ schoolName: "" });

  const [termForm, setTermForm] = useState({
    currentTerm: "Term 2",
    academicYear: "2025",
    weekNumber: "8",
    startDate: "03 Feb 2025",
    endDate: "30 Jun 2025"
  });

  const [smsPrefs, setSmsPrefs] = useState({
    smsAttendance: true,
    smsGrades: true,
    smsFeeReminders: true,
    smsApprovals: true,
  });
  const [testPhone, setTestPhone] = useState("");
  const [testingSMS, setTestingSMS] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    const fetchSettings = async () => {
      const schoolDoc = await getDoc(doc(db, "schools", schoolId));
      if (schoolDoc.exists()) {
        setSchoolCode(schoolDoc.data().schoolCode || "Not found");
        setProfileForm(prev => ({
          ...prev,
          schoolName: schoolDoc.data().name || "",
        }));
      }

      const settingsDoc = await getDoc(doc(db, "schools", schoolId, "settings", "general"));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.termSettings) {
          setTermForm(data.termSettings);
        }
        if (data.smsPrefs) {
          setSmsPrefs(data.smsPrefs);
        }
      }
    };
    fetchSettings();
  }, [schoolId]);

  const handleSaveProfile = async () => {
    if (!schoolId) return;
    try {
      await updateDoc(doc(db, "schools", schoolId), {
        name: profileForm.schoolName
      });
      toast.success("School profile updated successfully");
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("Error updating profile:", error);
      toast.error("Failed to update school profile");
    }
  };

  const handleSaveTerm = async () => {
    if (!schoolId) return;
    try {
      await setDoc(doc(db, "schools", schoolId, "settings", "general"), {
        termSettings: termForm
      }, { merge: true });
      toast.success("Term settings updated successfully");
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("Error updating term settings:", error);
      toast.error("Failed to update term settings");
    }
  };

  const handleSaveFeeStructure = async () => {
    if (!schoolId) return;
    try {
      await setDoc(doc(db, "schools", schoolId, "settings", "general"), {
        feeStructure: MOCK_FEE_STRUCTURE // In a real app, this would be editable state
      }, { merge: true });
      toast.success("Fee structure updated successfully");
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("Error updating fee structure:", error);
      toast.error("Failed to update fee structure");
    }
  };

  const handleSaveSmsPrefs = async () => {
    if (!schoolId) return;
    try {
      await setDoc(doc(db, "schools", schoolId, "settings", "general"), {
        smsPrefs
      }, { merge: true });
      toast.success("SMS settings updated successfully");
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("Error updating SMS settings:", error);
      toast.error("Failed to update SMS settings");
    }
  };

  const handleCopyCode = async () => {
    const code = schoolCode;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        toast.success("School code copied to clipboard");
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (err) {
      // Fallback for iframes or when document is not focused
      try {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        toast.success("School code copied to clipboard");
      } catch (fallbackErr) {
        if (process.env.NODE_ENV === 'development') console.error("Failed to copy text: ", err, fallbackErr);
        toast.error("Failed to copy school code");
      }
    }
  };

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <AdminSidebar
        activeHref="/admin/settings"
      />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="Settings" subtitle="System Configuration" />
        <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Section 1 — Page header */}
          <div>
            <h2 className="font-headline text-3xl font-light italic text-primary">
              System Configuration
            </h2>
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mt-1">
              School profile, term settings, and access management
            </p>
          </div>

          {/* Section 2 — Settings tab selector */}
          <GlassCard padding="p-2">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {SETTINGS_TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-label text-[11px] uppercase tracking-[0.08em] transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === i
                      ? "bg-primary-container text-white shadow-sm"
                      : "text-outline hover:bg-surface-container"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* TAB 0 — School Profile */}
          {activeTab === 0 && (
            <GlassCard showOrb>
              <h3 className="font-headline text-xl font-light italic text-primary mb-6">
                School Identity
              </h3>
              <div className="space-y-5">
                {/* Logo placeholder */}
                <div className="flex items-center gap-5 pb-5 border-b border-outline-variant/20">
                  <div className="w-20 h-20 rounded-2xl bg-primary-container/10 border-2 border-dashed border-primary-container/30 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-primary-container/15 transition-colors">
                    <span className="material-symbols-outlined text-[24px] text-primary-container">
                      add_photo_alternate
                    </span>
                    <span className="font-label text-[9px] text-outline uppercase tracking-[0.06em]">
                      Logo
                    </span>
                  </div>
                  <div>
                    <p className="font-body text-sm text-on-surface font-light">
                      School Logo
                    </p>
                    <p className="font-body text-xs text-outline mt-1">
                      PNG or JPG, max 2MB. Displayed on report cards.
                    </p>
                    <EliteButton variant="outlined" size="sm" className="mt-3">
                      Upload
                    </EliteButton>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <EliteInput
                    label="School Name"
                    placeholder="e.g. Kampala Royal Academy"
                    value={profileForm.schoolName}
                    onChange={(e) => setProfileForm({ ...profileForm, schoolName: e.target.value })}
                  />
                  <EliteInput
                    label="Motto"
                    placeholder="e.g. Excellence in All Things"
                    defaultValue="Excellence in All Things"
                  />
                  <EliteInput
                    label="Physical Address"
                    placeholder="e.g. Plot 12, Kololo Hill"
                  />
                  <EliteInput
                    label="Phone Number"
                    type="tel"
                    placeholder="e.g. +256 772 123 456"
                  />
                  <EliteInput
                    label="Official Email"
                    type="email"
                    placeholder="info@school.ac.ug"
                  />
                  <EliteInput
                    label="Website"
                    placeholder="e.g. www.school.ac.ug"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <EliteButton variant="primary" size="md" onClick={handleSaveProfile}>
                    <span className="material-symbols-outlined text-[16px] mr-1.5">
                      save
                    </span>
                    Save Profile
                  </EliteButton>
                </div>
              </div>
            </GlassCard>
          )}

          {/* TAB 1 — Term Settings */}
          {activeTab === 1 && (
            <GlassCard>
              <h3 className="font-headline text-xl font-light italic text-primary mb-6">
                Academic Calendar
              </h3>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">
                      Current Term
                    </label>
                    <select 
                      className="w-full h-14 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                      value={termForm.currentTerm}
                      onChange={(e) => setTermForm({ ...termForm, currentTerm: e.target.value })}
                    >
                      <option>Term 1</option>
                      <option>Term 2</option>
                      <option>Term 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">
                      Academic Year
                    </label>
                    <select 
                      className="w-full h-14 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                      value={termForm.academicYear}
                      onChange={(e) => setTermForm({ ...termForm, academicYear: e.target.value })}
                    >
                      <option>2024</option>
                      <option>2025</option>
                      <option>2026</option>
                    </select>
                  </div>
                  <EliteInput
                    label="Week Number"
                    type="number"
                    placeholder="e.g. 8"
                    value={termForm.weekNumber}
                    onChange={(e) => setTermForm({ ...termForm, weekNumber: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <EliteInput
                    label="Term Start Date"
                    type="text"
                    placeholder="e.g. 03 Feb 2025"
                    value={termForm.startDate}
                    onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })}
                  />
                  <EliteInput
                    label="Term End Date"
                    type="text"
                    placeholder="e.g. 30 Jun 2025"
                    value={termForm.endDate}
                    onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })}
                  />
                </div>

                {/* Term progress bar */}
                <div className="p-4 rounded-xl bg-surface-container-low">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-label text-[10px] uppercase tracking-[0.1em] text-outline">
                      Term Progress
                    </span>
                    <span className="font-headline text-xl font-light text-primary">
                      67%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-container rounded-full"
                      style={{ width: "67%" }}
                    />
                  </div>
                  <p className="font-body text-xs text-outline font-light mt-2">
                    43 days remaining in Term 2
                  </p>
                </div>

                <div className="flex justify-end">
                  <EliteButton variant="primary" onClick={handleSaveTerm}>Save Term Settings</EliteButton>
                </div>
              </div>
            </GlassCard>
          )}

          {/* TAB 2 — Fee Structure */}
          {activeTab === 2 && (
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-headline text-xl font-light italic text-primary">
                  Fee Structure — Term 2, 2025
                </h3>
                <EliteButton variant="outlined" size="sm">
                  <span className="material-symbols-outlined text-[16px] mr-1.5">
                    add
                  </span>
                  Add Tier
                </EliteButton>
              </div>

              <div className="space-y-3">
                {MOCK_FEE_STRUCTURE.map((tier, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/20"
                  >
                    <div className="flex-1">
                      <p className="font-body text-sm font-light text-on-surface">
                        {tier.level}
                      </p>
                      <p className="font-label text-[10px] text-outline mt-0.5">
                        {tier.classes}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-headline text-xl font-light text-primary">
                        UGX {tier.amount.toLocaleString()}
                      </p>
                      <p className="font-label text-[10px] text-outline">
                        per term
                      </p>
                    </div>
                    <button className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[16px] text-outline">
                        edit
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-5">
                <EliteButton variant="primary" onClick={handleSaveFeeStructure}>Save Fee Structure</EliteButton>
              </div>
            </GlassCard>
          )}

          {/* TAB 3 — School Code */}
          {activeTab === 3 && (
            <GlassCard showOrb>
              <h3 className="font-headline text-xl font-light italic text-primary mb-2">
                School Access Code
              </h3>
              <p className="font-body text-sm text-on-surface-variant font-light mb-8">
                Share this code with teachers and parents so they can register
                and link to your school.
              </p>

              {/* Code display */}
              <div className="flex items-center gap-4 p-6 rounded-2xl bg-primary-container/8 border border-primary-container/20 mb-6">
                <div className="flex-1">
                  <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mb-2">
                    Your School Code
                  </p>
                  <p className="font-headline text-5xl font-light tracking-[0.15em] text-primary">
                    {schoolCode}
                  </p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="w-12 h-12 rounded-full bg-primary-container/10 hover:bg-primary-container/20 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary-container">
                    {copySuccess ? "check" : "content_copy"}
                  </span>
                </button>
              </div>

              {/* Instructions */}
              <div className="space-y-3">
                {[
                  {
                    icon: "school",
                    text: "Teachers enter this code when registering",
                  },
                  {
                    icon: "family_restroom",
                    text: "Parents enter this code + their child's Student ID",
                  },
                  {
                    icon: "lock",
                    text: "Keep this code private — only share with verified staff and parents",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-primary-container">
                        {item.icon}
                      </span>
                    </div>
                    <p className="font-body text-sm text-on-surface-variant font-light">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Regenerate warning */}
              <div className="mt-8 pt-6 border-t border-outline-variant/20">
                <div className="flex items-start gap-3 mb-4">
                  <span className="material-symbols-outlined text-[18px] text-error flex-shrink-0 mt-0.5">
                    warning
                  </span>
                  <p className="font-body text-xs text-on-surface-variant font-light">
                    Regenerating the code will invalidate the old one. All
                    pending registrations using the old code will fail.
                  </p>
                </div>
                <EliteButton variant="outlined" size="sm">
                  Regenerate Code
                </EliteButton>
              </div>
            </GlassCard>
          )}

          {/* TAB 4 — Notifications */}
          {activeTab === 4 && (
            <div className="space-y-6">
              <GlassCard>
                <h3 className="font-headline text-xl font-light italic
                               text-primary mb-5">
                  SMS Notifications
                </h3>
                <div className="space-y-4">
                  {[
                    { key:"smsAttendance",
                      label:"Attendance alerts",
                      sub:"SMS parents when child is absent or late" },
                    { key:"smsGrades",
                      label:"Grade notifications",
                      sub:"SMS parents when new grades are posted" },
                    { key:"smsFeeReminders",
                      label:"Fee reminders",
                      sub:"Allow bulk fee reminder SMS to parents" },
                    { key:"smsApprovals",
                      label:"Account approvals",
                      sub:"SMS users when their account is approved" },
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
                      <button
                        onClick={() => setSmsPrefs(prev => ({
                          ...prev,
                          [item.key]: !prev[item.key as keyof typeof prev]
                        }))}
                        className={`w-12 h-6 rounded-full transition-all
                                     duration-200 relative flex-shrink-0
                                     ${smsPrefs[item.key as keyof typeof smsPrefs]
                                       ? "bg-primary-container"
                                       : "bg-surface-container-highest"}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full
                                         bg-white shadow-sm transition-all duration-200
                                         ${smsPrefs[item.key as keyof typeof smsPrefs]
                                           ? "left-7" : "left-1"}`} />
                      </button>
                    </div>
                  ))}
                  <EliteButton variant="primary" fullWidth
                    onClick={handleSaveSmsPrefs}>
                    Save SMS Settings
                  </EliteButton>
                </div>
              </GlassCard>

              {/* Test SMS */}
              <GlassCard padding="p-5">
                <h3 className="font-headline text-xl font-light italic
                               text-primary mb-4">
                  Test SMS
                </h3>
                <div className="space-y-3">
                  <EliteInput
                    label="Test Phone Number"
                    type="tel"
                    placeholder="e.g. 0772123456"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    hint="Enter a Uganda phone number to test" />
                  <EliteButton variant="outlined" fullWidth
                    loading={testingSMS}
                    onClick={async () => {
                      setTestingSMS(true);
                      await SMS.custom({
                        phones: [testPhone],
                        message: `Test message from EliteSchool's OS. Your SMS notifications are working correctly.`,
                      });
                      setTestingSMS(false);
                    }}>
                    Send Test SMS
                  </EliteButton>
                </div>
              </GlassCard>
            </div>
          )}
        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/settings" />
    </div>
  );
}
