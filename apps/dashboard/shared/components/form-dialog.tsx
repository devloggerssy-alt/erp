import React from 'react'
import { useQueryStates, parseAsBoolean, parseAsString } from 'nuqs'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Plus } from 'lucide-react'

export const formDialogParams = {
    dialog: parseAsBoolean.withDefault(false),
    resourceId: parseAsString,
}

export function useFormDialog(paramKey?: string) {
    // Default (no paramKey) uses the standard `dialog` and `resourceId` params
    const defaultState = useQueryStates(formDialogParams)

    // When a paramKey is provided, use prefixed params to avoid URL collisions
    const prefixedState = useQueryStates({
        [`${paramKey ?? "_"}_dialog`]: parseAsBoolean.withDefault(false),
        [`${paramKey ?? "_"}_resourceId`]: parseAsString,
    })

    if (paramKey) {
        const [params, setParams] = prefixedState
        const dialogKey = `${paramKey}_dialog`
        const resourceIdKey = `${paramKey}_resourceId`

        const open = (resourceId?: string) => {
            setParams({ [dialogKey]: true, [resourceIdKey]: resourceId ?? null })
        }
        const close = () => {
            setParams({ [dialogKey]: false, [resourceIdKey]: null })
        }

        return {
            isOpen: (params as Record<string, unknown>)[dialogKey] as boolean,
            resourceId: (params as Record<string, unknown>)[resourceIdKey] as string | null,
            open,
            close,
        }
    }

    const [params, setParams] = defaultState

    const open = (resourceId?: string) => {
        setParams({ dialog: true, resourceId: resourceId ?? null })
    }
    const close = () => {
        setParams({ dialog: false, resourceId: null })
    }

    return {
        isOpen: params.dialog,
        resourceId: params.resourceId,
        open,
        close,
    }
}

/**
 * Presentational, controlled dialog shell. Owns no domain state — the caller
 * decides `open`/`resourceId`, and may override the shell (layout, header,
 * close button, scrolling) for document-style forms. Domain-specific inputs are
 * never accepted here; pass those to the form component instead.
 */
export type FormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    resourceId: string | null
    children: (resourceId: string | null) => React.ReactNode
    /** Custom trigger element. When omitted, the built-in "+ title" button is used. */
    trigger?: React.ReactNode
    /** Render the trigger. Defaults to true. */
    showTrigger?: boolean
    /** Override the `DialogContent` classes (e.g. full-screen document layouts). */
    contentClassName?: string
    /** Replace the default header, or pass `false` to hide it (the form renders its own). */
    header?: React.ReactNode | false
    /** Render the built-in close button. Defaults to true. */
    showCloseButton?: boolean
    /** Wrap children in a `ScrollArea`. Defaults to true; disable for self-scrolling forms. */
    scrollable?: boolean
    /** Override the `ScrollArea` classes. */
    scrollClassName?: string
}

export default function FormDialog({
    open,
    onOpenChange,
    title,
    resourceId,
    children,
    trigger,
    showTrigger = true,
    contentClassName,
    header,
    showCloseButton = true,
    scrollable = true,
    scrollClassName,
}: FormDialogProps) {
    return (
        <>
            {showTrigger && (trigger ?? (
                <Button size='lg' onClick={() => onOpenChange(true)}>
                    <Plus />
                    {title}
                </Button>
            ))}
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className={contentClassName ?? 'min-w-xl'}
                    showCloseButton={showCloseButton}
                >
                    {header === false ? null : (header ?? (
                        <DialogHeader>
                            <DialogTitle className='text-2xl font-bold'>
                                {title}
                            </DialogTitle>
                        </DialogHeader>
                    ))}
                    {scrollable ? (
                        <ScrollArea className={scrollClassName ?? 'max-h-[80vh]'}>
                            {children(resourceId)}
                        </ScrollArea>
                    ) : (
                        children(resourceId)
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
