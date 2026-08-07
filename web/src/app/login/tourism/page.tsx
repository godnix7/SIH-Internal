'use client';

import RoleLoginForm from '../components/RoleLoginForm';

export default function TourismLoginPage() {
  return (
    <RoleLoginForm
      roleTitle="Tourism Authority Portal"
      roleSubtitle="Secure access for tourism department analytics, zone broadcasting, and oversight."
      roleIcon="️"
      allowedRoles={['tourism_admin']}
      redirectPath="/authority"
      roleMismatchMessage="Your account is not authorized for the Tourism Authority portal. Please use the correct login page for your role."
    />
  );
}
