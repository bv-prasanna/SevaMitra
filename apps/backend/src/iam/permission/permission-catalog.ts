/**
 * The fixed catalog of authorization checks that actually exist in code.
 * This is the single source of truth for two things kept deliberately in
 * sync by convention (same split as auth/dto/responses — see
 * docs/modules/AUTH_IMPLEMENTATION.md §7): `prisma/seed.ts` upserts these
 * rows into `auth.permissions`, and controllers reference the keys via
 * `@RequirePermissions()`. Adding a new guarded endpoint means adding an
 * entry here first, then re-running the seed.
 *
 * Permissions are not admin-creatable (PermissionService is read-only) —
 * only which Roles bundle which Permissions is admin-configurable, per BRD
 * §9's User Type -> Role -> Permissions -> Scope model.
 */
export interface PermissionCatalogEntry {
  key: string;
  description: string;
}

export const PERMISSION_CATALOG: readonly PermissionCatalogEntry[] = [
  {
    key: 'iam.role.manage',
    description:
      'Create, update, delete roles and edit their permission bundles',
  },
  {
    key: 'iam.role.view',
    description: 'List/view roles and their permission bundles',
  },
  {
    key: 'iam.permission.view',
    description: 'List the fixed permission catalog',
  },
  {
    key: 'iam.assignment.manage',
    description: 'Assign or revoke a role (with scope) for a user',
  },
  {
    key: 'iam.assignment.view',
    description: "View a user's role assignments",
  },
  {
    key: 'agent.company.manage',
    description: 'Create and update agent companies',
  },
  {
    key: 'provider.onboarding.review',
    description: 'View, claim, and decide provider onboarding applications',
  },
  {
    key: 'catalogue.manage',
    description: 'Create and update service categories, services, and variants',
  },
  {
    key: 'geography.manage',
    description:
      'Create and update states, districts, taluks, and towns/villages',
  },
  {
    key: 'serviceability.review',
    description: 'View, approve, and reject provider coverage area proposals',
  },
  {
    key: 'audit.view',
    description: 'View the audit log of authenticated write actions',
  },
  {
    key: 'notification.send',
    description: 'Send an operational or promotional notification to a user',
  },
  {
    key: 'commission.rule.manage',
    description: 'Create, update, and deactivate commission rules',
  },
  {
    key: 'commission.rule.view',
    description: 'List and view commission rules',
  },
  {
    key: 'commission.calculation.manage',
    description: 'Trigger commission calculation for a completed booking',
  },
  {
    key: 'commission.calculation.view',
    description: "View any booking's commission calculation",
  },
  {
    key: 'settlement.config.manage',
    description:
      'Create, update, and deactivate settlement cycle configuration',
  },
  {
    key: 'settlement.config.view',
    description: 'List and view settlement cycle configuration',
  },
  {
    key: 'settlement.manage',
    description: 'Run a settlement payout for a provider',
  },
  {
    key: 'settlement.view',
    description: "View any provider's settlements",
  },
  {
    key: 'refund.policy.manage',
    description: 'Create, update, and deactivate refund policies',
  },
  {
    key: 'refund.policy.view',
    description: 'List and view refund policies',
  },
  {
    key: 'refund.manage',
    description:
      "Process a refund for a booking's cancellation, no-show, or rejection",
  },
  {
    key: 'refund.view',
    description: "View any booking's refund",
  },
] as const;

export const PERMISSION_KEYS = PERMISSION_CATALOG.map((p) => p.key);
