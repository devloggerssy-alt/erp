/**
 * Narrows a generated `string` field to a hand-written domain union.
 *
 * The OpenAPI generator types enum-backed fields as `string`, so a cached
 * response cannot be assigned to a domain union directly. Rather than assert
 * (which would let an unrecognised value through as a lie), this validates the
 * value against the known set and yields `undefined` for anything else.
 */
export function narrowEnum<const T extends readonly string[]>(values: T) {
    return (value: string | undefined): T[number] | undefined =>
        values.find((candidate) => candidate === value)
}
