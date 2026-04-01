import { cn } from '@/shared/lib/utils'
import React from 'react'
import { DashboardHeader, type DashboardHeaderProps } from './dashboard-header'

type DashboardPageProps = {
    children: React.ReactNode
    header?: React.ReactNode | null
    headerProps?: DashboardHeaderProps
    toolbar?: React.ReactNode
    title?: string
    fullscreen?: boolean
}

export default function DashboardPage({ children, header, headerProps, title, fullscreen, toolbar }: DashboardPageProps) {
    const resolvedHeader = header !== undefined
        ? header
        : <DashboardHeader {...headerProps} />

    return (
        <div className='page'>
            {resolvedHeader !== null && (
                <header>
                    {resolvedHeader}
                </header>
            )}
            <main className={cn('p-4 w-full h-full ', fullscreen && 'h-screen p-0 lg:p-0')}>
                {(title || toolbar) && <div className='flex items-center justify-between gap-4 mb-4'>

                    {
                        title &&
                        <h2 className='text-lg lg:text-2xl font-bold '>  {title}</h2>
                    }
                    {
                        toolbar &&
                        <div className=''>
                            {toolbar}
                        </div>
                    }

                </div>}
                {children}
            </main>
        </div>
    )
}
