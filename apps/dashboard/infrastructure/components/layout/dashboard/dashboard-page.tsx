import { cn } from '@/shared/lib/utils'
import React from 'react'
import { DashboardHeader, type DashboardHeaderProps } from './dashboard-header'

type DashboardPageProps = {
    children: React.ReactNode
    toolbar?: React.ReactNode
    title?: string
    description?: string
    fullscreen?: boolean
}

export default function DashboardPage({ children, description, title, fullscreen, toolbar }: DashboardPageProps) {

    return (
        <div className='page'>

            <main className={cn('p-4 w-full h-full ', fullscreen && 'h-screen p-0 lg:p-0')}>
                {(title || toolbar) && <div className='flex items-center justify-between gap-4 mb-4'>

                    {
                        title &&
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                            <p className="text-muted-foreground mt-1">
                                {description}
                            </p>
                        </div>

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
