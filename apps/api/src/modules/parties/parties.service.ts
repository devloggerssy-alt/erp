import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Party } from '@devloggers/db-prisma';
import { PartiesRepository } from './repositories/parties.repository';
import { PartyPresenter } from './presenters/party.presenter';
import { CreatePartyDto, UpdatePartyDto, PartyResponseDto } from './dto';

@Injectable()
export class PartiesService extends CrudService<Party, PartyResponseDto, CreatePartyDto, UpdatePartyDto> {
    protected readonly resourceName = resources.parties.key;

    constructor(
        private readonly partiesRepository: PartiesRepository,
        private readonly partyPresenter: PartyPresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(partiesRepository, partyPresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreatePartyDto): Promise<void> {
        if (dto.code) {
            const taken = await this.partiesRepository.isCodeTaken(tenantId, dto.code);
            if (taken) {
                throw new ConflictException(`A party with code "${dto.code}" already exists`);
            }
        }
    }

    protected override async beforeUpdate(
        tenantId: string,
        id: string,
        dto: UpdatePartyDto,
    ): Promise<void> {
        if (dto.code) {
            const taken = await this.partiesRepository.isCodeTaken(tenantId, dto.code, id);
            if (taken) {
                throw new ConflictException(`A party with code "${dto.code}" already exists`);
            }
        }
    }
}
