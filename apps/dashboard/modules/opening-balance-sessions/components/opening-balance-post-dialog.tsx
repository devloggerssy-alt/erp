"use client"

import { useTranslations } from "next-intl"
import { TriangleAlertIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { useOpeningSessionPreview, type OpeningSessionListItem } from "../hooks/use-opening-balance-sessions"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: OpeningSessionListItem | null
  isPending: boolean
  onConfirm: () => void
}

function money(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
}

export function OpeningBalancePostDialog({ open, onOpenChange, session, isPending, onConfirm }: Props) {
  const t = useTranslations("business.resources.openingBalanceSessions")
  const { preview, isLoading, error } = useOpeningSessionPreview(open ? session?.id ?? null : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("postTitle")}</DialogTitle>
          <DialogDescription>
            {session ? `${session.number} — ${t("postDescription")}` : t("postDescription")}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">{t("previewLoading")}</p>}

        {error && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>{t("previewError")}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {preview && !error && (
          <div className="space-y-5">
            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t("currencyTotals")}</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("currencyColumn")}</TableHead>
                      <TableHead className="text-end">{t("totalDebit")}</TableHead>
                      <TableHead className="text-end">{t("totalCredit")}</TableHead>
                      <TableHead className="text-end">{t("totalNet")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.currencyTotals.map((total) => (
                      <TableRow key={total.currencyId ?? "base"}>
                        <TableCell>
                          <Badge variant="outline">{total.currencyCode ?? t("baseBucket")}</Badge>
                        </TableCell>
                        <TableCell className="text-end">{money(total.debit)}</TableCell>
                        <TableCell className="text-end">{money(total.credit)}</TableCell>
                        <TableCell className="text-end">{money(total.net)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{t("offsetTitle")}: </span>
                {preview.offset
                  ? t("offsetDescription", { amount: money(preview.offset.amount), account: preview.offset.accountCode })
                  : t("balanced")}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t("partyPreview")}</h3>
              {preview.parties.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noPartyLines")}</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("party")}</TableHead>
                        <TableHead>{t("partySideColumn")}</TableHead>
                        <TableHead>{t("currencyColumn")}</TableHead>
                        <TableHead className="text-end">{t("openingNet")}</TableHead>
                        <TableHead className="text-end">{t("currentBalance")}</TableHead>
                        <TableHead className="text-end">{t("resultingBalance")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.parties.map((party) => (
                        <TableRow key={`${party.partyId}:${party.side}:${party.currencyId}`}>
                          <TableCell>{party.partyName}</TableCell>
                          <TableCell>{party.side === "AR" ? t("sideAR") : t("sideAP")}</TableCell>
                          <TableCell>{party.currencyCode}</TableCell>
                          <TableCell className="text-end">{money(party.openingNet)}</TableCell>
                          <TableCell className="text-end">{money(party.currentBalance)}</TableCell>
                          <TableCell className="text-end">{money(party.resultingBalance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={!preview || Boolean(error) || isPending}>
            {isPending ? t("posting") : t("postConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
