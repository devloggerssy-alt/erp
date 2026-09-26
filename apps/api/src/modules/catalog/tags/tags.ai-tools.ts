import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { TagsService } from './services/tags.service';
import { CreateTagDto, UpdateTagDto } from './dto';
import { TAGS_FILTER_SCHEMA } from './controllers/tags.controller';

@AiToolProvider()
@Injectable()
export class TagsAiTools implements AiToolSource {
  constructor(private readonly tags: TagsService) {}

  aiTools(): readonly AiTool[] {
    return defineCrudAiTools({
      prefix: 'tags',
      resource: resources.tags.key,
      domain: 'catalog',
      label: 'tag',
      service: this.tags,
      createDto: CreateTagDto,
      updateDto: UpdateTagDto,
      filterSchema: TAGS_FILTER_SCHEMA,
      searchFields: ['name'],
      permissions: { view: 'tags.view', create: 'tags.create', update: 'tags.update', delete: 'tags.delete' },
      ops: ['list', 'show', 'create', 'update', 'delete'],
    });
  }
}
