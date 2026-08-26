import React from 'react';
import { useAuth } from './AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';

/**
 * Render children only when the current user holds `permission`.
 * `fallback` (default: nothing) is shown otherwise.
 */
export function Can({ permission, children, fallback = null }) {
  const { can } = useAuth();
  return can(permission) ? children : fallback;
}

/**
 * A Button that disables itself — with an explanatory tooltip — when the user
 * lacks `permission`. The server still enforces the rule; this is UX only,
 * making unavailable actions obvious instead of failing after a click.
 */
export function PermissionButton({ permission, children, ...props }) {
  const { can } = useAuth();
  if (can(permission)) return <Button {...props}>{children}</Button>;
  return (
    <span title="You don't have permission for this action" className="inline-flex cursor-not-allowed">
      <Button {...props} disabled>{children}</Button>
    </span>
  );
}
