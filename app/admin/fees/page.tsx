"use client";

import { useState, useMemo } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";
import EliteInput from "@/components/ui/EliteInput";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import PayFeeButton from "@/components/PayFeeButton";
import { exportToExcel } from "@/lib/utils/importExport";
import { useSchoolData, useCollection } from "@/lib/hooks/useSchoolData";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { SMS } from "@/lib/utils/sms";
import { toast } from "sonner";
import { useEffect } from "react";
import Link from "next/link";

interface FeeRecord {
  id: string;
  studentId: string;
  name: string;
  class: string;
  termFee: number;
  amountPaid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
  lastPayment: string;
  term?: string;
  academicYear?: string;
}

export default function AdminFeesPage() {
  const { schoolId, schoolName, adminName, adminEmail } = useSchoolData();
  const { data: fees, loading, error: feesError } = useCollection<FeeRecord>(schoolId, "fees");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [recordPayment, setRecordPayment] = useState<FeeRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [sendingReminders, setSendingReminders] = useState(false);
  const [termSettings, setTermSettings] = useState<{ currentTerm: string, academicYear: string } | null>(null);

  // Fetch current term settings
  useEffect(() => {
    if (!schoolId) return;
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "schools", schoolId, "settings", "general"));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.termSettings) {
            setTermSettings(data.termSettings);
          } else if (data.currentTerm) {
            // Fallback for different data structure
            setTermSettings({
              currentTerm: data.currentTerm,
              academicYear: data.academicYear || new Date().getFullYear().toString()
            });
          }
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, [schoolId]);

  // We need students data to get parentContact
  const { data: students } = useCollection<any>(schoolId, "students");

  // Identify students without fee records for the current term
  const missingFeeRecords = useMemo(() => {
    if (!termSettings || !students.length) return [];
    
    return students.filter(student => {
      const hasFee = fees.some(fee => 
        fee.studentId === student.id && 
        fee.term === termSettings.currentTerm && 
        fee.academicYear === termSettings.academicYear
      );
      return !hasFee;
    });
  }, [students, fees, termSettings]);

  // Live calculations
  const totalExpected = fees.reduce((sum, f) => sum + (f.termFee || 0), 0);
  const totalCollected = fees.reduce((sum, f) => sum + (f.amountPaid || 0), 0);
  const totalOutstanding = fees.reduce((sum, f) => sum + (f.balance || 0), 0);
  const fullyPaidCount = fees.filter(f => f.status === "paid").length;
  
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const outstandingRate = totalExpected > 0 ? Math.round((totalOutstanding / totalExpected) * 100) : 0;

  const totalStudents = fees.length;
  const fullyPaidRate = totalStudents > 0 ? Math.round((fullyPaidCount / totalStudents) * 100) : 0;
  const partialRate = totalStudents > 0 ? Math.round((fees.filter(f => f.status === "partial").length / totalStudents) * 100) : 0;
  const unpaidRate = totalStudents > 0 ? Math.round((fees.filter(f => f.status === "unpaid").length / totalStudents) * 100) : 0;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `UGX ${(amount / 1000000).toFixed(1)}M`;
    return `UGX ${amount.toLocaleString()}`;
  };

  const filteredFees = useMemo(() => {
    return fees.filter((fee) => {
      const matchesSearch =
        fee.name?.toLowerCase().includes(search.toLowerCase()) ||
        fee.studentId?.toLowerCase().includes(search.toLowerCase()) ||
        fee.class?.toLowerCase().includes(search.toLowerCase());
      const matchesClass = classFilter ? fee.class === classFilter : true;
      const matchesStatus = statusFilter ? fee.status === statusFilter : true;
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [fees, search, classFilter, statusFilter]);

  const handleRecordPayment = async () => {
    if (!schoolId || !recordPayment) return;
    const newPaid = recordPayment.amountPaid + Number(paymentAmount);
    const newBalance = recordPayment.termFee - newPaid;
    await updateDoc(
      doc(db, "schools", schoolId, "fees", recordPayment.id),
      {
        amountPaid: newPaid,
        balance: newBalance,
        status: newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid",
        lastPayment: new Date().toLocaleDateString("en-UG", { day: "2-digit", month: "short" }),
        paymentMethod,
      }
    );
    setRecordPayment(null);
    setPaymentAmount("");
    setPaymentMethod("");
  };

  const handleSendFeeReminders = async () => {
    setSendingReminders(true);
    const unpaidFees = (fees as FeeRecord[]).filter(
      f => f.status !== "paid"
    );
    for (const fee of unpaidFees) {
      const student = (students as any[]).find(
        s => s.id === fee.studentId
      );
      if (student?.parentContact) {
        await SMS.feeReminder({
          parentName:  student.parentName || "Parent",
          parentPhone: student.parentContact,
          studentName: student.name,
          balance:     fee.balance,
          schoolName:  schoolName || "EliteSchool's",
        });
        // Throttle — 1 SMS per second to respect API limits
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    setSendingReminders(false);
  };

  const handleExportFees = () => {
    const data = filteredFees.map(f => ({
      "Student ID": f.studentId,
      "Name": f.name,
      "Class": f.class,
      "Term Fee": f.termFee,
      "Amount Paid": f.amountPaid,
      "Balance": f.balance,
      "Status": f.status,
      "Last Payment": f.lastPayment || "N/A"
    }));
    exportToExcel(data, "EliteSchoolOS_Fees_Report");
  };

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <AdminSidebar
        activeHref="/admin/fees"
      />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="Fee Management" subtitle="Financial Ledger" />
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-6">
          <CollectionErrorBanner error={feesError} />
          
          {/* Section 0 — Initialization Banner */}
          {missingFeeRecords.length > 0 && (
            <GlassCard padding="p-4" className="border-amber-500/30 bg-amber-500/5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                  </div>
                  <div>
                    <h4 className="font-headline text-lg font-light text-amber-900 leading-tight">
                      {missingFeeRecords.length} students have no fee record for this term.
                    </h4>
                    <p className="font-body text-xs text-amber-800/70">
                      Fees cannot be tracked or paid for these students until they are initialized.
                    </p>
                  </div>
                </div>
                <Link href="/admin/fees/initialize">
                  <EliteButton variant="primary" className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-amber-900/10">
                    Initialize Fee Records
                    <span className="material-symbols-outlined text-[18px] ml-2">arrow_forward</span>
                  </EliteButton>
                </Link>
              </div>
            </GlassCard>
          )}

          {/* Section 1 — Fee summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Expected",
                value: formatCurrency(totalExpected),
                icon: "account_balance",
                sub: "Term 2, 2025",
              },
              {
                label: "Total Collected",
                value: formatCurrency(totalCollected),
                icon: "payments",
                sub: `${collectionRate}% collection rate`,
                highlight: true,
              },
              {
                label: "Outstanding",
                value: formatCurrency(totalOutstanding),
                icon: "pending_actions",
                sub: `${outstandingRate}% remaining`,
                danger: true,
              },
              {
                label: "Fully Paid",
                value: String(fullyPaidCount),
                icon: "check_circle",
                sub: `of ${totalStudents} students`,
              },
            ].map((card, i) => (
              <GlassCard key={i} padding="p-5" showOrb>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center
                      ${
                        card.highlight
                          ? "bg-primary-container text-white"
                          : card.danger
                          ? "bg-error/10 text-error"
                          : "bg-primary-container/10 text-primary-container"
                      }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {card.icon}
                    </span>
                  </div>
                </div>
                <p
                  className={`font-headline text-2xl font-light leading-none mb-1
                    ${card.danger ? "text-error" : "text-primary"}`}
                >
                  {card.value}
                </p>
                <p className="font-label text-[10px] uppercase tracking-[0.1em] text-outline">
                  {card.label}
                </p>
                <p className="font-body text-xs text-on-surface-variant font-light mt-1">
                  {card.sub}
                </p>
              </GlassCard>
            ))}
          </div>

          {/* Section 2 — Collection progress bar */}
          <GlassCard padding="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-headline text-xl font-light italic text-primary">
                  Collection Progress
                </h3>
                <p className="font-label text-[10px] uppercase tracking-[0.1em] text-outline mt-0.5">
                  Term 2, 2025 — Deadline: 30 June
                </p>
              </div>
              <span className="font-headline text-3xl font-light text-primary">
                {collectionRate}%
              </span>
            </div>
            {/* Stacked progress bar */}
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex">
              <div
                className="h-full bg-primary-container transition-all duration-1000"
                style={{ width: `${fullyPaidRate}%` }}
              />
              <div
                className="h-full bg-on-tertiary-container/60 transition-all duration-1000"
                style={{ width: `${partialRate}%` }}
              />
            </div>
            <div className="flex gap-4 mt-3 flex-wrap">
              {[
                { label: "Fully Paid", pct: `${fullyPaidRate}%`, color: "bg-primary-container" },
                { label: "Partial", pct: `${partialRate}%`, color: "bg-on-tertiary-container/60" },
                { label: "Unpaid", pct: `${unpaidRate}%`, color: "bg-surface-container-highest" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                  <span className="font-label text-[10px] text-outline uppercase tracking-[0.08em]">
                    {l.label} — {l.pct}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Section 3 — Search and filter bar */}
          <GlassCard padding="p-4">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                  search
                </span>
                <input
                  placeholder="Search by name, ID, or class..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 bg-surface-container-low rounded-full pl-11 pr-4 font-body text-sm font-light placeholder:text-outline border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                />
              </div>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-11 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
              >
                <option value="">All Classes</option>
                {[
                  "S.1A", "S.1B", "S.2A", "S.2B", "S.3A", "S.3B",
                  "S.4A", "S.4B", "S.5A", "S.5B", "S.6A", "S.6B",
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <EliteButton variant="outlined" size="sm" onClick={handleExportFees}>
                <span className="material-symbols-outlined text-[16px] mr-1.5">
                  download
                </span>
                Export
              </EliteButton>
              <EliteButton variant="outlined" size="sm" onClick={async () => {
                const toastId = toast.loading("Syncing Pesapal IPN...");
                try {
                  const res = await fetch("/api/payments/pesapal-ipn", { method: "POST" });
                  if (res.ok) toast.success("Pesapal IPN Registered!", { id: toastId });
                  else toast.error("Sync Failed", { id: toastId });
                } catch {
                  toast.error("Network Error", { id: toastId });
                }
              }}>
                <span className="material-symbols-outlined text-[16px] mr-1.5">
                  sync
                </span>
                Sync IPN
              </EliteButton>
              <EliteButton variant="outlined" size="sm"
                loading={sendingReminders}
                onClick={handleSendFeeReminders}>
                <span className="material-symbols-outlined
                                 text-[16px] mr-1.5">
                  sms
                </span>
                Send Reminders
              </EliteButton>
            </div>
          </GlassCard>

          {/* Section 4 — Fee records DataTable */}
          <DataTable
            columns={[
              {
                key: "studentId",
                label: "ID",
                width: "90px",
                render: (v) => (
                  <span className="font-label text-[11px] text-outline">
                    {String(v)}
                  </span>
                ),
              },
              {
                key: "name",
                label: "Student",
                render: (v, row) => (
                  <div>
                    <p className="font-body text-sm text-on-surface font-light">
                      {String(v)}
                    </p>
                    <p className="font-label text-[10px] text-outline">
                      {(row as FeeRecord).class}
                    </p>
                  </div>
                ),
              },
              {
                key: "termFee",
                label: "Term Fee",
                width: "120px",
                align: "right",
                render: (v) => (
                  <span className="font-label text-[11px] text-on-surface">
                    UGX {Number(v).toLocaleString()}
                  </span>
                ),
              },
              {
                key: "amountPaid",
                label: "Paid",
                width: "120px",
                align: "right",
                render: (v) => (
                  <span className="font-label text-[11px] text-primary-container font-medium">
                    UGX {Number(v).toLocaleString()}
                  </span>
                ),
              },
              {
                key: "balance",
                label: "Balance",
                width: "120px",
                align: "right",
                render: (v) => (
                  <span
                    className={`font-label text-[11px] font-medium ${
                      Number(v) > 0 ? "text-error" : "text-[#4A6741]"
                    }`}
                  >
                    UGX {Number(v).toLocaleString()}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                width: "110px",
                render: (v) => (
                  <Badge variant={v as "paid" | "partial" | "unpaid"} dot>
                    {String(v).charAt(0).toUpperCase() + String(v).slice(1)}
                  </Badge>
                ),
              },
              {
                key: "lastPayment",
                label: "Last Payment",
                width: "110px",
                render: (v) => (
                  <span className="font-label text-[10px] text-outline">
                    {String(v)}
                  </span>
                ),
              },
              {
                key: "payment",
                label: "Payment",
                width: "110px",
                align: "center",
                render: (_, row) => (
                  <PayFeeButton
                    schoolId={schoolId || ""}
                    feeId={(row as FeeRecord).id}
                    studentId={(row as FeeRecord).studentId}
                    studentName={(row as FeeRecord).name}
                    balance={(row as FeeRecord).balance}
                    payerEmail={adminEmail || ""}
                  />
                ),
              },
              {
                key: "actions",
                label: "",
                width: "50px",
                align: "right",
                render: (_, row) => (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecordPayment(row as FeeRecord);
                    }}
                    className="w-8 h-8 rounded-full hover:bg-primary-container/10 flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary-container">
                      add_circle
                    </span>
                  </button>
                ),
              },
            ]}
            data={filteredFees}
            loading={loading}
            keyExtractor={(f) => f.id}
            emptyMessage="No records found — Add your first entry to get started"
            emptyIcon="payments"
          />
        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/fees" />

      {/* Record Payment Modal */}
      {recordPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm" padding="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-headline text-2xl font-light italic text-primary">
                Record Payment
              </h3>
              <button
                onClick={() => setRecordPayment(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            {/* Student info */}
            <div className="p-3 rounded-xl bg-surface-container-low mb-5 mt-3">
              <p className="font-body text-sm font-light text-on-surface">
                {recordPayment.name}
              </p>
              <div className="flex gap-3 mt-1">
                <span className="font-label text-[10px] text-outline">
                  {recordPayment.class}
                </span>
                <span className="font-label text-[10px] text-error">
                  Balance: UGX {recordPayment.balance.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <EliteInput
                label="Amount Received (UGX)"
                type="number"
                placeholder="e.g. 500000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["MTN MoMo", "Airtel Money", "Cash"].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2.5 rounded-full border font-label text-[10px] uppercase tracking-[0.06em] transition-all ${
                        paymentMethod === method 
                          ? "bg-primary-container/10 border-primary-container text-primary-container" 
                          : "border-outline-variant/50 text-on-surface-variant hover:bg-primary-container/10 hover:border-primary-container/30 hover:text-primary-container"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
              <EliteInput
                label="Reference / Receipt No."
                placeholder="e.g. TXN-12345"
                hint="Optional — for mobile money transactions"
              />
              <div className="flex gap-3 pt-2">
                <EliteButton
                  variant="outlined"
                  fullWidth
                  onClick={() => setRecordPayment(null)}
                >
                  Cancel
                </EliteButton>
                <EliteButton
                  variant="primary"
                  fullWidth
                  onClick={handleRecordPayment}
                >
                  Confirm Payment
                </EliteButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
