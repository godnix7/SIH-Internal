'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';
import { useLogout } from '../../hooks/useLogout';
import { apiClient } from '../../lib/api';
import { LogOut, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [role, setRole] = useState<string>('');
  const { handleLogout, loggingOut } = useLogout();
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) setRole(savedRole);
  }, []);

  const handleRevokeAllSessions = async () => {
    if (revokingAll) return;
    if (!window.confirm('This will log you out of all devices including this one. Continue?'))
      return;

    setRevokingAll(true);
    setRevokeError(null);
    try {
      await apiClient.delete('/auth/sessions');
      setRevokeSuccess(true);
      // After revoking all sessions, the current session is also invalid — log out
      setTimeout(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setRevokeError('Session already expired. Redirecting to login...');
        setTimeout(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userRole');
          router.push('/login');
        }, 1500);
      } else if (!err.response) {
        setRevokeError('Network error. Please check your connection and try again.');
      } else {
        setRevokeError(
          err.response?.data?.detail || 'Failed to revoke sessions. Please try again.',
        );
      }
    } finally {
      setRevokingAll(false);
    }
  };

  const roleDisplay =
    {
      operator: 'Police / SDRF Operator',
      hospital: 'Hospital Staff',
      tourism_admin: 'Tourism Authority',
      sys_admin: 'System Administrator',
    }[role] || 'Staff Member';

  return (
    <DashboardLayout>
      <header style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>My Profile</h2>
      </header>

      <div className="card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '40px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
            }}
          >
            {role ? role[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>{roleDisplay}</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>Role: {role}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Revoke all sessions — actually hits the server */}
          <button
            onClick={handleRevokeAllSessions}
            disabled={revokingAll}
            className="btn btn-secondary"
            style={{
              color: 'var(--color-error)',
              borderColor: 'var(--color-error)',
              opacity: revokingAll ? 0.7 : 1,
              cursor: revokingAll ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {revokingAll ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Revoking sessions…
              </>
            ) : (
              'Log Out of All Devices'
            )}
          </button>

          {revokeSuccess && (
            <p style={{ color: 'var(--color-success)', fontSize: '14px' }}>
              All sessions have been revoked. Redirecting to login…
            </p>
          )}

          {revokeError && (
            <p style={{ color: 'var(--color-error)', fontSize: '14px' }}>{revokeError}</p>
          )}

          {/* Standard logout from this device */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-outline"
            style={{
              opacity: loggingOut ? 0.7 : 1,
              cursor: loggingOut ? 'not-allowed' : 'pointer',
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
                <LogOut size={16} /> Log Out (This Device)
              </>
            )}
          </button>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`,
        }}
      />
    </DashboardLayout>
  );
}
