import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { DashboardController } from './dashboard.controller';
import { ReportsService } from './reports.service';
import { ReportsAiTools } from './reports.ai-tools';

@Module({
    controllers: [ReportsController, DashboardController],
    providers: [ReportsService, ReportsAiTools],
    exports: [ReportsService],
})
export class ReportsModule {}
