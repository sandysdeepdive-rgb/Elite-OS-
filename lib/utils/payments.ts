/**
 * Mobile Money Payment Utility
 * Handles calls to the backend payment APIs
 */

export const Payments = {
  /**
   * Initiate an MTN MoMo "Request to Pay" (STK Push)
   */
  initiateMoMo: async (data: {
    amount: number;
    phone: string;
    studentId: string;
    studentName: string;
    schoolId: string;
  }): Promise<{ success: boolean; txnRef?: string; error?: string }> => {
    try {
      const res = await fetch("/api/payments/momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: "Network error" };
    }
  },

  /**
   * Initiate an Airtel Money Collection
   */
  initiateAirtel: async (data: {
    amount: number;
    phone: string;
    studentId: string;
    studentName: string;
    schoolId: string;
  }): Promise<{ success: boolean; txnRef?: string; error?: string }> => {
    try {
      const res = await fetch("/api/payments/airtel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: "Network error" };
    }
  },

  /**
   * Check status of a transaction
   */
  checkStatus: async (txnRef: string, method: "momo" | "airtel"): Promise<{ status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" }> => {
    try {
      const res = await fetch(`/api/payments/status?ref=${txnRef}&method=${method}`);
      return await res.json();
    } catch (err) {
      return { status: "PENDING" };
    }
  }
};
