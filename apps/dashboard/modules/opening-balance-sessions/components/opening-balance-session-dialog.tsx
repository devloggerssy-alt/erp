"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { PlusIcon, Trash2Icon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import {
  groupLinesByDimension,
  isLineComplete,
  linesFromSession,
  newLineForDimension,
  sumEnteredByCurrency,
  toLineBodies,
  type EditableSessionLine,
  type OpeningSessionDimension,
} from "../opening-balance-sessions.utils"
import {
  useOpeningSessionDetail,
  type useOpeningBalanceSessions,
} from "../hooks/use-opening-balance-sessions"

type SessionHook = ReturnType<typeof useOpeningBalanceSessions>
type SessionOptions = SessionHook["options"]

const STATUS_KEY: Record<string, string> = {
  DRAFT: "statusDraft",
  VALIDATED: "statusValidated",
  REVIEWED: "statusReviewed",
  POSTED: "statusPosted",
  LOCKED: "statusLocked",
}

const DIMENSION_TABS: { dimension: OpeningSessionDimension; labelKey: string }[] = [
  { dimension: "CASHBOX", labelKey: "sectionCash" },
  { dimension: "BANK_ACCOUNT", labelKey: "sectionBank" },
  { dimension: "PARTY", labelKey: "sectionParties" },
  { dimension: "ACCOUNT", labelKey: "sectionGL" },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string | null
  hook: SessionHook
  canManage: boolean
}

