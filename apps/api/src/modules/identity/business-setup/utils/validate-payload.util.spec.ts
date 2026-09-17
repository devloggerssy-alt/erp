import { IsString, IsNotEmpty } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { validateAs, validateArrayAs } from './validate-payload.util';

class FixtureDto {
    @IsString()
    @IsNotEmpty()
    code: string = '';
}

describe('validateAs', () => {
    it('returns a validated class instance for valid input', async () => {
        const result = await validateAs(FixtureDto, { code: 'ABC' });
        expect(result).toBeInstanceOf(FixtureDto);
        expect(result.code).toBe('ABC');
    });

    it('throws BadRequestException with constraint messages for invalid input', async () => {
        await expect(validateAs(FixtureDto, { code: '' })).rejects.toThrow(BadRequestException);
    });

    it('treats an undefined payload as {} and still fails required-field validation', async () => {
        await expect(validateAs(FixtureDto, undefined)).rejects.toThrow(BadRequestException);
    });
});

describe('validateArrayAs', () => {
    it('validates every item and returns typed instances', async () => {
        const result = await validateArrayAs(FixtureDto, [{ code: 'A' }, { code: 'B' }]);
        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(FixtureDto);
        expect(result[1].code).toBe('B');
    });

    it('rejects a non-array payload', async () => {
        await expect(validateArrayAs(FixtureDto, { code: 'A' })).rejects.toThrow('Expected a non-empty array payload');
    });

    it('rejects an empty array', async () => {
        await expect(validateArrayAs(FixtureDto, [])).rejects.toThrow('Expected a non-empty array payload');
    });

    it('rejects when any single item fails validation', async () => {
        await expect(validateArrayAs(FixtureDto, [{ code: 'A' }, { code: '' }])).rejects.toThrow(BadRequestException);
    });
});
