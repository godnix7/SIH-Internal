'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy /login route — redirects to the main portal selection page.
 * Each role now has its own login page under /login/responder, /login/hospital, etc.
 */
export default function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-on-surface-variant)',
      }}
    >
      Redirecting to portal selection…
    </div>
  );
}
