"use client"

import { useCallback, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Download, FileUp, Upload } from "lucide-react"
import { toast } from "sonner"
import type { ImportResultDto } from "@devloggers/api-contracts"
import type { ItemsClient } from "@devloggers/api-client"
import { Button } from "@/shared/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table"
import { useResourceContext } from "@/shared/data-view/resource"
import { toApiListParams } from "@/shared/data-view/table-view/list-query.utils"

export function ItemsImportExportActions() {
    const t = useTranslations("business.resources.items")
    const { client, params, list, invalidateQuery } = useResourceContext<ItemsClient>()

    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<ImportResultDto | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [isValidating, setIsValidating] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const resetImportState = useCallback(() => {
        setFile(null)
        setPreview(null)
        if (inputRef.current) inputRef.current.value = ""
    }, [])

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const query = toApiListParams(params, { searchIn: list?.searchIn })
            await client.exportExcel(query)
            toast.success(t("exportSuccess"))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("exportError"))
        } finally {
            setIsExporting(false)
        }
    }

    const handleDownloadTemplate = async () => {
        try {
            await client.downloadImportTemplate()
            toast.success(t("templateSuccess"))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("templateError"))
        }
    }

    const handleValidate = async () => {
        if (!file) return
        setIsValidating(true)
        try {
            const result = await client.importExcel(file, true)
            setPreview(result)
            if (result.errors.length === 0) {
                toast.success(t("validateSuccess"))
            } else if (result.created + result.updated > 0) {
                toast.warning(t("validatePartial", { valid: result.created + result.updated, errors: result.errors.length }))
            } else {
                toast.error(t("importNoValidRows"))
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("importError"))
        } finally {
            setIsValidating(false)
        }
    }

    const importableCount = preview ? preview.created + preview.updated : 0
    const canImport = Boolean(file && preview && importableCount > 0 && !isImporting && !isValidating)

    const handleImport = async () => {
        if (!file || !canImport) return
        setIsImporting(true)
        try {
            const result = await client.importExcel(file, false)
            setPreview(result)
            if (result.created + result.updated > 0) {
                toast.success(t("importSuccess", { created: result.created, updated: result.updated }))
                invalidateQuery()
                if (result.errors.length === 0) {
                    setOpen(false)
                    resetImportState()
                } else {
                    toast.warning(t("importPartial", { skipped: result.skipped }))
                }
            } else {
                toast.error(t("importNoValidRows"))
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("importError"))
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isExporting}
                onClick={handleExport}
            >
                <Download />
                {isExporting ? t("exporting") : t("exportAction")}
            </Button>

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen)
                    if (!nextOpen) resetImportState()
                }}
            >
                <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="lg">
                        <Upload />
                        {t("importAction")}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("importTitle")}</DialogTitle>
                        <DialogDescription>{t("importDescription")}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="secondary" onClick={handleDownloadTemplate}>
                                <Download />
                                {t("downloadTemplate")}
                            </Button>
                        </div>

                        <button
                            type="button"
                            className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center hover:bg-muted/50"
                            onClick={() => inputRef.current?.click()}
                        >
                            <FileUp className="size-8 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {file ? file.name : t("importDropHint")}
                            </span>
                            <span className="text-xs text-muted-foreground">{t("importFileTypes")}</span>
                        </button>
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            className="hidden"
                            onChange={(event) => {
                                setFile(event.target.files?.[0] ?? null)
                                setPreview(null)
                            }}
                        />

                        {preview && (
                            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                                    <div><span className="text-muted-foreground">{t("importTotal")}:</span> {preview.totalRows}</div>
                                    <div><span className="text-muted-foreground">{t("importCreated")}:</span> {preview.created}</div>
                                    <div><span className="text-muted-foreground">{t("importUpdated")}:</span> {preview.updated}</div>
                                    <div><span className="text-muted-foreground">{t("importSkipped")}:</span> {preview.skipped}</div>
                                </div>

                                {preview.errors.length > 0 && (
                                    <div className="max-h-48 overflow-auto rounded-md border bg-background">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t("importRow")}</TableHead>
                                                    <TableHead>{t("importField")}</TableHead>
                                                    <TableHead>{t("importMessage")}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {preview.errors.map((error, index) => (
                                                    <TableRow key={`${error.row}-${index}`}>
                                                        <TableCell>{error.row}</TableCell>
                                                        <TableCell>{error.field ?? "—"}</TableCell>
                                                        <TableCell>{error.message}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                                {importableCount === 0 && preview.errors.length > 0 && (
                                    <p className="text-sm text-destructive">{t("importNoValidRows")}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={!file || isValidating || isImporting}
                            onClick={handleValidate}
                        >
                            {isValidating ? t("validating") : t("validateAction")}
                        </Button>
                        <Button
                            type="button"
                            disabled={!canImport}
                            onClick={handleImport}
                        >
                            {isImporting ? t("importing") : t("confirmImport")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
