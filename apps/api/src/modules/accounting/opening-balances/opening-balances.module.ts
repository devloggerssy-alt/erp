import { Module } from '@nestjs/common';
import { PostingModule } from '../posting';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { OpeningCashService } from './services/opening-cash.service';
import { OpeningBankService } from './services/opening-bank.service';
import { PartyOpeningBalanceService } from './services/party-opening-balance.service';
import { OpeningBalanceSessionsRepository } from './sessions/opening-balance-sessions.repository';
import { OpeningBalanceSessionsPresenter } from './sessions/opening-balance-sessions.presenter';
import { OpeningBalanceSessionsService } from './sessions/opening-balance-sessions.service';
import { OpeningBalanceSessionPreviewService } from './sessions/opening-balance-session-preview.service';
import { OpeningBalanceSessionsController } from './sessions/opening-balance-sessions.controller';

@Module({
    imports: [PostingModule, DocumentSequencesModule],
    controllers: [OpeningBalanceSessionsController],
    providers: [
        OpeningCashService,
        OpeningBankService,
        PartyOpeningBalanceService,
        OpeningBalanceSessionsRepository,
        OpeningBalanceSessionsPresenter,
        OpeningBalanceSessionsService,
        OpeningBalanceSessionPreviewService,
    ],
    exports: [OpeningCashService, OpeningBankService, PartyOpeningBalanceService, OpeningBalanceSessionsService],
})
export class OpeningBalancesModule {}