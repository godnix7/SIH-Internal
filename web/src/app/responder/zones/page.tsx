'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { getZones, createZone, updateZone, deleteZone } from '../../../lib/api';
import {
  Map,
  ShieldAlert,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  AlertTriangle,
  X,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export default function GeofenceSafetyPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedZone, setSelectedZone] = useState<any>(null);

  // Form State
  const [name, setName] = useState('');
  const [zoneClass, setZoneClass] = useState('restricted');
  const [bufferM, setBufferM] = useState(250);
  const [description, setDescription] = useState('');
  const [centerLat, setCenterLat] = useState('32.2396');
  const [centerLon, setCenterLon] = useState('77.1887');
  const [radiusDeg, setRadiusDeg] = useState(0.02);
  const [crimeList, setCrimeList] = useState<any[]>([]);

  // New Crime Form
  const [crimeType, setCrimeType] = useState('Theft / Pickpocketing');
  const [crimeSeverity, setCrimeSeverity] = useState('medium');
  const [crimeDesc, setCrimeDesc] = useState('');
  const [crimeDate, setCrimeDate] = useState(new Date().toISOString().split('T')[0]);

  // Toast State
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; visible: boolean }>({
    msg: '',
    type: 'success',
    visible: false,
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type, visible: true });
    setTimeout(() => setToast((p) => ({ ...p, visible: false })), 4000);
  };

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    setLoading(true);
    try {
      const data = await getZones();
      setZones(data || []);
    } catch (e) {
      console.error('Failed to load zones:', e);
      showToast('Failed to connect to zone database', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Compute safety score from crime details in frontend preview
  const computePreviewScore = (crimes: any[]) => {
    if (!crimes || crimes.length === 0) return 100;
    let deduction = crimes.length * 5;
    crimes.forEach((c) => {
      const sev = (c.severity || '').toLowerCase();
      if (sev === 'critical') deduction += 20;
      else if (sev === 'high') deduction += 12;
      else if (sev === 'medium') deduction += 6;
      else deduction += 2;
    });
    return Math.max(5, Math.min(100, 100 - deduction));
  };

  const previewScore = computePreviewScore(crimeList);

  const getScoreColor = (score: number) => {
    if (score >= 76) return '#16a34a'; // Green - Safe
    if (score >= 51) return '#eab308'; // Yellow - Moderate
    if (score >= 26) return '#f97316'; // Orange - Caution
    return '#dc2626'; // Red - Danger
  };

  const handleAddCrime = () => {
    if (!crimeDesc.trim()) {
      showToast('Please enter brief crime incident details', 'error');
      return;
    }
    setCrimeList([
      ...crimeList,
      {
        id: Math.random().toString(),
        type: crimeType,
        severity: crimeSeverity,
        desc: crimeDesc.trim(),
        date: crimeDate,
      },
    ]);
    setCrimeDesc('');
  };

  const handleRemoveCrime = (index: number) => {
    setCrimeList(crimeList.filter((_, i) => i !== index));
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Zone Name is required', 'error');
      return;
    }

    // Build square polygon around center coords for simple geofence definition
    const lat = parseFloat(centerLat) || 28.6139;
    const lon = parseFloat(centerLon) || 77.209;
    const r = radiusDeg || 0.02;

    const geometry_geojson = {
      type: 'Polygon',
      coordinates: [
        [
          [lon - r, lat - r],
          [lon + r, lat - r],
          [lon + r, lat + r],
          [lon - r, lat + r],
          [lon - r, lat - r],
        ],
      ],
    };

    try {
      if (selectedZone) {
        await updateZone(selectedZone.id, {
          name,
          zone_class: zoneClass,
          buffer_m: bufferM,
          description,
          crime_data: crimeList,
          safety_score: previewScore,
          risk_factors: crimeList.map((c) => `${c.type} (${c.severity.toUpperCase()})`),
        });
        showToast('Geofence & Crime parameters updated successfully!');
      } else {
        await createZone({
          name,
          zone_class: zoneClass,
          buffer_m: bufferM,
          description,
          geometry_geojson,
          crime_data: crimeList,
          safety_score: previewScore,
          risk_factors: crimeList.map((c) => `${c.type} (${c.severity.toUpperCase()})`),
        });
        showToast('New police geofence zone created & broadcasted to mobile users!');
      }
      resetForm();
      await loadZones();
    } catch (err: any) {
      console.error('Save failed:', err);
      showToast(err.response?.data?.detail || 'Failed to save zone parameters.', 'error');
    }
  };

  const handleEdit = (zone: any) => {
    setSelectedZone(zone);
    setName(zone.name || '');
    setZoneClass(zone.zone_class || 'restricted');
    setBufferM(zone.buffer_m || 250);
    setDescription(zone.description || '');
    setCrimeList(zone.crime_data || []);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this geofenced zone?')) return;
    try {
      await deleteZone(id);
      showToast('Zone removed successfully.');
      loadZones();
    } catch (err) {
      showToast('Failed to delete zone', 'error');
    }
  };

  const resetForm = () => {
    setSelectedZone(null);
    setName('');
    setZoneClass('restricted');
    setBufferM(250);
    setDescription('');
    setCrimeList([]);
    setIsEditing(false);
  };

  return (
    <DashboardLayout>
      <div style={{ position: 'relative', minHeight: '100%', paddingBottom: '40px' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Map size={28} color="#38bdf8" /> Police Geofence & Crime Safety Score Engine
            </h1>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
              Define geographical safety perimeters. Areas scored below 40 automatically broadcast
              high-priority warning alerts to tourist mobiles upon entry.
            </p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                backgroundColor: '#0284c7',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
              }}
            >
              <Plus size={18} /> New Geofenced Zone
            </button>
          ) : (
            <button
              onClick={resetForm}
              style={{
                backgroundColor: '#334155',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Back to Overview
            </button>
          )}
        </header>

        {toast.visible && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 9999,
              padding: '14px 24px',
              borderRadius: '12px',
              backgroundColor: toast.type === 'error' ? '#7f1d1d' : '#064e3b',
              color: 'white',
              fontWeight: '600',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`,
            }}
          >
            {toast.msg}
          </div>
        )}

        {isEditing ? (
          /* Zone Creation & Crime Data Form */
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            <form
              onSubmit={handleCreateOrUpdate}
              style={{
                backgroundColor: '#1e293b',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #334155',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  color: '#f8fafc',
                }}
              >
                {selectedZone ? `Editing: ${selectedZone.name}` : 'Create Police Geofenced Area'}
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    color: '#94a3b8',
                    marginBottom: '6px',
                  }}
                >
                  Zone Name / Location Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kasol Dark Forest Corridor / Manali North Pass"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    color: 'white',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color: '#94a3b8',
                      marginBottom: '6px',
                    }}
                  >
                    Zone Classification
                  </label>
                  <select
                    value={zoneClass}
                    onChange={(e) => setZoneClass(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      color: 'white',
                      fontSize: '14px',
                    }}
                  >
                    <option value="restricted">Restricted (Police Monitored)</option>
                    <option value="disaster">Disaster / Landslide Risk</option>
                    <option value="advisory">Tourist Advisory</option>
                    <option value="corridor">Safe Corridor</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color: '#94a3b8',
                      marginBottom: '6px',
                    }}
                  >
                    Alert Buffer Radius (Meters)
                  </label>
                  <input
                    type="number"
                    value={bufferM}
                    onChange={(e) => setBufferM(parseInt(e.target.value) || 100)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      color: 'white',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              {!selectedZone && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#94a3b8',
                        marginBottom: '6px',
                      }}
                    >
                      Center Latitude
                    </label>
                    <input
                      type="text"
                      value={centerLat}
                      onChange={(e) => setCenterLat(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        color: 'white',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#94a3b8',
                        marginBottom: '6px',
                      }}
                    >
                      Center Longitude
                    </label>
                    <input
                      type="text"
                      value={centerLon}
                      onChange={(e) => setCenterLon(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        color: 'white',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    color: '#94a3b8',
                    marginBottom: '6px',
                  }}
                >
                  Police Instructions & Tourist Guidance
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide immediate instructions for tourists entering this zone (e.g. Do not trek alone after dark. Wild animal reports in Sector 4)."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    color: 'white',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  borderTop: '1px solid #334155',
                  paddingTop: '16px',
                }}
              >
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #64748b',
                    color: '#cbd5e1',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#0284c7',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
                  }}
                >
                  {selectedZone ? 'Update Zone & Score' : 'Deploy Geofence & Score'}
                </button>
              </div>
            </form>

            {/* Right Panel: Crime Data & Automated Score Preview */}
            <div
              style={{
                backgroundColor: '#1e293b',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: `2px solid ${getScoreColor(previewScore)}`,
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: '700',
                  }}
                >
                  Calculated Area Safety Score
                </span>
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: '800',
                    color: getScoreColor(previewScore),
                    margin: '8px 0',
                  }}
                >
                  {previewScore} <span style={{ fontSize: '20px', color: '#64748b' }}>/ 100</span>
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: getScoreColor(previewScore),
                  }}
                >
                  {previewScore >= 76
                    ? '🟢 Safe Area - No alert required'
                    : previewScore >= 51
                      ? '🟡 Moderate Risk - Standard monitoring'
                      : previewScore >= 26
                        ? '🟠 Caution Zone - Tourist Advisory'
                        : ' DANGER ZONE - Instant High-Priority Warning'}
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                  Score is automatically weighed by incident volume, crime severity, density, and
                  30-day recency.
                </p>
              </div>

              {/* Crime Logger Box */}
              <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
                <h4
                  style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#f8fafc',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertTriangle size={16} color="#eab308" /> Log Crime & Hazard Records
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginBottom: '10px',
                  }}
                >
                  <select
                    value={crimeType}
                    onChange={(e) => setCrimeType(e.target.value)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      color: 'white',
                      fontSize: '13px',
                    }}
                  >
                    <option value="Theft / Pickpocketing">Theft / Pickpocketing</option>
                    <option value="Assault / Harassment">Assault / Harassment</option>
                    <option value="Unregistered Scams">Unregistered Scams / Overcharging</option>
                    <option value="Wildlife Hazard">Wildlife Hazard / Leopards</option>
                    <option value="Terrain / Drowning Risk">Terrain / Drowning Risk</option>
                    <option value="Narcotics Activity">Narcotics Activity</option>
                  </select>
                  <select
                    value={crimeSeverity}
                    onChange={(e) => setCrimeSeverity(e.target.value)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      color: 'white',
                      fontSize: '13px',
                    }}
                  >
                    <option value="low">Low Severity</option>
                    <option value="medium">Medium Severity</option>
                    <option value="high">High Severity (-12 pts)</option>
                    <option value="critical">Critical Trauma (-20 pts)</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Incident summary (e.g. Tourist mugging near Old Bridge at 11 PM)"
                  value={crimeDesc}
                  onChange={(e) => setCrimeDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    color: 'white',
                    fontSize: '13px',
                    marginBottom: '10px',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCrime}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  + Add Record to Calculation
                </button>
              </div>

              {/* Logged Crime List */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <h5 style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                  Attached Records ({crimeList.length})
                </h5>
                {crimeList.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                    No historical crime records attached yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {crimeList.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px',
                          backgroundColor: '#0f172a',
                          borderRadius: '8px',
                          border: '1px solid #334155',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                            {c.type}{' '}
                            <span
                              style={{
                                fontSize: '11px',
                                color:
                                  c.severity === 'critical' || c.severity === 'high'
                                    ? '#ef4444'
                                    : '#eab308',
                              }}
                            >
                              ({c.severity.toUpperCase()})
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{c.desc}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCrime(i)}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Zone Overview Grid */
          <div>
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '200px',
                  color: '#94a3b8',
                  gap: '10px',
                }}
              >
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading
                active geofenced areas from secure police database...
              </div>
            ) : zones.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#1e293b',
                  padding: '60px 20px',
                  borderRadius: '16px',
                  border: '1px dashed #475569',
                  textAlign: 'center',
                }}
              >
                <ShieldCheck size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#f8fafc',
                    marginBottom: '8px',
                  }}
                >
                  No Active Danger Geofences Defined
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    maxWidth: '500px',
                    margin: '0 auto 20px',
                  }}
                >
                  Create targeted police geofences with historical crime incident logs to enable
                  dynamic safety scoring and automatic tourist danger notification alerts.
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    backgroundColor: '#0284c7',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} style={{ display: 'inline', marginRight: '6px' }} /> Deploy First
                  Geofence
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '20px',
                }}
              >
                {zones.map((z) => {
                  const score = z.safety_score !== undefined ? z.safety_score : 100;
                  const color = getScoreColor(score);
                  const isDeleted = z.status === 'deleted';

                  return (
                    <div
                      key={z.id}
                      style={{
                        backgroundColor: '#1e293b',
                        borderRadius: '16px',
                        border: `1px solid ${isDeleted ? '#475569' : '#334155'}`,
                        overflow: 'hidden',
                        opacity: isDeleted ? 0.6 : 1,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div
                        style={{
                          padding: '18px',
                          borderBottom: '1px solid #334155',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          background: 'linear-gradient(180deg, #1e293b, #0f172a)',
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: '11px',
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#334155',
                              color: '#cbd5e1',
                              fontWeight: '700',
                            }}
                          >
                            {z.zone_class}
                          </span>
                          <h3
                            style={{
                              fontSize: '18px',
                              fontWeight: '700',
                              color: '#f8fafc',
                              marginTop: '8px',
                            }}
                          >
                            {z.name}
                          </h3>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                            Buffer Radius: {z.buffer_m || 100}m
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                            SAFETY SCORE
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: '800', color }}>{score}</div>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '18px',
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
                          {z.description || 'No specialized instructions provided.'}
                        </p>

                        <div style={{ borderTop: '1px solid #334155', paddingTop: '12px' }}>
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#94a3b8',
                              fontWeight: '600',
                              marginBottom: '6px',
                            }}
                          >
                            CRIME LOGS & RISK FACTORS (
                            {z.total_incidents || (z.crime_data ? z.crime_data.length : 0)} records)
                          </div>
                          {z.risk_factors && z.risk_factors.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {z.risk_factors.slice(0, 3).map((rf: string, idx: number) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: '11px',
                                    backgroundColor: '#3f1f23',
                                    color: '#fca5a5',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #7f1d1d',
                                  }}
                                >
                                  ️ {rf}
                                </span>
                              ))}
                              {z.risk_factors.length > 3 && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  +{z.risk_factors.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#10b981',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <CheckCircle size={14} /> Zero reported crimes in perimeter
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '12px 18px',
                          backgroundColor: '#0f172a',
                          borderTop: '1px solid #334155',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: '8px',
                        }}
                      >
                        {!isDeleted && (
                          <>
                            <button
                              onClick={() => handleEdit(z)}
                              style={{
                                backgroundColor: '#334155',
                                color: '#f8fafc',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Edit3 size={14} /> Edit / Add Crime
                            </button>
                            <button
                              onClick={() => handleDelete(z.id)}
                              style={{
                                backgroundColor: 'transparent',
                                color: '#ef4444',
                                border: '1px solid #7f1d1d',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
