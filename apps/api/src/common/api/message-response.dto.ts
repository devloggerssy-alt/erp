import { ApiProperty } from '@nestjs/swagger';

/**
 * Envelope for state-changing actions that return no payload: the runtime
 * response is `ApiResponseBuilder.success(null, '<message>')`, so `data` is
 * always null.
 *
 * Exists so those routes can be documented with a concrete schema. A Swagger
 * response declared with `example` only (no `type`) is emitted by
 * openapi-typescript as `"application/json": unknown`, which counts as an
 * untyped response in `scripts/audit-openapi-response-types.mjs`.
 */
export class ApiMessageResponseDto {
    @ApiProperty({ example: 'success' })
    status = 'success' as const;

    @ApiProperty({ example: 'Account restored' })
    message: string = '';

    @ApiProperty({
        type: () => Object,
        nullable: true,
        default: null,
        example: null,
        description: 'Always null — the action returns no payload',
    })
    data: null = null;
}
