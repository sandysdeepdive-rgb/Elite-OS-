"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import BottomNavBar, { TEACHER_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

// ─── Types & Mock Data ────────────────────────────────────────────────────────

type UserRole = "teacher" | "parent" | "admin";

const PROFILE = {
  name: "Prof. Beatrice Namukasa",
  initials: "BN",
  role: "teacher" as UserRole,
  title: "Senior Faculty — Sciences & Mathematics",
  email: "b.namukasa@eliteschool.ac.ug",
  phone: "+256 772 445 891",
  staffId: "STF-2019-0041",
  department: "STEM Department",
  joinDate: "August 2019",
  location: "Kampala, Uganda",
  bio: "Passionate educator with 8 years of experience in secondary sciences. Committed to evidence-based pedagogy and student-centred learning. Mentor for the school's STEM club.",
  subjects: ["Advanced Mathematics", "Physics & Applied Sciences", "Biology & Life Sciences"],
  classes: ["Senior 4 West", "Senior 4 East", "Senior 3 North"],
};

const STATS = [
  { label: "Classes",    value: "3"   },
  { label: "Students",   value: "95"  },
  { label: "This Term",  value: "T2"  },
  { label: "Since",      value: "2019"},
];

type SettingItem = {
  id: string;
  label: string;
  description: string;
  icon: string; // material symbol
  type: "toggle" | "link" | "destructive";
  value?: boolean;
};

const SETTINGS: SettingItem[] = [
  { id:"notif_grades",    label:"Grade Notifications",    description:"Alert when grades are posted or updated",       icon:"grade",            type:"toggle",      value:true  },
  { id:"notif_messages",  label:"Message Alerts",         description:"Push alerts for new messages",                  icon:"forum",            type:"toggle",      value:true  },
  { id:"notif_fees",      label:"Fee Reminders",          description:"Notify before fee payment deadlines",           icon:"payments",         type:"toggle",      value:false },
  { id:"notif_events",    label:"Event Reminders",        description:"Upcoming school events and meetings",           icon:"event",            type:"toggle",      value:true  },
  { id:"change_password", label:"Change Password",        description:"Update your account password",                  icon:"lock",             type:"link"         },
  { id:"privacy",         label:"Privacy Settings",       description:"Control data visibility and sharing",           icon:"privacy_tip",      type:"link"         },
  { id:"help",            label:"Help & Support",         description:"FAQs, contact support, report an issue",        icon:"help",             type:"link"         },
  { id:"logout",          label:"Sign Out",               description:"Sign out of your EliteSchool account",          icon:"logout",           type:"destructive"  },
];

