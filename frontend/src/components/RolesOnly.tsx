import React, { useContext } from 'react';
import UserContext from '../UserContext';

type RolesUser = {
  roles?: Array<{ name: string }>;
};

/**
 * Returns true if the user has at least one of the given role names.
 */
export function userHasRole(user: RolesUser | undefined, roles: string[]): boolean {
  return (user?.roles || []).some((role) => roles.includes(role.name));
}

/**
 * Renders children only when the current user (from UserContext) has one of the given roles.
 */
export default function RolesOnly({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}): JSX.Element | null {
  const { user } = (useContext(UserContext) || {}) as { user?: RolesUser };

  if (!userHasRole(user, roles)) {
    return null;
  }

  return <>{children}</>;
}
