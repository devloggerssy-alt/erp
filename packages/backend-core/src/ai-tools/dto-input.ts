import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import type { AiToolInput, AiToolValidation, JsonSchema } from './ai-tool.types.js';
import { dtoJsonSchema, type DtoClass } from './dto-json-schema.js';

function flattenErrors(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) out[path] = Object.values(error.constraints);
    if (error.children?.length) Object.assign(out, flattenErrors(error.children, path));
  }
  return out;
}

function omitProperties(schema: JsonSchema, omit: readonly string[]): JsonSchema {
  if (omit.length === 0) return schema;
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).filter(([key]) => !omit.includes(key)),
  );
  return { ...schema, properties, required: (schema.required ?? []).filter((key) => !omit.includes(key)) };
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/**
 * Tool input backed by a class-validator DTO — same semantics as the global
 * ValidationPipe (whitelist + forbidNonWhitelisted + implicit conversion).
 * `omit` removes fields the model must not set (the handler supplies them).
 */
export function dtoInput<T extends object>(
  dto: DtoClass<T>,
  options: { omit?: readonly string[]; defaults?: Partial<T> } = {},
): AiToolInput<T> {
  const omit = options.omit ?? [];
  const defaults = options.defaults ?? {};
  return {
    jsonSchema: omitProperties(dtoJsonSchema(dto), omit),
    async validate(raw): Promise<AiToolValidation<T>> {
      const body = asRecord(raw);
      const forbidden = omit.filter((key) => key in body);
      if (forbidden.length > 0) {
        return { ok: false, errors: Object.fromEntries(forbidden.map((key) => [key, [`${key} cannot be set by the assistant`]])) };
      }
      // Defaults fill in fields the model didn't send (e.g. omitted fields the
      // handler used to Object.assign in post-validation). Values the model DID
      // send always win, so this can never let the model override an omitted field.
      const merged: Record<string, unknown> = { ...defaults, ...body };
      const instance = plainToInstance(dto, merged, { enableImplicitConversion: true });
      const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
      return errors.length > 0 ? { ok: false, errors: flattenErrors(errors) } : { ok: true, value: instance };
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Adds a required `id` (UUID) to another input: `{ id, ...rest }` → `{ id, value: rest }`. */
export function withId<T>(input: AiToolInput<T>): AiToolInput<{ id: string; value: T }> {
  return {
    jsonSchema: {
      ...input.jsonSchema,
      properties: { id: { type: 'string', format: 'uuid', description: 'Record UUID' }, ...input.jsonSchema.properties },
      required: ['id', ...(input.jsonSchema.required ?? [])],
    },
    async validate(raw) {
      const { id, ...rest } = asRecord(raw);
      if (typeof id !== 'string' || !UUID.test(id)) return { ok: false, errors: { id: ['id must be a UUID'] } };
      const result = await input.validate(rest);
      return result.ok ? { ok: true, value: { id, value: result.value } } : result;
    },
  };
}
