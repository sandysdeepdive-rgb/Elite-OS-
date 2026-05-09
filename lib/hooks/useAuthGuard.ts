'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import type { UserRole } from '@/lib/types';

export function useAuthGuard(requiredRole: UserRole): void {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // No user logged in — send to login
      if (!user) {
        router.replace('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        // No Firestore document — account setup incomplete
        if (!userDoc.exists()) {
          await auth.signOut();
          router.replace('/login?error=account_incomplete');
          return;
        }

        const data = userDoc.data();
        const role = data?.role?.toLowerCase().trim();
        const status = data?.status?.toLowerCase().trim();

        // Not approved yet
        if (status !== 'approved') {
          router.replace('/pending-approval');
          return;
        }

        // Wrong role for this portal
        if (role !== requiredRole) {
          router.replace(`/${role}`);
          return;
        }

      } catch {
        // Firestore read failed — sign out for safety
        await auth.signOut();
        router.replace('/login?error=session_error');
      }
    });

    return () => unsubscribe();
  }, [router, requiredRole]);
}
