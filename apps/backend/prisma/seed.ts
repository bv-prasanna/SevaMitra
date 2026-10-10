/**
 * Idempotent — safe to re-run on every deploy. Two jobs:
 * 1. Upsert the fixed permission catalog (src/iam/permission/permission-catalog.ts)
 *    into auth.permissions.
 * 2. Ensure the SUPER_ADMIN system role exists, and — if
 *    IAM_BOOTSTRAP_ADMIN_PHONE or IAM_BOOTSTRAP_ADMIN_EMAIL is set and
 *    matches an existing user — grant it to that user platform-wide. This
 *    solves IAM's bootstrapping problem: the very first admin can't be
 *    granted permissions through the API, because nobody yet holds
 *    `iam.assignment.manage` to call it with (see src/iam/authorization/system-roles.ts).
 *
 * Usage: npm run db:seed
 */
import 'dotenv/config';
import { PrismaClient, ScopeType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PERMISSION_CATALOG } from '../src/iam/permission/permission-catalog';
import { SUPER_ADMIN_ROLE } from '../src/iam/authorization/system-roles';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const entry of PERMISSION_CATALOG) {
      await prisma.permission.upsert({
        where: { key: entry.key },
        update: { description: entry.description },
        create: entry,
      });
    }
    console.log(`Seeded ${PERMISSION_CATALOG.length} permissions`);

    const superAdminRole = await prisma.role.upsert({
      where: { name: SUPER_ADMIN_ROLE },
      update: {},
      create: {
        name: SUPER_ADMIN_ROLE,
        description: 'Bypasses all permission checks (see AuthorizationService)',
        isSystem: true,
      },
    });
    console.log(`Ensured system role "${SUPER_ADMIN_ROLE}"`);

    const bootstrapPhone = process.env.IAM_BOOTSTRAP_ADMIN_PHONE;
    const bootstrapEmail = process.env.IAM_BOOTSTRAP_ADMIN_EMAIL;
    if (bootstrapPhone || bootstrapEmail) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            bootstrapPhone ? { phoneNumber: bootstrapPhone } : undefined,
            bootstrapEmail ? { email: bootstrapEmail } : undefined,
          ].filter((c): c is NonNullable<typeof c> => c !== undefined),
        },
      });

      if (!user) {
        console.warn(
          'IAM_BOOTSTRAP_ADMIN_PHONE/EMAIL set but no matching user exists yet — skipping bootstrap assignment. Re-run this seed after the user has logged in once.',
        );
      } else {
        const existing = await prisma.userRoleAssignment.findFirst({
          where: {
            userId: user.id,
            roleId: superAdminRole.id,
            scopeType: ScopeType.PLATFORM,
            revokedAt: null,
          },
        });
        if (existing) {
          console.log(`User ${user.id} already holds ${SUPER_ADMIN_ROLE}`);
        } else {
          await prisma.userRoleAssignment.create({
            data: {
              userId: user.id,
              roleId: superAdminRole.id,
              scopeType: ScopeType.PLATFORM,
            },
          });
          console.log(`Granted ${SUPER_ADMIN_ROLE} to user ${user.id}`);
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
