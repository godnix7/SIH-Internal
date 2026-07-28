"use client";

import RoleLoginForm from '../components/RoleLoginForm';

export default function AdminLoginPage() {
  return (
    <RoleLoginForm
      roleTitle="System Administration"
      roleSubtitle="Secure access for platform administrators to manage system health, staff accounts, and configuration."
      roleIcon="⚙️"
      allowedRoles={['sys_admin']}
      redirectPath="/admin"
      roleMismatchMessage="Your account is not authorized for system administration. Only sys_admin accounts can access this portal."
    />
  );
}
