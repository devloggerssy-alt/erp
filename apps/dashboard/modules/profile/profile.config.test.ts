import { describe, expect, it } from "vitest"
import {
  createChangePasswordSchema,
  mapUserToProfileValues,
  toUpdateProfile,
} from "./profile.config"

describe("mapUserToProfileValues", () => {
  it("maps a full user payload", () => {
    expect(
      mapUserToProfileValues({
        fullName: "Admin User",
        phone: "+963-933-111222",
        avatarUrl: "/uploads/t1/avatars/u1/a.png",
      }),
    ).toEqual({
      fullName: "Admin User",
      phone: "+963-933-111222",
      avatarUrl: "/uploads/t1/avatars/u1/a.png",
    })
  })

  it("maps null phone/avatar to form-friendly blanks", () => {
    expect(mapUserToProfileValues({ fullName: "Admin", phone: null, avatarUrl: null })).toEqual({
      fullName: "Admin",
      phone: "",
      avatarUrl: null,
    })
  })

  it("unwraps the API envelope and tolerates missing data", () => {
    expect(mapUserToProfileValues({ data: { fullName: "Admin" } })).toEqual({
      fullName: "Admin",
      phone: "",
      avatarUrl: null,
    })
    expect(mapUserToProfileValues(undefined)).toEqual({ fullName: "", phone: "", avatarUrl: null })
  })
})

describe("toUpdateProfile", () => {
  it("trims values and turns blanks into nulls so fields can be cleared", () => {
    expect(
      toUpdateProfile({ fullName: "  Admin User  ", phone: "   ", avatarUrl: null }),
    ).toEqual({ fullName: "Admin User", phone: null, avatarUrl: null })
  })

  it("keeps a real phone and avatar", () => {
    expect(
      toUpdateProfile({ fullName: "Admin", phone: "+963-933-111222", avatarUrl: "/uploads/a.png" }),
    ).toEqual({ fullName: "Admin", phone: "+963-933-111222", avatarUrl: "/uploads/a.png" })
  })
})

describe("createChangePasswordSchema", () => {
  const schema = createChangePasswordSchema({
    minLength: "min 8",
    mismatch: "mismatch",
    sameAsCurrent: "same",
  })
  const valid = {
    currentPassword: "oldPassword1",
    newPassword: "newPassword1",
    confirmNewPassword: "newPassword1",
  }

  it("accepts a valid change", () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it("rejects a new password shorter than 8 characters", () => {
    const result = schema.safeParse({ ...valid, newPassword: "short1", confirmNewPassword: "short1" })
    expect(result.success).toBe(false)
  })

  it("rejects a mismatched confirmation", () => {
    const result = schema.safeParse({ ...valid, confirmNewPassword: "different1" })
    expect(result.success).toBe(false)
  })

  it("rejects a new password equal to the current one", () => {
    const result = schema.safeParse({
      currentPassword: "samePassword1",
      newPassword: "samePassword1",
      confirmNewPassword: "samePassword1",
    })
    expect(result.success).toBe(false)
  })
})
