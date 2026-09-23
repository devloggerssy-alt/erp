import { describe, expect, it } from "vitest"
import {
  EXECUTABLE_TASK_TYPES,
  SETUP_GROUPS,
  SETUP_TASK_LINKS,
  computeGroupProgress,
  computeSetupProgress,
  initialOpenGroup,
  parseReconciliationChecks,
} from "./setup.config"
import type { SetupTask, SetupTaskType } from "./hooks/use-business-setup"

function task(type: SetupTaskType, status: string, required = true): SetupTask {
  return { id: `id-${type}`, type, status, required, dependencies: [], metadata: null, progress: null, completedAt: null, createdAt: "", updatedAt: "", skippable: false } as SetupTask
}

describe("setup config", () => {
  it("assigns every task type to exactly one group", () => {
    const grouped = SETUP_GROUPS.flatMap((group) => group.tasks)
    expect([...grouped].sort()).toEqual([...Object.keys(SETUP_TASK_LINKS)].sort())
    expect(new Set(grouped).size).toBe(grouped.length)
  })

  it("has a link for every task type", () => {
    for (const type of Object.keys(SETUP_TASK_LINKS) as SetupTaskType[]) {
      expect(SETUP_TASK_LINKS[type]).toMatch(/^\//)
    }
  })

  it("only marks known task types as executable", () => {
    for (const type of EXECUTABLE_TASK_TYPES) {
      expect(Object.keys(SETUP_TASK_LINKS)).toContain(type)
    }
  })
})

describe("computeSetupProgress", () => {
  it("counts required tasks only and treats SKIPPED as done", () => {
    const progress = computeSetupProgress([
      task("CURRENCIES", "COMPLETED"),
      task("CASHBOXES", "SKIPPED"),
      task("BANK_ACCOUNTS", "READY"),
      task("WAREHOUSES", "SKIPPED", false),
    ])
    expect(progress).toEqual({ completed: 2, total: 3, percent: 67 })
  })

  it("returns 100% when there are no required tasks", () => {
    expect(computeSetupProgress([])).toEqual({ completed: 0, total: 0, percent: 100 })
  })
})

describe("computeGroupProgress", () => {
  it("counts every task present in the group and ignores missing ones", () => {
    const taskByType = new Map([
      ["CASHBOXES", task("CASHBOXES", "COMPLETED")],
      ["BANK_ACCOUNTS", task("BANK_ACCOUNTS", "SKIPPED", false)],
      ["OPENING_CASH_BALANCES", task("OPENING_CASH_BALANCES", "BLOCKED")],
    ] as [SetupTaskType, SetupTask][])
    expect(computeGroupProgress({ tasks: ["CASHBOXES", "BANK_ACCOUNTS", "OPENING_CASH_BALANCES", "OPENING_BANK_BALANCES"] }, taskByType))
      .toEqual({ completed: 2, total: 3 })
  })
})

describe("initialOpenGroup", () => {
  const taskByType = new Map([
    ["CURRENCIES", task("CURRENCIES", "COMPLETED")],
    ["CASHBOXES", task("CASHBOXES", "READY")],
    ["CUSTOMERS", task("CUSTOMERS", "READY")],
  ] as [SetupTaskType, SetupTask][])

  it("opens the group holding the next recommended task", () => {
    expect(initialOpenGroup(taskByType, "CUSTOMERS")).toBe("parties")
  })

  it("falls back to the first group with unfinished work", () => {
    expect(initialOpenGroup(taskByType, null)).toBe("money")
  })

  it("opens nothing when every task is done", () => {
    const done = new Map([["CURRENCIES", task("CURRENCIES", "COMPLETED")]] as [SetupTaskType, SetupTask][])
    expect(initialOpenGroup(done, null)).toBeUndefined()
  })
})

describe("parseReconciliationChecks", () => {
  it("parses the stored per-check summary", () => {
    const checks = parseReconciliationChecks({
      checks: [
        { code: "JOURNAL_ENTRIES_BALANCED", passed: false, findingCount: 2 },
        { code: "CASH_GL_VS_CASHBOX_SUBLEDGER", passed: true, findingCount: 0 },
      ],
    })
    expect(checks).toEqual([
      { code: "JOURNAL_ENTRIES_BALANCED", passed: false, findingCount: 2 },
      { code: "CASH_GL_VS_CASHBOX_SUBLEDGER", passed: true, findingCount: 0 },
    ])
  })

  it("returns an empty list for missing or malformed progress", () => {
    expect(parseReconciliationChecks(null)).toEqual([])
    expect(parseReconciliationChecks({ checks: "nope" })).toEqual([])
    expect(parseReconciliationChecks({ checks: [null, { code: 1 }] })).toEqual([])
  })
})
