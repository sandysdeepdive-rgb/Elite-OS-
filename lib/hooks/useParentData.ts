'use client';
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { handleFirestoreError, OperationType } from "@/lib/firebase/errors";

export function useParentData() {
  const [parentProfile, setParentProfile] = useState<{
    uid: string;
    name: string;
    email: string;
    phone: string;
    schoolId: string;
    schoolName: string;
    linkedId: string;
    studentName: string;
    studentId: string;
  } | null>(null);
  const [studentRecord, setStudentRecord] = useState<{
    id: string;
    name: string;
    class: string;
    attendance: string;
    feesStatus: string;
    parentContact: string;
    enrollmentDate?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) { setLoading(false); return; }

        const userData = userDoc.data();
        const schoolId = userData.schoolId;

        let schoolName = "";
        try {
          const schoolDoc = await getDoc(doc(db, "schools", schoolId));
          if (schoolDoc.exists()) {
            schoolName = schoolDoc.data().name;
          }
        } catch (e) {
          console.warn("Could not fetch school doc:", e);
        }

        // Get child's student record
        if (userData.linkedId) {
          const studentDoc = await getDoc(
            doc(db, "schools", schoolId,
                "students", userData.linkedId)
          );
          if (studentDoc.exists()) {
            setStudentRecord({
              id: studentDoc.id,
              ...studentDoc.data()
            } as typeof studentRecord extends
              null ? never : typeof studentRecord);
          }
        }

        setParentProfile({
          uid: user.uid,
          name: userData.name,
          email: userData.email || user.email || "",
          phone: userData.phone || "",
          schoolId,
          schoolName,
          linkedId: userData.linkedId || "",
          studentName: userData.studentName || "",
          studentId: userData.studentId || "",
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { parentProfile, studentRecord, loading };
}
