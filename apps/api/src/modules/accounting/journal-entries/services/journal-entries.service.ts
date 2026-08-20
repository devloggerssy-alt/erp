import { Injectable, NotFoundException } from '@nestjs/common';
import { JournalEntriesRepository } from '../repositories/journal-entries.repository';

@Injectable()
export class JournalEntriesService {
    constructor(private readonly repository: JournalEntriesRepository) {}

    async findJournalEntries(tenantId: string, page = 1, limit = 50) {
        const { data, total } = await this.repository.findMany(tenantId, page, limit);
        return { data, total, page, limit };
    }

    async findJournalEntryById(tenantId: string, id: string) {
        const entry = await this.repository.findById(tenantId, id);
        if (!entry) throw new NotFoundException('Journal entry not found');
        return entry;
    }
}
