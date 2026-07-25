'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { deleteInternalUser, getInternalUsers, getSystemHealth } from '../../lib/api';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  Gauge,
  Loader2,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import styles from './admin.module.css';

type Notice = { message: string; type: 'success' } | null;

const roleLabel = (role: string) =>
  ({
    operator: 'Operator',
    hospital: 'Hospital staff',
    tourism_admin: 'Tourism authority',
    sys_admin: 'System admin',
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
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    email: '',
    password: '',
    role: 'operator',
    organization: '',
  });
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionLoading, setProvisionLoading] = useState(false);
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
    provisionForm.organization !== '';
  const isHealthy = Boolean(health && !loadError);
  const dbUsed = health?.databasePool?.used ?? 0;
  const dbTotal = health?.databasePool?.total ?? 0;

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
      setNotice({ message: 'Internal user removed successfully.', type: 'success' });
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

  const handleCancelProvision = () => {
    if (isProvisionFormDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    setShowProvisionModal(false);
    setProvisionForm({ email: '', password: '', role: 'operator', organization: '' });
    setProvisionError(null);
  };

  const handleProvisionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (provisionLoading) return;

    setProvisionError(null);
    setProvisionLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/admin/provision`,
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
      setProvisionForm({ email: '', password: '', role: 'operator', organization: '' });
      setNotice({ message: 'Internal user provisioned successfully.', type: 'success' });
      window.setTimeout(() => setNotice(null), 4000);
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
              <button className="btn btn-primary" onClick={() => setShowProvisionModal(true)}>
                <UserPlus size={16} /> Provision user
              </button>
            </div>

            {loading && users.length === 0 ? (
              <div className={styles.emptyState}>
                <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: 12 }}>Loading internal access records…</p>
              </div>
            ) : users.length === 0 ? (
              <div className={styles.emptyState}>
                <UsersRound size={28} />
                <p style={{ marginTop: 12 }}>
                  No internal users are available yet. Provision the first staff account to grant
                  access.
                </p>
              </div>
            ) : (
              <div className={styles.userTableWrap}>
                <table className={styles.userTable}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>MFA</th>
                      <th>Account</th>
                      <th>Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
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
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={styles.rolePill}>{roleLabel(user.role)}</span>
                          </td>
                          <td>
                            <span
                              className={styles.mfaState}
                              style={{
                                color: user.mfa_enabled
                                  ? 'var(--color-success)'
                                  : 'var(--color-warning)',
                              }}
                            >
                              {user.mfa_enabled ? (
                                <ShieldCheck size={16} />
                              ) : (
                                <AlertTriangle size={16} />
                              )}
                              {user.mfa_enabled ? 'Protected' : 'Not enrolled'}
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
                            {protectedAccount ? (
                              <span className={styles.readOnlyPill}>Protected admin</span>
                            ) : (
                              <button
                                className="btn btn-outline"
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                disabled={deletingId !== null}
                                style={{
                                  minHeight: 34,
                                  padding: '7px 10px',
                                  color: 'var(--color-error)',
                                  fontSize: 12,
                                }}
                                aria-label={`Remove ${user.email}`}
                              >
                                {deletingId === user.id ? (
                                  <Loader2
                                    size={14}
                                    style={{ animation: 'spin 1s linear infinite' }}
                                  />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                                {deletingId === user.id ? 'Removing' : 'Remove'}
                              </button>
                            )}
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
                <div>
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
                    <option value="hospital">Hospital staff</option>
                    <option value="tourism_admin">Tourism authority</option>
                    <option value="sys_admin">System administrator</option>
                  </select>
                </div>
                <div>
                  <label className={styles.fieldLabel} htmlFor="provision-organization">
                    Organization or precinct
                  </label>
                  <input
                    id="provision-organization"
                    required
                    type="text"
                    className="input-premium"
                    placeholder="e.g. Kedarnath Base Camp"
                    value={provisionForm.organization}
                    onChange={(event) =>
                      setProvisionForm({ ...provisionForm, organization: event.target.value })
                    }
                  />
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
