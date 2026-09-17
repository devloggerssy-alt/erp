import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';
import type { BusinessSetupProfileModules } from '../constants/setup-task-graph';

const DEFAULT_PROFILE: BusinessSetupProfileModules = { inventory: true, sales: true, purchasing: true, accounting: true };

@Injectable()
export class BusinessSetupProfileService {
    constructor(private readonly prisma: PrismaService) {}

    async getProfile(tenantId: string): Promise<BusinessSetupProfileModules> {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessSetupProfile: true } });
        const stored = tenant?.businessSetupProfile as Partial<BusinessSetupProfileModules> | null;
        return stored ? { ...DEFAULT_PROFILE, ...stored } : DEFAULT_PROFILE;
    }

    async setProfile(tenantId: string, profile: BusinessSetupProfileModules): Promise<void> {
        await this.prisma.tenant.update({ where: { id: tenantId }, data: { businessSetupProfile: profile as unknown as Prisma.InputJsonValue } });
    }
}
