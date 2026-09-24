import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { UnitsService } from './services/units.service';
import { CreateUnitDto, UpdateUnitDto } from './dto';
import { UNITS_FILTER_SCHEMA } from './controllers/units.controller';

@AiToolProvider()
@Injectable()
export class UnitsAiTools implements AiToolSource {
  constructor(private readonly units: UnitsService) {}

  aiTools(): readonly AiTool[] {
    return defineCrudAiTools({
      prefix: 'units',
      resource: resources.units.key,
      domain: 'catalog',
      label: 'unit of measure',
      service: this.units,
      createDto: CreateUnitDto,
      updateDto: UpdateUnitDto,
      filterSchema: UNITS_FILTER_SCHEMA,
      searchFields: ['name', 'abbreviation'],
      permissions: { view: 'units.view', create: 'units.create', update: 'units.update' },
    });
  }
}
