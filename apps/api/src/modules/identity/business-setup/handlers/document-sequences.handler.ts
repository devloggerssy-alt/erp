import { ConflictException, Injectable } from '@nestjs/common';
import { DocumentSequencesService } from '../../../accounting/document-sequences/services/document-sequences.service';
import { CreateDocumentSequenceDto } from '../../../accounting/document-sequences/dto';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class DocumentSequencesTaskHandler implements SetupTaskHandler {
    constructor(private readonly documentSequencesService: DocumentSequencesService) {}

    async execute(tenantId: string, _userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const items = await validateArrayAs(CreateDocumentSequenceDto, payload);

        let created = 0;
        for (const item of items) {
            try {
                await this.documentSequencesService.create(tenantId, item);
                created += 1;
            } catch (error) {
                if (error instanceof ConflictException) continue;
                throw error;
            }
        }

        return { completed: true, details: { created } };
    }
}
