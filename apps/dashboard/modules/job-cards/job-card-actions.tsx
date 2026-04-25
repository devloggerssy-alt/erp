"use client"

import { useState, useRef } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useAuthApi } from "@/shared/useApi"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/shared/components/ui/dialog"
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
} from "@/shared/components/ui/combobox"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/shared/components/ui/popover"
import { Calendar } from "@/shared/components/ui/calendar"
import { confirm } from "@/shared/components/confirm-dialog"
import { toast } from "sonner"
import { Ellipsis, Pencil, Trash2, CalendarIcon, UserCog, UserCheck, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { EMPLOYEE_ROUTES } from "@devloggers/api-client"

type JobCardActionsProps = {
    jobCardId: string
}

type Employee = {
    id: number
    first_name?: string
    last_name?: string
    name?: string
}

function getEmployeeName(emp: Employee) {
    return emp.name || [emp.first_name, emp.last_name].filter(Boolean).join(" ") || `Employee #${emp.id}`
}

// ── Employee Picker Dialog ──

type EmployeePickerDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    employees: Employee[]
    loading: boolean
    isPending: boolean
    onSelect: (employeeId: number) => void
}

function EmployeePickerDialog({
    open,
    onOpenChange,
    title,
    description,
    employees,
    loading,
    isPending,
    onSelect,
}: EmployeePickerDialogProps) {
    const anchorRef = useRef<HTMLDivElement>(null)

    const handleSelect = (emp: Employee | null) => {
        if (!emp) return
        onSelect(emp.id)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div ref={anchorRef}>
                    <Combobox
                        value={null}
                        onValueChange={handleSelect}
                        disabled={isPending}
                    >
                        <ComboboxInput
                            placeholder="Search employees..."
                            showClear={false}
                        />
                        <ComboboxContent anchor={anchorRef}>
                            <ComboboxList>
                                {loading && (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                                {!loading &&
                                    employees.map((emp) => (
                                        <ComboboxItem key={emp.id} value={emp}>
                                            {getEmployeeName(emp)}
                                        </ComboboxItem>
                                    ))}
                                {!loading && employees.length === 0 && (
                                    <ComboboxEmpty>No employees found</ComboboxEmpty>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Main Component ──

export function JobCardActions({ jobCardId }: JobCardActionsProps) {
    const api = useAuthApi()
    const router = useRouter()
    const [datePickerOpen, setDatePickerOpen] = useState(false)
    const [serviceWriterDialogOpen, setServiceWriterDialogOpen] = useState(false)
    const [salesPersonDialogOpen, setSalesPersonDialogOpen] = useState(false)

    const { data: employeesData, isLoading: employeesLoading } = useQuery({
        queryKey: [EMPLOYEE_ROUTES.INDEX],
        queryFn: () => api.employees.list(),
    })

    const employees: Employee[] = (employeesData as any)?.data ?? []

    const handleEdit = () => {
        router.push(`/sales/job-cards/${jobCardId}/edit`)
    }

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: "Delete Job Card",
            description: "Are you sure you want to delete this job card? This action cannot be undone.",
            confirmLabel: "Delete",
            variant: "destructive",
        })
        if (confirmed) {
            const promise = api.jobCards.destroy(jobCardId)
            toast.promise(promise, {
                loading: "Deleting job card...",
                success: "Job card deleted successfully",
                error: "Failed to delete job card",
            })
            await promise
            router.push("/sales/job-cards")
        }
    }

    const changeDateMutation = useMutation({
        mutationFn: (date: Date) => {
            const order_date = format(date, "yyyy-MM-dd")
            const promise = api.jobCards.changeDate(jobCardId, { order_date })
            toast.promise(promise, {
                loading: "Updating date...",
                success: "Date updated successfully",
                error: "Failed to update date",
            })
            return promise
        },
        onSuccess: () => {
            setDatePickerOpen(false)
            router.refresh()
        },
    })

    const changeServiceWriterMutation = useMutation({
        mutationFn: (employeeId: number) => {
            const promise = api.jobCards.changeServiceWriter(jobCardId, { service_writer_id: employeeId })
            toast.promise(promise, {
                loading: "Updating service writer...",
                success: "Service writer updated successfully",
                error: "Failed to update service writer",
            })
            return promise
        },
        onSuccess: () => {
            setServiceWriterDialogOpen(false)
            router.refresh()
        },
    })

    const changeSalesPersonMutation = useMutation({
        mutationFn: (employeeId: number) => {
            const promise = api.jobCards.changeSalesPerson(jobCardId, { sales_person_id: employeeId })
            toast.promise(promise, {
                loading: "Updating sales person...",
                success: "Sales person updated successfully",
                error: "Failed to update sales person",
            })
            return promise
        },
        onSuccess: () => {
            setSalesPersonDialogOpen(false)
            router.refresh()
        },
    })

    return (
        <div className="flex items-center gap-1">
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                        <CalendarIcon className="size-4" />
                        <span className="hidden sm:inline">Change Date</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="single"
                        onSelect={(date) => {
                            if (date) changeDateMutation.mutate(date)
                        }}
                        disabled={changeDateMutation.isPending}
                    />
                </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" onClick={() => setServiceWriterDialogOpen(true)}>
                <UserCog className="size-4" />
                <span className="hidden sm:inline">Service Writer</span>
            </Button>

            <Button variant="outline" size="sm" onClick={() => setSalesPersonDialogOpen(true)}>
                <UserCheck className="size-4" />
                <span className="hidden sm:inline">Sales Person</span>
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Ellipsis className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEdit}>
                        <Pencil className="size-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                        <Trash2 className="size-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <EmployeePickerDialog
                open={serviceWriterDialogOpen}
                onOpenChange={setServiceWriterDialogOpen}
                title="Change Service Writer"
                description="Search and select an employee to assign as service writer."
                employees={employees}
                loading={employeesLoading}
                isPending={changeServiceWriterMutation.isPending}
                onSelect={(id) => changeServiceWriterMutation.mutate(id)}
            />

            <EmployeePickerDialog
                open={salesPersonDialogOpen}
                onOpenChange={setSalesPersonDialogOpen}
                title="Change Sales Person"
                description="Search and select an employee to assign as sales person."
                employees={employees}
                loading={employeesLoading}
                isPending={changeSalesPersonMutation.isPending}
                onSelect={(id) => changeSalesPersonMutation.mutate(id)}
            />
        </div>
    )
}
