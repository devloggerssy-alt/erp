import { Module } from '@nestjs/common';
import { PosSettingsModule } from './settings/pos-settings.module';
import { PosCheckoutModule } from './checkout/pos-checkout.module';

@Module({
    imports: [PosSettingsModule, PosCheckoutModule],
    exports: [PosSettingsModule, PosCheckoutModule],
})
export class PosModule {}
