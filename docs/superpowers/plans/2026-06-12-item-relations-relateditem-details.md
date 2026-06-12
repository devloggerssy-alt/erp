# Item Relations — Include Related Item Details in Response

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the item-relations API response include `relatedItem { id, name, code }` so the dashboard shows human-readable item names instead of raw UUIDs.

**Architecture:** The `ItemRelationsRepository` overrides `findMany` and `findById` to pass Prisma's `include: { relatedItem: … }`. The presenter maps the new nested field. The shared DTO interface and the backend DTO class both gain the `relatedItem` field. The frontend component then renders `name (code)` instead of the UUID.

**Tech Stack:** NestJS, Prisma, TypeScript, Next.js/React, TanStack Query.

---

## File Map

| Action | File |
|--------|------|
| Modify | `packages/api-contracts/src/dto/item-relation.dto.ts` |
| Modify | `apps/api/src/modules/catalog/item-relations/dto/item-relation.dto.ts` |
| Modify | `apps/api/src/modules/catalog/item-relations/repositories/item-relations.repository.ts` |
| Modify | `apps/api/src/modules/catalog/item-relations/presenters/item-relation.presenter.ts` |
| Modify | `apps/dashboard/modules/items/components/items-relations-section.tsx` |

---

### Task 1: Add `relatedItem` to the shared DTO interface

**Files:**
- Modify: `packages/api-contracts/src/dto/item-relation.dto.ts`

- [ ] **Step 1: Update the shared interface**

Replace the full file content:

```ts
export type RelationType = 'compatible_with' | 'replaces' | 'requires'

export interface CreateItemRelationDto {
    itemId: string;
    relatedItemId: string;
    relationType: RelationType;
    notes?: string;
}

export interface UpdateItemRelationDto {
    relationType?: RelationType;
    notes?: string;
}

export interface ItemRelationResponseDto {
    id: string;
    itemId: string;
    relatedItemId: string;
    relationType: RelationType;
    notes: string | null;
    relatedItem: { id: string; name: string; code: string };
    createdAt: string;
    updatedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api-contracts/src/dto/item-relation.dto.ts
git commit -m "feat(api-contracts): add relatedItem to ItemRelationResponseDto"
```

---

### Task 2: Update backend DTO class and repository to include related item

**Files:**
- Modify: `apps/api/src/modules/catalog/item-relations/dto/item-relation.dto.ts`
- Modify: `apps/api/src/modules/catalog/item-relations/repositories/item-relations.repository.ts`

- [ ] **Step 1: Add `relatedItem` to `ItemRelationResponseDto` class**

Replace the full file content:

```ts
import { IsString, IsNotEmpty, IsOptional, IsIn, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RelationType } from '@devloggers/api-contracts';

export class CreateItemRelationDto {
  @ApiProperty({ description: 'The source item ID' })
  @IsUUID()
  @IsNotEmpty()
  itemId: string = '';

  @ApiProperty({ description: 'The related item ID' })
  @IsUUID()
  @IsNotEmpty()
  relatedItemId: string = '';

  @ApiProperty({
    example: 'compatible_with',
    enum: ['compatible_with', 'replaces', 'requires'],
  })
  @IsString()
  @IsIn(['compatible_with', 'replaces', 'requires'])
  relationType: RelationType = 'compatible_with';

  @ApiPropertyOptional({ example: 'Fits model X and Y' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateItemRelationDto {
  @ApiPropertyOptional({
    example: 'replaces',
    enum: ['compatible_with', 'replaces', 'requires'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['compatible_with', 'replaces', 'requires'])
  relationType?: RelationType;

  @ApiPropertyOptional({ example: 'Updated notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RelatedItemSummaryDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  name: string = '';

  @ApiProperty()
  code: string = '';
}

export class ItemRelationResponseDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  itemId: string = '';

  @ApiProperty()
  relatedItemId: string = '';

  @ApiProperty({ example: 'compatible_with', enum: ['compatible_with', 'replaces', 'requires'] })
  relationType: RelationType = 'compatible_with';

  @ApiProperty({ nullable: true })
  notes: string | null = null;

  @ApiProperty({ type: RelatedItemSummaryDto })
  relatedItem: RelatedItemSummaryDto = new RelatedItemSummaryDto();

  @ApiProperty()
  createdAt: string = '';

  @ApiProperty()
  updatedAt: string = '';
}
```

