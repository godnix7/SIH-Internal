"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, User, Briefcase, ShieldAlert, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    
    try {
      const response = await apiClient.post('/auth/login/internal', {
        email,
        password,
        deviceFingerprint: "web-dashboard-fingerprint",
        platform: "web"
      });
      
      // Parse JWT payload — wrapped in try/catch to handle malformed tokens
      let role: string;
      try {
        const payload = JSON.parse(atob(response.data.accessToken.split('.')[1]));
        role = payload.role;
      } catch {
        setError('Received an invalid authentication token. Please contact support.');
        setLoading(false);
        return;
      }

      const { accessToken, refreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userRole', role);

      if (role === 'hospital') {
        router.push('/hospital');
      } else if (role === 'tourism_admin') {
        router.push('/authority');
      } else if (role === 'sys_admin') {
        router.push('/admin');
      } else if (role === 'tourist') {
        setError('Unauthorized. Tourists must use the mobile app.');
        // Clear tokens since this role isn't allowed on web
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        setLoading(false);
      } else {
        router.push('/responder');
      }

    } catch (err: any) {
      // Distinguish error types for clear user feedback
      if (!err.response) {
        // Network error — no response received
        setError('Unable to reach the server. Please check your internet connection and try again.');
      } else if (err.response.status === 401) {
        const detail = err.response.data?.detail;
        if (detail === 'ACCOUNT_SUSPENDED') {
          setError('Your account has been suspended. Please contact your administrator.');
        } else {
          setError('Invalid email or password. Please check your credentials and try again.');
        }
      } else if (err.response.status === 429) {
        setError('Too many login attempts. Please wait a moment and try again.');
      } else if (err.response.status >= 500) {
        setError('The server is experiencing issues. Please try again later.');
      } else {
        setError(err.response?.data?.detail || 'Login failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background-start)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', zIndex: 2 }}>
        
        <div className="glass-card animate-fade-in" style={{ maxWidth: '420px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ padding: '16px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-glow) 100%)', borderRadius: '20px', boxShadow: '0 8px 32px var(--color-primary-glow)' }}>
              <Shield color="white" size={32} strokeWidth={1.5} />
            </div>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', textAlign: 'center', marginBottom: '8px', letterSpacing: '-0.5px' }}>Yatri Shield Portal</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', textAlign: 'center', marginBottom: '32px', fontSize: '15px' }}>
            Secure Authentication System
          </p>

          {error && (
            <div className="animate-fade-in" style={{ backgroundColor: 'var(--color-error-container)', color: 'var(--color-error)', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', fontWeight: '500', border: '1px solid var(--color-error)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-on-surface-variant)' }}>Work Email</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--color-on-surface-variant)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  className="input-premium" 
                  style={{ paddingLeft: '44px' }}
                  placeholder="admin@yatrishield.gov.in" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-on-surface-variant)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} color="var(--color-on-surface-variant)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" 
                  className="input-premium" 
                  style={{ paddingLeft: '44px' }}
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                marginTop: '12px',
                padding: '14px',
                width: '100%',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Authenticating…
                </>
              ) : (
                'Secure Login'
              )}
            </button>
          </form>

          <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', textAlign: 'center', marginTop: '32px' }}>
            Tourists must use the Yatri Shield Mobile App.
          </p>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'none', position: 'relative', overflow: 'hidden' }} className="desktop-only-banner">
        {/* Animated decorative blobs */}
        <div style={{ position: 'absolute', width: '600px', height: '600px', background: 'var(--color-primary-glow)', borderRadius: '50%', top: '-200px', right: '-200px', filter: 'blur(80px)', opacity: 0.6 }}></div>
        <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'var(--color-success)', borderRadius: '50%', bottom: '-100px', left: '-100px', filter: 'blur(100px)', opacity: 0.2 }}></div>
        
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 10, padding: '4rem', backdropFilter: 'blur(10px)' }}>
          <ShieldAlert size={120} strokeWidth={1} color="var(--color-primary)" style={{ marginBottom: '32px', filter: 'drop-shadow(0 12px 24px var(--color-primary-glow))' }} />
          <h2 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '16px', textAlign: 'center', color: 'var(--color-on-surface)', letterSpacing: '-1px' }}>Unified Command Center</h2>
          <p style={{ fontSize: '18px', textAlign: 'center', color: 'var(--color-on-surface-variant)', maxWidth: '400px', lineHeight: '1.6' }}>
            Next-generation ecosystem management for Police, SDRF, Tourism Authorities, and Hospital staff.
          </p>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 900px) {
          .desktop-only-banner {
            display: flex !important;
          }
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
