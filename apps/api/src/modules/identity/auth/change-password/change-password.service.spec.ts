import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ChangePasswordService } from './change-password.service';

async function createPrismaMock(password = 'oldPassword1') {
    return {
        passwordHash: await bcrypt.hash(password, 10),
    };
}

function createService(passwordHash: string) {
    const prisma = {
        appUser: {
            findUnique: jest.fn().mockResolvedValue({ id: 'user-1', passwordHash }),
            update: jest.fn().mockResolvedValue({}),
        },
    };
    return { service: new ChangePasswordService(prisma as never), prisma };
}

describe('ChangePasswordService', () => {
    it('rejects a wrong current password and keeps the stored hash', async () => {
        const { passwordHash } = await createPrismaMock();
        const { service, prisma } = createService(passwordHash);

        await expect(service.changePassword('user-1', 'wrong-password', 'newPassword1')).rejects.toThrow(
            BadRequestException,
        );
        expect(prisma.appUser.update).not.toHaveBeenCalled();
    });

    it('rejects a new password equal to the current one', async () => {
        const { passwordHash } = await createPrismaMock('oldPassword1');
        const { service, prisma } = createService(passwordHash);

        await expect(service.changePassword('user-1', 'oldPassword1', 'oldPassword1')).rejects.toThrow(
            BadRequestException,
        );
        expect(prisma.appUser.update).not.toHaveBeenCalled();
    });

    it('stores a new hash when the current password matches', async () => {
        const { passwordHash } = await createPrismaMock('oldPassword1');
        const { service, prisma } = createService(passwordHash);

        await service.changePassword('user-1', 'oldPassword1', 'newPassword1');

        expect(prisma.appUser.update).toHaveBeenCalledTimes(1);
        const update = prisma.appUser.update.mock.calls[0][0];
        expect(update.where).toEqual({ id: 'user-1' });
        await expect(bcrypt.compare('newPassword1', update.data.passwordHash)).resolves.toBe(true);
    });

    it('fails unauthorized when the user no longer exists', async () => {
        const { service, prisma } = createService('irrelevant');
        prisma.appUser.findUnique.mockResolvedValue(null);

        await expect(service.changePassword('user-1', 'oldPassword1', 'newPassword1')).rejects.toThrow(
            UnauthorizedException,
        );
    });
});