export function OpeningBalanceSessionDialog({ open, onOpenChange, sessionId, hook, canManage }: Props) {
  const t = useTranslations("business.resources.openingBalanceSessions")
  const { detail, isLoading: isDetailLoading } = useOpeningSessionDetail(open ? sessionId : null, open)

  const [fiscalPeriodId, setFiscalPeriodId] = useState("")
  const [description, setDescription] = useState("")
  const [lines, setLines] = useState<EditableSessionLine[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const loadedRef = useRef<string | null>(null)

  const isCreate = sessionId === null
  const isView = detail?.status === "POSTED" || detail?.status === "LOCKED"

  useEffect(() => {
    if (!open) {
      loadedRef.current = null
      return
    }
    if (isCreate) {
      if (loadedRef.current !== "new") {
        loadedRef.current = "new"
        setFiscalPeriodId("")
        setDescription("")
        setLines([newLineForDimension("CASHBOX")])
      }
      return
    }
    if (!detail || loadedRef.current === detail.id) return
    loadedRef.current = detail.id
    setFiscalPeriodId(detail.fiscalPeriodId)
    setDescription(detail.description ?? "")
    setLines(detail.lines.length > 0 ? linesFromSession(detail.lines) : [newLineForDimension("CASHBOX")])
  }, [open, isCreate, detail])

  const groups = groupLinesByDimension(lines)
  const totals = sumEnteredByCurrency(lines)
  const complete = lines.length > 0 && lines.every(isLineComplete)
  const isSaving = hook.createSession.isPending || hook.updateSession.isPending
  const periodLabel = hook.options.periods.find((period) => period.id === fiscalPeriodId)?.name ?? ""

  const updateLine = (key: string, patch: Partial<EditableSessionLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }
  const addLine = (dimension: OpeningSessionDimension) => {
    setLines((current) => [...current, newLineForDimension(dimension)])
  }
  const removeLine = (key: string) => {
    setLines((current) => current.filter((line) => line.key !== key))
  }

  const save = () => {
    const bodies = toLineBodies(lines)
    if (isCreate) {
      hook.createSession.mutate({
        fiscalPeriodId,
        description: description || undefined,
        lines: bodies,
      })
    } else if (sessionId) {
      hook.updateSession.mutate({
        id: sessionId,
        body: { description: description || undefined, lines: bodies },
      })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {isCreate ? t("newSession") : isView ? t("viewSession") : t("editSession")}
            </DialogTitle>
            <DialogDescription>
              {isCreate
                ? t("subtitle")
                : `${detail?.number ?? ""} — ${t(STATUS_KEY[detail?.status ?? "DRAFT"] ?? "statusDraft")}`}
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading && !isCreate ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("fiscalPeriod")}</Label>
                  {isCreate ? (
                    <Select value={fiscalPeriodId} onValueChange={setFiscalPeriodId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("selectPeriod")} />
                      </SelectTrigger>
                      <SelectContent>
                        {hook.options.periods.map((period) => (
                          <SelectItem key={period.id} value={period.id}>
                            {period.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{periodLabel || "—"}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>{t("description")}</Label>
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={isView || !canManage}
                  />
                </div>
              </div>

              <Tabs defaultValue="CASHBOX">
                <TabsList>
                  {DIMENSION_TABS.map((tab) => (
                    <TabsTrigger key={tab.dimension} value={tab.dimension}>
                      {t(tab.labelKey)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {DIMENSION_TABS.map((tab) => (
                  <TabsContent key={tab.dimension} value={tab.dimension} className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {t("linesCount", { count: groups[tab.dimension].length })}
                      </p>
                      {!isView && canManage && (
                        <Button size="sm" variant="outline" onClick={() => addLine(tab.dimension)}>
                          <PlusIcon className="size-4" />
                          {t("addLine")}
                        </Button>
                      )}
                    </div>
                    {groups[tab.dimension].length === 0 ? (
                      <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                        {t("noLines")}
                      </p>
                    ) : (
                      groups[tab.dimension].map((line) => (
                        <EditableLineRow
                          key={line.key}
                          line={line}
                          options={hook.options}
                          disabled={isView || !canManage}
                          onChange={(patch) => updateLine(line.key, patch)}
                          onRemove={() => removeLine(line.key)}
                        />
                      ))
                    )}
                  </TabsContent>
                ))}
              </Tabs>

              <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/40 p-3 text-xs">
                <span className="font-medium">{t("enterTotals")}:</span>
                {totals.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  totals.map((total) => (
                    <Badge key={total.currencyId || "base"} variant="outline">
                      {total.currencyId
                        ? hook.options.currencies.find((currency) => currency.id === total.currencyId)?.code ??
                          total.currencyId
                        : t("baseBucket")}
                      : {total.total}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {!isCreate && detail?.status === "DRAFT" && canManage && (
              <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={hook.busy}>
                {t("delete")}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("close")}
            </Button>
            {!isView && canManage && (
              <Button onClick={save} disabled={!complete || isSaving || (isCreate && !fiscalPeriodId)}>
                {isSaving ? t("saving") : t("saveDraft")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sessionId) hook.deleteSession.mutate(sessionId)
                setDeleteOpen(false)
              }}
            >
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

type LineRowProps = {
  line: EditableSessionLine
  options: SessionOptions
  disabled: boolean
  onChange: (patch: Partial<EditableSessionLine>) => void
  onRemove: () => void
}

function EditableLineRow({ line, options, disabled, onChange, onRemove }: LineRowProps) {
  const t = useTranslations("business.resources.openingBalanceSessions")
  const needsCurrency = line.dimension !== "ACCOUNT"
  const partyOptions =
    line.dimension === "PARTY" && line.partySide
      ? options.parties.filter((party) => party.type === (line.partySide === "AR" ? "CUSTOMER" : "SUPPLIER"))
      : options.parties

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border p-2">
      <div className="grid gap-1">
        {line.dimension === "CASHBOX" && (
          <>
            <Label className="text-xs">{t("cashbox")}</Label>
            <Select value={line.cashboxId} onValueChange={(value) => onChange({ cashboxId: value })} disabled={disabled}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("selectCashbox")} />
              </SelectTrigger>
              <SelectContent>
                {options.cashboxes.map((cashbox) => (
                  <SelectItem key={cashbox.id} value={cashbox.id}>
                    {cashbox.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        {line.dimension === "BANK_ACCOUNT" && (
          <>
            <Label className="text-xs">{t("bankAccount")}</Label>
            <Select
              value={line.bankAccountId}
              onValueChange={(value) => onChange({ bankAccountId: value })}
              disabled={disabled}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("selectBankAccount")} />
              </SelectTrigger>
              <SelectContent>
                {options.bankAccounts.map((bankAccount) => (
                  <SelectItem key={bankAccount.id} value={bankAccount.id}>
                    {bankAccount.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        {line.dimension === "PARTY" && (
          <>
            <Label className="text-xs">{t("party")}</Label>
            <div className="flex gap-2">
              <Select
                value={line.partyId}
                onValueChange={(value) => onChange({ partyId: value })}
                disabled={disabled}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("selectParty")} />
                </SelectTrigger>
                <SelectContent>
                  {partyOptions.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={line.partySide}
                onValueChange={(value) => onChange({ partySide: value as "AR" | "AP", partyId: "" })}
                disabled={disabled}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AR">{t("sideAR")}</SelectItem>
                  <SelectItem value="AP">{t("sideAP")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        {line.dimension === "ACCOUNT" && (
          <>
            <Label className="text-xs">{t("account")}</Label>
            <Select value={line.accountId} onValueChange={(value) => onChange({ accountId: value })} disabled={disabled}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("selectAccount")} />
              </SelectTrigger>
              <SelectContent>
                {options.accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {needsCurrency && (
        <div className="grid gap-1">
          <Label className="text-xs">{t("currency")}</Label>
          <Select
            value={line.currencyId}
            onValueChange={(value) => onChange({ currencyId: value })}
            disabled={disabled}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder={t("selectCurrency")} />
            </SelectTrigger>
            <SelectContent>
              {options.currencies.map((currency) => (
                <SelectItem key={currency.id} value={currency.id}>
                  {currency.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-1">
        <Label className="text-xs">{t("amount")}</Label>
        <Input
          type="number"
          step="any"
          className="w-32"
          value={line.amount}
          onChange={(event) => onChange({ amount: event.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-1">
        <Label className="text-xs">{t("exchangeRate")}</Label>
        <Input
          type="number"
          step="any"
          className="w-24"
          value={line.exchangeRate}
          onChange={(event) => onChange({ exchangeRate: event.target.value })}
          disabled={disabled}
        />
      </div>

      {!disabled && (
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label={t("removeLine")}>
          <Trash2Icon className="size-4" />
        </Button>
      )}
    </div>
  )
}
