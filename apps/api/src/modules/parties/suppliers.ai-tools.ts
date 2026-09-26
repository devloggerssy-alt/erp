import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { PartiesService } from './parties.service';
import { CreatePartyDto, PartyTypeEnum, UpdatePartyDto, type PartyResponseDto } from './dto';
import { PARTIES_FILTER_SCHEMA } from './parties.controller';

const SUPPLIER_TYPES: string[] = [PartyTypeEnum.SUPPLIER, PartyTypeEnum.CUSTOMER_SUPPLIER];

@AiToolProvider()
@Injectable()
export class SuppliersAiTools implements AiToolSource {
    constructor(private readonly parties: PartiesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'suppliers',
            resource: resources.parties.key,
            domain: 'parties',
            label: 'supplier',
            service: this.parties,
            createDto: CreatePartyDto,
            updateDto: UpdatePartyDto,
            filterSchema: PARTIES_FILTER_SCHEMA,
            searchFields: ['name', 'code'],
            permissions: { view: 'parties.view', create: 'parties.create', update: 'parties.update' },
            scope: {
                listWhere: { type: { in: SUPPLIER_TYPES } },
                createDefaults: { type: PartyTypeEnum.SUPPLIER },
                omitInputFields: ['type', 'receivableAccountId', 'payableAccountId'],
                isInScope: (party: PartyResponseDto) => SUPPLIER_TYPES.includes(party.type),
            },
        });
    }
}
