import { describe, expectTypeOf, it } from 'vitest'
import type { ApiResponse, AuthUser } from '..'

type LoginUser = NonNullable<NonNullable<ApiResponse<'/auth/login', 'post'>['data']>['user']>
type RegisterUser = NonNullable<NonNullable<ApiResponse<'/auth/register', 'post'>['data']>['user']>
type MeUser = NonNullable<ApiResponse<'/auth/me', 'get'>['data']>

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

describe('authenticated user shape', () => {
  it('is one shape from login, registration, and me through AuthUser', () => {
    expectTypeOf<LoginUser>().toEqualTypeOf<AuthUser>()
    expectTypeOf<RegisterUser>().toEqualTypeOf<AuthUser>()
    expectTypeOf<MeUser>().toEqualTypeOf<AuthUser>()

    const loginIsAuthUser: Equal<LoginUser, AuthUser> = true
    const registerIsAuthUser: Equal<RegisterUser, AuthUser> = true
    const meIsAuthUser: Equal<MeUser, AuthUser> = true
    void loginIsAuthUser
    void registerIsAuthUser
    void meIsAuthUser
  })
})
