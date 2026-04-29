"use client";

import { useState } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";
import Badge from "@/components/ui/Badge";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { useSchoolData, useCollection } from "@/lib/hooks/useSchoolData";
import { doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";
import { SMS } from "@/lib/utils/sms";

interface Applicant {
  id: string;
  uid: string;
  name: string;
  email: string;
  schoolCode: string;
  registeredAt: string;
  studentId?: string; // parents only
  role: string;
}

export default function AdminApprovalsPage() {
  const { schoolId, schoolName, adminName } = useSchoolData();
  const { data: pendingUsers, error: pendingUsersError } = useCollection<Applicant>(schoolId, "pendingUsers");
  const { data: teachers, error: teachersError } = useCollection(schoolId, "teachers");

  const anyError = pendingUsersError || teachersError;

  const [activeTab, setActiveTab] = useState(0);
  const [rejectTarget, setRejectTarget] = useState<Applicant | null>(null);

  const pendingTeachers = pendingUsers.filter(u => u.role === "teacher");
  const pendingParents = pendingUsers.filter(u => u.role === "parent");

  const currentList = activeTab === 0 ? pendingTeachers : pendingParents;

  const handleApprove = async (applicant: Applicant) => {
    if (!schoolId) return;
    try {
      // Update user status to active
      await updateDoc(doc(db, "users", applicant.uid), {
        status: "active",
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser?.uid,
      });

      // If teacher — create teacher document in school
      if (applicant.role === "teacher") {
        const teacherCode = String(
          (pendingTeachers.length + 1)
        ).padStart(2, "0");

        await setDoc(
          doc(db, "schools", schoolId, "teachers", applicant.uid),
          {
            name: applicant.name,
            email: applicant.email,
            teacherUid: applicant.uid,
            teacherCode,
            status: "active",
            classes: [],
            subject: "",
            phone: "",
            createdAt: serverTimestamp(),
          }
        );
      }

      // Remove from pendingUsers
      await deleteDoc(
        doc(db, "schools", schoolId, "pendingUsers", applicant.uid)
      );

      // Send approval SMS if phone number available
      if ((applicant as any).phone) {
        await SMS.accountApproved({
          phone:      (applicant as any).phone,
          schoolName: schoolName || "EliteSchool's",
        });
      }

    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error("Approval error:", err);
      alert("Failed to approve account. Please check your permissions.");
    }
  };

  const handleReject = async () => {
    if (!schoolId || !rejectTarget) return;

    // Delete user Firestore profile
    await deleteDoc(doc(db, "users", rejectTarget.uid));

    // Remove from pendingUsers
    await deleteDoc(
      doc(db, "schools", schoolId, "pendingUsers", rejectTarget.uid)
    );

    // Note: Firebase Auth account remains but has no profile
    // User cannot login without a Firestore profile
    setRejectTarget(null);
  };

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <AdminSidebar
        activeHref="/admin/approvals"
      />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="Approvals" subtitle="Account Verification Queue" />
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-6">
          <CollectionErrorBanner error={anyError} />
          {/* Section 1 — Page header with count badges */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-headline text-3xl font-light italic text-primary">
                Verification Queue
              </h2>
              <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mt-1">
                Pending account approvals
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container border border-outline-variant/30">
                <span className="material-symbols-outlined text-[16px] text-primary-container">
                  school
                </span>
                <span className="font-label text-[11px] text-on-surface">
                  {pendingTeachers.length} Teachers
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container border border-outline-variant/30">
                <span className="material-symbols-outlined text-[16px] text-primary-container">
                  family_restroom
                </span>
                <span className="font-label text-[11px] text-on-surface">
                  {pendingParents.length} Parents
                </span>
              </div>
            </div>
          </div>

          {/* Section 2 — Tab selector */}
          <GlassCard padding="p-2">
            <div className="flex gap-1">
              {["Teachers", "Parents"].map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={`flex-1 py-2.5 rounded-xl font-label text-[11px] uppercase tracking-[0.1em] transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === i
                      ? "bg-primary-container text-white shadow-sm"
                      : "text-outline hover:bg-surface-container"
                  }`}
                >
                  {tab}
                  {/* Unread count pill */}
                  {(i === 0 ? pendingTeachers : pendingParents).length > 0 && (
                    <span
                      className={`min-w-[18px] h-[18px] px-1 rounded-full font-label text-[9px] flex items-center justify-center ${
                        activeTab === i
                          ? "bg-white/20 text-white"
                          : "bg-primary-container/10 text-primary-container"
                      }`}
                    >
                      {(i === 0 ? pendingTeachers : pendingParents).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Section 3 — Approval cards list */}
          <div className="space-y-3">
            {currentList.length === 0 ? (
              <GlassCard padding="p-12">
                <div className="text-center">
                  <span className="material-symbols-outlined text-[48px] text-outline/30 block mb-3">
                    check_circle
                  </span>
                  <p className="font-body text-sm text-outline font-light">
                    No pending approvals
                  </p>
                  <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline/60 mt-1">
                    All accounts are verified
                  </p>
                </div>
              </GlassCard>
            ) : (
              currentList.map((applicant, i) => (
                <GlassCard
                  key={applicant.id}
                  padding="p-5"
                  style={{ animation: `fadeSlideIn 0.3s ${i * 0.06}s ease both` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-label text-[14px] text-primary-container">
                        {applicant.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-body text-sm font-medium text-on-surface">
                          {applicant.name}
                        </p>
                        <Badge variant="pending" size="sm">
                          Pending
                        </Badge>
                      </div>
                      <p className="font-body text-xs text-outline font-light mt-0.5">
                        {applicant.email}
                      </p>
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        {applicant.schoolCode && (
                          <span className="font-label text-[10px] text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">
                              vpn_key
                            </span>
                            {applicant.schoolCode}
                          </span>
                        )}
                        {applicant.studentId && (
                          <span className="font-label text-[10px] text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">
                              badge
                            </span>
                            Student: {applicant.studentId}
                          </span>
                        )}
                        <span className="font-label text-[10px] text-outline flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            schedule
                          </span>
                          {applicant.registeredAt}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                         onClick={() => setRejectTarget(applicant)}
                        className="w-9 h-9 rounded-full border border-outline-variant/50 flex items-center justify-center hover:bg-error/10 hover:border-error/30 transition-all group"
                      >
                        <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-error">
                          close
                        </span>
                      </button>
                      <button
                        onClick={() => handleApprove(applicant)}
                        className="w-9 h-9 rounded-full bg-primary-container/10 border border-primary-container/20 flex items-center justify-center hover:bg-primary-container hover:border-primary-container transition-all group"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary-container group-hover:text-white">
                          check
                        </span>
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/approvals" />

      {/* Reject confirmation modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm" padding="p-6">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[24px] text-error">
                person_remove
              </span>
            </div>
            <h3 className="font-headline text-xl font-light text-primary text-center mb-2">
              Reject Application?
            </h3>
            <p className="font-body text-sm text-on-surface-variant font-light text-center mb-2 leading-relaxed">
              This will permanently reject the registration for{" "}
              <strong className="font-medium text-on-surface">
                {rejectTarget.name}
              </strong>
              .
            </p>
            <p className="font-body text-xs text-outline text-center mb-6">
              They will need to re-register to request access again.
            </p>
            <div className="flex gap-3">
              <EliteButton
                variant="outlined"
                fullWidth
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </EliteButton>
              <EliteButton
                variant="primary"
                fullWidth
                onClick={handleReject}
              >
                Reject
              </EliteButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
