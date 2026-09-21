import { describe, expect, it, vi } from "vitest"
import { applyFieldErrors } from "./apply-field-errors"

type Values = { name: string; abbreviation: string }

describe("applyFieldErrors", () => {
    it("sets each failing field's first message on the form", () => {
        const setError = vi.fn()

        applyFieldErrors<Values>({ setError }, {
            name: ["name is required", "name is too long"],
            abbreviation: ["abbreviation is already taken"],
        })

        expect(setError).toHaveBeenCalledWith("name", { message: "name is required" })
        expect(setError).toHaveBeenCalledWith("abbreviation", { message: "abbreviation is already taken" })
    })

    it("does nothing when there are no validation errors", () => {
        const setError = vi.fn()

        applyFieldErrors<Values>({ setError }, undefined)

        expect(setError).not.toHaveBeenCalled()
    })
})
