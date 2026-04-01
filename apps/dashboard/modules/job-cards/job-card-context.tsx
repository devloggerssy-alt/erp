"use client"

import { createContext, useContext, useState, useCallback } from "react"
import type { JobCardStatus } from "./job-card.schema"

type JobCardContextValue = {
    id: string
    label: string
    status: JobCardStatus
    setStatus: (status: JobCardStatus) => void
}

const JobCardContext = createContext<JobCardContextValue | null>(null)

export function JobCardProvider({
    jobCard,
    children,
}: {
    jobCard: { id: string; label: string; status: JobCardStatus }
    children: React.ReactNode
}) {
    const [status, setStatusState] = useState<JobCardStatus>(jobCard.status)

    const setStatus = useCallback((newStatus: JobCardStatus) => {
        setStatusState(newStatus)
    }, [])

    return (
        <JobCardContext.Provider value={{ id: jobCard.id, label: jobCard.label, status, setStatus }}>
            {children}
        </JobCardContext.Provider>
    )
}

export function useJobCard() {
    return useContext(JobCardContext)
}
