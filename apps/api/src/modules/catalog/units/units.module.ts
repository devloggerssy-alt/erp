import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { UnitsRepository } from './repositories/units.repository';
import { UnitsService } from './services/units.service';
import { UnitsExportService } from './services/units-export.service';
import { UnitsImportService } from './services/units-import.service';
import { UnitPresenter } from './presenters/unit.presenter';
import { UnitsController } from './controllers/units.controller';
import { UnitsImportExportController } from './controllers/units-import-export.controller';
import { UnitsAiTools } from './units.ai-tools';

@Module({
  controllers: [UnitsImportExportController, UnitsController],
  providers: [UnitsRepository, UnitsService, UnitsExportService, UnitsImportService, UnitPresenter, LocaleResolverService, UnitsAiTools],
  exports: [UnitsService],
})
export class UnitsModule {}