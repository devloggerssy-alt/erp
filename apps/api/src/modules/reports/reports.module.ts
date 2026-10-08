import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { ReportsController } from './reports.controller';
import { DashboardController } from './dashboard.controller';
import { ReportsService } from './reports.service';
import { ReportsPresenter } from './presenters/reports.presenter';
import { ReportsAiTools } from './reports.ai-tools';

@Module({
    controllers: [ReportsController, DashboardController],
    providers: [ReportsService, ReportsPresenter, LocaleResolverService, ReportsAiTools],
    exports: [ReportsService],
})
export class ReportsModule {}
