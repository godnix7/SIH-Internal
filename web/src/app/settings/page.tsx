'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { apiClient } from '../../lib/api';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read from localStorage on mount
    const savedLang = localStorage.getItem('language') || 'en';
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setLanguage(savedLang);
    setTheme(savedTheme);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Attempt backend update (for the active user's language setting, which works for tourists and resolves safely for staff)
      await apiClient.patch(`/users/me/language?language=${language}`);

      // 2. Persist settings in local storage
      localStorage.setItem('language', language);
      localStorage.setItem('theme', theme);

      // 3. Apply theme override directly to the HTML document root
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      if (!err.response) {
        setError('Network error. Preferences saved locally but could not sync with server.');
        // Still save locally
        localStorage.setItem('language', language);
        localStorage.setItem('theme', theme);
        if (theme === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(err.response?.data?.detail || 'Failed to save settings. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <header style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Settings</h2>
      </header>

      <div
        className="card"
        style={{
          maxWidth: '600px',
          backgroundColor: 'var(--color-surface)',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '20px' }}>
          Application Preferences
        </h3>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--color-error-container)',
              color: 'var(--color-error)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              Portal Language
            </label>
            <select
              className="input-premium"
              style={{ appearance: 'none', width: '100%' }}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={loading}
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिंदी)</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              Appearance Theme
            </label>
            <select
              className="input-premium"
              style={{ appearance: 'none', width: '100%' }}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled={loading}
            >
              <option value="dark">Dark Mode (Premium Glow)</option>
              <option value="light">Light Mode (Classic Sleek)</option>
            </select>
          </div>

          <hr
            style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '10px 0' }}
          />

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Saving Changes…
              </>
            ) : (
              'Save Changes'
            )}
          </button>

          {success && (
            <p
              style={{
                color: 'var(--color-success)',
                fontSize: '14px',
                marginTop: '8px',
                fontWeight: '500',
              }}
            >
              ✓ Settings saved and applied successfully.
            </p>
          )}
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