- [ ] **Step 2: Override `findMany` and `findById` in the repository**

Replace the full file content:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository, type FindManyOptions, type FindManyResult } from '@devloggers/backend-core';
import type { ItemRelation } from '@devloggers/db-prisma';
import { RelationType } from '@devloggers/db-prisma';

const RELATED_ITEM_INCLUDE = {
  relatedItem: { select: { id: true, name: true, code: true } },
} as const;

@Injectable()
export class ItemRelationsRepository extends CrudRepository<ItemRelation> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.itemRelation);
  }

  override async findMany(tenantId: string, options: FindManyOptions = {}): Promise<FindManyResult<ItemRelation>> {
    return super.findMany(tenantId, { ...options, include: RELATED_ITEM_INCLUDE });
  }

  override async findById(tenantId: string, id: string): Promise<ItemRelation | null> {
    return this.prisma.itemRelation.findFirst({
      where: { id, tenantId },
      include: RELATED_ITEM_INCLUDE,
    });
  }

  async existsRelation(
    tenantId: string,
    itemId: string,
    relatedItemId: string,
    relationType: string,
    excludeId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.itemRelation.count({
      where: {
        tenantId,
        itemId,
        relatedItemId,
        relationType: relationType as RelationType,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/catalog/item-relations/dto/item-relation.dto.ts
git add apps/api/src/modules/catalog/item-relations/repositories/item-relations.repository.ts
git commit -m "feat(item-relations): include relatedItem in repository queries and DTO"
```

---

### Task 3: Update the presenter to map `relatedItem`

**Files:**
- Modify: `apps/api/src/modules/catalog/item-relations/presenters/item-relation.presenter.ts`

- [ ] **Step 1: Map `relatedItem` in `toResponse`**

Replace the full file content:

```ts
import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { ItemRelation } from '@devloggers/db-prisma';
import { ItemRelationResponseDto } from '../dto';
import type { RelationType } from '@devloggers/api-contracts';

type ItemRelationWithRelated = ItemRelation & {
  relatedItem: { id: string; name: string; code: string };
};

@Injectable()
export class ItemRelationPresenter extends CrudPresenter<ItemRelation, ItemRelationResponseDto> {
  toResponse(entity: ItemRelation): ItemRelationResponseDto {
    const e = entity as ItemRelationWithRelated;
    return {
      id: e.id,
      itemId: e.itemId,
      relatedItemId: e.relatedItemId,
      relationType: e.relationType as RelationType,
      notes: e.notes ?? null,
      relatedItem: {
        id: e.relatedItem.id,
        name: e.relatedItem.name,
        code: e.relatedItem.code,
      },
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/catalog/item-relations/presenters/item-relation.presenter.ts
git commit -m "feat(item-relations): map relatedItem in presenter response"
```

---

### Task 4: Fix frontend relations section to display item name/code

**Files:**
- Modify: `apps/dashboard/modules/items/components/items-relations-section.tsx`

- [ ] **Step 1: Replace UUID display with item name and code**

Replace the full file content:

```tsx
"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { TrashIcon, PlusIcon } from "lucide-react"
import { useApi } from "@/shared/useApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select"
import { ResourceSelectField } from "@/shared/components/form"
import type { RelationType } from "@devloggers/api-contracts"
import type { ItemsClient } from "@devloggers/api-client"

const RELATION_TYPES: RelationType[] = ["compatible_with", "replaces", "requires"]

interface ItemRelationsSectionProps {
    itemId: string
    disabled?: boolean
}

export function ItemRelationsSection({ itemId, disabled }: ItemRelationsSectionProps) {
    const api = useApi()
    const t = useTranslations("business.resources.items")
    const qc = useQueryClient()

    const [relatedItemId, setRelatedItemId] = useState<string | null>(null)
    const [relationType, setRelationType] = useState<RelationType>("compatible_with")
    const [notes, setNotes] = useState("")

    const relationsKey = ["item-relations", itemId]

    const { data: relationsResponse } = useQuery({
        queryKey: relationsKey,
        queryFn: () => api["item-relations"].list({ itemId } as never),
        enabled: !!itemId,
    })
    const relations: any[] = (relationsResponse as any)?.data ?? []

    const addMutation = useMutation({
        mutationFn: () =>
            api["item-relations"].create({
                itemId,
                relatedItemId: relatedItemId!,
                relationType,
                notes: notes.trim() || undefined,
            } as never),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: relationsKey })
            setRelatedItemId(null)
            setNotes("")
            setRelationType("compatible_with")
        },
    })

    const removeMutation = useMutation({
        mutationFn: (id: string) => api["item-relations"].destroy(id),
        onSuccess: () => void qc.invalidateQueries({ queryKey: relationsKey }),
    })

    const handleAdd = () => {
        if (relatedItemId) addMutation.mutate()
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("sectionRelations")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {relations.length > 0 && (
                    <div className="divide-y rounded-md border">
                        {relations.map((rel) => (
                            <div key={rel.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                <div className="flex flex-col gap-1 min-w-0">
                                    <span className="font-medium truncate">
                                        {rel.relatedItem?.name ?? rel.relatedItemId}
                                        {rel.relatedItem?.code && (
                                            <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                                                ({rel.relatedItem.code})
                                            </span>
                                        )}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs py-0">
                                            {t(`relationTypes.${rel.relationType as RelationType}`)}
                                        </Badge>
                                        {rel.notes && (
                                            <span className="text-muted-foreground text-xs truncate">
                                                {rel.notes}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-destructive hover:text-destructive"
                                    disabled={disabled || removeMutation.isPending}
                                    onClick={() => removeMutation.mutate(rel.id)}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="space-y-3 rounded-md border p-3">
                    <p className="text-sm font-medium text-muted-foreground">{t("addRelation")}</p>
                    <div className="space-y-2">
                        <Label className="text-sm">{t("relatedItem")}</Label>
                        <ResourceSelectField<ItemsClient>
                            client={(a) => a.items}
                            getLabel={(item) => `${(item as any).name} (${(item as any).code})`}
                            value={relatedItemId}
                            onChange={(val) => setRelatedItemId(val as string | null)}
                            placeholder={t("relatedItemPlaceholder")}
                            disabled={disabled}
                            queryKey={["items", "relation-picker"]}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">{t("relationType")}</Label>
                        <Select
                            value={relationType}
                            onValueChange={(v) => setRelationType(v as RelationType)}
                            disabled={disabled}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {RELATION_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {t(`relationTypes.${type}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">{t("notes")}</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t("notesPlaceholder")}
                            rows={2}
                            disabled={disabled}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!relatedItemId || disabled || addMutation.isPending}
                        onClick={handleAdd}
                    >
                        <PlusIcon className="h-4 w-4 me-2" />
                        {t("addRelationAction")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/modules/items/components/items-relations-section.tsx
git commit -m "feat(dashboard): show related item name/code in relations section"
```

---

### Task 5: Verify end-to-end

- [ ] **Step 1: Build the API to catch TS errors**

```bash
pnpm turbo run build --filter=@devloggers/api
```

Expected: exit 0, no TypeScript errors.

- [ ] **Step 2: Build the dashboard to catch TS errors**

```bash
pnpm turbo run build --filter=@devloggers/dashboard
```

Expected: exit 0, no TypeScript errors.

- [ ] **Step 3: Smoke-test in the browser**

1. Start both dev servers: `pnpm dev`
2. Open an existing item in edit mode
3. Confirm the **Tags** section shows colored badges and lets you add/remove
4. Confirm the **Item Relations** section shows `Name (CODE)` + a `Badge` for the relation type — not a raw UUID
5. Add a new relation, verify it appears with name/code

- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git add -p
git commit -m "chore: verify item-relations integration"
```
