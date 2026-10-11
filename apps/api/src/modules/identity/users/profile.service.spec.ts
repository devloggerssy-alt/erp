import { NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UsersRepository } from './repositories/users.repository';

function createRepositoryMock() {
    return {
        findByIdInTenant: jest.fn().mockResolvedValue({ id: 'user-1' }),
        updateUser: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'admin@demo-shop.com',
            fullName: 'Admin User',
            phone: '+963-933-111222',
            avatarUrl: '/uploads/t1/avatars/user-1/a.png',
        }),
    };
}

describe('ProfileService', () => {
    it('updates only the whitelisted profile fields', async () => {
        const repository = createRepositoryMock();
        const service = new ProfileService(repository as unknown as UsersRepository);

        await service.updateMe('tenant-1', 'user-1', {
            fullName: 'Admin User',
            phone: '+963-933-111222',
            avatarUrl: '/uploads/t1/avatars/user-1/a.png',
        });

        expect(repository.findByIdInTenant).toHaveBeenCalledWith('tenant-1', 'user-1');
        expect(repository.updateUser).toHaveBeenCalledWith('user-1', {
            fullName: 'Admin User',
            phone: '+963-933-111222',
            avatarUrl: '/uploads/t1/avatars/user-1/a.png',
        });
        const payload = repository.updateUser.mock.calls[0][1];
        expect(payload).not.toHaveProperty('email');
        expect(payload).not.toHaveProperty('password');
        expect(payload).not.toHaveProperty('isActive');
    });

    it('returns the updated profile shape', async () => {
        const repository = createRepositoryMock();
        const service = new ProfileService(repository as unknown as UsersRepository);

        const result = await service.updateMe('tenant-1', 'user-1', { fullName: 'Admin User' });

        expect(result).toEqual({
            id: 'user-1',
            email: 'admin@demo-shop.com',
            fullName: 'Admin User',
            phone: '+963-933-111222',
            avatarUrl: '/uploads/t1/avatars/user-1/a.png',
        });
    });

    it('does not update when the user is not in the tenant', async () => {
        const repository = createRepositoryMock();
        repository.findByIdInTenant.mockRejectedValue(new NotFoundException('User not found'));
        const service = new ProfileService(repository as unknown as UsersRepository);

        await expect(service.updateMe('tenant-2', 'user-1', { fullName: 'X' })).rejects.toThrow(NotFoundException);
        expect(repository.updateUser).not.toHaveBeenCalled();
    });
});
