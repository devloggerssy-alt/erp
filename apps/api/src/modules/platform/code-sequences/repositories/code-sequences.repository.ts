import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@devloggers/db-prisma/nest';

@Injectable()
export class CodeSequencesRepository {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Atomically reserves and returns the next value for a tenant + entity.
     * `INSERT ... ON CONFLICT DO UPDATE` keeps concurrent creates race-free.
     */
    async allocate(tenantId: string, entity: string): Promise<number> {
        const rows = await this.prisma.$queryRaw<Array<{ next_value: number }>>`
            INSERT INTO "code_sequences" ("id", "tenant_id", "entity", "next_value", "created_at", "updated_at")
            VALUES (${randomUUID()}, ${tenantId}, ${entity}, 1, now(), now())
            ON CONFLICT ("tenant_id", "entity")
            DO UPDATE SET "next_value" = "code_sequences"."next_value" + 1, "updated_at" = now()
            RETURNING "next_value"
        `;
        return rows[0]!.next_value;
    }
}
