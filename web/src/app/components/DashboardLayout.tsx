'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Shield,
  ShieldAlert,
  Building2,
  Map,
  LayoutDashboard,
  User,
  Settings,
  LogOut,
  Loader2,
  History,
} from 'lucide-react';
import { useLogout } from '../../hooks/useLogout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { handleLogout, loggingOut, logoutInProgress } = useLogout();

  useEffect(() => {
    // Restore theme on mount
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Guard: If a logout is in progress, do NOT try to read auth state
    if (logoutInProgress.current) return;

    const token = localStorage.getItem('accessToken');
    const savedRole = localStorage.getItem('userRole');

    if (!token || !savedRole) {
      router.push('/');
      return;
    }

    // Set role for dynamic theming
    document.documentElement.setAttribute('data-role', savedRole);
    setRole(savedRole);
    setLoading(false);
  }, [router, logoutInProgress]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading portal...</p>
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`,
          }}
        />
      </div>
    );
  }

  // Determine role display name
  const roleDisplay =
    {
      operator: 'Police / SDRF',
      hospital: 'Hospital Staff',
      tourism_admin: 'Tourism Authority',
      sys_admin: 'System Administrator',
    }[role || ''] || 'Staff Member';

  return (
    <div className="layout-container">
      <aside className="sidebar glass">
        <div
          style={{
            padding: '32px 24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <ShieldAlert size={28} color="var(--color-primary)" />
          <div>
            <Link
              href="/"
              style={{
                fontSize: '22px',
                fontWeight: '700',
                color: 'var(--color-primary)',
                letterSpacing: '-0.5px',
              }}
            >
              Yatri Shield
            </Link>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-on-surface-variant)',
                marginTop: '2px',
                fontWeight: '500',
              }}
            >
              Web Portal
            </div>
          </div>
        </div>
        <nav
          style={{
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flex: 1,
          }}
        >
          {(role === 'operator' || role === 'sys_admin') && (
            <>
              <Link
                href="/responder"
                className={`btn btn-outline ${pathname === '/responder' ? 'btn-primary' : ''}`}
                style={{ justifyContent: 'flex-start', padding: '14px 16px' }}
              >
                <Shield size={18} /> Police / SDRF
              </Link>
              <Link
                href="/responder/zones"
                className={`btn btn-outline ${pathname.startsWith('/responder/zones') ? 'btn-primary' : ''}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '14px 16px',
                  borderColor: '#38bdf8',
                  color: pathname.startsWith('/responder/zones') ? '#fff' : '#38bdf8',
                }}
              >
                <Map size={18} /> Geofence & Safety
              </Link>
            </>
          )}

          {(role === 'hospital' || role === 'sys_admin') && (
            <Link
              href="/hospital"
              className={`btn btn-outline ${pathname.startsWith('/hospital') ? 'btn-primary' : ''}`}
              style={{ justifyContent: 'flex-start', padding: '14px 16px' }}
            >
              <Building2 size={18} /> Hospital Staff
            </Link>
          )}

          {(role === 'tourism_admin' || role === 'sys_admin') && (
            <Link
              href="/authority"
              className={`btn btn-outline ${pathname.startsWith('/authority') ? 'btn-primary' : ''}`}
              style={{ justifyContent: 'flex-start', padding: '14px 16px' }}
            >
              <Map size={18} /> Tourism Dept
            </Link>
          )}

          {role === 'sys_admin' && (
            <Link
              href="/admin"
              className={`btn btn-outline ${pathname === '/admin' ? 'btn-primary' : ''}`}
              style={{ justifyContent: 'flex-start', padding: '14px 16px' }}
            >
              <LayoutDashboard size={18} /> System Admin
            </Link>
          )}

          <Link
            href="/history"
            className={`btn btn-outline ${pathname.startsWith('/history') ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start', padding: '14px 16px' }}
          >
            <History size={18} /> Incident History
          </Link>
        </nav>
        <div
          style={{
            padding: '24px 16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', padding: '0 8px' }}
          >
            Logged in as <b style={{ color: 'var(--color-on-surface)' }}>{roleDisplay}</b>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              href="/profile"
              className="btn btn-outline"
              style={{ flex: 1, padding: '10px', fontSize: '13px', justifyContent: 'center' }}
            >
              <User size={16} /> Profile
            </Link>
            <Link
              href="/settings"
              className="btn btn-outline"
              style={{ flex: 1, padding: '10px', fontSize: '13px', justifyContent: 'center' }}
            >
              <Settings size={16} /> Settings
            </Link>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn"
            style={{
              padding: '12px',
              fontSize: '14px',
              color: loggingOut ? 'var(--color-on-surface-variant)' : 'var(--color-error)',
              backgroundColor: loggingOut
                ? 'var(--color-surface-variant)'
                : 'var(--color-error-container)',
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              opacity: loggingOut ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loggingOut ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Logging out…
              </>
            ) : (
              <>
                <LogOut size={16} /> Log Out
              </>
            )}
          </button>
        </div>
      </aside>
      <div
        className="main-content"
        style={{ padding: '32px', backgroundColor: 'var(--color-background-start)' }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
