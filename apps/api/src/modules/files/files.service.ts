import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './storage/local.storage';
import { S3StorageProvider } from './storage/s3.storage';
import { IStorageProvider } from './storage/storage.interface';
import { FILE_SIZE_LIMITS, IMAGE_MIME_TYPES, validateFile } from './storage/s3.utils';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { createHash } from 'crypto';

@Injectable()
export class FilesService {
    private storage: IStorageProvider;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        const storageType = this.configService.get<string>('STORAGE_TYPE', 'local');
        this.storage = storageType === 's3'
            ? new S3StorageProvider(this.configService)
            : new LocalStorageProvider();
    }

    async upload(file: Express.Multer.File, folder: string, tenantId: string) {
        const path = await this.storage.uploadFile(file, `${tenantId}/${folder}`);
        const url = this.storage.getFileUrl(path);

        const extension = this.extractExtension(file.originalname);
        const checksum = this.computeSha256(file.buffer);

        // Physical file was already overwritten by storage provider; remove stale DB record.
        const existing = await this.prisma.file.findUnique({ where: { path } });
        if (existing) {
            await this.prisma.file.delete({ where: { path } });
        }

        return this.prisma.file.create({
            data: {
                tenantId,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                extension,
                folder,
                path,
                url,
                checksum,
            },
        });
    }

    /**
     * Self-service avatar upload: validates image type/size for every storage
     * provider (the S3 provider validates internally, the local one does not)
     * and stores the file under the caller's avatar folder.
     */
    async uploadAvatar(file: Express.Multer.File, tenantId: string, userId: string) {
        const validation = validateFile(file, {
            allowedMimeTypes: IMAGE_MIME_TYPES,
            maxSize: FILE_SIZE_LIMITS.IMAGE,
        });
        if (!validation.isValid) {
            throw new BadRequestException(validation.error ?? 'Invalid avatar file');
        }

        return this.upload(file, `avatars/${userId}`, tenantId);
    }

    async delete(id: string, tenantId: string) {
        const file = await this.prisma.file.findUnique({ where: { id } });
        if (!file || file.tenantId !== tenantId) {
            throw new NotFoundException(`File not found`);
        }
        await this.storage.deleteFile(file.path);
        await this.prisma.file.delete({ where: { id } });
    }

    private extractExtension(filename: string) {
        const idx = filename.lastIndexOf('.');
        return idx >= 0 ? filename.substring(idx + 1).toLowerCase() : null;
    }

    private computeSha256(buffer?: Buffer) {
        if (!buffer) return null;
        return createHash('sha256').update(buffer).digest('hex');
    }
}
