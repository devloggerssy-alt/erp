export enum ApiErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',

    // Custom Business Codes
    USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
    // ... and more
}

export interface FieldError {
    field: string;
    message: string;
    code?: string;
}


export interface ApiErrorResponse {
    status: 'error';
    code: ApiErrorCode | string;
    message: string;
    errors?: FieldError[];
    traceId?: string;
}