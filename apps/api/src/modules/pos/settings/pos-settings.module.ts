import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { LocaleResolverService } from '@devloggers/backend-core';
import { PartiesModule } from '../../parties';
import { InvoiceTypesModule } from '../../invoicing';
import { PosSettingsRepository } from './repositories/pos-settings.repository';
import { PosSettingsService } from './services/pos-settings.service';
import { PosSettingPresenter } from './presenters/pos-setting.presenter';
import { PosSettingsController } from './controllers/pos-settings.controller';

@Module({
    imports: [PrismaModule, PartiesModule, InvoiceTypesModule],
    controllers: [PosSettingsController],
    providers: [PosSettingsRepository, PosSettingsService, PosSettingPresenter, LocaleResolverService],
    exports: [PosSettingsService],
})
export class PosSettingsModule {}
