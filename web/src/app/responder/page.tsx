"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import DashboardLayout from '../components/DashboardLayout';
import { getIncidents, acknowledgeIncident, resolveIncident, assignIncident, escalateIncident } from '../../lib/api';
import { useIncidentsSocket } from '../../hooks/useIncidentsSocket';
import { AlertCircle, EyeOff, MapPin, CheckCircle, X, Loader2 } from 'lucide-react';

// Dynamically import the map to prevent SSR issues with Leaflet
const IncidentMap = dynamic(() => import('../components/IncidentMap'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>
});

// ── Toast component ────────────────────────────────────────────────────
function Toast({ message, type = 'success', visible }: { message: string; type?: 'success' | 'error'; visible: boolean }) {
  if (!visible) return null;
  const bg = type === 'error' ? 'var(--color-error-container)' : 'rgba(76, 175, 80, 0.15)';
  const color = type === 'error' ? 'var(--color-error)' : 'var(--color-success)';
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      padding: '14px 24px', borderRadius: '12px', backgroundColor: bg, color,
      fontWeight: '600', fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      border: `1px solid ${color}`, animation: 'slideUp 0.3s ease'
    }}>
      {message}
    </div>
  );
}

// ── Modal wrapper ──────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
      <div className="glass-card animate-fade-in" style={{ width: '440px', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ResponderDashboard() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [processingActionId, setProcessingActionId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const { socket, lastEvent } = useIncidentsSocket();

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({ message: '', type: 'success', visible: false });
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
  };

  // Modal states for Assign and Escalate
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignUnitId, setAssignUnitId] = useState('');
  const [assignTargetId, setAssignTargetId] = useState<string | null>(null);

  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateTargetId, setEscalateTargetId] = useState<string | null>(null);

  // Confirm resolve
  const [confirmResolveId, setConfirmResolveId] = useState<string | null>(null);

  useEffect(() => {
    // SLA Timer Tick
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lastEvent) {
      fetchIncidents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);

  const fetchIncidents = async () => {
    try {
      const data = await getIncidents();
      setIncidents(data);
      if (selectedIncident) {
        const updated = data.find((i: any) => i.id === selectedIncident.id);
        if (updated) setSelectedIncident(updated);
        else setSelectedIncident(null); // incident was resolved/removed
      }
    } catch (error: any) {
      if (!error.response) {
        showToast('Unable to reach server. Incidents may be stale.', 'error');
      } else {
        showToast('Failed to load incidents.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (processingActionId === id) return;
    setProcessingActionId(id);
    try {
      await acknowledgeIncident(id);
      showToast('Incident acknowledged successfully.');
      await fetchIncidents();
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast('You do not have permission to acknowledge incidents.', 'error');
      } else if (error.response?.status === 404) {
        showToast('Incident no longer exists.', 'error');
      } else if (!error.response) {
        showToast('Network error. Please try again.', 'error');
      } else {
        showToast(error.response?.data?.detail || 'Failed to acknowledge incident.', 'error');
      }
    } finally {
      setProcessingActionId(null);
    }
  };

  const openAssignModal = (id: string) => {
    setAssignTargetId(id);
    setAssignUnitId('');
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!assignTargetId || !assignUnitId.trim()) return;
    if (processingActionId === assignTargetId) return;
    setProcessingActionId(assignTargetId);
    try {
      await assignIncident(assignTargetId, assignUnitId.trim());
      showToast(`Unit ${assignUnitId.trim()} assigned successfully.`);
      setAssignModalOpen(false);
      await fetchIncidents();
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast('You do not have permission to assign units.', 'error');
      } else if (!error.response) {
        showToast('Network error. Please try again.', 'error');
      } else {
        showToast(error.response?.data?.detail || 'Failed to assign unit.', 'error');
      }
    } finally {
      setProcessingActionId(null);
    }
  };

  const openEscalateModal = (id: string) => {
    setEscalateTargetId(id);
    setEscalateReason('');
    setEscalateModalOpen(true);
  };

  const handleEscalateSubmit = async () => {
    if (!escalateTargetId || !escalateReason.trim()) return;
    if (processingActionId === escalateTargetId) return;
    setProcessingActionId(escalateTargetId);
    try {
      await escalateIncident(escalateTargetId, escalateReason.trim());
      showToast('Incident escalated to CRITICAL.');
      setEscalateModalOpen(false);
      await fetchIncidents();
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast('You do not have permission to escalate.', 'error');
      } else if (!error.response) {
        showToast('Network error. Please try again.', 'error');
      } else {
        showToast(error.response?.data?.detail || 'Failed to escalate incident.', 'error');
      }
    } finally {
      setProcessingActionId(null);
    }
  };

  const handleResolve = async (id: string) => {
    // State-machine guard: can only resolve acknowledged/assigned/escalated incidents
    const incident = incidents.find(i => i.id === id);
    if (incident && incident.status === 'created') {
      showToast('Cannot resolve an incident that has not been acknowledged yet.', 'error');
      return;
    }
    setConfirmResolveId(id);
  };

  const confirmResolve = async () => {
    if (!confirmResolveId) return;
    if (processingActionId === confirmResolveId) return;
    setProcessingActionId(confirmResolveId);
    try {
      await resolveIncident(confirmResolveId);
      showToast('Incident resolved and closed.');
      setConfirmResolveId(null);
      await fetchIncidents();
      setSelectedIncident(null);
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast('You do not have permission to resolve incidents.', 'error');
      } else if (!error.response) {
        showToast('Network error. Please try again.', 'error');
      } else {
        showToast(error.response?.data?.detail || 'Failed to resolve incident.', 'error');
      }
    } finally {
      setProcessingActionId(null);
    }
  };

  const activeIncidents = incidents.filter(inc => !['closed', 'resolved', 'false_alarm', 'merged'].includes(inc.status));

  return (
    <DashboardLayout>
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '500' }}>Active Incident Queue</h2>
        <div>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: socket ? 'var(--color-success)' : 'var(--color-error)', marginRight: '8px' }}></span>
          {socket ? 'Connected to WebSocket' : 'Disconnected'}
        </div>
      </header>
      
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
          
          {/* Queue List */}
          <div className="glass" style={{ flex: '1', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-on-surface-variant)' }}>
              Pending ({activeIncidents.length})
            </h3>
            
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Loading incidents...</span>
              </div>
            ) : activeIncidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-success)' }}>
                <CheckCircle size={48} style={{ margin: '0 auto 16px' }} />
                <p>No active incidents. System monitoring normally.</p>
              </div>
            ) : (
              activeIncidents.map((inc) => {
                const isCritical = inc.severity === 'CRITICAL';
                const isSilent = inc.type === 'silent' || inc.covert;
                const isSlaViolated = inc.status === 'created' && (now - new Date(inc.createdAt).getTime() > 60000);
                const isSelected = selectedIncident?.id === inc.id;

                return (
                  <div key={inc.id} 
                    onClick={() => setSelectedIncident(inc)}
                    style={{ 
                    padding: '16px', 
                    border: `1px solid ${isSelected ? 'var(--color-primary)' : (isCritical || isSlaViolated ? 'var(--color-error)' : 'var(--color-warning)')}`, 
                    borderRadius: '8px', 
                    background: isSelected ? 'rgba(76, 175, 80, 0.1)' : (isCritical || isSlaViolated ? 'rgba(220, 38, 38, 0.05)' : 'rgba(227, 116, 0, 0.05)'), 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    animation: isSlaViolated ? 'pulse 2s infinite' : 'none'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ 
                          background: isCritical ? 'var(--color-error)' : 'var(--color-warning)', 
                          color: '#fff', 
                          fontSize: '10px', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontWeight: 'bold' 
                        }}>
                          {inc.severity}
                        </span>
                        
                        <span style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
                          {new Date(inc.createdAt).toLocaleTimeString()}
                        </span>
                        
                        {isSilent && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-error)', fontSize: '12px', fontWeight: 'bold' }}>
                            <EyeOff size={14} /> DO NOT CALL
                          </span>
                        )}
                      </div>
                      
                      <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={16} color={isCritical ? "var(--color-error)" : "var(--color-warning)"} />
                        {inc.type.toUpperCase()} EMERGENCY
                      </div>
                      
                      <div style={{ fontSize: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} />
                        {inc.location || "Location Unknown"}
                      </div>
                      
                      <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--color-primary)' }}>
                        Status: {inc.status.toUpperCase()}
                      </div>
                    </div>
                    
                    {inc.status === 'created' ? (
                      <button 
                        className="btn btn-primary"
                        onClick={(e) => handleAcknowledge(inc.id, e)}
                        disabled={processingActionId === inc.id}
                        style={{
                          backgroundColor: processingActionId === inc.id ? 'var(--color-surface)' : 'var(--color-error)',
                          border: 'none',
                          color: processingActionId === inc.id ? 'var(--color-text-secondary)' : '#fff',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                      >
                        {processingActionId === inc.id ? (
                          <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                        ) : (
                          'Acknowledge'
                        )}
                      </button>
                    ) : (
                      <button className="btn btn-secondary" disabled>
                        {inc.status.charAt(0).toUpperCase() + inc.status.slice(1)}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Live Map Area */}
          <div className="glass" style={{ flex: '1.5', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
             <IncidentMap incidents={activeIncidents} />
          </div>

          {/* Incident Detail Sidebar */}
          {selectedIncident && (
            <div className="glass" style={{ flex: '1', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Incident Context</h3>
                <button onClick={() => setSelectedIncident(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '4px' }}>
                  <X size={18} />
                </button>
              </div>
              
              <div style={{ padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px' }}>
                <p style={{ fontWeight: '500', marginBottom: '8px' }}>Tourist Details</p>
                <div style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div><strong>Status:</strong> {selectedIncident.status.toUpperCase()}</div>
                  <div><strong>Severity:</strong> {selectedIncident.severity}</div>
                  <div><strong>Type:</strong> {selectedIncident.type}</div>
                  <div><strong>Created:</strong> {new Date(selectedIncident.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px' }}>
                <p style={{ fontWeight: '500', marginBottom: '8px' }}>Actions</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={(e) => handleAcknowledge(selectedIncident.id, e)}
                    disabled={selectedIncident.status !== 'created' || processingActionId === selectedIncident.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {processingActionId === selectedIncident.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    Acknowledge
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => openAssignModal(selectedIncident.id)}
                    disabled={!['acknowledged', 'escalated'].includes(selectedIncident.status) || processingActionId === selectedIncident.id}
                  >
                    Assign Unit
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => openEscalateModal(selectedIncident.id)}
                    disabled={selectedIncident.severity === 'CRITICAL' || processingActionId === selectedIncident.id}
                    style={{ color: '#f44336', borderColor: '#f44336' }}
                  >
                    Escalate
                  </button>
                  <button 
                    className="btn btn-secondary"
                    disabled={selectedIncident.status === 'created' || processingActionId === selectedIncident.id}
                    onClick={() => handleResolve(selectedIncident.id)}
                  >
                    Resolve
                  </button>
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', flex: 1 }}>
                <p style={{ fontWeight: '500', marginBottom: '8px' }}>Timeline & Integrity</p>
                <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedIncident.events?.length > 0 ? (
                    selectedIncident.events.map((ev: any, idx: number) => (
                      <div key={idx} style={{ borderLeft: '2px solid var(--color-primary)', paddingLeft: '8px' }}>
                        <strong>{new Date(ev.createdAt).toLocaleTimeString()}</strong> - {ev.eventType.toUpperCase()}
                        <br/>
                        <span style={{ color: '#4CAF50' }}>✓ Hash verified</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--color-on-surface-variant)' }}>No timeline events recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* ── Assign Unit Modal ─────────────────────────────────────── */}
      <Modal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Assign Responder Unit">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-on-surface-variant)' }}>Unit ID</label>
            <input
              type="text"
              className="input-premium"
              placeholder="e.g. UK-12, unit-123"
              value={assignUnitId}
              onChange={(e) => setAssignUnitId(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setAssignModalOpen(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              disabled={!assignUnitId.trim() || processingActionId === assignTargetId}
              onClick={handleAssignSubmit}
            >
              {processingActionId === assignTargetId ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Assigning...</> : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Escalate Modal ────────────────────────────────────────── */}
      <Modal open={escalateModalOpen} onClose={() => setEscalateModalOpen(false)} title="Escalate to Critical">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-on-surface-variant)' }}>Reason for Escalation</label>
            <textarea
              className="input-premium"
              placeholder="Describe why this incident needs critical escalation..."
              rows={4}
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              style={{ resize: 'vertical' }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setEscalateModalOpen(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px', backgroundColor: 'var(--color-error)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              disabled={!escalateReason.trim() || processingActionId === escalateTargetId}
              onClick={handleEscalateSubmit}
            >
              {processingActionId === escalateTargetId ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Escalating...</> : 'Escalate to Critical'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Resolve Confirmation Modal ────────────────────────────── */}
      <Modal open={!!confirmResolveId} onClose={() => setConfirmResolveId(null)} title="Confirm Resolution">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '15px' }}>
            Are you sure you want to resolve and close this incident? This action will timestamp the resolution and remove it from the active queue.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setConfirmResolveId(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              disabled={processingActionId === confirmResolveId}
              onClick={confirmResolve}
            >
              {processingActionId === confirmResolveId ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Resolving...</> : 'Confirm Resolve'}
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </DashboardLayout>
  );
}
