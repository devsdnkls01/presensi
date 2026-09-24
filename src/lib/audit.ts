import { prisma } from './prisma';

export async function createAuditLog({
  action,
  actor,
  details,
  schoolId,
  ipAddress,
}: {
  action: string;
  actor: string;
  details: string;
  schoolId?: string | null;
  ipAddress?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actor,
        details,
        schoolId: schoolId || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
