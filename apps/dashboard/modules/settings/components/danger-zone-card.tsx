"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"

export type DangerZoneCardLabels = {
  /** Confirm-dialog title. */
  dialogTitle: string
  /** Confirm-dialog description / final warning. */
  dialogDescription: string
  /** Label above the confirmation input, e.g. `Type RESET FINANCE to confirm`. */
  confirmPrompt: string
  /** Primary destructive button + dialog action label. */
  actionLabel: string
  cancelLabel: string
  /** Toast strings. */
  running: string
  success: string
  failed: string
}

export type DangerZoneCardProps = {
  title: string
  description: string
  /** Bullet list of what will be permanently deleted. */
  warningItems: string[]
  /** Exact phrase the user must type to enable the destructive action. */
  confirmPhrase: string
  /** Runs the destructive request. */
  onConfirm: () => Promise<unknown>
  labels: DangerZoneCardLabels
}

export function DangerZoneCard({
  title,
  description,
  warningItems,
  confirmPhrase,
  onConfirm,
  labels,
}: DangerZoneCardProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")

  const phraseMatches = typed.trim() === confirmPhrase

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const promise = onConfirm()
      toast.promise(promise, {
        loading: labels.running,
        success: labels.success,
        error: labels.failed,
      })
      return promise
    },
    onSuccess: () => {
      setOpen(false)
      setTyped("")
      // Transactional data changed broadly — refresh every cached list.
      queryClient.invalidateQueries()
    },
  })

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertTriangle className="me-2 h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          <ul className="mt-1 list-disc ps-5 text-sm">
            {warningItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Alert>

        <div>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => setOpen(true)}
          >
            <AlertTriangle />
            {labels.actionLabel}
          </Button>
        </div>
      </CardContent>

      <AlertDialog
        open={open}
        onOpenChange={(v) => {
          if (isPending) return
          setOpen(v)
          if (!v) setTyped("")
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangle className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>{labels.dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{labels.dialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="danger-confirm">{labels.confirmPrompt}</Label>
            <Input
              id="danger-confirm"
              autoComplete="off"
              value={typed}
              placeholder={confirmPhrase}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{labels.cancelLabel}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={!phraseMatches || isPending}
              onClick={() => mutate()}
            >
              {labels.actionLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
