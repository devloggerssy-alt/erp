import { BadRequestException } from '@nestjs/common';
import { FilesService } from './files.service';
import { FILE_SIZE_LIMITS } from './storage/s3.utils';

function createService() {
    const prisma = { file: { findUnique: jest.fn(), delete: jest.fn(), create: jest.fn() } };
    const config = { get: jest.fn().mockReturnValue('local') };
    const service = new FilesService(prisma as never, config as never);
    return service;
}

function createFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
    return {
        fieldname: 'file',
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('fake-image'),
        ...overrides,
    } as Express.Multer.File;
}

describe('FilesService.uploadAvatar', () => {
    it('rejects a non-image file before touching storage', async () => {
        const service = createService();
        const uploadSpy = jest.spyOn(service, 'upload');

        await expect(
            service.uploadAvatar(createFile({ mimetype: 'application/pdf' }), 'tenant-1', 'user-1'),
        ).rejects.toThrow(BadRequestException);
        expect(uploadSpy).not.toHaveBeenCalled();
    });

    it('rejects an image above the image size limit', async () => {
        const service = createService();
        const uploadSpy = jest.spyOn(service, 'upload');

        await expect(
            service.uploadAvatar(
                createFile({ size: FILE_SIZE_LIMITS.IMAGE + 1, buffer: Buffer.alloc(FILE_SIZE_LIMITS.IMAGE + 1) }),
                'tenant-1',
                'user-1',
            ),
        ).rejects.toThrow(BadRequestException);
        expect(uploadSpy).not.toHaveBeenCalled();
    });

    it('stores valid images under the user avatar folder', async () => {
        const service = createService();
        const uploadSpy = jest.spyOn(service, 'upload').mockResolvedValue({ url: '/uploads/a.png' } as never);

        const file = createFile();
        await expect(service.uploadAvatar(file, 'tenant-1', 'user-1')).resolves.toEqual({ url: '/uploads/a.png' });
        expect(uploadSpy).toHaveBeenCalledWith(file, 'avatars/user-1', 'tenant-1');
    });
});
