import type { ColumnDef } from "@tanstack/react-table"
import type { CustomFieldResponseDto } from "@devloggers/api-contracts"
import { ColumnHeader } from "@/shared/data-view/table-view"
import { localize } from "@/shared/lib/localize"

type RowWithCustomFields = {
    customFields?: Record<string, unknown>
}

export function buildCustomFieldColumns<T extends RowWithCustomFields>(
    definitions: CustomFieldResponseDto[],
    locale: string,
): ColumnDef<T>[] {
    return definitions
        .filter((field) => field.showInList)
        .map((field) => ({
            id: `customField_${field.id}`,
            accessorFn: (row) => row.customFields?.[field.id],
            header: ({ column }) => (
                <ColumnHeader column={column} title={localize(field.label, locale, localize(field.name, locale))} />
            ),
            cell: ({ getValue }) => {
                const value = getValue()
                if (value === null || value === undefined || value === "") return "—"
                if (Array.isArray(value)) return value.join(", ")
                if (typeof value === "boolean") return value ? "✓" : "—"
                return String(value)
            },
        }))
}
