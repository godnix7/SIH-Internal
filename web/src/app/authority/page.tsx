"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { getAnalyticsOverview } from '../../lib/api';
import { Activity, AlertTriangle, Users, Clock, Send, ShieldAlert, BarChart2 } from 'lucide-react';

export default function AuthorityDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  useEffect(() => {
    getAnalyticsOverview()
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleBroadcast = () => {
    setBroadcastLoading(true);
    setTimeout(() => {
      setBroadcastLoading(false);
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 4000);
    }, 1200);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(var(--color-primary-rgb), 0.3)', borderTop: '4px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '16px', color: 'var(--color-text-secondary)', fontSize: '18px', fontWeight: '500' }}>Initializing Command Center...</p>
        </div>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
        
        {/* Header Section */}
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', background: 'linear-gradient(90deg, #FFFFFF, #B0BEC5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
              Tourism Authority Command
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px', marginTop: '4px' }}>
              Real-time oversight of regional safety and tourist activity.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '30px', background: 'rgba(76, 175, 80, 0.15)', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
               <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4CAF50', boxShadow: '0 0 8px #4CAF50' }}></div>
               <span style={{ color: '#81C784', fontWeight: '600', fontSize: '14px' }}>Systems Optimal</span>
             </div>
          </div>
        </header>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          
          <div className="glass-card hover-lift" style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(145deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.02))', border: '1px solid rgba(33, 150, 243, 0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
              <Users size={120} color="#2196F3" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: 'rgba(33, 150, 243, 0.2)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
                <Users color="#64B5F6" size={28} />
              </div>
              <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Active Tourists</p>
            </div>
            <p style={{ fontSize: '40px', fontWeight: '800', color: '#FFFFFF', lineHeight: 1 }}>{analytics?.touristCount?.toLocaleString() || 0}</p>
          </div>

          <div className="glass-card hover-lift" style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(145deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.02))', border: '1px solid rgba(76, 175, 80, 0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
              <Activity size={120} color="#4CAF50" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: 'rgba(76, 175, 80, 0.2)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
                <Activity color="#81C784" size={28} />
              </div>
              <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Active Trips</p>
            </div>
            <p style={{ fontSize: '40px', fontWeight: '800', color: '#FFFFFF', lineHeight: 1 }}>{analytics?.activeTrips?.toLocaleString() || 0}</p>
          </div>

          <div className="glass-card hover-lift" style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(145deg, rgba(244, 67, 54, 0.1), rgba(244, 67, 54, 0.02))', border: '1px solid rgba(244, 67, 54, 0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
              <AlertTriangle size={120} color="#F44336" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: 'rgba(244, 67, 54, 0.2)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
                <AlertTriangle color="#E57373" size={28} />
              </div>
              <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Incidents Today</p>
            </div>
            <p style={{ fontSize: '40px', fontWeight: '800', color: '#FFFFFF', lineHeight: 1 }}>{analytics?.incidentsToday || 0}</p>
          </div>

          <div className="glass-card hover-lift" style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.1), rgba(255, 152, 0, 0.02))', border: '1px solid rgba(255, 152, 0, 0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
              <Clock size={120} color="#FF9800" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: 'rgba(255, 152, 0, 0.2)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
                <Clock color="#FFB74D" size={28} />
              </div>
              <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Avg Response</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <p style={{ fontSize: '40px', fontWeight: '800', color: '#FFFFFF', lineHeight: 1 }}>{analytics?.averageResponseTimeSeconds || 0}</p>
              <span style={{ fontSize: '18px', color: 'var(--color-text-secondary)', fontWeight: '600' }}>sec</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
          
          {/* Emergency Broadcast Panel */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '20px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ padding: '10px', backgroundColor: 'rgba(255, 87, 34, 0.15)', borderRadius: '10px' }}>
                <ShieldAlert color="#FF7043" size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>Emergency Broadcast</h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Push instant alerts to tourist devices.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Zone</label>
                <select className="premium-input" defaultValue="all" style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '16px', appearance: 'none', cursor: 'pointer' }}>
                  <option value="all" style={{ background: '#1A1A1A' }}>State-wide (All Regions)</option>
                  <option value="north" style={{ background: '#1A1A1A' }}>North District Only</option>
                  <option value="south" style={{ background: '#1A1A1A' }}>South District Only</option>
                </select>
              </div>
              
              <div className="input-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Advisory Message</label>
                <textarea 
                  className="premium-input" 
                  placeholder="e.g. Flash flood warning in the northern valley. Please seek higher ground immediately..." 
                  rows={5} 
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '16px', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              
              <button 
                className="btn-premium" 
                onClick={handleBroadcast}
                disabled={broadcastLoading}
                style={{ 
                  marginTop: '8px',
                  width: '100%', 
                  padding: '18px', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #FF5722, #F4511E)',
                  color: 'white', 
                  fontWeight: '700', 
                  fontSize: '16px',
                  border: 'none',
                  cursor: broadcastLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '12px',
                  boxShadow: '0 8px 20px rgba(255, 87, 34, 0.3)',
                  transition: 'all 0.3s ease',
                  opacity: broadcastLoading ? 0.8 : 1
                }}
              >
                {broadcastLoading ? (
                   <span style={{ animation: 'pulse 1.5s infinite' }}>Transmitting...</span>
                ) : (
                   <><Send size={20} /> Transmit Alert to Network</>
                )}
              </button>
              
              {broadcastSuccess && (
                <div style={{ padding: '16px', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: '12px', color: '#81C784', display: 'flex', alignItems: 'center', gap: '12px', animation: 'slideUp 0.3s ease' }}>
                  <ShieldAlert size={20} />
                  <span style={{ fontWeight: '500' }}>Broadcast successfully dispatched to all active devices.</span>
                </div>
              )}
            </div>
          </div>

          {/* Incident Breakdown Panel */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '20px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ padding: '10px', backgroundColor: 'rgba(156, 39, 176, 0.15)', borderRadius: '10px' }}>
                <BarChart2 color="#BA68C8" size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>Incident Topology</h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Categorized breakdown of today&apos;s emergencies.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="stat-row hover-bg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '4px', height: '24px', background: '#F44336', borderRadius: '4px' }}></div>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: '#E0E0E0' }}>Medical Emergencies</span>
                </div>
                <span style={{ fontSize: '24px', fontWeight: '800', color: '#FFFFFF' }}>{analytics?.incidentsByType?.medical || 0}</span>
              </div>
              
              <div className="stat-row hover-bg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '4px', height: '24px', background: '#2196F3', borderRadius: '4px' }}></div>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: '#E0E0E0' }}>Police / Security</span>
                </div>
                <span style={{ fontSize: '24px', fontWeight: '800', color: '#FFFFFF' }}>{analytics?.incidentsByType?.police || 0}</span>
              </div>
              
              <div className="stat-row hover-bg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '4px', height: '24px', background: '#FF9800', borderRadius: '4px' }}></div>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: '#E0E0E0' }}>Anomaly / Auto-Trigger</span>
                </div>
                <span style={{ fontSize: '24px', fontWeight: '800', color: '#FFFFFF' }}>{analytics?.incidentsByType?.anomaly || 0}</span>
              </div>
            </div>
            
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Data synchronizes securely with the blockchain ledger every 5 seconds.</p>
            </div>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        .hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0,0,0,0.3) !important; }
        .hover-bg:hover { background-color: rgba(255,255,255,0.06) !important; }
        .premium-input:focus { outline: none; border-color: rgba(255,255,255,0.3) !important; background: rgba(255,255,255,0.05) !important; }
        .btn-premium:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(255, 87, 34, 0.4) !important; }
        .btn-premium:active:not(:disabled) { transform: translateY(1px); }
      `}} />
    </DashboardLayout>
  );
}
