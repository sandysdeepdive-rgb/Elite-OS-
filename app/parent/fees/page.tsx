"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import BottomNavBar, { PARENT_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import { useAuthGuard } from '@/lib/hooks/useAuthGuard';
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { useParentData } from "@/lib/hooks/useParentData";
import { useChildCollection } from "@/lib/hooks/useSchoolData";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";
import PayFeeButton from "@/components/PayFeeButton";
import { Payments } from "@/lib/utils/payments";
import { toast } from "sonner";

interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  termFee: number;
  amountPaid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
  lastPayment: string;
}

// ─── Types & Mock Data ────────────────────────────────────────────────────────

type PaymentStatus = "paid" | "partial" | "overdue" | "pending";

type FeeItem = {
  id: string;
  label: string;
  amount: number;
  paid: number;
  dueDate: string;
  status: PaymentStatus;
  term: string;
};

const STATUS_STYLES: Record<PaymentStatus, { bg:string; text:string; label:string }> = {
  paid:    { bg:"rgba(43,77,90,0.08)",   text:"#2B4D5A", label:"Paid"     },
  partial: { bg:"rgba(181,168,152,0.25)", text:"#393125", label:"Partial"  },
  overdue: { bg:"rgba(186,26,26,0.08)",  text:"#ba1a1a", label:"Overdue"  },
  pending: { bg:"rgba(193,199,203,0.3)", text:"#41484b", label:"Pending"  },
};

const TERMS = ["Term 2", "Term 1"];

