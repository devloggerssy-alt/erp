import { randomUUID } from 'crypto';

/**
 * Supported image MIME types
 */
export const IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif',
    'image/bmp',
] as const;

/**
 * Supported document MIME types
 */
export const DOCUMENT_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
] as const;

/**
 * All supported MIME types
 */
export const ALLOWED_MIME_TYPES = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES] as const;

/**
 * File size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
    IMAGE: 10 * 1024 * 1024, // 10MB
    DOCUMENT: 50 * 1024 * 1024, // 50MB
    DEFAULT: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * File validation result
 */
export interface FileValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Sanitize filename by removing special characters and normalizing
 */
export function sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters
    let sanitized = filename
        .replace(/[^a-zA-Z0-9._-]/g, '-') // Replace invalid chars with dash
        .replace(/-+/g, '-') // Replace multiple dashes with single dash
        .replace(/^-|-$/g, ''); // Remove leading/trailing dashes

    // Limit filename length (max 255 chars, but leave room for extension and UUID)
    const maxLength = 200;
    if (sanitized.length > maxLength) {
        const lastDotIndex = sanitized.lastIndexOf('.');
        if (lastDotIndex > 0) {
            const ext = sanitized.substring(lastDotIndex);
            const name = sanitized.substring(0, lastDotIndex);
            sanitized = name.substring(0, maxLength - ext.length) + ext;
        } else {
            sanitized = sanitized.substring(0, maxLength);
        }
    }

    return sanitized.trim() || 'file';
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex >= 0 ? filename.substring(lastDotIndex + 1).toLowerCase() : '';
}

/**
 * Extract filename without extension
 */
export function getFileNameWithoutExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex >= 0 ? filename.substring(0, lastDotIndex) : filename;
}

/**
 * Validate file MIME type
 */
export function validateMimeType(mimeType: string, allowedTypes: readonly string[] = ALLOWED_MIME_TYPES): boolean {
    return allowedTypes.includes(mimeType);
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number = FILE_SIZE_LIMITS.DEFAULT): boolean {
    return size > 0 && size <= maxSize;
}

/**
 * Comprehensive file validation
 */
export function validateFile(
    file: Express.Multer.File,
    options: {
        allowedMimeTypes?: readonly string[];
        maxSize?: number;
        required?: boolean;
    } = {},
): FileValidationResult {
    const { allowedMimeTypes = ALLOWED_MIME_TYPES, maxSize = FILE_SIZE_LIMITS.DEFAULT, required = true } = options;

    if (!file) {
        return {
            isValid: false,
            error: required ? 'File is required' : undefined,
        };
    }

    if (!file.buffer || file.buffer.length === 0) {
        return {
            isValid: false,
            error: 'File buffer is empty',
        };
    }

    if (!validateMimeType(file.mimetype, allowedMimeTypes)) {
        return {
            isValid: false,
            error: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
        };
    }

    if (!validateFileSize(file.size, maxSize)) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        return {
            isValid: false,
            error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
        };
    }

    return { isValid: true };
}

/**
 * Generate S3 key (path) for file
 */
export function generateS3Key(folder: string, filename: string, addTimestamp: boolean = false): string {
    const sanitizedFilename = sanitizeFilename(filename);
    const timestamp = addTimestamp ? `-${Date.now()}` : '';
    const key = folder ? `${folder}/${sanitizedFilename}${timestamp}` : `${sanitizedFilename}${timestamp}`;

    // Ensure key doesn't start with /
    return key.replace(/^\/+/, '');
}

/**
 * Generate unique filename with UUID
 */
export function generateUniqueFilename(originalName: string, includeExtension: boolean = true): string {
    const extension = includeExtension ? getFileExtension(originalName) : '';
    const nameWithoutExt = getFileNameWithoutExtension(originalName);
    const sanitizedName = sanitizeFilename(nameWithoutExt);
    const ext = extension ? `.${extension}` : '';

    return `${sanitizedName}-${randomUUID()}${ext}`;
}

/**
 * Generate S3 URL based on region and bucket
 */
