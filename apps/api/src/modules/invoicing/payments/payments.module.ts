import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { PostingModule } from '../../accounting/posting';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './repositories/payments.repository';
import { PaymentPresenter } from './presenters/payment.presenter';

@Module({
  imports: [PrismaModule, DocumentSequencesModule, PostingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, PaymentPresenter],
  exports: [PaymentsService],
})
export class PaymentsModule {}
