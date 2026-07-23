"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { getAnalyticsOverview } from '../../lib/api';
import { Loader2 } from 'lucide-react';

export default function TourismDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsOverview()
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading Command Center...</p>
        </div>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <header className="header">
        <h2 style={{ fontSize: '20px', fontWeight: '500' }}>Tourism Authority Command Center</h2>
      </header>
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
          <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
            <h4 style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', marginBottom: '8px' }}>Active Tourist Trips</h4>
            <div style={{ fontSize: '32px', fontWeight: '600' }}>{analytics?.activeTrips || 0}</div>
            <div style={{ color: 'var(--color-success)', fontSize: '12px', marginTop: '4px' }}>Trips actively monitored</div>
          </div>
          <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
            <h4 style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', marginBottom: '8px' }}>Registered Tourists</h4>
            <div style={{ fontSize: '32px', fontWeight: '600' }}>{analytics?.touristCount || 0}</div>
            <div style={{ color: 'var(--color-primary)', fontSize: '12px', marginTop: '4px' }}>Verified credentials active</div>
          </div>
          <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
            <h4 style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', marginBottom: '8px' }}>Incidents Today</h4>
            <div style={{ fontSize: '32px', fontWeight: '600', color: analytics?.incidentsToday > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
              {analytics?.incidentsToday || 0}
            </div>
            <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '12px', marginTop: '4px' }}>Current active emergencies</div>
          </div>
          <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
            <h4 style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', marginBottom: '8px' }}>Avg Response Time</h4>
            <div style={{ fontSize: '32px', fontWeight: '600' }}>
              {analytics?.averageResponseTimeSeconds ? `${analytics.averageResponseTimeSeconds}s` : 'N/A'}
            </div>
            <div style={{ color: 'var(--color-success)', fontSize: '12px', marginTop: '4px' }}>Within SLA requirements</div>
          </div>
        </div>
        
        <div className="glass" style={{ flex: 1, borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Incident Severity Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginTop: '8px' }}>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--color-surface-variant)', borderLeft: '4px solid var(--color-error)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>CRITICAL</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{analytics?.incidentsBySeverity?.CRITICAL || 0}</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--color-surface-variant)', borderLeft: '4px solid var(--color-warning)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>HIGH</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{analytics?.incidentsBySeverity?.HIGH || 0}</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--color-surface-variant)', borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>MODERATE</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{analytics?.incidentsBySeverity?.MODERATE || 0}</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--color-surface-variant)', borderLeft: '4px solid var(--color-success)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>LOW</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{analytics?.incidentsBySeverity?.LOW || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
