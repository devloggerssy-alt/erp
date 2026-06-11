import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

@Injectable()
export class TagAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, entityType: string, entityId: string) {
    const assignments = await this.prisma.tagAssignment.findMany({
      where: { tenantId, entityType, entityId },
      include: { tag: { select: { id: true, name: true, color: true, module: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return assignments.map((a) => ({
      id: a.id,
      tagId: a.tagId,
      entityType: a.entityType,
      entityId: a.entityId,
      tag: { id: a.tag.id, name: a.tag.name, color: a.tag.color ?? null, module: a.tag.module },
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async assign(
    tenantId: string,
    dto: { tagId: string; entityType: string; entityId: string },
  ) {
    // Verify the tag exists and belongs to this tenant
    const tag = await this.prisma.tag.findFirst({ where: { id: dto.tagId, tenantId } });
    if (!tag) throw new NotFoundException(`Tag not found`);

    // Check for duplicate assignment
    const existing = await this.prisma.tagAssignment.findFirst({
      where: { tagId: dto.tagId, entityType: dto.entityType, entityId: dto.entityId },
    });
    if (existing) throw new ConflictException('This tag is already assigned to this entity');

    const created = await this.prisma.tagAssignment.create({
      data: { tenantId, tagId: dto.tagId, entityType: dto.entityType, entityId: dto.entityId },
      include: { tag: { select: { id: true, name: true, color: true, module: true } } },
    });
    return {
      id: created.id,
      tagId: created.tagId,
      entityType: created.entityType,
      entityId: created.entityId,
      tag: {
        id: created.tag.id,
        name: created.tag.name,
        color: created.tag.color ?? null,
        module: created.tag.module,
      },
      createdAt: created.createdAt.toISOString(),
    };
  }

  async unassign(tenantId: string, id: string) {
    const assignment = await this.prisma.tagAssignment.findFirst({ where: { id, tenantId } });
    if (!assignment) throw new NotFoundException(`Tag assignment not found`);
    await this.prisma.tagAssignment.delete({ where: { id } });
  }
}
