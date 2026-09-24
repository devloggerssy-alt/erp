import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { PartiesController } from './parties.controller';
import { PartiesService } from './parties.service';
import { PartiesRepository } from './repositories/parties.repository';
import { PartyPresenter } from './presenters/party.presenter';
import { PartiesAiTools } from './parties.ai-tools';

@Module({
    imports: [PrismaModule],
    controllers: [PartiesController],
    providers: [PartiesService, PartiesRepository, PartyPresenter, PartiesAiTools],
    exports: [PartiesService],
})
export class PartiesModule {}
