"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EliteButton from "@/components/ui/EliteButton";

export default function GoogleSetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"teacher" | "parent">("teacher");
  const [schoolCode, setSchoolCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sessionUid = sessionStorage.getItem("google_pending_uid");
    const sessionEmail = sessionStorage.getItem("google_pending_email");
    const sessionName = sessionStorage.getItem("google_pending_name");

    if (!sessionUid) {
      router.push("/");
      return;
    }

    setTimeout(() => {
      setUid(sessionUid);
      setEmail(sessionEmail || "");
      setName(sessionName || "");
    }, 0);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { collection, query, where, getDocs, doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase/config");

      const schoolCodeUpper = schoolCode.trim().toUpperCase();
      const schoolsSnap = await getDocs(query(collection(db, "schools"), where("schoolCode", "==", schoolCodeUpper)));
      
      if (schoolsSnap.empty) {
        toast.error("Invalid school code");
        setLoading(false);
        return;
      }
      
      const matchedSchoolId = schoolsSnap.docs[0].id;
      
      let linkedStudentId = null;

      if (role === 'parent') {
        const studentIdUpper = studentId.trim().toUpperCase();
        const studentSnap = await getDocs(query(collection(db, "schools", matchedSchoolId, "students"), where("id", "==", studentIdUpper)));
        linkedStudentId = studentSnap.empty ? studentIdUpper : studentSnap.docs[0].id;
      }

      await setDoc(doc(db, "users", uid), {
        uid,
        email: email.toLowerCase().trim(),
        name,
        role,
        schoolId: matchedSchoolId,
        schoolCode: schoolCodeUpper,
        status: "pending",
        linkedId: linkedStudentId,
        phone: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      sessionStorage.removeItem("google_pending_uid");
      sessionStorage.removeItem("google_pending_email");
      sessionStorage.removeItem("google_pending_name");

      toast.success("Registration completed!");
      router.push("/pending-approval");
    } catch (err) {
      toast.error("Network error. Please try again.");
      setLoading(false);
    }
  };

  if (!uid) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface-container-low p-8 rounded-xl shadow-lg border border-outline-variant/20">
        <h1 className="font-headline text-3xl text-primary mb-2">Complete Profile</h1>
        <p className="font-body text-on-surface-variant text-sm mb-6">
          Welcome {name}! Please provide your school information to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-widest text-taupe ml-2">
              I am a
            </label>
            <div className="flex gap-4">
              <label className="flex-1">
                <input
                  type="radio"
                  className="peer sr-only"
                  checked={role === "teacher"}
                  onChange={() => setRole("teacher")}
                />
                <div className="h-14 rounded-full border border-outline-variant/30 flex items-center justify-center font-medium cursor-pointer peer-checked:bg-petrol peer-checked:text-white peer-checked:border-petrol transition-all">
                  Teacher
                </div>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  className="peer sr-only"
                  checked={role === "parent"}
                  onChange={() => setRole("parent")}
                />
                <div className="h-14 rounded-full border border-outline-variant/30 flex items-center justify-center font-medium cursor-pointer peer-checked:bg-petrol peer-checked:text-white peer-checked:border-petrol transition-all">
                  Parent
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-widest text-taupe ml-2">
              Full Name
            </label>
            <input
              type="text"
              required
              className="w-full h-14 bg-surface-container-lowest rounded-full px-6 focus:ring-2 focus:ring-petrol outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-widest text-taupe ml-2">
              School Code
            </label>
            <input
              type="text"
              required
              placeholder="SCH-000"
              className="w-full h-14 bg-surface-container-lowest rounded-full px-6 focus:ring-2 focus:ring-petrol outline-none uppercase font-mono"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
            />
          </div>

          {role === "parent" && (
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-widest text-taupe ml-2">
                Student ID
              </label>
              <input
                type="text"
                required
                placeholder="STU-123"
                className="w-full h-14 bg-surface-container-lowest rounded-full px-6 focus:ring-2 focus:ring-petrol outline-none uppercase font-mono"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
          )}

          <EliteButton type="submit" className="w-full h-14 mt-4" loading={loading}>
            Complete Setup
            <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
          </EliteButton>
        </form>
      </div>
    </div>
  );
}
