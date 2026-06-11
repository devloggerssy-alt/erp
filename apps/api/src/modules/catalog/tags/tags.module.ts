import { Module } from '@nestjs/common';
import { TagsRepository } from './repositories/tags.repository';
import { TagsService } from './services/tags.service';
import { TagPresenter } from './presenters/tag.presenter';
import { TagsController } from './controllers/tags.controller';

/**
 * TagsModule — tags CRUD feature.
 *
 * Providers follow the 4-layer architecture:
 *   Controller → Service → Repository → Presenter
 *
 * Exports TagsService so CatalogModule (and other domain modules)
 * can inject it for cross-module business logic.
 */
@Module({
  controllers: [TagsController],
  providers: [TagsRepository, TagsService, TagPresenter],
  exports: [TagsService],
})
export class TagsModule {}
