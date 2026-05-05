'use client';
import { useState, useEffect } from "react";
import { collection, onSnapshot, query,
         orderBy, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";
import { handleFirestoreError, OperationType } from "@/lib/firebase/errors";

export function useSchoolData() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("EliteSchool's");
  const [adminName, setAdminName] = useState("Administrator");
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { 
        setLoading(false); 
        return; 
      }
      setAdminEmail(user.email);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSchoolId(data.schoolId);
          setAdminName(data.name);
          
          // Normalized role and status check
          const role = (data.role || "").toLowerCase().trim();
          const status = (data.status || "").toLowerCase().trim();

          if (role !== "admin") {
            setAuthError("access_denied");
          }

          if (status !== "approved") {
            setAuthError("access_denied");
          }

          try {
            const schoolDoc = await getDoc(
              doc(db, "schools", data.schoolId)
            );
            if (schoolDoc.exists()) {
              setSchoolName(schoolDoc.data().name);
            }
          } catch (e) {
            console.warn("Could not fetch school doc:", e);
          }
        } else {
          setAuthError("account_setup_incomplete");
        }
      } catch (error: any) {
        if (error.message?.includes("permissions")) {
          setAuthError("permission_denied");
        }
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { schoolId, schoolName, adminName, adminEmail, loading, authError };
}

export function useCollection<T>(
  schoolId: string | null,
  collectionName: string
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    let q;
    try {
      q = query(
        collection(db, "schools", schoolId, collectionName),
        orderBy("createdAt", "desc")
      );
    } catch {
      // If query creation fails, try without orderBy
      q = query(
        collection(db, "schools", schoolId, collectionName)
      );
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map(d => ({
          id: d.id, ...d.data()
        })) as T[]);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // console.warn(
        //   `[${collectionName}] snapshot error:`, err.message
        // );

        if (err.message.includes("index")) {
          setError("index_required");
        } else if (err.message.includes("permissions") || err.message.includes("insufficient")) {
          setError("permission_denied");
        } else {
          setError("unknown");
        }

        // Always set empty data — never crash
        setData([]);
        setLoading(false);

        // Try without orderBy as fallback
        const fallbackQ = query(
          collection(db, "schools", schoolId, collectionName)
        );
        const fallbackUnsub = onSnapshot(
          fallbackQ,
          (snap) => {
            setData(snap.docs.map(d => ({
              id: d.id, ...d.data()
            })) as T[]);
            setLoading(false);
            setError(null);
          },
          () => {
            // Fallback also failed — stay empty
            setData([]);
            setLoading(false);
          }
        );
        return fallbackUnsub;
      }
    );

    return () => unsub();
  }, [schoolId, collectionName]);

  return { data, loading, error };
}

