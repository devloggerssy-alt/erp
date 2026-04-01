import type { FieldShellProps } from "./types"
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/shared/components/ui/field"

export function FieldShell({
  label,
  error,
  description,
  required,
  children,
}: FieldShellProps) {
  return (
    <Field data-invalid={!!error || undefined}>
      {label && (
        <FieldLabel>
          {label}
          {required && <span className="text-destructive">*</span>}
        </FieldLabel>
      )}
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}
