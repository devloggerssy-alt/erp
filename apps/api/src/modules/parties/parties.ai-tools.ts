import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { PartiesService } from './parties.service';
import { CreatePartyDto, PartyTypeEnum, UpdatePartyDto, type PartyResponseDto } from './dto';
import { PARTIES_FILTER_SCHEMA } from './parties.controller';

const CUSTOMER_TYPES: string[] = [PartyTypeEnum.CUSTOMER, PartyTypeEnum.CUSTOMER_SUPPLIER];

@AiToolProvider()
@Injectable()
export class PartiesAiTools implements AiToolSource {
    constructor(private readonly parties: PartiesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'customers',
            resource: resources.parties.key,
            domain: 'parties',
            label: 'customer',
            service: this.parties,
            createDto: CreatePartyDto,
            updateDto: UpdatePartyDto,
            filterSchema: PARTIES_FILTER_SCHEMA,
            searchFields: ['name', 'code'],
            permissions: { view: 'parties.view', create: 'parties.create', update: 'parties.update' },
            scope: {
                listWhere: { type: { in: CUSTOMER_TYPES } },
                createDefaults: { type: PartyTypeEnum.CUSTOMER },
                omitInputFields: ['type', 'receivableAccountId', 'payableAccountId'],
                isInScope: (party: PartyResponseDto) => CUSTOMER_TYPES.includes(party.type),
            },
        });
    }
}
