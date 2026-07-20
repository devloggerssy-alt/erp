import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { AccountsModule } from '../../accounting/accounts/accounts.module';

@Module({
    imports: [DocumentSequencesModule, AccountsModule],
    controllers: [ExpensesController],
    providers: [ExpensesService],
    exports: [ExpensesService],
})
export class ExpensesModule {}
