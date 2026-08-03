'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/api';

/**
 * Shared logout hook for the web portal.
 *
 * Ensures the correct logout sequence:
 * 1. Invalidate session server-side (best-effort — failure must not block logout)
 * 2. Clear all local/session storage
 * 3. Redirect to login
 *
 * A `logoutInProgress` ref prevents DashboardLayout's useEffect from
 * triggering a competing redirect during the same render cycle — which was
 * the root cause of the admin logout crash.
 */
export function useLogout() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutInProgress = useRef(false);

  const performLogout = useCallback(async () => {
    if (logoutInProgress.current) return;
    logoutInProgress.current = true;
    setLoggingOut(true);

    // Step 1: Attempt server-side session invalidation (best-effort)
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Server invalidation failed — continue anyway.
      // The user must still be logged out client-side.
    }

    // Step 2: Clear all local storage tokens
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userRole');
    } catch {
      // Storage clear failed — extremely unlikely, but don't crash.
    }

    // Step 3: Redirect to login
    router.push('/login');
  }, [router]);

  const handleLogout = useCallback(() => {
    if (loggingOut || logoutInProgress.current) return;

    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to log out?')) {
      return;
    }

    void performLogout();
  }, [loggingOut, performLogout]);

  return { handleLogout, loggingOut, logoutInProgress };
}
