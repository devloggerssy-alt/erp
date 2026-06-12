import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import {
  CatalogEntitiesRepository,
  type CatalogEntityWithParent,
} from '../repositories/catalog-entities.repository';
import { CatalogEntityPresenter } from '../presenters/catalog-entity.presenter';
import {
  CreateCatalogEntityDto,
  UpdateCatalogEntityDto,
  CatalogEntityResponseDto,
} from '../dto';

@Injectable()
export class CatalogEntitiesService extends CrudService<
  CatalogEntityWithParent,
  CatalogEntityResponseDto,
  CreateCatalogEntityDto,
  UpdateCatalogEntityDto
> {
  protected readonly resourceName = resources.catalogEntities.key;

  constructor(
    private readonly catalogEntitiesRepository: CatalogEntitiesRepository,
    private readonly catalogEntityPresenter: CatalogEntityPresenter,
    private readonly emitter: EventEmitter2,
  ) {
    super(catalogEntitiesRepository, catalogEntityPresenter, emitter);
  }

  // ── Business rule hooks ──────────────────────────────────────────────────

  protected override async beforeCreate(
    tenantId: string,
    dto: CreateCatalogEntityDto,
  ): Promise<void> {
    if (dto.parentId) {
      const exists = await this.catalogEntitiesRepository.parentExists(tenantId, dto.parentId);
      if (!exists) {
        throw new NotFoundException(`Parent catalog entity '${dto.parentId}' not found`);
      }
    }
    const taken = await this.catalogEntitiesRepository.isNameTakenUnderParent(
      tenantId,
      dto.name,
      dto.kind,
      dto.parentId,
    );
    if (taken) {
      throw new ConflictException(
        `A catalog entity named '${dto.name}' with kind '${dto.kind}' already exists under the same parent`,
      );
    }
  }

  protected override async beforeUpdate(
    tenantId: string,
    id: string,
    dto: UpdateCatalogEntityDto,
  ): Promise<void> {
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('A catalog entity cannot be its own parent');
      }
      const exists = await this.catalogEntitiesRepository.parentExists(tenantId, dto.parentId);
      if (!exists) {
        throw new NotFoundException(`Parent catalog entity '${dto.parentId}' not found`);
      }
    }
    if (dto.name !== undefined || dto.kind !== undefined || dto.parentId !== undefined) {
      // Need the current entity to fill in unchanged fields for the uniqueness check.
      const current = await this.catalogEntitiesRepository.findByIdOrFail(
        tenantId,
        id,
        this.resourceName,
      );
      const name = dto.name ?? current.name;
      const kind = dto.kind ?? current.kind;
      const parentId = dto.parentId !== undefined ? dto.parentId : current.parentId;
      const taken = await this.catalogEntitiesRepository.isNameTakenUnderParent(
        tenantId,
        name,
        kind,
        parentId,
        id,
      );
      if (taken) {
        throw new ConflictException(
          `A catalog entity named '${name}' with kind '${kind}' already exists under the same parent`,
        );
      }
    }
  }

  protected override async beforeDelete(tenantId: string, id: string): Promise<void> {
    const hasChildren = await this.catalogEntitiesRepository.hasChildren(tenantId, id);
    if (hasChildren) {
      throw new ConflictException(
        'Cannot delete a catalog entity that has children. Delete or reassign children first.',
      );
    }
  }
}
