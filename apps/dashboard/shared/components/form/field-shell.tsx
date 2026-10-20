import type { FieldShellProps } from "./types"
import { useFieldErrorMessage } from "@/shared/hooks/use-field-error-message"
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
  const message = useFieldErrorMessage(error)

  return (
    <Field dir="auto" data-invalid={!!message || undefined}>
      {label && (
        <FieldLabel>
          {label}
          {required && <span className="text-destructive">*</span>}
        </FieldLabel>
      )}
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      {message && <FieldError>{message}</FieldError>}
    </Field>
  )
}
