import { Module } from '@nestjs/common';
import { TagAssignmentsService } from './services/tag-assignments.service';
import { TagAssignmentsController } from './controllers/tag-assignments.controller';

@Module({
  controllers: [TagAssignmentsController],
  providers: [TagAssignmentsService],
  exports: [TagAssignmentsService],
})
export class TagAssignmentsModule {}
