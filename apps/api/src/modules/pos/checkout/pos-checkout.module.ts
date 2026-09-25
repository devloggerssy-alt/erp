import { Module } from '@nestjs/common';
import { SalesCheckoutModule } from '../../invoicing';
import { PosSettingsModule } from '../settings/pos-settings.module';
import { PosCheckoutService } from './services/pos-checkout.service';
import { PosCheckoutController } from './controllers/pos-checkout.controller';

@Module({
    imports: [SalesCheckoutModule, PosSettingsModule],
    controllers: [PosCheckoutController],
    providers: [PosCheckoutService],
    exports: [PosCheckoutService],
})
export class PosCheckoutModule {}
