import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Tag } from '@devloggers/db-prisma';
import { TagsRepository } from '../repositories/tags.repository';
import { TagPresenter } from '../presenters/tag.presenter';
import { CreateTagDto, UpdateTagDto, TagResponseDto } from '../dto';

@Injectable()
export class TagsService extends CrudService<Tag, TagResponseDto, CreateTagDto, UpdateTagDto> {
  protected readonly resourceName = resources.tags.key;

  constructor(
    private readonly tagsRepository: TagsRepository,
    private readonly tagPresenter: TagPresenter,
    private readonly emitter: EventEmitter2,
  ) {
    super(tagsRepository, tagPresenter, emitter);
  }

  // ── Business rule hooks ──────────────────────────────────────────────────

  protected override async beforeCreate(tenantId: string, dto: CreateTagDto): Promise<void> {
    const taken = await this.tagsRepository.isNameTakenInModule(tenantId, dto.name, dto.module);
    if (taken) {
      throw new ConflictException(
        `A tag named "${dto.name}" already exists in module "${dto.module}"`,
      );
    }
  }

  protected override async beforeUpdate(
    tenantId: string,
    id: string,
    dto: UpdateTagDto,
  ): Promise<void> {
    if (dto.name) {
      // Need the existing tag's module for uniqueness check
      const existing = await this.tagsRepository.findByIdOrFail(tenantId, id, this.resourceName);
      const taken = await this.tagsRepository.isNameTakenInModule(
        tenantId,
        dto.name,
        existing.module,
        id,
      );
      if (taken) {
        throw new ConflictException(
          `A tag named "${dto.name}" already exists in module "${existing.module}"`,
        );
      }
    }
  }
}
