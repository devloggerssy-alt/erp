"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { ImagePlus, X } from "lucide-react"
import type { BaseFieldControlProps } from "../types"
import { cn } from "@/shared/lib/utils"

export type ImageInputFieldProps = BaseFieldControlProps<File | null> & {
    accept?: string
}

export function ImageInputField({
    value,
    onChange,
    onBlur,
    name,
    disabled,
    invalid,
    accept = "image/*",
}: ImageInputFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    useEffect(() => {
        if (!value) {
            setPreview(null)
            return
        }
        const url = URL.createObjectURL(value)
        setPreview(url)
        return () => URL.revokeObjectURL(url)
    }, [value])

    const handleFile = useCallback(
        (file: File | null) => {
            if (file && !file.type.startsWith("image/")) return
            onChange(file)
        },
        [onChange],
    )

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragging(false)
            if (disabled) return
            const file = e.dataTransfer.files?.[0] ?? null
            handleFile(file)
        },
        [disabled, handleFile],
    )

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            if (!disabled) setIsDragging(true)
        },
        [disabled],
    )

    const handleDragLeave = useCallback(() => setIsDragging(false), [])

    const handleClear = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            onChange(null)
            if (inputRef.current) inputRef.current.value = ""
        },
        [onChange],
    )

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => !disabled && inputRef.current?.click()}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    inputRef.current?.click()
                }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onBlur={onBlur}
            aria-invalid={invalid || undefined}
            className={cn(
                "relative flex min-h-35 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-background p-4 text-sm transition-colors",
                isDragging && "border-primary bg-primary/5",
                invalid && "border-destructive",
                disabled && "pointer-events-none opacity-50",
            )}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                name={name}
                disabled={disabled}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />

            {preview ? (
                <>
                    <img
                        src={preview}
                        alt="Preview"
                        className="max-h-30 max-w-full rounded-md object-contain"
                    />
                    {!disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </>
            ) : (
                <>
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <span className="text-muted-foreground">
                        Click or drag & drop an image
                    </span>
                </>
            )}
        </div>
    )
}