const ROLE_LABEL: Record<UserRole, string> = {
  teacher: "Faculty Member",
  parent:  "Parent / Guardian",
  admin:   "School Administrator",
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

function CustomTopAppBar() {
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
          {PROFILE.initials}
        </div>
      </div>
    </header>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();

  const [settings, setSettings] = useState(
    Object.fromEntries(
      SETTINGS.filter(s => s.type === "toggle").map(s => [s.id, s.value ?? false])
    ) as Record<string, boolean>
  );
  const [editMode, setEditMode] = useState(false);
  const [editedBio, setEditedBio] = useState(PROFILE.bio);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  function toggleSetting(id: string) {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <CustomTopAppBar />
      
      <main className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full pt-28 pb-32 space-y-8">
        
        {/* Section 1 — Profile hero card */}
        <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background:"#123643" }}>
          {/* Ambient orb */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background:"rgba(154,189,204,0.06)", filter:"blur(30px)" }} />

          <div className="relative z-10">
            {/* Top row: avatar + name + edit button */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-4">
                {/* Avatar — large initials circle */}
                <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                  style={{ background:"rgba(255,255,255,0.1)", borderColor:"rgba(255,255,255,0.2)", fontFamily:"'Cormorant Garamond', serif", fontSize:"1.5rem", color:"#ffffff" }}>
                  {PROFILE.initials}
                </div>
                <div>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest mb-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {ROLE_LABEL[PROFILE.role]}
                  </p>
                  <h1 className="text-2xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {PROFILE.name}
                  </h1>
                  <p className="text-sm text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {PROFILE.title}
                  </p>
                </div>
              </div>

              {/* Edit button */}
              <button onClick={() => setEditMode(v => !v)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs transition-all active:scale-95"
                style={{
                  background: editMode ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.12)",
                  color: editMode ? "#123643" : "rgba(255,255,255,0.8)",
                  fontFamily:"'DM Sans', sans-serif",
                  border:"1px solid rgba(255,255,255,0.15)",
                }}>
                <span className="material-symbols-outlined text-[14px]">
                  {editMode ? "check" : "edit"}
                </span>
                {editMode ? "Save" : "Edit"}
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              {STATS.map(s => (
                <div key={s.label} className="rounded-xl py-2.5 px-2 text-center" style={{ background:"rgba(255,255,255,0.07)" }}>
                  <span className="text-2xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{s.value}</span>
                  <p className="text-[9px] text-white/40 uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2 — Contact & identity details card */}
        <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.65)", border:"1px solid rgba(193,199,203,0.15)" }}>
          <div className="px-5 py-4" style={{ borderBottom:"1px solid rgba(193,199,203,0.12)", background:"rgba(240,238,233,0.5)" }}>
            <h2 className="text-xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Account Details</h2>
          </div>

          <div className="divide-y divide-[#c1c7cb]/10">
            {[
              { icon:"badge",       label:"Staff ID",    value:PROFILE.staffId   },
              { icon:"mail",        label:"Email",       value:PROFILE.email     },
              { icon:"phone",       label:"Phone",       value:PROFILE.phone     },
              { icon:"apartment",   label:"Department",  value:PROFILE.department},
              { icon:"calendar_month", label:"Joined",   value:PROFILE.joinDate  },
              { icon:"location_on", label:"Location",    value:PROFILE.location  },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:"rgba(43,77,90,0.08)" }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color:"#2B4D5A" }}>{row.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-[#72787b] uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {row.label}
                  </p>
                  <p className="text-sm text-[#1b1c19] truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 — Bio card (editable) */}
        <div className="rounded-2xl p-6" style={{ background:"rgba(255,255,255,0.65)", border:"1px solid rgba(193,199,203,0.15)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>About</h2>
            {editMode && (
              <span className="text-[9px] text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>Editing</span>
            )}
          </div>
          {editMode ? (
            <textarea
              value={editedBio}
              onChange={e => setEditedBio(e.target.value)}
              rows={4}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-shadow"
              style={{
                background:"#f0eee9", border:"1px solid rgba(193,199,203,0.3)",
                fontFamily:"'DM Sans', sans-serif", color:"#1b1c19",
                lineHeight:1.6,
              }}
              onFocus={e => (e.target.style.boxShadow = "0 0 0 2px rgba(43,77,90,0.2)")}
              onBlur={e => (e.target.style.boxShadow = "none")}
            />
          ) : (
            <p className="text-sm text-[#5f5e60] font-light leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {editedBio}
            </p>
          )}
        </div>

        {/* Section 4 — Teaching subjects + classes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subjects */}
          <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.65)", border:"1px solid rgba(193,199,203,0.15)" }}>
            <h2 className="text-xl text-[#2B4D5A] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Subjects</h2>
            <div className="space-y-2">
              {PROFILE.subjects.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background:"#f0eee9" }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:"#2B4D5A" }} />
                  <span className="text-sm text-[#1b1c19]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Classes */}
          <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.65)", border:"1px solid rgba(193,199,203,0.15)" }}>
            <h2 className="text-xl text-[#2B4D5A] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Classes</h2>
            <div className="space-y-2">
              {PROFILE.classes.map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background:"#f0eee9" }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:"#B5A898" }} />
                  <span className="text-sm text-[#1b1c19]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5 — Settings list */}
        <div>
          <h2 className="text-2xl text-[#2B4D5A] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Settings</h2>
          <div className="rounded-2xl overflow-hidden divide-y divide-[#c1c7cb]/10" style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(193,199,203,0.15)" }}>
            {SETTINGS.map(item => (
              <div key={item.id}
                className={`flex items-center gap-4 px-5 py-4 transition-colors ${item.type === "link" || item.type === "destructive" ? "cursor-pointer" : ""}`}
                style={{ background:"transparent" }}
                onClick={() => {
                  if (item.id === "logout") setShowLogoutConfirm(true);
                  if (item.type === "toggle") toggleSetting(item.id);
                }}
                onMouseEnter={e => { if (item.type !== "toggle") (e.currentTarget as HTMLElement).style.background = "rgba(240,238,233,0.5)"; }}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>

                {/* Icon */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: item.type === "destructive" ? "rgba(186,26,26,0.07)" : "rgba(43,77,90,0.07)" }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color: item.type === "destructive" ? "#ba1a1a" : "#2B4D5A" }}>
                    {item.icon}
                  </span>
                </div>

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ fontFamily: "'DM Sans', sans-serif", color: item.type === "destructive" ? "#ba1a1a" : "#1b1c19" }}>
                    {item.label}
                  </p>
                  <p className="text-xs text-[#72787b]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.description}</p>
                </div>

                {/* Right control */}
                {item.type === "toggle" && (
                  // Custom toggle pill
                  <div className="w-11 h-6 rounded-full relative flex-shrink-0 transition-colors cursor-pointer"
                    style={{ background: settings[item.id] ? "#2B4D5A" : "#c1c7cb" }}
                    onClick={(e) => { e.stopPropagation(); toggleSetting(item.id); }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: settings[item.id] ? "calc(100% - 20px)" : "4px" }} />
                  </div>
                )}
                {item.type === "link" && (
                  <span className="material-symbols-outlined text-[18px]" style={{ color:"#c1c7cb" }}>chevron_right</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      <BottomNavBar items={TEACHER_NAV_ITEMS} activeHref="" onNavigate={(href) => router.push(href)} />

      {/* Logout confirmation modal */}
      <AnimatePresence>
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-[#141416]/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:24 }}
            transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
            className="w-full max-w-xs rounded-2xl p-7 text-center"
            style={{ background:"#fbf9f4", boxShadow:"0 32px 64px rgba(20,20,22,0.18)" }}>

            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background:"rgba(186,26,26,0.07)" }}>
              <span className="material-symbols-outlined text-[28px]" style={{ color:"#ba1a1a" }}>logout</span>
            </div>

            <h2 className="text-2xl text-[#2B4D5A] mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Sign Out?</h2>
            <p className="text-sm text-[#5f5e60] mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              You will be returned to the login screen.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-full text-sm border transition-colors"
                style={{ borderColor:"rgba(193,199,203,0.4)", color:"#72787b", fontFamily:"'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await signOut(auth);
                  router.push("/");
                }}
                className="flex-1 py-3 rounded-full text-sm font-medium text-white"
                style={{ background:"#ba1a1a", fontFamily:"'DM Sans', sans-serif" }}>
                Sign Out
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
