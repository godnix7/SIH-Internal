"use client";

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { scanQR } from '../../lib/api';
import { CheckCircle, AlertTriangle, User, Loader2, Camera } from 'lucide-react';

export default function HospitalDashboard() {
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [permissionChecking, setPermissionChecking] = useState(false);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning) {
      // Small timeout to ensure the DOM node #reader is rendered
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
          );
          scannerRef.current = scanner;
          scanner.render(onScanSuccess, onScanFailure);
        } catch (e) {
          console.error("Scanner initialization failed:", e);
          setError("Failed to initialize the camera scanner. Please reload the page.");
          setIsScanning(false);
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => {
            console.error("Failed to clear scanner during unmount:", err);
          });
          scannerRef.current = null;
        }
      };
    }
  }, [isScanning]);

  const requestCameraPermission = async () => {
    setCameraPermissionError(null);
    setError(null);
    setPermissionChecking(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPermissionError("Your browser or device does not support camera access.");
      setPermissionChecking(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop all tracks to release camera before initializing html5-qrcode
      stream.getTracks().forEach(track => track.stop());
      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera access denied:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermissionError(
          "Camera access was denied. Please check your browser address bar permissions or site settings to enable the camera."
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraPermissionError("No camera device found on this system.");
      } else {
        setCameraPermissionError("Could not access the camera. Error: " + (err.message || err.name));
      }
    } finally {
      setPermissionChecking(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    setIsScanning(false);
    setLoading(true);
    setError(null);
    try {
      const data = await scanQR(decodedText);
      setScanResult(data);
    } catch (err: any) {
      console.error(err);
      if (!err.response) {
        setError("Network error. Unable to verify the patient QR code at this time.");
      } else if (err.response.status === 404) {
        setError("Invalid QR Code: Patient identity record not found on the server.");
      } else if (err.response.status === 410 || err.response.data?.detail === "ID_EXPIRED") {
        setError("Verification Failed: The presented Tourist ID has expired.");
      } else {
        setError(err.response?.data?.detail || "Failed to verify ID or ID is expired.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onScanFailure = (error: any) => {
    // Normal failure when code isn't fully in frame; ignore to allow continuous scanning
  };

  const handleReset = () => {
    setScanResult(null);
    setError(null);
    requestCameraPermission();
  };

  return (
    <DashboardLayout>
      <header className="header">
        <h2 style={{ fontSize: '20px', fontWeight: '500' }}>Hospital & Identity Access</h2>
      </header>
      
      <div style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {!isScanning && !scanResult && !loading && (
          <div className="glass" style={{ maxWidth: '600px', width: '100%', padding: '32px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-variant)', borderRadius: '50%' }}>
                <Camera size={48} color="var(--color-primary)" />
              </div>
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Scan Patient Identity</h3>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '24px', lineHeight: '1.6' }}>
              Scan the Yatri Shield QR code on the patient&apos;s device or wristband to securely decrypt and view their medical history, blood type, and emergency contacts.
            </p>
            
            {cameraPermissionError && (
              <div style={{ backgroundColor: 'var(--color-error-container)', color: 'var(--color-error)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--color-error)', textAlign: 'left', fontSize: '14px', lineHeight: '1.5' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <AlertTriangle size={18} /> Camera Access Required
                </strong>
                {cameraPermissionError}
              </div>
            )}

            {error && (
              <div style={{ backgroundColor: 'var(--color-error-container)', color: 'var(--color-error)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--color-error)', textAlign: 'left', fontSize: '14px' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <AlertTriangle size={18} /> Error
                </strong>
                {error}
              </div>
            )}

            <button 
              className="btn btn-primary" 
              onClick={requestCameraPermission} 
              disabled={permissionChecking}
              style={{ padding: '12px 24px', fontSize: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {permissionChecking ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Checking Permission…
                </>
              ) : (
                'Activate Camera'
              )}
            </button>
          </div>
        )}

        {isScanning && (
          <div className="glass" style={{ maxWidth: '600px', width: '100%', padding: '32px', borderRadius: '12px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Align QR Code within frame</h3>
            <div id="reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }}></div>
            <button className="btn btn-secondary" onClick={() => setIsScanning(false)} style={{ marginTop: '24px' }}>
              Cancel
            </button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)', margin: '0 auto 16px' }} />
            <p style={{ fontWeight: '500', color: 'var(--color-on-surface)' }}>Decrypting Medical Profile...</p>
          </div>
        )}

        {scanResult && (
          <div className="glass" style={{ maxWidth: '800px', width: '100%', padding: '0', borderRadius: '12px', overflow: 'hidden' }}>
            
            {/* Header / Identity Verification */}
            <div style={{ padding: '32px', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '40px', backgroundColor: 'var(--color-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={40} color="var(--color-on-surface-variant)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{scanResult.name}</h2>
                    {scanResult.verified ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-success)', padding: '4px 8px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}>
                        <CheckCircle size={14} /> Verified ID
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(234, 179, 8, 0.1)', color: 'var(--color-warning)', padding: '4px 8px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}>
                        <AlertTriangle size={14} /> Provisional ID
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '16px' }}>
                    DOB: {scanResult.dob || 'Unknown'} • {scanResult.nationality || 'Nationality Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {/* Medical Card */}
            <div style={{ padding: '32px', backgroundColor: 'rgba(var(--color-surface-rgb), 0.5)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '600' }}>Medical Details</h3>
                {scanResult.medicalDataSelfDeclared && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-warning)', fontSize: '14px', fontWeight: '600' }}>
                    <AlertTriangle size={16} /> ⚠ Self-Declared
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                
                {/* Blood Group */}
                <div style={{ padding: '20px', backgroundColor: 'rgba(220, 38, 38, 0.05)', borderRadius: '8px', border: '1px solid var(--color-error)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-error)', fontWeight: '600', marginBottom: '4px' }}>BLOOD GROUP</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-error)' }}>{scanResult.bloodGroup || 'Unknown'}</div>
                </div>

                {/* Allergies */}
                <div style={{ padding: '20px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', fontWeight: '600', marginBottom: '8px' }}>ALLERGIES</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>
                    {scanResult.allergies?.length > 0 ? scanResult.allergies.join(', ') : 'None reported'}
                  </div>
                </div>

                {/* Medications */}
                <div style={{ padding: '20px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', fontWeight: '600', marginBottom: '8px' }}>CURRENT MEDICATIONS</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>
                    {scanResult.medications?.length > 0 ? scanResult.medications.join(', ') : 'None reported'}
                  </div>
                </div>

                {/* Conditions */}
                <div style={{ padding: '20px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', fontWeight: '600', marginBottom: '8px' }}>PRE-EXISTING CONDITIONS</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>
                    {scanResult.conditions?.length > 0 ? scanResult.conditions.join(', ') : 'None reported'}
                  </div>
                </div>

              </div>

              {/* Emergency Contacts */}
              <div style={{ marginTop: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Emergency Contacts</h3>
                {scanResult.emergencyContacts?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {scanResult.emergencyContacts.map((contact: any, idx: number) => (
                      <div key={idx} style={{ padding: '16px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600' }}>{contact.name}</div>
                          <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px' }}>{contact.relationship}</div>
                        </div>
                        <a href={`tel:${contact.phone}`} className="btn btn-secondary">
                          📞 {contact.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--color-on-surface-variant)' }}>No emergency contacts listed.</p>
                )}
              </div>

            </div>

            <div style={{ padding: '24px', backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
              <button className="btn btn-primary" onClick={handleReset}>Scan Next Patient</button>
            </div>
            
          </div>
        )}

      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
    </DashboardLayout>
  );
}
