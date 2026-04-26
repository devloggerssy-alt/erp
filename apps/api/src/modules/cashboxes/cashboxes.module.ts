import { Module } from '@nestjs/common';
import { CashboxesController } from './cashboxes.controller';
import { CashboxesService } from './cashboxes.service';

@Module({
    controllers: [CashboxesController],
    providers: [CashboxesService],
    exports: [CashboxesService],
})
export class CashboxesModule {}
