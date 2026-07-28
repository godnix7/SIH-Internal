"use client";

import RoleLoginForm from '../components/RoleLoginForm';

export default function HospitalLoginPage() {
  return (
    <RoleLoginForm
      roleTitle="Hospital Portal"
      roleSubtitle="Secure access for hospital staff to manage patient identity and emergency records."
      roleIcon="🏥"
      allowedRoles={['hospital']}
      redirectPath="/hospital"
      roleMismatchMessage="Your account is not authorized for the Hospital portal. Please use the correct login page for your role."
    />
  );
}
