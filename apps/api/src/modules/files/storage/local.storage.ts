import { IStorageProvider } from './storage.interface';
import { join } from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';

export class LocalStorageProvider implements IStorageProvider {
    private uploadRoot = join(process.cwd(), 'uploads');

    async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
        const folderPath = join(this.uploadRoot, folder);
        await fs.mkdir(folderPath, { recursive: true });

        // Extract filename and extension
        const lastDotIndex = file.originalname.lastIndexOf('.');
        const nameWithoutExt = lastDotIndex >= 0 
            ? file.originalname.substring(0, lastDotIndex) 
            : file.originalname;
        const extension = lastDotIndex >= 0 
            ? file.originalname.substring(lastDotIndex) 
            : '';
        
        // Generate unique filename with UUID to avoid conflicts
        const uniqueFilename = `${nameWithoutExt}-${randomUUID()}${extension}`;
        const filePath = join(folderPath, uniqueFilename);
        await fs.writeFile(filePath, file.buffer);

        return `${folder}/${uniqueFilename}`;
    }

    async deleteFile(filePath: string): Promise<void> {
        const fullPath = join(this.uploadRoot, filePath);
        await fs.unlink(fullPath).catch(() => null);
    }

    getFileUrl(filePath: string): string {
        return `/uploads/${filePath}`;
    }
}


