import { ConflictException, Injectable } from '@nestjs/common';
import { CodeSequencesRepository } from '../repositories/code-sequences.repository';

/** Master-data entities whose codes are system-generated when omitted. */
export type CodeSequenceEntity = 'warehouse' | 'cashbox' | 'item' | 'bank_account';

const CODE_FORMATS: Record<CodeSequenceEntity, { prefix: string; padding: number }> = {
    warehouse: { prefix: 'WH', padding: 4 },
    cashbox: { prefix: 'CSH', padding: 4 },
    item: { prefix: 'ITM', padding: 4 },
    bank_account: { prefix: 'BA', padding: 4 },
};

@Injectable()
export class CodeSequencesService {
    constructor(private readonly repository: CodeSequencesRepository) {}

    /**
     * Allocates the next formatted code. Pass `isTaken` to skip codes already in
     * use (e.g. manually entered before generation existed).
     */
    async next(
        tenantId: string,
        entity: CodeSequenceEntity,
        isTaken?: (code: string) => Promise<boolean>,
    ): Promise<string> {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const value = await this.repository.allocate(tenantId, entity);
            const code = this.format(entity, value);
            if (!isTaken || !(await isTaken(code))) return code;
        }
        throw new ConflictException(`Could not generate a unique ${entity} code`);
    }

    private format(entity: CodeSequenceEntity, value: number): string {
        const { prefix, padding } = CODE_FORMATS[entity];
        return `${prefix}-${String(value).padStart(padding, '0')}`;
    }
}
