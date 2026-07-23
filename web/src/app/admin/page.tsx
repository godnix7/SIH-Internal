"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { getSystemHealth, getInternalUsers, deleteInternalUser } from '../../lib/api';
import { Server, Activity, Users, Shield, Cpu, Database, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [health, setHealth] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionForm, setProvisionForm] = useState({ email: '', password: '', role: 'operator', organization: '' });
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([getSystemHealth(), getInternalUsers()])
      .then(([healthData, usersData]) => {
        setHealth(healthData);
        setUsers(usersData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const isProvisionFormDirty = provisionForm.email !== '' || provisionForm.password !== '' || provisionForm.organization !== '';

  const handleDeleteUser = async (id: string, email: string) => {
    if (deletingId) return;

    if (email === 'admin@yatrishield.gov.in') {
      alert('Cannot delete the primary Super Admin account.');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.sub === id) {
          alert('Cannot delete your own admin account.');
          return;
        }
      }
    } catch { /* parse error fallback to backend check */ }

    if (!window.confirm(`Are you sure you want to remove the user account for ${email}?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteInternalUser(id);
      setProvisionSuccess(true); // show generic success message
      fetchDashboardData();
    } catch (err: any) {
      let msg = 'Failed to delete user.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (!err.response) {
        msg = 'Network error. Please check your connection.';
      }
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelProvision = () => {
    if (isProvisionFormDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    setShowProvisionModal(false);
    setProvisionForm({ email: '', password: '', role: 'operator', organization: '' });
    setProvisionError(null);
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (provisionLoading) return;
    setProvisionError(null);
    setProvisionLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/admin/provision`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(provisionForm)
      });
      if (!res.ok) {
        // Parse server error for specific field messages
        let errorMsg = 'Failed to provision user.';
        try {
          const errBody = await res.json();
          if (errBody.detail) {
            errorMsg = typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail);
          }
        } catch { /* response wasn't JSON */ }
        if (res.status === 409) errorMsg = 'A user with this email already exists.';
        if (res.status === 403) errorMsg = 'You do not have permission to provision users.';
        if (res.status === 422) errorMsg = 'Validation error: please check all fields.';
        throw new Error(errorMsg);
      }
      setShowProvisionModal(false);
      setProvisionForm({ email: '', password: '', role: 'operator', organization: '' });
      setProvisionSuccess(true);
      setTimeout(() => setProvisionSuccess(false), 4000);
      fetchDashboardData();
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setProvisionError('Network error. Please check your connection and try again.');
      } else {
        setProvisionError(err.message);
      }
    } finally {
      setProvisionLoading(false);
    }
  };

  if (loading) {
    return <DashboardLayout><div style={{ padding: '2rem' }}>Loading Admin Console...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>System Admin Console</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '15px' }}>Manage internal roles, configurations, and system health.</p>
        </div>
        <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', backgroundColor: 'rgba(52, 211, 153, 0.1)', color: 'var(--color-success)', borderRadius: '100px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-success)', boxShadow: '0 0 10px var(--color-success)' }}></span>
          <span style={{ fontWeight: '600', fontSize: '14px' }}>System Operational</span>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0.05) 100%)', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <Activity color="var(--color-primary)" size={28} />
          </div>
          <div>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', fontWeight: '500' }}>API Latency (p95)</p>
            <p style={{ fontSize: '28px', fontWeight: '700', marginTop: '4px', letterSpacing: '-0.5px' }}>{health?.apiLatencyP95 || "0ms"}</p>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%)', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <Database color="var(--color-warning)" size={28} />
          </div>
          <div>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', fontWeight: '500' }}>DB Pool Used</p>
            <p style={{ fontSize: '28px', fontWeight: '700', marginTop: '4px', letterSpacing: '-0.5px' }}>{health?.databasePool?.used || 0} / {health?.databasePool?.total || 0}</p>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <Server color="var(--color-success)" size={28} />
          </div>
          <div>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', fontWeight: '500' }}>Active Sockets</p>
            <p style={{ fontSize: '28px', fontWeight: '700', marginTop: '4px', letterSpacing: '-0.5px' }}>{health?.activeWebSockets || 0}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600' }}>Internal Users</h3>
            <button className="btn btn-primary" onClick={() => setShowProvisionModal(true)}>
              <Users size={16} /> Provision User
            </button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '16px 12px', color: 'var(--color-on-surface-variant)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                  <th style={{ padding: '16px 12px', color: 'var(--color-on-surface-variant)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
                  <th style={{ padding: '16px 12px', color: 'var(--color-on-surface-variant)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MFA</th>
                  <th style={{ padding: '16px 12px', color: 'var(--color-on-surface-variant)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '16px 12px', color: 'var(--color-on-surface-variant)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontWeight: '600', fontSize: '15px' }}>{u.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{ backgroundColor: 'var(--color-surface-variant)', padding: '6px 12px', borderRadius: '100px', fontSize: '13px', fontWeight: '500', border: '1px solid var(--color-border)' }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      {u.mfa_enabled ? <Shield color="var(--color-success)" size={18} /> : <AlertTriangle color="var(--color-error)" size={18} />}
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{ color: u.status === 'active' ? 'var(--color-success)' : 'var(--color-on-surface-variant)', fontWeight: '500', fontSize: '14px' }}>
                        {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      {u.email === 'admin@yatrishield.gov.in' ? (
                        <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: '500' }}>Super Admin</span>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          disabled={deletingId !== null}
                          className="btn btn-outline"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            color: deletingId === u.id ? 'var(--color-on-surface-variant)' : 'var(--color-error)',
                            borderColor: 'var(--color-border)',
                            cursor: deletingId !== null ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {deletingId === u.id ? 'Removing…' : 'Remove'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>System Configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-on-surface-variant)' }}>Risk Engine Anomaly Tuning</p>
              <input type="text" className="input-premium" defaultValue="STRICT" disabled style={{ opacity: 0.7 }} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-on-surface-variant)' }}>SLA Timeout (Seconds)</p>
              <input type="number" className="input-premium" defaultValue={60} disabled style={{ opacity: 0.7 }} />
            </div>
          </div>
        </div>
      </div>

      {showProvisionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div className="glass-card animate-fade-in" style={{ width: '440px', padding: '32px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', letterSpacing: '-0.5px' }}>Provision Internal User</h3>
            {provisionError && <div style={{ backgroundColor: 'var(--color-error-container)', color: 'var(--color-error)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>{provisionError}</div>}
            
            <form onSubmit={handleProvisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-on-surface-variant)' }}>Email</label>
                <input required type="email" className="input-premium" placeholder="name@yatrishield.gov.in" value={provisionForm.email} onChange={e => setProvisionForm({...provisionForm, email: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-on-surface-variant)' }}>Temporary Password</label>
                <input required type="text" className="input-premium" placeholder="e.g. temp1234" value={provisionForm.password} onChange={e => setProvisionForm({...provisionForm, password: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-on-surface-variant)' }}>Role</label>
                <select className="input-premium" style={{ appearance: 'none' }} value={provisionForm.role} onChange={e => setProvisionForm({...provisionForm, role: e.target.value})}>
                  <option value="operator">Police / SDRF Operator</option>
                  <option value="hospital">Hospital Staff</option>
                  <option value="tourism_admin">Tourism Authority</option>
                  <option value="sys_admin">System Administrator</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-on-surface-variant)' }}>Organization / Precinct</label>
                <input required type="text" className="input-premium" placeholder="e.g. Kedarnath Base Camp" value={provisionForm.organization} onChange={e => setProvisionForm({...provisionForm, organization: e.target.value})} />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={handleCancelProvision} disabled={provisionLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} disabled={provisionLoading}>
                   {provisionLoading ? (<><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Provisioning…</>) : 'Provision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    {provisionSuccess && (
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, padding: '14px 24px', borderRadius: '12px', backgroundColor: 'rgba(76, 175, 80, 0.15)', color: 'var(--color-success)', fontWeight: '600', fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckCircle size={16} /> User provisioned successfully.
      </div>
    )}
    </div>
    </DashboardLayout>
  );
}
