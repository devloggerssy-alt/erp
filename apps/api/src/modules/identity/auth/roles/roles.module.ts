import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';
import { RolesRepository } from './repositories/roles.repository';
import { RolePresenter } from './presenters/role.presenter';

@Module({
    imports: [PrismaModule],
    controllers: [RolesController],
    providers: [RolesService, RolesRepository, RolePresenter],
    exports: [RolesService],
})
export class RolesModule {}
