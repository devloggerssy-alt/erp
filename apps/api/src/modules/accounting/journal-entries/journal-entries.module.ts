import { Module } from '@nestjs/common';
import { JournalEntriesRepository } from './repositories/journal-entries.repository';
import { JournalEntriesService } from './services/journal-entries.service';
import { JournalEntriesController } from './controllers/journal-entries.controller';

@Module({
    controllers: [JournalEntriesController],
    providers: [JournalEntriesRepository, JournalEntriesService],
    exports: [JournalEntriesService],
})
export class JournalEntriesModule {}
