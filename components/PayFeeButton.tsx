
"use client";

import { useState } from "react";
import { toast } from "sonner";
import EliteButton from "./ui/EliteButton";

interface PayFeeButtonProps {
  schoolId: string;
  feeId: string;
  studentId: string;
  studentName: string;
  balance: number;
  payerEmail: string;
  payerPhone?: string;
  onSuccess?: () => void;
}

export default function PayFeeButton({
  schoolId,
  feeId,
  studentId,
  studentName,
  balance,
  payerEmail,
  payerPhone,
  onSuccess,
}: PayFeeButtonProps) {
  const [loading, setLoading] = useState(false);

  if (balance <= 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 w-fit">
        <span className="material-symbols-outlined text-[18px]">check_circle</span>
        <span className="text-[12px] font-medium font-body">Paid</span>
      </div>
    );
  }

  const handlePay = async () => {
    setLoading(true);
    const toastId = toast.loading("Initiating payment...");

    try {
      const res = await fetch("/api/payments/submit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          feeId,
          studentId,
          studentName,
          amount: balance,
          email: payerEmail,
          phone: payerPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate payment");
      }

      toast.success("Payment initiated!", { id: toastId });
      
      if (data.redirect_url) {
        window.open(data.redirect_url, "_blank");
      }
      
      onSuccess?.();
    } catch (error: any) {
      console.error("Payment Error:", error);
      toast.error(error.message || "Payment initiation failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <EliteButton
      onClick={handlePay}
      loading={loading}
      className="bg-[#2B4D5A] hover:bg-[#1f3842] text-white h-9 px-4 rounded-full text-[13px] font-medium"
    >
      Pay Now
    </EliteButton>
  );
}
