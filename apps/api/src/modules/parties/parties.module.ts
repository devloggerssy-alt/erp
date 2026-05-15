import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { PartiesController } from './parties.controller';
import { PartiesService } from './parties.service';
import { PartiesRepository } from './repositories/parties.repository';
import { PartyPresenter } from './presenters/party.presenter';

@Module({
    imports: [PrismaModule],
    controllers: [PartiesController],
    providers: [PartiesService, PartiesRepository, PartyPresenter],
    exports: [PartiesService],
})
export class PartiesModule {}