function formatUGX(n: number) {
  return "UGX " + n.toLocaleString("en-UG");
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function CustomTopAppBar({ initials }: { initials: string }) {
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
          {initials}
        </div>
      </div>
    </header>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParentFeesPage() {
  useAuthGuard('parent');
  const router = useRouter();
  const [activeTerm, setActiveTerm] = useState<string>("Term 2");
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "MTN MoMo" | "Airtel Money" | "Cash"
  >("MTN MoMo");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [payStep, setPayStep] = useState<"form"|"confirm"|"success">("form");
  const [txnRef, setTxnRef] = useState("");
  const [payMethod, setPayMethod] = useState<"mtn"|"airtel"|"bank">("mtn");

  const { parentProfile, studentRecord, loading } = useParentData();
  const { data: fees, error: feesError } = useChildCollection<FeeRecord>(
    parentProfile?.schoolId || null, "fees", studentRecord?.id || null
  );

  const childFee = fees[0];

  const handleInitiatePayment = async () => {
    if (!parentProfile?.schoolId || !childFee || !paymentAmount || !studentRecord) return;
    
    // Check if phone number is valid (Uganda format)
    if (payMethod !== "bank" && !/^(07|2567|7)\d{8}$/.test(phoneNumber.replace(/\s/g, ""))) {
      toast.error("Please enter a valid Uganda phone number");
      return;
    }

    setPaying(true);

    try {
      let res;
      const paymentData = {
        amount: Number(paymentAmount),
        phone: phoneNumber,
        studentId: studentRecord.id,
        studentName: studentRecord.name,
        schoolId: parentProfile.schoolId,
      };

      if (payMethod === "mtn") {
        res = await Payments.initiateMoMo(paymentData);
      } else if (payMethod === "airtel") {
        res = await Payments.initiateAirtel(paymentData);
      } else {
        // Bank transfer - just log intent or show info
        toast.info("Please complete the bank transfer and contact the school office.");
        setPaying(false);
        return;
      }

      if (res.success) {
        setTxnRef(res.txnRef || "");
        setPayStep("success");
        // In a real app, we would start polling here
        toast.success("Payment request sent! Check your phone.");
      } else {
        toast.error(res.error || "Failed to initiate payment");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setPaying(false);
    }
  };

  const totalDue   = childFee?.termFee || 0;
  const totalPaid  = childFee?.amountPaid || 0;
  const balance    = childFee?.balance || 0;
  const paidPct    = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100;
  const isOverdue  = childFee?.status === "unpaid" || childFee?.status === "partial";
  const paymentHistory = fees.filter(f => f.amountPaid > 0).map(f => ({
    id: f.id,
    ref: `TXN-${f.id.substring(0, 8).toUpperCase()}`,
    method: (f as any).paymentMethod || "Unknown",
    amount: f.amountPaid,
    date: f.lastPayment || "Unknown",
    status: "confirmed"
  }));

  const parentInitials = parentProfile?.name ? parentProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "PN";

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <CustomTopAppBar initials={parentInitials} />
        
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full pt-28 space-y-8">
          <CollectionErrorBanner error={feesError} />
          {/* Section 1 — Header */}
          <div>
            <h1 className="text-5xl font-light text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Fees & Payments
            </h1>
            <p className="text-base font-light text-[#5f5e60] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {studentRecord?.name || "Your Child"} · {studentRecord?.class || "—"} · {studentRecord?.id || "—"}
            </p>
          </div>

          {/* Section 2 — Summary card */}
          <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background:"#123643" }}>
            <div className="relative z-10">
              {/* Top row: balance + term selector */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                    Outstanding Balance · {activeTerm}
                  </p>
                  <span className="text-5xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {formatUGX(balance)}
                  </span>
                </div>
                {/* Term selector pills */}
                <div className="flex gap-1 flex-shrink-0">
                  {TERMS.map(t => (
                    <button key={t} onClick={() => setActiveTerm(t)}
                      className="px-3 py-1.5 rounded-full text-xs transition-all"
                      style={{
                        background: activeTerm === t ? "rgba(255,255,255,0.15)" : "transparent",
                        color: activeTerm === t ? "#ffffff" : "rgba(255,255,255,0.4)",
                        fontFamily: "'DM Mono', monospace",
                        border: activeTerm === t ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background:"rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full transition-all" style={{ width:`${paidPct}%`, background:"#9abdcc" }} />
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-white/50" style={{ fontFamily: "'DM Mono', monospace" }}>Paid: {formatUGX(totalPaid)}</span>
                <span className="text-[9px] text-white/50" style={{ fontFamily: "'DM Mono', monospace" }}>{paidPct}% of {formatUGX(totalDue)}</span>
              </div>

              {/* Overdue warning pill (conditional) */}
              {isOverdue && (
                <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full w-fit"
                  style={{ background:"rgba(186,26,26,0.2)", border:"1px solid rgba(186,26,26,0.3)" }}>
                  <span className="material-symbols-outlined text-[16px]" style={{ color:"#ffb4ab" }}>warning</span>
                  <span className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", color:"#ffb4ab" }}>
                    Payment is {childFee?.status === "unpaid" ? "overdue" : "partially paid"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pesapal Pay Button */}
          {childFee && (
            <div className="flex justify-center">
              <PayFeeButton
                schoolId={parentProfile?.schoolId || ""}
                feeId={childFee.id}
                studentId={studentRecord?.id || ""}
                studentName={studentRecord?.name || ""}
                balance={childFee.balance}
                payerEmail={auth.currentUser?.email || parentProfile?.email || ""}
                payerPhone={parentProfile?.phone || ""}
              />
            </div>
          )}

          {/* Section 3 — Fee breakdown table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Fee Breakdown</h2>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(193,199,203,0.15)" }}>
              <div className="divide-y divide-[#c1c7cb]/10">
                {childFee && (
                  <motion.div
                    style={{ animation:`fadeSlideIn 0.3s 0s ease both` }}
                    className="flex items-center justify-between px-5 py-4 gap-4">

                    {/* Left: label + due date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1b1c19]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Term Fee</p>
                      <p className="text-[9px] text-[#72787b] mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>Due end of term</p>
                    </div>

                    {/* Center: amount + paid bar */}
                    <div className="hidden md:block w-32">
                      <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background:"#e4e2dd" }}>
                        <div className="h-full rounded-full"
                          style={{
                            width: childFee.termFee > 0 ? `${Math.round((childFee.amountPaid/childFee.termFee)*100)}%` : "0%",
                            background: "#2B4D5A",
                          }} />
                      </div>
                      <p className="text-[9px] text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {formatUGX(childFee.amountPaid)} / {formatUGX(childFee.termFee)}
                      </p>
                    </div>

                    {/* Right: status badge + pay button if not fully paid */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-medium uppercase tracking-wide"
                        style={{ ...STATUS_STYLES[childFee.status === "unpaid" ? "overdue" : childFee.status], fontFamily:"'DM Mono', monospace" }}>
                        {STATUS_STYLES[childFee.status === "unpaid" ? "overdue" : childFee.status]?.label || "Unpaid"}
                      </span>
                      {childFee.status !== "paid" && (
                        <button
                          onClick={() => {
                            setSelectedFee({
                              id: childFee.id,
                              label: "Term Fee",
                              amount: childFee.termFee,
                              paid: childFee.amountPaid,
                              dueDate: "End of term",
                              status: childFee.status === "unpaid" ? "overdue" : childFee.status,
                              term: activeTerm
                            });
                            setPaymentAmount(String(childFee.balance));
                            setShowPayModal(true);
                            setPayStep("form");
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-90 active:scale-95"
                          style={{ background:"#2B4D5A", color:"#ffffff", fontFamily:"'DM Sans', sans-serif" }}>
                          Pay
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4 — Payment history */}
          <div>
            <h2 className="text-2xl text-[#2B4D5A] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Payment History</h2>
            <div className="space-y-3">
              {paymentHistory.length > 0 ? (
                paymentHistory.map((p, i) => (
                  <div key={p.id}
                    style={{ animation:`fadeSlideIn 0.3s ${i*0.06}s ease both`, background:"rgba(255,255,255,0.55)", border:"1px solid rgba(193,199,203,0.12)" }}
                    className="flex items-center justify-between px-5 py-4 rounded-2xl">

                    {/* Left: method icon + ref */}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background:"rgba(43,77,90,0.08)" }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color:"#2B4D5A" }}>receipt_long</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1b1c19]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{p.method}</p>
                        <p className="text-[9px] text-[#72787b] mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>{p.ref}</p>
                      </div>
                    </div>

                    {/* Right: amount + date + confirmed chip */}
                    <div className="text-right">
                      <p className="text-xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{formatUGX(p.amount)}</p>
                      <p className="text-[9px] text-[#72787b] mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>{p.date}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 rounded-2xl" style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(193,199,203,0.12)" }}>
                  <span className="material-symbols-outlined text-[32px] text-outline/30 mb-2">receipt_long</span>
                  <p className="font-body text-sm text-outline">No payment history yet</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <BottomNavBar items={PARENT_NAV_ITEMS} activeHref="/parent/fees" onNavigate={(href) => router.push(href)} />

      {/* Payment modal */}
      <AnimatePresence>
        {showPayModal && selectedFee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-[#141416]/40 backdrop-blur-sm"
            onClick={() => setShowPayModal(false)}
          >
            <motion.div
              initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:24 }}
              transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background:"#fbf9f4", boxShadow:"0 32px 64px rgba(20,20,22,0.18)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Step: form */}
              {payStep === "form" && selectedFee && (
                <>
                  <div className="p-6" style={{ borderBottom:"1px solid rgba(193,199,203,0.15)" }}>
                    <p className="text-[9px] text-[#72787b] uppercase tracking-widest mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Make Payment</p>
                    <h2 className="text-2xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{selectedFee.label}</h2>
                    <p className="text-sm text-[#4A6741] mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {formatUGX(selectedFee.amount - selectedFee.paid)} remaining
                    </p>
                  </div>
                  <div className="p-6 space-y-5">
                    <div>
                      <p className="text-[9px] text-[#72787b] uppercase tracking-widest mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>
                        Amount to Pay
                      </p>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        placeholder="Amount"
                        className="w-full h-11 rounded-full px-5 text-sm outline-none"
                        style={{
                          background:"#f0eee9", border:"1px solid rgba(193,199,203,0.3)",
                          fontFamily:"'DM Mono', monospace", color:"#1b1c19",
                        }} />
                    </div>
                    {/* Method selector */}
                    <div>
                      <p className="text-[9px] text-[#72787b] uppercase tracking-widest mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>
                        Payment Method
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { id:"mtn",   label:"MTN\nMoMo"    },
                          { id:"airtel", label:"Airtel\nMoney" },
                          { id:"bank",  label:"Bank\nTransfer" },
                        ] as const).map(m => (
                          <button key={m.id} onClick={() => setPayMethod(m.id)}
                            className="py-3 rounded-xl text-xs font-medium text-center transition-all"
                            style={{
                              background: payMethod === m.id ? "#2B4D5A" : "#f0eee9",
                              color: payMethod === m.id ? "#ffffff" : "#41484b",
                              fontFamily:"'DM Mono', monospace",
                              whiteSpace:"pre-line",
                            }}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Phone number input (MTN/Airtel only) */}
                    {payMethod !== "bank" && (
                      <div>
                        <p className="text-[9px] text-[#72787b] uppercase tracking-widest mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {payMethod === "mtn" ? "MTN" : "Airtel"} Number
                        </p>
                        <input
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                          placeholder="07X XXX XXXX"
                          className="w-full h-11 rounded-full px-5 text-sm outline-none"
                          style={{
                            background:"#f0eee9", border:"1px solid rgba(193,199,203,0.3)",
                            fontFamily:"'DM Mono', monospace", color:"#1b1c19",
                          }} />
                      </div>
                    )}
                    {payMethod === "bank" && (
                      <div className="rounded-xl p-4 space-y-2" style={{ background:"#f0eee9" }}>
                        {[
                          ["Bank",    "Stanbic Bank Uganda"],
                          ["Account", "9030012345678"],
                          ["Branch",  "Kampala Main"],
                          ["Ref",     studentRecord?.id || "—"],
                        ].map(([k,v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="text-[9px] text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>{k}</span>
                            <span className="text-[9px] text-[#1b1c19] font-medium" style={{ fontFamily: "'DM Mono', monospace" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                      <button onClick={() => setShowPayModal(false)}
                        className="flex-1 py-3 rounded-full text-sm border transition-colors"
                        style={{ borderColor:"rgba(193,199,203,0.4)", color:"#72787b", fontFamily:"'DM Sans', sans-serif" }}>
                        Cancel
                      </button>
                      <button
                        onClick={() => setPayStep("confirm")}
                        disabled={payMethod !== "bank" && phoneNumber.length < 10}
                        className="flex-1 py-3 rounded-full text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                        style={{ background:"#2B4D5A", fontFamily:"'DM Sans', sans-serif" }}>
                        Continue
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Step: confirm */}
              {payStep === "confirm" && selectedFee && (
                <div className="p-6 space-y-5">
                  <h2 className="text-2xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Confirm Payment</h2>
                  <div className="rounded-xl divide-y divide-[#c1c7cb]/10" style={{ background:"#f0eee9" }}>
                    {[
                      ["Fee Item",  selectedFee.label],
                      ["Amount",    formatUGX(Number(paymentAmount))],
                      ["Method",    payMethod === "mtn" ? "MTN Mobile Money"
                                   : payMethod === "airtel" ? "Airtel Money" : "Bank Transfer"],
                      ...(payMethod !== "bank" ? [["Number", phoneNumber]] : []),
                      ["Student",   studentRecord?.name || "Your Child"],
                    ].map(([k,v]) => (
                      <div key={k} className="flex justify-between px-4 py-3">
                        <span className="text-[9px] text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>{k}</span>
                        <span className="text-sm text-[#1b1c19] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setPayStep("form")}
                      className="flex-1 py-3 rounded-full text-sm border"
                      style={{ borderColor:"rgba(193,199,203,0.4)", color:"#72787b", fontFamily:"'DM Sans', sans-serif" }}>
                      Back
                    </button>
                    <button onClick={handleInitiatePayment}
                      disabled={paying || (payMethod !== "bank" && phoneNumber.length < 10)}
                      className="flex-1 py-3 rounded-full text-sm font-medium text-white hover:opacity-90 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
                      style={{ background:"#2B4D5A", fontFamily:"'DM Sans', sans-serif" }}>
                      {paying && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      Confirm &amp; Pay
                    </button>
                  </div>
                </div>
              )}

              {/* Step: success */}
              {payStep === "success" && (
                <div className="p-8 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background:"rgba(43,77,90,0.1)" }}>
                    <span className="material-symbols-outlined text-[32px]" style={{ color:"#2B4D5A" }}>check_circle</span>
                  </div>
                  <h2 className="text-2xl italic text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Payment Initiated</h2>
                  <p className="text-sm text-[#5f5e60] max-w-[240px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Your payment request has been submitted. You will receive a confirmation prompt on your mobile phone.
                  </p>
                  <p className="text-[9px] text-[#72787b]" style={{ fontFamily: "'DM Mono', monospace" }}>
                    Ref: TXN-{txnRef}
                  </p>
                  <button onClick={() => { setShowPayModal(false); setPayStep("form"); setPhoneNumber(""); }}
                    className="w-full mt-2 py-3 rounded-full text-sm font-medium text-white"
                    style={{ background:"#2B4D5A", fontFamily:"'DM Sans', sans-serif" }}>
                    Done
                  </button>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
