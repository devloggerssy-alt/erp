import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts.module';
import { ChartOfAccountsBootstrapService } from './chart-of-accounts-bootstrap.service';

@Module({
    imports: [AccountsModule],
    providers: [ChartOfAccountsBootstrapService],
    exports: [ChartOfAccountsBootstrapService],
})
export class ChartOfAccountsBootstrapModule {}
