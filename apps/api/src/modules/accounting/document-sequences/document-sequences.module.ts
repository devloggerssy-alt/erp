import { Module } from '@nestjs/common';
import { DocumentSequencesController } from './controllers/document-sequences.controller';
import { DocumentSequencesService } from './services/document-sequences.service';
import { DocumentSequencesRepository } from './repositories/document-sequences.repository';
import { DocumentSequencePresenter } from './presenters/document-sequence.presenter';

@Module({
    controllers: [DocumentSequencesController],
    providers: [DocumentSequencesService, DocumentSequencesRepository, DocumentSequencePresenter],
    exports: [DocumentSequencesService],
})
export class DocumentSequencesModule {}
