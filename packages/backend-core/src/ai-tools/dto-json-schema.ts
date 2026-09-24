import type { JsonSchema } from './ai-tool.types.js';

// This module reads `reflect-metadata` decorator metadata (via `Reflect.getMetadata`) that
// @nestjs/swagger's @ApiProperty writes onto DTO prototypes. `reflect-metadata` itself is not a
// backend-core dependency — it relies on the consuming Nest app (apps/api) having loaded it.

/** Metadata keys written by @nestjs/swagger's @ApiProperty (stable since v4). */
const PROPERTIES_ARRAY = 'swagger/apiModelPropertiesArray';
const PROPERTY = 'swagger/apiModelProperties';

export type DtoClass<T extends object = object> = new () => T;

interface SwaggerPropertyMeta {
  type?: unknown;
  required?: boolean;
  isArray?: boolean;
  enum?: unknown;
  nullable?: boolean;
  description?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  /**
   * Element metadata for array properties. @nestjs/swagger rewrites
   * `@ApiProperty({ enum: X, isArray: true })` into `{ type: 'array', items: { type, enum }, enum: undefined }`
   * (see node_modules/@nestjs/swagger/dist/decorators/api-property.decorator.js), so this is where
   * enum-array constraints actually live.
   */
  items?: { type?: unknown; enum?: unknown };
}

function readMeta<T>(key: string, target: object, property?: string): T | undefined {
  const value: unknown =
    property === undefined ? Reflect.getMetadata(key, target) : Reflect.getMetadata(key, target, property);
  return value as T | undefined;
}

function isDtoClass(value: unknown): value is DtoClass {
  return (
    typeof value === 'function' &&
    value.prototype !== undefined &&
    readMeta<string[]>(PROPERTIES_ARRAY, value.prototype as object) !== undefined
  );
}

/** `type: () => Dto` is a lazy reference: an arrow function has no prototype. */
function resolveType(type: unknown): unknown {
  if (typeof type === 'function' && type.prototype === undefined) {
    return (type as () => unknown)();
  }
  return type;
}

function enumValues(enumLike: unknown): (string | number)[] {
  if (Array.isArray(enumLike)) return enumLike.filter((v): v is string | number => typeof v === 'string' || typeof v === 'number');
  if (enumLike && typeof enumLike === 'object') {
    const values = Object.values(enumLike as Record<string, string | number>);
    const numbers = values.filter((v): v is number => typeof v === 'number');
    // Numeric TS enums carry a reverse mapping; keep only the numeric values then.
    return numbers.length > 0 ? numbers : values;
  }
  return [];
}

function primitiveSchema(type: unknown): JsonSchema | undefined {
  if (type === String || type === 'string') return { type: 'string' };
  if (type === Number || type === 'number') return { type: 'number' };
  if (type === 'integer') return { type: 'integer' };
  if (type === Boolean || type === 'boolean') return { type: 'boolean' };
  if (type === Date) return { type: 'string', format: 'date-time' };
  if (type === Object || type === 'object') return { type: 'object' };
  return undefined;
}

/**
 * Converts a DTO class's @ApiProperty metadata into a JSON schema for an LLM tool.
 * The repo mandates complete Swagger decorators on every DTO field (.ai/rules/api.md),
 * so this is the same contract the OpenAPI generator sees.
 */
export function dtoJsonSchema(dto: DtoClass, seen: ReadonlySet<DtoClass> = new Set()): JsonSchema {
  if (seen.has(dto)) {
    throw new Error(`DTO "${dto.name}" is recursive and cannot be used as an AI tool input`);
  }
  const nextSeen = new Set(seen).add(dto);
  const prototype = dto.prototype as object;
  const keys = (readMeta<string[]>(PROPERTIES_ARRAY, prototype) ?? []).map((key) => key.replace(/^:/, ''));

  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const key of keys) {
    const meta = readMeta<SwaggerPropertyMeta>(PROPERTY, prototype, key) ?? {};
    const rawType = resolveType(meta.type ?? readMeta<unknown>('design:type', prototype, key));

    const isArrayType = rawType === 'array' || rawType === Array;

    let schema: JsonSchema;
    if (meta.enum !== undefined) {
      const values = enumValues(meta.enum);
      schema = { type: typeof values[0] === 'number' ? 'number' : 'string', enum: values };
    } else if (isDtoClass(rawType)) {
      schema = dtoJsonSchema(rawType, nextSeen);
    } else if (!isArrayType) {
      schema = primitiveSchema(rawType) ?? {};
    } else {
      schema = {};
    }

    if (isArrayType && meta.items) {
      const itemType = resolveType(meta.items.type);
      let itemSchema: JsonSchema;
      if (meta.items.enum !== undefined) {
        const values = enumValues(meta.items.enum);
        itemSchema = { type: typeof values[0] === 'number' ? 'number' : 'string', enum: values };
      } else if (isDtoClass(itemType)) {
        itemSchema = dtoJsonSchema(itemType, nextSeen);
      } else {
        itemSchema = primitiveSchema(itemType) ?? {};
      }
      schema = { type: 'array', items: itemSchema };
    } else if (meta.isArray || isArrayType) {
      schema = { type: 'array', items: isArrayType ? {} : schema };
    }
    if (meta.nullable && typeof schema.type === 'string') {
      schema = { ...schema, type: [schema.type, 'null'] };
    }
    if (meta.description) schema = { ...schema, description: meta.description };
    if (meta.format && !schema.format) schema = { ...schema, format: meta.format };
    if (meta.minimum !== undefined) schema = { ...schema, minimum: meta.minimum };
    if (meta.maximum !== undefined) schema = { ...schema, maximum: meta.maximum };

    properties[key] = schema;
    if (meta.required !== false) required.push(key);
  }

  return { type: 'object', properties, required, additionalProperties: false };
}
