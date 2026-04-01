import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateRoleDto, UpdateRoleDto } from './dto';

@Injectable()
export class RolesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string) {
        return this.prisma.role.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'asc' },
            include: {
                _count: { select: { userRoles: true } },
            },
        });
    }

    async create(tenantId: string, dto: CreateRoleDto) {
        const existing = await this.prisma.role.findUnique({
            where: { tenantId_name: { tenantId, name: dto.name } },
        });
        if (existing) {
            throw new ConflictException('Role with this name already exists');
        }

        return this.prisma.role.create({
            data: {
                tenantId,
                name: dto.name,
                description: dto.description,
            },
        });
    }

    async update(tenantId: string, roleId: string, dto: UpdateRoleDto) {
        const role = await this.prisma.role.findFirst({
            where: { id: roleId, tenantId },
        });
        if (!role) {
            throw new NotFoundException('Role not found');
        }
        if (role.isSystem) {
            throw new BadRequestException('System roles cannot be modified');
        }

        if (dto.name) {
            const existing = await this.prisma.role.findFirst({
                where: { tenantId, name: dto.name, id: { not: roleId } },
            });
            if (existing) {
                throw new ConflictException('Role with this name already exists');
            }
        }

        return this.prisma.role.update({
            where: { id: roleId },
            data: dto,
        });
    }
}
