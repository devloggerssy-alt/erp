import type {
  FilterCondition,
  FilterFieldDef,
  FilterFieldType,
  FilterOperator,
  FilterSchema,
  ParsedFilters,
} from '@devloggers/api-contracts';

export type {
  FilterCondition,
  FilterFieldDef,
  FilterFieldType,
  FilterOperator,
  FilterSchema,
  ListFilterField,
  ParsedFilters,
} from '@devloggers/api-contracts';

const OPERATORS_BY_TYPE: Record<FilterFieldType, FilterOperator[]> = {
  string: ['$eq', '$like', '$in', '$isNull'],
  id: ['$eq', '$in', '$isNull'],
  number: ['$eq', '$gte', '$lte', '$in', '$isNull'],
  date: ['$eq', '$gte', '$lte', '$isNull'],
  boolean: ['$eq', '$isNull'],
  enum: ['$eq', '$in', '$isNull'],
};

export function getAllowedOperators(def: FilterFieldDef): FilterOperator[] {
  const defaults = OPERATORS_BY_TYPE[def.type];
  return def.operators ? def.operators.filter((op) => defaults.includes(op)) : defaults;
}

export function conditionUsesOperator(
  condition: FilterCondition,
): FilterOperator | undefined {
  if ('$eq' in condition) return '$eq';
  if ('$like' in condition) return '$like';
  if ('$gte' in condition) return '$gte';
  if ('$lte' in condition) return '$lte';
  if ('$in' in condition) return '$in';
  if ('$isNull' in condition) return '$isNull';
  return undefined;
}

export function isOperatorAllowedForField(
  condition: FilterCondition,
  def: FilterFieldDef,
): boolean {
  const op = conditionUsesOperator(condition);
  return op !== undefined && getAllowedOperators(def).includes(op);
}