export function useTeacherStudents<T>(
  schoolId: string | null,
  classes: string[] | undefined
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId || !classes || classes.length === 0) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    let q;
    try {
      q = query(
        collection(db, "schools", schoolId, "students"),
        where("class", "in", classes),
        orderBy("createdAt", "desc")
      );
    } catch {
      q = query(
        collection(db, "schools", schoolId, "students"),
        where("class", "in", classes)
      );
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map(d => ({
          id: d.id, ...d.data()
        })) as T[]);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn(`[students] snapshot error:`, err.message);
        if (err.message.includes("index")) setError("index_required");
        else if (err.message.includes("permissions") || err.message.includes("insufficient")) setError("permission_denied");
        else setError("unknown");

        setData([]);
        setLoading(false);

        const fallbackQ = query(
          collection(db, "schools", schoolId, "students"),
          where("class", "in", classes)
        );
        const fallbackUnsub = onSnapshot(
          fallbackQ,
          (snap) => {
            setData(snap.docs.map(d => ({ id: d.id, ...d.data() })) as T[]);
            setLoading(false);
            setError(null);
          },
          () => {
            setData([]);
            setLoading(false);
          }
        );
        return fallbackUnsub;
      }
    );
    return () => unsub();
  }, [schoolId, classes]);

  return { data, loading, error };
}
export function useTeacherReports<T>(
  schoolId: string | null,
  teacherId: string | null
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId || !teacherId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    let q;
    try {
      q = query(
        collection(db, "schools", schoolId, "reports"),
        where("teacherId", "==", teacherId),
        orderBy("createdAt", "desc")
      );
    } catch {
      q = query(
        collection(db, "schools", schoolId, "reports"),
        where("teacherId", "==", teacherId)
      );
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map(d => ({
          id: d.id, ...d.data()
        })) as T[]);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn(`[reports] snapshot error:`, err.message);
        if (err.message.includes("index")) setError("index_required");
        else if (err.message.includes("permissions") || err.message.includes("insufficient")) setError("permission_denied");
        else setError("unknown");

        setData([]);
        setLoading(false);

        const fallbackQ = query(
          collection(db, "schools", schoolId, "reports"),
          where("teacherId", "==", teacherId)
        );
        const fallbackUnsub = onSnapshot(
          fallbackQ,
          (snap) => {
            setData(snap.docs.map(d => ({ id: d.id, ...d.data() })) as T[]);
            setLoading(false);
            setError(null);
          },
          () => {
            setData([]);
            setLoading(false);
          }
        );
        return fallbackUnsub;
      }
    );
    return () => unsub();
  }, [schoolId, teacherId]);

  return { data, loading, error };
}
export function useChatCollection<T = any>(
  schoolId: string | null,
  userId: string | null
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId || !userId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const q = query(
      collection(db, "schools", schoolId, "chats"),
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map(d => ({
          id: d.id, ...d.data()
        })) as T[]);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn(`[chats] snapshot error:`, err.message);
        if (err.message.includes("index")) {
          setError("index_required");
        } else if (err.message.includes("permissions") || err.message.includes("insufficient")) {
          setError("permission_denied");
        } else {
          setError("unknown");
        }

        // Try without orderBy if permission/index issue
        const fallbackQ = query(
          collection(db, "schools", schoolId, "chats"),
          where("participants", "array-contains", userId)
        );
        onSnapshot(fallbackQ, (s) => {
           setData(s.docs.map(d => ({ id: d.id, ...d.data() })) as T[]);
           setLoading(false);
        }, () => {
           setData([]);
           setLoading(false);
        });
      }
    );
    return () => unsub();
  }, [schoolId, userId]);

  return { data, loading, error };
}

export function useChildCollection<T>(
  schoolId: string | null,
  collectionName: string,
  studentId: string | null
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId || !studentId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    let q;
    try {
      q = query(
        collection(db, "schools", schoolId, collectionName),
        where("studentId", "==", studentId),
        orderBy("createdAt", "desc")
      );
    } catch {
      q = query(
        collection(db, "schools", schoolId, collectionName),
        where("studentId", "==", studentId)
      );
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map(d => ({
          id: d.id, ...d.data()
        })) as T[]);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn(`[${collectionName}] snapshot error:`, err.message);
        if (err.message.includes("index")) setError("index_required");
        else if (err.message.includes("permissions") || err.message.includes("insufficient")) setError("permission_denied");
        else setError("unknown");

        setData([]);
        setLoading(false);

        const fallbackQ = query(
          collection(db, "schools", schoolId, collectionName),
          where("studentId", "==", studentId)
        );
        const fallbackUnsub = onSnapshot(
          fallbackQ,
          (snap) => {
            setData(snap.docs.map(d => ({ id: d.id, ...d.data() })) as T[]);
            setLoading(false);
            setError(null);
          },
          () => {
            setData([]);
            setLoading(false);
          }
        );
        return fallbackUnsub;
      }
    );
    return () => unsub();
  }, [schoolId, collectionName, studentId]);

  return { data, loading, error };
}
