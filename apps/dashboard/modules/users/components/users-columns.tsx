import type { ColumnDef } from "@tanstack/react-table"
import type { UsersClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"
import { Badge } from "@/shared/components/ui/badge"

type ColumnTranslator = (key: string) => string

export function createUsersColumns(
    helpers: ResourceTableHelpers<UsersClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<UsersClient>>[] {
    return [
        {
            accessorKey: "fullName",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("fullName")} />,
        },
        {
            accessorKey: "email",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("email")} />,
        },
        {
            accessorKey: "phone",
            header: ({ column }) => <ColumnHeader column={column} title={t("phone")} />,
        },
        {
            accessorKey: "roles",
            header: ({ column }) => <ColumnHeader column={column} title={t("roles")} />,
            cell: ({ row }) => {
                const roles = row.getValue("roles") as { id: string; name: string }[] | undefined
                if (!roles?.length) return <span className="text-muted-foreground">—</span>
                return (
                    <div className="flex flex-wrap gap-1">
                        {roles.map((r) => (
                            <Badge key={r.id} variant="secondary">{r.name}</Badge>
                        ))}
                    </div>
                )
            },
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title={t("active")} />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isActive") as boolean} />,
        },
        helpers.actionsColumn(),
    ]
}
