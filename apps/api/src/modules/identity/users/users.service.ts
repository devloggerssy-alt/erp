import { Injectable, ConflictException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from './repositories/users.repository';
import { UserPresenter } from './presenters/user.presenter';

@Injectable()
export class UsersService {
    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly userPresenter: UserPresenter,
    ) {}

    async findAll(tenantId: string, page = 1, limit = 20) {
        const { data, total } = await this.usersRepository.findAll(tenantId, page, limit);

        return {
            data: data.map((u) => this.userPresenter.toResponse(u)),
            total,
            page,
            limit,
        };
    }

    async create(tenantId: string, dto: CreateUserDto) {
        const existing = await this.usersRepository.findByEmailInTenant(tenantId, dto.email);
        if (existing) {
            throw new ConflictException('User with this email already exists in this tenant');
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);

        const user = await this.usersRepository.createUser({
            tenantId,
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            phone: dto.phone,
            roleIds: dto.roleIds,
        });

        return this.userPresenter.toResponse(user);
    }

    async update(tenantId: string, userId: string, dto: UpdateUserDto) {
        await this.usersRepository.findByIdInTenant(tenantId, userId);

        if (dto.roleIds !== undefined) {
            await this.usersRepository.replaceRoles(userId, dto.roleIds);
        }

        const updated = await this.usersRepository.updateUser(userId, {
            email: dto.email,
            fullName: dto.fullName,
            phone: dto.phone,
        });

        return this.userPresenter.toResponse(updated);
    }

    async updateStatus(tenantId: string, userId: string, isActive: boolean) {
        await this.usersRepository.findByIdInTenant(tenantId, userId);
        return this.usersRepository.updateStatus(userId, isActive);
    }
}
