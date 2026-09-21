"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import {
  Dialog,
  DialogContent,
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
import { useOpeningBalanceSessions } from "../hooks/use-opening-balance-sessions"
import { OpeningBalanceSessionForm } from "./opening-balance-session-form"

const STATUS_KEY: Record<string, string> = {
  DRAFT: "statusDraft",
  VALIDATED: "statusValidated",
  REVIEWED: "statusReviewed",
  POSTED: "statusPosted",
  LOCKED: "statusLocked",
}

export function OpeningBalanceSessionsPage() {
  const t = useTranslations("business.resources.openingBalanceSessions")
  const hook = useOpeningBalanceSessions()

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => hook.setCreateOpen(true)}>{t("newSession")}</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("number")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("description")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hook.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("loading")}
                </TableCell>
              </TableRow>
            ) : hook.sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("noSessions")}
                </TableCell>
              </TableRow>
            ) : (
              hook.sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.number}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(STATUS_KEY[session.status] ?? "statusDraft")}</Badge>
                  </TableCell>
                  <TableCell>{session.description ?? "—"}</TableCell>
                  <TableCell>
                    {session.postedAt
                      ? new Date(session.postedAt).toLocaleDateString()
                      : new Date(session.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {["DRAFT", "VALIDATED", "REVIEWED"].includes(session.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={hook.busy}
                        onClick={() => hook.postSession.mutate({ id: session.id, status: session.status })}
                      >
                        {t("post")}
                      </Button>
                    )}
                    {session.status === "POSTED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={hook.busy}
                        onClick={() => hook.lockSession.mutate(session.id)}
                      >
                        {t("lock")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={hook.createOpen} onOpenChange={hook.setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newSession")}</DialogTitle>
          </DialogHeader>
          <OpeningBalanceSessionForm
            onSubmit={(body) => hook.createSession.mutate(body)}
            options={hook.options}
            disabled={hook.busy}
            onCancel={() => hook.setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}