import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        environment: "node",
        include: ["src/**/*.{test,type-test}.ts"],
        typecheck: {
            enabled: true,
            include: ["src/**/*.type-test.ts"],
        },
    },
})
