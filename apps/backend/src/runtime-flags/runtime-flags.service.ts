import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const FLAG_KEY = /^[a-z0-9][a-z0-9._-]{1,127}$/;

@Injectable()
export class RuntimeFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.runtimeFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async set(key: string, enabled: boolean, reason: string, updatedBy: string) {
    if (!FLAG_KEY.test(key)) throw new BadRequestException('Invalid flag key');
    return this.prisma.runtimeFlag.upsert({
      where: { key },
      create: { key, enabled, reason, updatedBy },
      update: { enabled, reason, updatedBy },
    });
  }

  /** Server-side hard filter: a disabled service/geography cannot be booked.
   * `pilot.enabled` changes the geography default to deny until allowed.
   */
  async assertBookingAllowed(serviceId: string, townVillageId: string): Promise<void> {
    const keys = [
      'bookings.enabled',
      'pilot.enabled',
      `service.${serviceId}.enabled`,
      `geography.${townVillageId}.enabled`,
    ];
    const rows = await this.prisma.runtimeFlag.findMany({
      where: { key: { in: keys } },
    });
    const flags = new Map(rows.map((item) => [item.key, item.enabled]));
    if (flags.get('bookings.enabled') === false)
      throw new ConflictException('Bookings are temporarily unavailable');
    if (flags.get(`service.${serviceId}.enabled`) === false)
      throw new ConflictException('This service has been temporarily disabled');
    if (flags.get(`geography.${townVillageId}.enabled`) === false ||
        (flags.get('pilot.enabled') === true &&
         flags.get(`geography.${townVillageId}.enabled`) !== true))
      throw new ConflictException('Bookings are not enabled for this geography');
  }
}
