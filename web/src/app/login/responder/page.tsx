'use client';

import RoleLoginForm from '../components/RoleLoginForm';

export default function ResponderLoginPage() {
  return (
    <RoleLoginForm
      roleTitle="Police / SDRF Command Center"
      roleSubtitle="Secure access for law enforcement and emergency response personnel."
      roleIcon="🚓"
      allowedRoles={['operator', 'dispatcher', 'supervisor']}
      redirectPath="/responder"
      roleMismatchMessage="Your account is not authorized for the Police / SDRF portal. Please use the correct login page for your role."
    />
  );
}
