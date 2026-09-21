"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { usePermissions } from "@/shared/hooks/use-permissions"
import { useOpeningBalanceSessions } from "../hooks/use-opening-balance-sessions"
import { OpeningBalancePostDialog } from "./opening-balance-post-dialog"
import { OpeningBalanceSessionDialog } from "./opening-balance-session-dialog"

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
  const { can } = usePermissions()
  const canManage = can("openingBalances.manage")

  const [lockSessionId, setLockSessionId] = useState<string | null>(null)
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canManage && <Button onClick={hook.openCreate}>{t("newSession")}</Button>}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("number")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("description")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead className="text-end">{t("actions")}</TableHead>
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
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" disabled={hook.busy} onClick={() => hook.openEditor(session.id)}>
                        {session.status === "DRAFT" ? t("edit") : t("view")}
                      </Button>
                      {canManage && ["DRAFT", "VALIDATED", "REVIEWED"].includes(session.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={hook.busy}
                          onClick={() => hook.openPostDialog(session.id)}
                        >
                          {t("post")}
                        </Button>
                      )}
                      {canManage && session.status === "POSTED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={hook.busy}
                          onClick={() => setLockSessionId(session.id)}
                        >
                          {t("lock")}
                        </Button>
                      )}
                      {canManage && session.status === "DRAFT" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={hook.busy}
                          onClick={() => setDeleteSessionId(session.id)}
                        >
                          {t("delete")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <OpeningBalanceSessionDialog
        open={hook.editorOpen}
        onOpenChange={(next) => {
          if (!next) hook.closeEditor()
        }}
        sessionId={hook.editingSessionId}
        hook={hook}
        canManage={canManage}
      />

      <OpeningBalancePostDialog
        open={hook.postingSessionId !== null}
        onOpenChange={(next) => {
          if (!next) hook.closePostDialog()
        }}
        session={hook.postingSession}
        isPending={hook.postSession.isPending}
        onConfirm={() => {
          if (hook.postingSession) {
            hook.postSession.mutate({ id: hook.postingSession.id, status: hook.postingSession.status })
          }
        }}
      />

      <AlertDialog open={lockSessionId !== null} onOpenChange={(next) => !next && setLockSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lockTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("lockDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (lockSessionId) hook.lockSession.mutate(lockSessionId)
                setLockSessionId(null)
              }}
            >
              {t("confirmLock")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteSessionId !== null} onOpenChange={(next) => !next && setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteSessionId) hook.deleteSession.mutate(deleteSessionId)
                setDeleteSessionId(null)
              }}
            >
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
