import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

/**
 * Pins the request-DTO convention: required fields use definite-assignment (`!`),
 * never a value initializer.
 *
 * Under `strictPropertyInitialization`, a required DTO field must either carry an
 * initializer or `!`. Those two are NOT interchangeable: the global ValidationPipe
 * runs with `transform: true`, so `plainToInstance` constructs the class and any
 * initializer becomes a real value. A field absent from the request body then
 * arrives at the validators already populated, and the validator passes.
 *
 * `!` is purely a compile-time assertion — no runtime value — so an absent field
 * stays `undefined` and is still rejected.
 *
 * This matters most for enums: defaulting `PaymentTypeEnum` would let an omitted
 * `type` silently become RECEIPT, flipping the debit/credit direction chosen in
 * `payment-journal.ts`.
 *
 * Response DTOs are exempt — they are built by presenters and never validated.
 */

enum Kind {
    A = 'A',
    B = 'B',
}

class InitializedDto {
    @IsString() @IsNotEmpty() name: string = '';
    @IsEnum(Kind) kind: Kind = Kind.A;
    @IsBoolean() flag: boolean = false;
    @IsNumber() qty: number = 0;
    @IsArray() lines: string[] = [];
}

class DefiniteAssignmentDto {
    @IsString() @IsNotEmpty() name!: string;
    @IsEnum(Kind) kind!: Kind;
    @IsBoolean() flag!: boolean;
    @IsNumber() qty!: number;
    @IsArray() lines!: string[];
}

const ALL_FIELDS = ['flag', 'kind', 'lines', 'name', 'qty'];

/** Property names rejected when validating an empty request body. */
function rejectedFieldsForEmptyBody(dtoClass: new () => object): string[] {
    return validateSync(plainToInstance(dtoClass, {}))
        .map((error) => error.property)
        .sort();
}

describe('request DTO required-field convention', () => {
    it('definite assignment (`!`) rejects every absent required field', () => {
        expect(rejectedFieldsForEmptyBody(DefiniteAssignmentDto)).toEqual(ALL_FIELDS);
    });

    it('value initializers silently accept absent fields — why the convention forbids them', () => {
        // Only `name` is caught, and only because @IsNotEmpty() rejects the '' default.
        // kind/flag/qty/lines all pass validation despite being absent from the body.
        expect(rejectedFieldsForEmptyBody(InitializedDto)).toEqual(['name']);
    });
});
