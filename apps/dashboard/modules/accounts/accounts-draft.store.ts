import { create } from "zustand"
import type { AccountType } from "@devloggers/api-contracts"

export type AccountDraft = {
    parent: { id: string; code: string; name: string } | null
    /** Forced type for the new account (parent's type for a child; bucket type for a root). */
    type: AccountType
}

type AccountDraftStore = {
    draft: AccountDraft | null
    setDraft: (draft: AccountDraft | null) => void
    clear: () => void
}

/** Carries the pre-filled parent/type from an "add child"/"add root" click into the create form. */
export const useAccountDraftStore = create<AccountDraftStore>((set) => ({
    draft: null,
    setDraft: (draft) => set({ draft }),
    clear: () => set({ draft: null }),
}))
