import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';
import { IStorageProvider } from './storage.interface';
import {
    generateUniqueFilename,
    generateS3Key,
    generateS3Url,
    generateCloudFrontUrl,
    getContentType,
    validateFile,
    FileValidationResult,
} from './s3.utils';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
    private readonly logger = new Logger(S3StorageProvider.name);
    private s3Client: S3Client;
    private bucketName: string;
    private region: string;
    private cloudFrontDomain?: string;
    private usePathStyle: boolean;

    constructor(private readonly configService: ConfigService) {
        this.region = this.configService.get<string>('AWS_REGION')!;
        this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME')!;
        this.cloudFrontDomain = this.configService.get<string>('AWS_CLOUDFRONT_DOMAIN');
        const pathStyleConfig = this.configService.get<string>('AWS_S3_PATH_STYLE', 'false');
        this.usePathStyle = pathStyleConfig === 'true';

        this.s3Client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
                secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
            },
            forcePathStyle: this.usePathStyle,
        });
    }

    /**
     * Validate file before upload
     */
    validateFile(file: Express.Multer.File): FileValidationResult {
        return validateFile(file);
    }

    async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
        // Validate file
        const validation = this.validateFile(file);
        if (!validation.isValid) {
            throw new Error(validation.error || 'File validation failed');
        }

        // Generate unique filename
        const uniqueFilename = generateUniqueFilename(file.originalname);
        
        // Generate S3 key using utility
        const key = generateS3Key(folder, uniqueFilename);
        
        // Get content type (use utility as fallback)
        const contentType = getContentType(file.originalname, file.mimetype);

        try {
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: contentType,
                // Add metadata
                Metadata: {
                    originalName: file.originalname,
                    uploadedAt: new Date().toISOString(),
                },
            });

            await this.s3Client.send(command);
            this.logger.debug(`File uploaded successfully: ${key}`);

            return key;
        } catch (error) {
            this.logger.error(`Failed to upload file to S3: ${key}`, error);
            
            if (error instanceof S3ServiceException) {
                throw new Error(`S3 upload failed: ${error.message}`);
            }
            throw error;
        }
    }

    async deleteFile(filePath: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: filePath,
            });

            await this.s3Client.send(command);
            this.logger.debug(`File deleted successfully: ${filePath}`);
        } catch (error) {
            // Log error but don't throw - file might already be deleted
            this.logger.warn(`Failed to delete file from S3: ${filePath}`, error);
            
            // Re-throw only if it's not a "Not Found" error
            if (error instanceof S3ServiceException && error.name !== 'NoSuchKey') {
                throw new Error(`S3 delete failed: ${error.message}`);
            }
        }
    }

    getFileUrl(filePath: string): string {
        // Use CloudFront URL if configured, otherwise use S3 URL
        if (this.cloudFrontDomain) {
            return generateCloudFrontUrl(this.cloudFrontDomain, filePath);
        }
        
        return generateS3Url(this.bucketName, this.region, filePath, this.usePathStyle);
    }
}
