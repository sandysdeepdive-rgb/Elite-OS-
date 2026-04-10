'use client';
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection,
         query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { handleFirestoreError, OperationType } from "@/lib/firebase/errors";

export function useTeacherData() {
  const [teacherProfile, setTeacherProfile] = useState<{
    uid: string;
    name: string;
    email: string;
    schoolId: string;
    schoolName: string;
    teacherCode: string;
    subject: string;
    classes: string[];
    phone: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }

      try {
        // Get user profile
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) { setLoading(false); return; }

        const userData = userDoc.data();
        const schoolId = userData.schoolId;

        // Get school name
        let schoolName = "";
        try {
          const schoolDoc = await getDoc(doc(db, "schools", schoolId));
          if (schoolDoc.exists()) {
            schoolName = schoolDoc.data().name;
          }
        } catch (e) {
          console.warn("Could not fetch school doc:", e);
        }

        // Get teacher record
        const teacherDoc = await getDoc(
          doc(db, "schools", schoolId, "teachers", user.uid)
        );

        if (teacherDoc.exists()) {
          setTeacherProfile({
            uid: user.uid,
            schoolId,
            schoolName,
            ...teacherDoc.data() as object,
          } as typeof teacherProfile extends null ? never : typeof teacherProfile);
        } else {
          // Fallback to user doc data
          setTeacherProfile({
            uid: user.uid,
            name: userData.name,
            email: userData.email,
            schoolId,
            schoolName,
            teacherCode: "—",
            subject: "—",
            classes: [],
            phone: "—",
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { teacherProfile, loading };
}
