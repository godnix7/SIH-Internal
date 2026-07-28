'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { deleteInternalUser, getInternalUsers, getSystemHealth, updateInternalUser, resetUserPassword } from '../../lib/api';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  Gauge,
  KeyRound,
  Loader2,
  Network,
  Pencil,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import styles from './admin.module.css';

type Notice = { message: string; type: 'success' } | null;

const roleLabel = (role: string) =>
  ({
    operator: 'Operator',
    dispatcher: 'Dispatcher',
    supervisor: 'Supervisor',
    hospital: 'Hospital staff',
    tourism_admin: 'Tourism authority',
    sys_admin: 'System admin',
    auditor: 'Auditor',
  })[role] ?? role.replace(/_/g, ' ');

const initials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'YS';

export default function AdminDashboard() {
  const [health, setHealth] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Provision modal
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    email: '',
    password: '',
    role: 'operator',
    organization: '',
    name: '',
    phone: '',
  });
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionLoading, setProvisionLoading] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', organization: '', role: '', status: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Reset password modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState<any>(null);
  const [resetPassword, setResetPasswordValue] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const [notice, setNotice] = useState<Notice>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [healthData, usersData] = await Promise.all([getSystemHealth(), getInternalUsers()]);
      setHealth(healthData);
      setUsers(usersData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error(error);
      setLoadError('Unable to refresh the command center. Check the API connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const isProvisionFormDirty =
    provisionForm.email !== '' ||
    provisionForm.password !== '' ||
    provisionForm.organization !== '' ||
    provisionForm.name !== '' ||
    provisionForm.phone !== '';
  const isHealthy = Boolean(health && !loadError);
  const dbUsed = health?.databasePool?.used ?? 0;
  const dbTotal = health?.databasePool?.total ?? 0;

  // Filter users by search
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (user.name || '').toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q) ||
      (user.organization || '').toLowerCase().includes(q)
    );
  });

  const handleDeleteUser = async (id: string, email: string) => {
    if (deletingId) return;

    if (email === 'admin@yatrishield.gov.in' || email === 'admin@yatrishield.com') {
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
    } catch {
      // Let the server enforce the final authorization decision.
    }

    if (
      !window.confirm(`Remove access for ${email}? This action cannot be undone from the portal.`)
    )
      return;

    setDeletingId(id);
    try {
      await deleteInternalUser(id);
      showNotice('Internal user removed successfully.');
      await fetchDashboardData();
    } catch (error: any) {
      const message =
        error.response?.data?.detail ??
        (error.response
          ? 'Failed to delete user.'
          : 'Network error. Please check your connection.');
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  const showNotice = (message: string) => {
    setNotice({ message, type: 'success' });
    window.setTimeout(() => setNotice(null), 4000);
  };

  // ---- Provision Modal ----
  const handleCancelProvision = () => {
    if (isProvisionFormDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    setShowProvisionModal(false);
    setProvisionForm({ email: '', password: '', role: 'operator', organization: '', name: '', phone: '' });
    setProvisionError(null);
  };

  const handleProvisionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (provisionLoading) return;

    setProvisionError(null);
    setProvisionLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/system/admin/provision`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify(provisionForm),
        },
      );

      if (!response.ok) {
        let message = 'Failed to provision user.';
        try {
          const body = await response.json();
          if (body.detail)
            message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
        } catch {
          // A non-JSON error still receives the safe default message.
        }
        if (response.status === 409) message = 'A user with this email already exists.';
        if (response.status === 403) message = 'You do not have permission to provision users.';
        if (response.status === 422) message = 'Validation error: please check all fields.';
        throw new Error(message);
      }

      setShowProvisionModal(false);
      setProvisionForm({ email: '', password: '', role: 'operator', organization: '', name: '', phone: '' });
      showNotice('Internal user provisioned successfully.');
      await fetchDashboardData();
    } catch (error: any) {
      setProvisionError(
        error.message === 'Failed to fetch'
          ? 'Network error. Please check your connection and try again.'
          : error.message,
      );
    } finally {
      setProvisionLoading(false);
    }
  };

  // ---- Edit Modal ----
  const openEditModal = (user: any) => {
    setEditUser(user);
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      organization: user.organization || '',
      role: user.role,
      status: user.status,
    });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (editLoading || !editUser) return;

    setEditError(null);
    setEditLoading(true);
    try {
      await updateInternalUser(editUser.id, editForm);
      setShowEditModal(false);
      showNotice('User updated successfully.');
      await fetchDashboardData();
    } catch (error: any) {
      setEditError(
        error.response?.data?.detail ??
          (error.response ? 'Failed to update user.' : 'Network error. Please check your connection.'),
      );
    } finally {
      setEditLoading(false);
    }
  };

  // ---- Suspend/Reactivate ----
  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'suspended' ? 'suspend' : 'reactivate';

    if (!window.confirm(`Are you sure you want to ${action} ${user.email}?`)) return;

    try {
      await updateInternalUser(user.id, { status: newStatus });
      showNotice(`User ${action}d successfully.`);
      await fetchDashboardData();
    } catch (error: any) {
      alert(
        error.response?.data?.detail ??
          `Failed to ${action} user. Please try again.`,
      );
    }
  };

  // ---- Reset Password Modal ----
  const openResetModal = (user: any) => {
    setResetUser(user);
    setResetPasswordValue('');
    setResetError(null);
    setShowResetModal(true);
  };

  const handleResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (resetLoading || !resetUser) return;

    if (resetPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }

    setResetError(null);
    setResetLoading(true);
    try {
      await resetUserPassword(resetUser.id, resetPassword);
      setShowResetModal(false);
      showNotice(`Password reset for ${resetUser.email}.`);
    } catch (error: any) {
      setResetError(
        error.response?.data?.detail ??
          (error.response ? 'Failed to reset password.' : 'Network error.'),
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <main className={styles.page}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              <Gauge size={14} /> Platform operations
            </p>
            <h1 className={styles.title}>System Admin Console</h1>
            <p className={styles.subtitle}>
              Monitor platform health, manage internal access, and review the guardrails protecting
              emergency operations.
            </p>
          </div>
          <div className={styles.heroActions}>
            <div
              className={styles.serviceBadge}
              style={
                {
                  '--badge-color': isHealthy ? 'var(--color-success)' : 'var(--color-warning)',
                } as CSSProperties
              }
            >
              <span className={styles.serviceDot} />
              {isHealthy ? 'Services operational' : 'Status needs review'}
            </div>
            <button
              className={`btn btn-outline ${styles.refreshButton}`}
              onClick={fetchDashboardData}
              disabled={loading}
              aria-label="Refresh system data"
            >
              <RefreshCw
                size={16}
                style={loading ? { animation: 'spin 1s linear infinite' } : undefined}
              />
              {loading ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </header>

        {loadError && (
          <div className={styles.errorState} role="alert">
            <CircleAlert size={18} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
            {loadError}
          </div>
        )}

        <section className={styles.metricGrid} aria-label="System health summary">
          <article
            className={`glass-card ${styles.metricCard}`}
            style={
              {
                '--metric-color': '#0EA5E9',
                '--metric-tint': 'rgba(14, 165, 233, 0.12)',
                '--metric-surface': 'rgba(14, 165, 233, 0.11)',
                '--metric-border': 'rgba(14, 165, 233, 0.22)',
              } as CSSProperties
            }
          >
            <div className={styles.metricTop}>
              <span className={styles.metricIcon}>
                <Activity size={21} />
              </span>
              <span className={styles.metricLabel}>API latency, p95</span>
            </div>
            <div className={styles.metricFooter}>
              <span className={styles.metricValue}>{health?.apiLatencyP95 ?? '—'}</span>
              <span className={styles.metricDelta}>
                <Clock3 size={13} /> Live sample
              </span>
            </div>
          </article>
          <article
            className={`glass-card ${styles.metricCard}`}
            style={
              {
                '--metric-color': '#D97706',
                '--metric-tint': 'rgba(217, 119, 6, 0.12)',
                '--metric-surface': 'rgba(217, 119, 6, 0.11)',
                '--metric-border': 'rgba(217, 119, 6, 0.22)',
              } as CSSProperties
            }
          >
            <div className={styles.metricTop}>
              <span className={styles.metricIcon}>
                <Database size={21} />
              </span>
              <span className={styles.metricLabel}>Database pool</span>
            </div>
            <div className={styles.metricFooter}>
              <span className={styles.metricValue}>
                {dbUsed}{' '}
                <small style={{ fontSize: '16px', color: 'var(--color-on-surface-variant)' }}>
                  / {dbTotal}
                </small>
              </span>
              <span className={styles.metricDelta}>Connections used</span>
            </div>
          </article>
          <article
            className={`glass-card ${styles.metricCard}`}
            style={
              {
                '--metric-color': '#059669',
                '--metric-tint': 'rgba(5, 150, 105, 0.11)',
                '--metric-surface': 'rgba(5, 150, 105, 0.11)',
                '--metric-border': 'rgba(5, 150, 105, 0.22)',
              } as CSSProperties
            }
          >
            <div className={styles.metricTop}>
              <span className={styles.metricIcon}>
                <Network size={21} />
              </span>
              <span className={styles.metricLabel}>Live connections</span>
            </div>
            <div className={styles.metricFooter}>
              <span className={styles.metricValue}>{health?.activeWebSockets ?? 0}</span>
              <span className={styles.metricDelta}>
                <Server size={13} /> Active sockets
              </span>
            </div>
          </article>
        </section>

        <section className={styles.workspace}>
          <article className={`glass-card ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <UsersRound size={20} color="var(--color-primary)" /> Internal access
                </h2>
                <p className={styles.sectionDescription}>
                  {users.length} staff account{users.length === 1 ? '' : 's'} in the command network
                  {lastUpdated
                    ? ` · updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)' }} />
                  <input
                    type="text"
                    className="input-premium"
                    placeholder="Search users…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '36px', minWidth: '200px', height: '38px', fontSize: '13px' }}
                    id="user-search"
                  />
                </div>
                <button className="btn btn-primary" onClick={() => setShowProvisionModal(true)}>
                  <UserPlus size={16} /> Provision user
                </button>
              </div>
            </div>

            {loading && users.length === 0 ? (
              <div className={styles.emptyState}>
                <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: 12 }}>Loading internal access records…</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className={styles.emptyState}>
                <UsersRound size={28} />
                <p style={{ marginTop: 12 }}>
                  {searchQuery.trim()
                    ? `No users matching "${searchQuery}". Try a different search.`
                    : 'No internal users are available yet. Provision the first staff account to grant access.'}
                </p>
              </div>
            ) : (
              <div className={styles.userTableWrap}>
                <table className={styles.userTable}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Organization</th>
                      <th>Account</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const active = user.status === 'active';
                      const protectedAccount =
                        user.email === 'admin@yatrishield.gov.in' ||
                        user.email === 'admin@yatrishield.com';
                      return (
                        <tr key={user.id}>
                          <td>
                            <div className={styles.identityCell}>
                              <span className={styles.avatar}>
                                {initials(user.name || user.email)}
                              </span>
                              <div>
                                <p className={styles.personName}>{user.name || 'Unnamed user'}</p>
                                <p className={styles.personEmail}>{user.email}</p>
                                {user.phone && (
                                  <p className={styles.personEmail} style={{ fontSize: '11px' }}>{user.phone}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={styles.rolePill}>{roleLabel(user.role)}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '13px', color: user.organization ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>
                              {user.organization || '—'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={styles.statusPill}
                              style={
                                {
                                  '--status-color': active
                                    ? 'var(--color-success)'
                                    : 'var(--color-on-surface-variant)',
                                } as CSSProperties
                              }
                            >
                              <span className={styles.statusDot} />
                              {active ? 'Active' : roleLabel(user.status)}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {/* Edit */}
                              <button
                                className="btn btn-outline"
                                onClick={() => openEditModal(user)}
                                style={{ minHeight: 32, padding: '5px 8px', fontSize: 12 }}
                                aria-label={`Edit ${user.email}`}
                                title="Edit user"
                              >
                                <Pencil size={13} /> Edit
                              </button>

                              {/* Suspend / Reactivate */}
                              {!protectedAccount && (
                                <button
                                  className="btn btn-outline"
                                  onClick={() => handleToggleStatus(user)}
                                  style={{
                                    minHeight: 32,
                                    padding: '5px 8px',
                                    fontSize: 12,
                                    color: active ? 'var(--color-warning)' : 'var(--color-success)',
                                  }}
                                  aria-label={active ? `Suspend ${user.email}` : `Reactivate ${user.email}`}
                                  title={active ? 'Suspend user' : 'Reactivate user'}
                                >
                                  {active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                                  {active ? 'Suspend' : 'Activate'}
                                </button>
                              )}

                              {/* Reset Password */}
                              <button
                                className="btn btn-outline"
                                onClick={() => openResetModal(user)}
                                style={{ minHeight: 32, padding: '5px 8px', fontSize: 12 }}
                                aria-label={`Reset password for ${user.email}`}
                                title="Reset password"
                              >
                                <KeyRound size={13} /> Reset
                              </button>

                              {/* Delete */}
                              {protectedAccount ? (
                                <span className={styles.readOnlyPill}>Protected</span>
                              ) : (
                                <button
                                  className="btn btn-outline"
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  disabled={deletingId !== null}
                                  style={{
                                    minHeight: 32,
                                    padding: '5px 8px',
                                    color: 'var(--color-error)',
                                    fontSize: 12,
                                  }}
                                  aria-label={`Remove ${user.email}`}
                                  title="Remove user"
                                >
                                  {deletingId === user.id ? (
                                    <Loader2
                                      size={13}
                                      style={{ animation: 'spin 1s linear infinite' }}
                                    />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                  {deletingId === user.id ? 'Removing' : 'Remove'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <aside className={`glass-card ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <ShieldCheck size={20} color="var(--color-primary)" /> Operating guardrails
                </h2>
                <p className={styles.sectionDescription}>Current production safety defaults</p>
              </div>
            </div>
            <div className={styles.configBody}>
              <div className={styles.configRow}>
                <div>
                  <p className={styles.configLabel}>Risk response profile</p>
                  <p className={styles.configHint}>
                    Sensitivity used when the risk engine assesses anomalous activity.
                  </p>
                </div>
                <span className={styles.readOnlyPill}>Strict</span>
              </div>
              <div className={styles.configRow}>
                <div>
                  <p className={styles.configLabel}>Incident acknowledgement SLA</p>
                  <p className={styles.configHint}>
                    Target response window shown to command-center operators.
                  </p>
                </div>
                <span className={styles.readOnlyPill}>60 seconds</span>
              </div>
              <div className={styles.configRow}>
                <div>
                  <p className={styles.configLabel}>Evidence integrity</p>
                  <p className={styles.configHint}>
                    Hash-chain verification remains enabled for incident records.
                  </p>
                </div>
                <span className={styles.readOnlyPill}>Enabled</span>
              </div>
            </div>
            <div className={styles.securityNotice}>
              <AlertTriangle size={17} color="var(--color-warning)" />
              <span>
                Configuration values are intentionally read-only here. Changes require the approved
                deployment workflow and audit review.
              </span>
            </div>
          </aside>
        </section>

        {/* ===== Provision Modal ===== */}
        {showProvisionModal && (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onMouseDown={handleCancelProvision}
          >
            <div
              className={`glass-card ${styles.modal}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="provision-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2 id="provision-title" className={styles.modalTitle}>
                Provision internal user
              </h2>
              <p className={styles.modalSubtitle}>
                Create a staff account with the minimum role and organization scope required for
                their duties.
              </p>
              {provisionError && (
                <div className={styles.errorState} role="alert">
                  {provisionError}
                </div>
              )}
              <form className={styles.form} onSubmit={handleProvisionSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.fieldLabel} htmlFor="provision-email">
                      Work email
                    </label>
                    <input
                      id="provision-email"
                      required
                      type="email"
                      className="input-premium"
                      placeholder="name@yatrishield.gov.in"
                      value={provisionForm.email}
                      onChange={(event) =>
                        setProvisionForm({ ...provisionForm, email: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel} htmlFor="provision-name">
                      Full name
                    </label>
                    <input
                      id="provision-name"
                      type="text"
                      className="input-premium"
                      placeholder="e.g. Rajesh Kumar"
                      value={provisionForm.name}
                      onChange={(event) =>
                        setProvisionForm({ ...provisionForm, name: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel} htmlFor="provision-phone">
                      Phone number
                    </label>
                    <input
                      id="provision-phone"
                      type="tel"
                      className="input-premium"
                      placeholder="+91 98765 43210"
                      value={provisionForm.phone}
                      onChange={(event) =>
                        setProvisionForm({ ...provisionForm, phone: event.target.value })
                      }
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.fieldLabel} htmlFor="provision-password">
                      Temporary password
                    </label>
                    <input
                      id="provision-password"
                      required
                      type="password"
                      className="input-premium"
                      placeholder="Create a one-time credential"
                      value={provisionForm.password}
                      onChange={(event) =>
                        setProvisionForm({ ...provisionForm, password: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel} htmlFor="provision-role">
                      Role
                    </label>
                    <select
                      id="provision-role"
                      className="input-premium"
                      value={provisionForm.role}
                      onChange={(event) =>
                        setProvisionForm({ ...provisionForm, role: event.target.value })
                      }
                    >
                      <option value="operator">Police / SDRF operator</option>
                      <option value="dispatcher">Dispatcher</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="hospital">Hospital staff</option>
                      <option value="tourism_admin">Tourism authority</option>
                      <option value="sys_admin">System administrator</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </div>
                  <div>
                    <label className={styles.fieldLabel} htmlFor="provision-organization">
                      Organization or precinct
                    </label>
                    <input
                      id="provision-organization"
                      type="text"
                      className="input-premium"
                      placeholder="e.g. Kedarnath Base Camp"
                      value={provisionForm.organization}
                      onChange={(event) =>
                        setProvisionForm({ ...provisionForm, organization: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className={styles.formActions}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCancelProvision}
                    disabled={provisionLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={provisionLoading}>
                    {provisionLoading ? (
                      <>
                        <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                        Provisioning
                      </>
                    ) : (
                      <>
                        <UserPlus size={15} />
                        Provision user
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== Edit Modal ===== */}
        {showEditModal && editUser && (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onMouseDown={() => setShowEditModal(false)}
          >
            <div
              className={`glass-card ${styles.modal}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2 id="edit-title" className={styles.modalTitle}>
                Edit user
              </h2>
              <p className={styles.modalSubtitle}>
                Update {editUser.email}'s profile, role, and access status.
              </p>
              {editError && (
                <div className={styles.errorState} role="alert">
                  {editError}
                </div>
              )}
              <form className={styles.form} onSubmit={handleEditSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className={styles.fieldLabel} htmlFor="edit-name">Name</label>
                    <input
                      id="edit-name"
                      type="text"
                      className="input-premium"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel} htmlFor="edit-phone">Phone</label>
                    <input
                      id="edit-phone"
                      type="tel"
                      className="input-premium"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel} htmlFor="edit-role">Role</label>
                    <select
                      id="edit-role"
                      className="input-premium"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    >
                      <option value="operator">Police / SDRF operator</option>
                      <option value="dispatcher">Dispatcher</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="hospital">Hospital staff</option>
                      <option value="tourism_admin">Tourism authority</option>
                      <option value="sys_admin">System administrator</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </div>
                  <div>
                    <label className={styles.fieldLabel} htmlFor="edit-status">Status</label>
                    <select
                      id="edit-status"
                      className="input-premium"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.fieldLabel} htmlFor="edit-organization">Organization</label>
                    <input
                      id="edit-organization"
                      type="text"
                      className="input-premium"
                      value={editForm.organization}
                      onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                    />
                  </div>
                </div>
                <div className={styles.formActions}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowEditModal(false)}
                    disabled={editLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={editLoading}>
                    {editLoading ? (
                      <>
                        <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                        Saving
                      </>
                    ) : (
                      <>
                        <Pencil size={15} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== Reset Password Modal ===== */}
        {showResetModal && resetUser && (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onMouseDown={() => setShowResetModal(false)}
          >
            <div
              className={`glass-card ${styles.modal}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2 id="reset-title" className={styles.modalTitle}>
                Reset password
              </h2>
              <p className={styles.modalSubtitle}>
                Set a new temporary password for <strong>{resetUser.email}</strong>. They will need to use this password to log in.
              </p>
              {resetError && (
                <div className={styles.errorState} role="alert">
                  {resetError}
                </div>
              )}
              <form className={styles.form} onSubmit={handleResetSubmit}>
                <div>
                  <label className={styles.fieldLabel} htmlFor="reset-new-password">
                    New password
                  </label>
                  <input
                    id="reset-new-password"
                    required
                    type="password"
                    className="input-premium"
                    placeholder="Minimum 8 characters"
                    value={resetPassword}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    minLength={8}
                  />
                </div>
                <div className={styles.formActions}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowResetModal(false)}
                    disabled={resetLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                        Resetting
                      </>
                    ) : (
                      <>
                        <KeyRound size={15} />
                        Reset Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {notice && (
          <div className={styles.toast} role="status">
            <CheckCircle2 size={18} color="var(--color-success)" />
            {notice.message}
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
