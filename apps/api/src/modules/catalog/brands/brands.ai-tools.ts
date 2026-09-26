import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { BrandsService } from './services/brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto';
import { BRANDS_FILTER_SCHEMA } from './controllers/brands.controller';

@AiToolProvider()
@Injectable()
export class BrandsAiTools implements AiToolSource {
  constructor(private readonly brands: BrandsService) {}

  aiTools(): readonly AiTool[] {
    return defineCrudAiTools({
      prefix: 'brands',
      resource: resources.brands.key,
      domain: 'catalog',
      label: 'brand',
      service: this.brands,
      createDto: CreateBrandDto,
      updateDto: UpdateBrandDto,
      filterSchema: BRANDS_FILTER_SCHEMA,
      searchFields: ['name'],
      permissions: { view: 'brands.view', create: 'brands.create', update: 'brands.update', delete: 'brands.delete' },
      ops: ['list', 'show', 'create', 'update', 'delete'],
    });
  }
}
