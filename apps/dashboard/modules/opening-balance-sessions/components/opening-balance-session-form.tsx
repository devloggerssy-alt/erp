"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import type { CreateSessionBody, useOpeningBalanceSessions } from "../hooks/use-opening-balance-sessions"

type Props = {
  onSubmit: (body: CreateSessionBody) => void
  options: ReturnType<typeof useOpeningBalanceSessions>["options"]
  disabled: boolean
  onCancel: () => void
}

export function OpeningBalanceSessionForm({ onSubmit, options, disabled, onCancel }: Props) {
  const t = useTranslations("business.resources.openingBalanceSessions")
  const [fiscalPeriodId, setFiscalPeriodId] = useState("")
  const [description, setDescription] = useState("")
  const [dimension, setDimension] = useState("CASHBOX")
  const [cashboxId, setCashboxId] = useState("")
  const [bankAccountId, setBankAccountId] = useState("")
  const [partyId, setPartyId] = useState("")
  const [partySide, setPartySide] = useState("AR")
  const [accountId, setAccountId] = useState("")
  const [currencyId, setCurrencyId] = useState("")
  const [amount, setAmount] = useState("0")
  const [exchangeRate, setExchangeRate] = useState("1")

  const valid =
    fiscalPeriodId !== "" &&
    Number(amount) !== 0 &&
    (dimension === "CASHBOX"
      ? cashboxId !== "" && currencyId !== ""
      : dimension === "BANK_ACCOUNT"
        ? bankAccountId !== "" && currencyId !== ""
        : dimension === "PARTY"
          ? partyId !== "" && currencyId !== ""
          : accountId !== "")

  const needsCurrency = ["CASHBOX", "BANK_ACCOUNT", "PARTY"].includes(dimension)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label>{t("fiscalPeriod")}</Label>
        <Select value={fiscalPeriodId} onValueChange={setFiscalPeriodId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("selectPeriod")} />
          </SelectTrigger>
          <SelectContent>
            {options.periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>{t("description")}</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label>{t("dimension")}</Label>
        <Select value={dimension} onValueChange={setDimension}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CASHBOX">{t("dimensionCASHBOX")}</SelectItem>
            <SelectItem value="BANK_ACCOUNT">{t("dimensionBANK_ACCOUNT")}</SelectItem>
            <SelectItem value="PARTY">{t("dimensionPARTY")}</SelectItem>
            <SelectItem value="ACCOUNT">{t("dimensionACCOUNT")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {dimension === "CASHBOX" && (
        <div className="grid gap-2">
          <Label>{t("cashbox")}</Label>
          <Select value={cashboxId} onValueChange={setCashboxId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("select")} />
            </SelectTrigger>
            <SelectContent>
              {options.cashboxes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {dimension === "BANK_ACCOUNT" && (
        <div className="grid gap-2">
          <Label>{t("bankAccount")}</Label>
          <Select value={bankAccountId} onValueChange={setBankAccountId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("select")} />
            </SelectTrigger>
            <SelectContent>
{options.bankAccounts.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.code}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {dimension === "PARTY" && (
        <>
          <div className="grid gap-2">
            <Label>{t("party")}</Label>
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("select")} />
              </SelectTrigger>
              <SelectContent>
{options.parties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("partySide")}</Label>
            <Select value={partySide} onValueChange={setPartySide}>
              <SelectTrigger className="w-full">
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

      {dimension === "ACCOUNT" && (
        <div className="grid gap-2">
          <Label>{t("account")}</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("select")} />
            </SelectTrigger>
            <SelectContent>
{options.accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.code}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {needsCurrency && (
        <div className="grid gap-2">
          <Label>{t("currency")}</Label>
          <Select value={currencyId} onValueChange={setCurrencyId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("select")} />
            </SelectTrigger>
            <SelectContent>
              {options.currencies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>{t("amount")}</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>{t("exchangeRate")}</Label>
          <Input type="number" step="any" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={disabled}>
          {t("cancel")}
        </Button>
        <Button
          disabled={!valid || disabled}
          onClick={() =>
            onSubmit({
              fiscalPeriodId,
              description: description || undefined,
              lines: [
                {
                  dimension,
                  accountId: dimension === "ACCOUNT" ? accountId : null,
                  partyId: dimension === "PARTY" ? partyId : null,
                  cashboxId: dimension === "CASHBOX" ? cashboxId : null,
                  bankAccountId: dimension === "BANK_ACCOUNT" ? bankAccountId : null,
                  currencyId: needsCurrency ? currencyId : null,
                  partySide: dimension === "PARTY" ? partySide : null,
                  amount: Number(amount),
                  exchangeRate: Number(exchangeRate) || 1,
                },
              ],
            })
          }
        >
          {t("create")}
        </Button>
      </div>
    </div>
  )
}