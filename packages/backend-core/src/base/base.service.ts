import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaDelegate } from '../prisma/prisma-delegate.interface';
import { PrismaQueryBuilder, QueryParams } from '../utils/query-builder';

@Injectable()
export abstract class BaseService<T, CreateDto, UpdateDto> {
    // نحقن الموديل المحدد (مثل prisma.product)
    constructor(protected readonly model: PrismaDelegate<T, any, any>) { }

    /**
     * List Resources with Pagination, Sort, Filter
     */
    async findAll(params: QueryParams) {
        const { skip, take, orderBy, where } = PrismaQueryBuilder.build(params);

        // تنفيذ الاستعلامين بالتوازي للأداء
        const [data, total] = await Promise.all([
            this.model.findMany({
                skip,
                take,
                where,
                orderBy,
            }),
            this.model.count({ where }),
        ]);

        return {
            data,
            meta: {
                total,
                page: Number(params.page) || 1,
                limit: take,
                lastPage: Math.ceil(total / take),
            },
        };
    }

    /**
     * Find One by ID
     */
    async findOne(id: string): Promise<T> {
        const item = await this.model.findUnique({
            where: { id },
        });

        if (!item) {
            throw new NotFoundException(`Resource with ID ${id} not found`);
        }

        return item;
    }

    /**
     * Find One by Slug (Optional Helper)
     */
    async findBySlug(slug: string): Promise<T> {
        const item = await this.model.findUnique({
            where: { slug },
        });
        if (!item) throw new NotFoundException(`Slug ${slug} not found`);
        return item;
    }

    /**
     * Create Resource
     */
    async create(data: CreateDto): Promise<T> {
        return this.model.create({ data });
    }

    /**
     * Update Resource
     */
    async update(id: string, data: UpdateDto): Promise<T> {
        // Check existence first (optional, but good for error clarity)
        await this.findOne(id);
        return this.model.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete Resource
     */
    async delete(id: string): Promise<T> {
        await this.findOne(id);
        return this.model.delete({
            where: { id },
        });
    }
}