import { applyDecorators } from '@nestjs/common';
import {
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiUnprocessableEntityResponse,
    ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

/**
 * Applies standardized error-response decorators to a controller method.
 *
 * Adds Swagger documentation for:
 * - 401 Unauthorized
 * - 403 Forbidden
 * - 404 Not Found
 * - 422 Validation Error
 * - 500 Internal Server Error
 */
export function ApiStandardErrors(): MethodDecorator & ClassDecorator {
    return applyDecorators(
        ApiUnauthorizedResponse({
            description: 'JWT token is missing, expired, or invalid',
            schema: {
                example: {
                    message: 'Unauthorized',
                    data: null,
                    error: { code: 'UNAUTHORIZED', message: 'JWT token is missing, expired, or invalid' },
                },
            },
        }),
        ApiForbiddenResponse({
            description: 'Insufficient permissions to perform this action',
            schema: {
                example: {
                    message: 'Forbidden',
                    data: null,
                    error: { code: 'FORBIDDEN', message: 'Insufficient permissions to perform this action' },
                },
            },
        }),
        ApiNotFoundResponse({
            description: 'The requested resource was not found',
            schema: {
                example: {
                    message: 'Not found',
                    data: null,
                    error: { code: 'NOT_FOUND', message: 'The requested resource was not found' },
                },
            },
        }),
        ApiUnprocessableEntityResponse({
            description: 'Request body validation failed',
            schema: {
                example: {
                    message: 'Validation failed',
                    data: null,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Validation failed',
                        details: [
                            { property: 'email', constraints: { isEmail: 'email must be a valid email address' } },
                        ],
                    },
                },
            },
        }),
        ApiInternalServerErrorResponse({
            description: 'An unexpected internal server error occurred',
            schema: {
                example: {
                    message: 'Internal server error',
                    data: null,
                    error: { code: 'INTERNAL_ERROR', message: 'An unexpected internal server error occurred' },
                },
            },
        }),
    );
}
