import { applyDecorators, Type } from '@nestjs/common';
import {
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiUnprocessableEntityResponse,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    getSchemaPath,
    ApiExtraModels,
} from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../api/api-responses.dto';

/**
 * Applies standardized error-response decorators to a controller method.
 */
export function ApiStandardErrors(): MethodDecorator & ClassDecorator {
    return applyDecorators(
        ApiUnauthorizedResponse({
            description: 'JWT token is missing, expired, or invalid',
            schema: {
                example: {
                    status: 'error',
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
                    status: 'error',
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
                    status: 'error',
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
                    status: 'error',
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
                    status: 'error',
                    message: 'Internal server error',
                    data: null,
                    error: { code: 'INTERNAL_ERROR', message: 'An unexpected internal server error occurred' },
                },
            },
        }),
    );
}

/**
 * Custom decorator to document a standardized success response.
 */
export function ApiOkResponseStandard<T extends Type<any>>(
    model: T,
    options: { description?: string; isArray?: boolean } = {},
): MethodDecorator {
    return applyDecorators(
        ApiExtraModels(ApiSuccessResponseDto, model),
        ApiOkResponse({
            description: options.description || 'Success',
            schema: {
                allOf: [
                    { $ref: getSchemaPath(ApiSuccessResponseDto) },
                    {
                        properties: {
                            data: options.isArray
                                ? { type: 'array', items: { $ref: getSchemaPath(model) } }
                                : { $ref: getSchemaPath(model) },
                        },
                    },
                ],
            },
        }),
    );
}

/**
 * Custom decorator to document a standardized paginated success response.
 */
export function ApiOkResponsePaginated<T extends Type<any>>(
    model: T,
    options: { description?: string } = {},
): MethodDecorator {
    return applyDecorators(
        ApiExtraModels(ApiSuccessResponseDto, model),
        ApiOkResponse({
            description: options.description || 'Paginated success',
            schema: {
                allOf: [
                    { $ref: getSchemaPath(ApiSuccessResponseDto) },
                    {
                        properties: {
                            data: {
                                type: 'array',
                                items: { $ref: getSchemaPath(model) },
                            },
                        },
                    },
                ],
            },
        }),
    );
}
