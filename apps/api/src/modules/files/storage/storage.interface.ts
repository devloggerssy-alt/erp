export interface IStorageProvider {
    uploadFile(file: Express.Multer.File, folder: string): Promise<string>;
    deleteFile(filePath: string): Promise<void>;
    getFileUrl(filePath: string): string;
}


