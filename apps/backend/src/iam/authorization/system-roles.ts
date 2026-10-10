/**
 * Name of the seeded, non-deletable role that bypasses permission checks
 * entirely (AuthorizationService). Exists to solve IAM's bootstrapping
 * problem: the very first admin can't be granted `iam.assignment.manage`
 * through the API, because no one yet holds a permission that would let
 * them call it. `prisma/seed.ts` creates this role and — if
 * IAM_BOOTSTRAP_ADMIN_PHONE/EMAIL is set and matches an existing user —
 * assigns it platform-wide.
 */
export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';
