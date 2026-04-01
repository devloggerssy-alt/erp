import { Module } from '@nestjs/common';
import { DocumentSequencesController } from './document-sequences.controller';
import { DocumentSequencesService } from './document-sequences.service';

@Module({
    controllers: [DocumentSequencesController],
    providers: [DocumentSequencesService],
    exports: [DocumentSequencesService],
})
export class DocumentSequencesModule {}
