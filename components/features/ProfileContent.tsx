'use client';
import { useState, useEffect } from "react";
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import GlassCard from "@/components/ui/GlassCard";
import EliteInput from "@/components/ui/EliteInput";
import EliteButton from "@/components/ui/EliteButton";
import Badge from "@/components/ui/Badge";
import { useRouter } from "next/navigation";

export default function ProfileContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  // Load profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return;
      const data = userDoc.data();
      setProfile({ ...data, uid: user.uid });
      setNameInput(data.name || "");
      setPhoneInput(data.phone || "");
      // Get school name
      if (data.schoolId) {
        const schoolDoc = await getDoc(
          doc(db, "schools", data.schoolId)
        );
        if (schoolDoc.exists()) {
          setProfile((prev: any) => ({
            ...prev!,
            schoolName: schoolDoc.data().name,
            schoolCode: schoolDoc.data().schoolCode,
          }));
        }
      }
    });
    return () => unsub();
  }, []);

  // Save profile
  const handleSaveProfile = async () => {
    if (!profile?.uid) return;
    setSaving(true);
    await updateDoc(doc(db, "users", profile.uid), {
      name: nameInput.trim(),
      phone: phoneInput.trim(),
    });
    setProfile((prev: any) => ({ ...prev!, name: nameInput }));
    setSaving(false);
  };

  // Change password
  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) {
      setPwdError("Passwords do not match");
      return;
    }
    if (newPwd.length < 6) {
      setPwdError("Password must be at least 6 characters");
      return;
    }
    setChangingPwd(true);
    try {
      const user = auth.currentUser!;
      const credential = EmailAuthProvider.credential(
        user.email!, currentPwd
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPwd);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setPwdError("");
      alert("Password updated successfully");
    } catch {
      setPwdError("Current password is incorrect");
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1 — Avatar + Identity */}
      <GlassCard showOrb>
        <div className="flex items-center gap-5">
          {/* Avatar circle with initials */}
          <div className="w-20 h-20 rounded-full bg-primary-container
                          flex items-center justify-center flex-shrink-0
                          shadow-lg">
            <span className="font-headline text-3xl font-light text-white">
              {profile?.name?.split(" ")
                .map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-headline text-2xl font-light italic text-primary">
              {profile?.name}
            </h2>
            <p className="font-body text-sm text-on-surface-variant font-light mt-0.5">
              {profile?.email}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="active" dot>
                {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ""}
              </Badge>
              <Badge variant="default">
                {profile?.schoolName || "EliteSchool's"}
              </Badge>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Section 2 — Edit Personal Info */}
      <GlassCard>
        <h3 className="font-headline text-xl font-light italic text-primary mb-5">
          Personal Information
        </h3>
        <div className="space-y-4">
          <EliteInput label="Full Name"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)} />
          <EliteInput label="Email Address"
            type="email" value={profile?.email || ""}
            disabled
            hint="Email cannot be changed" />
          {profile?.role === "teacher" && (
            <EliteInput label="Phone Number"
              type="tel" value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)} />
          )}
          {profile?.role === "parent" && (
            <EliteInput label="Phone Number"
              type="tel" value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)} />
          )}
          <EliteButton variant="primary" fullWidth
            loading={saving} onClick={handleSaveProfile}>
            Save Changes
          </EliteButton>
        </div>
      </GlassCard>

      {/* Section 3 — Change Password */}
      <GlassCard>
        <h3 className="font-headline text-xl font-light italic text-primary mb-5">
          Change Password
        </h3>
        <div className="space-y-4">
          <EliteInput label="Current Password"
            type="password" value={currentPwd}
            onChange={e => setCurrentPwd(e.target.value)} />
          <EliteInput label="New Password"
            type="password" value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            hint="Minimum 6 characters" />
          <EliteInput label="Confirm New Password"
            type="password" value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            error={pwdError} />
          <EliteButton variant="outlined" fullWidth
            loading={changingPwd} onClick={handleChangePassword}>
            Update Password
          </EliteButton>
        </div>
      </GlassCard>

      {/* Section 4 — Account Info (read-only) */}
      <GlassCard padding="p-5">
        <h3 className="font-headline text-xl font-light italic text-primary mb-4">
          Account Details
        </h3>
        <div className="space-y-3">
          {([
            { label:"Role", value: profile?.role },
            { label:"School", value: profile?.schoolName },
            { label:"School Code", value: profile?.schoolCode },
            { label:"Status", value: profile?.status },
            profile?.role === "parent" ? {
              label:"Linked Student",
              value: profile?.studentName
            } : false,
            profile?.role === "teacher" ? {
              label:"Teacher Code",
              value: `TR-${profile?.teacherCode || "—"}`
            } : false,
          ].filter(Boolean) as {label:string, value:string}[]).map((item) => {
            return (
              <div key={item.label}
                className="flex items-center justify-between py-2
                           border-b border-outline-variant/20 last:border-0">
                <span className="font-label text-[10px] uppercase
                                 tracking-[0.12em] text-outline">
                  {item.label}
                </span>
                <span className="font-body text-sm text-on-surface font-light">
                  {item.value || "—"}
                </span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Section 5 — Danger Zone */}
      <GlassCard padding="p-5">
        <h3 className="font-label text-[10px] uppercase tracking-[0.15em]
                       text-outline mb-4">
          Session
        </h3>
        <EliteButton variant="outlined" fullWidth
          onClick={async () => {
            await auth.signOut();
            router.push("/");
          }}>
          <span className="material-symbols-outlined text-[16px] mr-2">
            logout
          </span>
          Sign Out
        </EliteButton>
      </GlassCard>
    </div>
  );
}
