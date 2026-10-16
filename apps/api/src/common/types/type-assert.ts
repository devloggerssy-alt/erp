/**
 * Compile-time equality for type-tests. `Equal<A, B>` is `true` only when the
 * two types are identical, so `assertType<Equal<A, B>>()` fails `tsc` on any
 * drift. Type-test files are excluded from the production build.
 */
export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export function assertType<_T extends true>(): void {}
