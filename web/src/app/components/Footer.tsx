export default function Footer() {
  const email = process.env.NEXT_PUBLIC_HELP_CONTACT_EMAIL || 'support@example.com';
  const phone = process.env.NEXT_PUBLIC_HELP_CONTACT_PHONE || '112';
  const termsLink = process.env.NEXT_PUBLIC_TERMS_LINK || '#';
  const privacyLink = process.env.NEXT_PUBLIC_PRIVACY_LINK || '#';

  return (
    <footer
      style={{
        width: '100%',
        maxWidth: '800px',
        textAlign: 'center',
        padding: '16px',
        fontSize: '12px',
        color: 'var(--color-on-surface-variant)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <p>Yatri Shield is a secure government portal. Unauthorized access is strictly prohibited.</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
        <a href={`mailto:${email}`} style={{ textDecoration: 'underline' }}>
          Support: {email}
        </a>
        <a href={`tel:${phone}`} style={{ textDecoration: 'underline' }}>
          Emergency: {phone}
        </a>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
        <a
          href={termsLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'underline' }}
        >
          Terms of Service
        </a>
        <a
          href={privacyLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'underline' }}
        >
          Privacy Policy
        </a>
      </div>
    </footer>
  );
}
