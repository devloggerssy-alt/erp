import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { PostingModule } from '../../accounting/posting';

@Module({
    imports: [DocumentSequencesModule, PostingModule],
    controllers: [ExpensesController],
    providers: [ExpensesService],
    exports: [ExpensesService],
})
export class ExpensesModule {}