export function generateS3Url(bucketName: string, region: string, key: string, usePathStyle: boolean = false): string {
    // Remove leading slash from key if present
    const cleanKey = key.replace(/^\/+/, '');

    if (usePathStyle) {
        // Path-style URL: https://s3.region.amazonaws.com/bucket/key
        return `https://s3.${region}.amazonaws.com/${bucketName}/${cleanKey}`;
    } else {
        // Virtual-hosted-style URL: https://bucket.s3.region.amazonaws.com/key
        // Also handle special cases for certain regions
        if (region === 'us-east-1') {
            return `https://${bucketName}.s3.amazonaws.com/${cleanKey}`;
        } else {
            return `https://${bucketName}.s3.${region}.amazonaws.com/${cleanKey}`;
        }
    }
}

/**
 * Generate CloudFront URL if CloudFront distribution is configured
 */
export function generateCloudFrontUrl(cloudFrontDomain: string, key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    return `https://${cloudFrontDomain}/${cleanKey}`;
}

/**
 * Extract bucket and key from S3 URL
 */
export function parseS3Url(url: string): { bucket: string; key: string } | null {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Handle virtual-hosted-style: bucket.s3.region.amazonaws.com
        const virtualHostedMatch = hostname.match(/^(.+)\.s3(?:\.(.+))?\.amazonaws\.com$/);
        if (virtualHostedMatch) {
            return {
                bucket: virtualHostedMatch[1],
                key: urlObj.pathname.substring(1), // Remove leading /
            };
        }

        // Handle path-style: s3.region.amazonaws.com/bucket/key
        const pathStyleMatch = hostname.match(/^s3(?:\.(.+))?\.amazonaws\.com$/);
        if (pathStyleMatch) {
            const pathParts = urlObj.pathname.substring(1).split('/');
            if (pathParts.length >= 2) {
                return {
                    bucket: pathParts[0],
                    key: pathParts.slice(1).join('/'),
                };
            }
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Get appropriate file size limit based on MIME type
 */
export function getFileSizeLimit(mimeType: string): number {
    if (IMAGE_MIME_TYPES.includes(mimeType as any)) {
        return FILE_SIZE_LIMITS.IMAGE;
    }
    if (DOCUMENT_MIME_TYPES.includes(mimeType as any)) {
        return FILE_SIZE_LIMITS.DOCUMENT;
    }
    return FILE_SIZE_LIMITS.DEFAULT;
}

/**
 * Check if file is an image
 */
export function isImage(mimeType: string): boolean {
    return IMAGE_MIME_TYPES.includes(mimeType as any);
}

/**
 * Check if file is a document
 */
export function isDocument(mimeType: string): boolean {
    return DOCUMENT_MIME_TYPES.includes(mimeType as any);
}

/**
 * Get content type header for S3 upload
 */
export function getContentType(filename: string, defaultMimeType?: string): string {
    const extension = getFileExtension(filename);

    const mimeTypeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        avif: 'image/avif',
        bmp: 'image/bmp',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        txt: 'text/plain',
        csv: 'text/csv',
    };

    return mimeTypeMap[extension] || defaultMimeType || 'application/octet-stream';
}

/**
 * Format file size for human-readable display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Batch upload configuration
 */
export interface BatchUploadConfig {
    folder: string;
    allowedMimeTypes?: readonly string[];
    maxSize?: number;
    generateUniqueNames?: boolean;
}

/**
 * Validate multiple files for batch upload
 */
export function validateFiles(
    files: Express.Multer.File[],
    config: BatchUploadConfig,
): { valid: Express.Multer.File[]; invalid: Array<{ file: Express.Multer.File; error: string }> } {
    const valid: Express.Multer.File[] = [];
    const invalid: Array<{ file: Express.Multer.File; error: string }> = [];

    for (const file of files) {
        const validation = validateFile(file, {
            allowedMimeTypes: config.allowedMimeTypes,
            maxSize: config.maxSize,
        });

        if (validation.isValid) {
            valid.push(file);
        } else {
            invalid.push({
                file,
                error: validation.error || 'Validation failed',
            });
        }
    }

    return { valid, invalid };
}
