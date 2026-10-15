"use client"

import { useEffect, useRef } from "react"
import { parseAsString, useQueryState } from "nuqs"

/**
 * Opens a create dialog when a page is entered with `?action=create`
 * (e.g. from the dashboard quick actions), then clears the param so the
 * dialog does not reopen once it is closed.
 */
export function useCreateAction(onCreate: () => void) {
    const [action, setAction] = useQueryState("action", parseAsString)
    const onCreateRef = useRef(onCreate)

    useEffect(() => {
        onCreateRef.current = onCreate
    })

    useEffect(() => {
        if (action !== "create") return
        onCreateRef.current()
        void setAction(null, { history: "replace" })
    }, [action, setAction])
}
