import { Module } from '@nestjs/common';
import { CodeSequencesService } from './services/code-sequences.service';
import { CodeSequencesRepository } from './repositories/code-sequences.repository';

@Module({
    providers: [CodeSequencesService, CodeSequencesRepository],
    exports: [CodeSequencesService],
})
export class CodeSequencesModule {}
