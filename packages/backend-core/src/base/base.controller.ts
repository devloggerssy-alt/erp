import { Get, Post, Body, Patch, Param, Delete, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { BaseService } from './base.service';
import type { QueryParams } from '../utils/query-builder';

// T: Entity Type, C: CreateDto, U: UpdateDto
export abstract class BaseController<T, C, U> {
    constructor(protected readonly service: BaseService<T, C, U>) { }

    @Get()
    async findAll(@Query() query: QueryParams) {
        return this.service.findAll(query);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    // نفترض أن الـ Validation يتم عبر Global Pipe أو نحدده هنا
    async create(@Body() createDto: C) {
        return this.service.create(createDto);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateDto: U) {
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.service.delete(id);
    }
}