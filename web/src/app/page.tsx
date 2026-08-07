import Link from 'next/link';
import Footer from './components/Footer';

export default function Home() {
  return (
    <main
      className="layout-container"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        flexDirection: 'column',
      }}
    >
      <div
        className="glass"
        style={{
          padding: '48px',
          borderRadius: '16px',
          maxWidth: '800px',
          width: '100%',
          textAlign: 'center',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--color-primary)' }}>
          Yatri Shield
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--color-on-surface-variant)',
            marginBottom: '48px',
          }}
        >
          Authority Command Center
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
          }}
        >
          <Link
            href="/login/responder"
            className="glass"
            style={{
              padding: '32px 24px',
              borderRadius: '12px',
              transition: 'transform 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '48px', marginBottom: '16px' }}></span>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Police / SDRF</h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-on-surface-variant)',
                marginTop: '8px',
              }}
            >
              Incident queue &amp; dispatch
            </p>
          </Link>

          <Link
            href="/login/hospital"
            className="glass"
            style={{
              padding: '32px 24px',
              borderRadius: '12px',
              transition: 'transform 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '48px', marginBottom: '16px' }}></span>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Hospital</h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-on-surface-variant)',
                marginTop: '8px',
              }}
            >
              Patient identity &amp; records
            </p>
          </Link>

          <Link
            href="/login/tourism"
            className="glass"
            style={{
              padding: '32px 24px',
              borderRadius: '12px',
              transition: 'transform 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '48px', marginBottom: '16px' }}>️</span>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Tourism Authority</h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-on-surface-variant)',
                marginTop: '8px',
              }}
            >
              Analytics &amp; zone broadcasting
            </p>
          </Link>

          <Link
            href="/login/admin"
            className="glass"
            style={{
              padding: '32px 24px',
              borderRadius: '12px',
              transition: 'transform 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '48px', marginBottom: '16px' }}>️</span>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>System Admin</h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-on-surface-variant)',
                marginTop: '8px',
              }}
            >
              System health &amp; config
            </p>
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
