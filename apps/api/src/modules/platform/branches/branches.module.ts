import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { CodeSequencesModule } from '../code-sequences/code-sequences.module';
import { BranchesController } from './controllers/branches.controller';
import { BranchesService } from './services/branches.service';
import { BranchesRepository } from './repositories/branches.repository';
import { BranchPresenter } from './presenters/branch.presenter';

@Module({
    imports: [CodeSequencesModule],
    controllers: [BranchesController],
    providers: [BranchesService, BranchesRepository, BranchPresenter, LocaleResolverService],
    exports: [BranchesService],
})
export class BranchesModule {}
