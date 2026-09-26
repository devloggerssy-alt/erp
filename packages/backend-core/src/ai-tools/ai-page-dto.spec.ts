import { AiPageDto } from './ai-tool-dtos';
import { dtoInput } from './dto-input';

describe('AiPageDto', () => {
    const input = dtoInput(AiPageDto);

    it('describes page and limit in the JSON schema', () => {
        expect(Object.keys(input.jsonSchema.properties ?? {})).toEqual(['page', 'limit']);
        expect(input.jsonSchema.properties?.limit).toMatchObject({ maximum: 50 });
    });

    it('accepts an empty object and valid paging', async () => {
        await expect(input.validate({})).resolves.toMatchObject({ ok: true });
        await expect(input.validate({ page: 2, limit: 50 })).resolves.toMatchObject({ ok: true });
    });

    it('rejects limit above 50, page below 1 and unknown fields', async () => {
        await expect(input.validate({ limit: 51 })).resolves.toMatchObject({ ok: false });
        await expect(input.validate({ page: 0 })).resolves.toMatchObject({ ok: false });
        await expect(input.validate({ search: 'x' })).resolves.toMatchObject({ ok: false });
    });
});
