# Dashboard Forms — Architecture

This document is the single source of truth for **how dashboard CRUD forms are built** in `apps/dashboard`. It captures the full pattern used by the `units`, `categories`, and `warehouses` modules and is the reference for any new resource form.

> Companion skill: [`.ai/skills/dashboard-form/SKILL.md`](../skills/dashboard-form/SKILL.md) — quick checklist + hook triggers for the agent.

---

## 1. Goals

- **One declarative config** per resource drives create + update + validation.
- **One thin form component** per resource — fields only, no plumbing.
- **Shared scaffolding** (form element, error alert, submit button, dialog close) is rendered by `ResourceFormShell`, not re-implemented per module.
- **No `any`**, no JSX in `*.config.ts`, no duplicated `useForm` / `useMutation` / `useFormDialog` wiring per form.

## 2. The 8 layers (top → bottom)

| # | Layer | File | Purpose |
|---|-------|------|---------|
| 1 | Page composition | `modules/<r>/components/<r>-page.tsx` | Wires `<Resource.FormDialog form={<R>Form} />` |
| 2 | Form component | `modules/<r>/components/<r>-form.tsx` | Declares the controller + renders the field list |
| 3 | Config (pure TS) | `modules/<r>/<r>.config.ts` | Zod schema, defaults, mappers, `ResourceFormConfig` |
| 4 | Controller hook | `shared/hooks/use-resource-form-controller.ts` | Composes form + mutation + dialog + toast |
| 5 | Infrastructure hooks | `shared/hooks/use-resource-form.ts`, `use-form-mutation.ts` | RHF + react-query wiring |
| 6 | Shell | `shared/components/form/resource-form-shell.tsx` | `<Rhform>` + error alert + field group + submit button |
| 7 | RHF field wrappers | `shared/components/form/fields/rhf-*.tsx` | Connect controls to RHF via `useController` |
| 8 | Form dialog | `shared/data-view/resource/resource-form-dialog.tsx` | Bridges `ResourceContext` ↔ form props |

Layers 6–8 are shared infrastructure. Modules only own layers 1–3.

---

## 3. The config file (`<r>.config.ts`)

Pure TypeScript — **no JSX, no React imports**. Holds everything needed to seed the form, validate it, and map it to API payloads.

```ts
// modules/units/units.config.ts
import { z } from "zod"
import type { CreateUnitDto, UpdateUnitDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export const unitFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    abbreviation: z.string().trim().min(1, "Abbreviation is required"),
    isActive: z.boolean().optional(),
})

export type UnitFormValues = z.infer<typeof unitFormSchema>

export const DEFAULT_UNIT_FORM_VALUES: UnitFormValues = {
    name: "",
    abbreviation: "",
    isActive: true,
}

export function mapUnitToFormValues(data: unknown): UnitFormValues {
    const resolved = unwrapApiData<UnitFormValues>(data)
    return {
        name: resolved.name ?? "",
        abbreviation: resolved.abbreviation ?? "",
        isActive: resolved.isActive ?? true,
    }
}

export const unitsFormConfig: ResourceFormConfig<
    UnitFormValues,
    CreateUnitDto,
    UpdateUnitDto
> = {
    schema: unitFormSchema,
    defaultValues: DEFAULT_UNIT_FORM_VALUES,
    mapToFormValues: mapUnitToFormValues,
    toCreate: (values) => ({
        name: values.name.trim(),
        abbreviation: values.abbreviation.trim(),
    }),
    toUpdate: (values) => ({
        name: values.name.trim(),
        abbreviation: values.abbreviation.trim(),
        isActive: values.isActive ?? true,
    }),
}
```

### `ResourceFormConfig` contract

```ts
type ResourceFormConfig<TValues, TCreate, TUpdate> = {
    schema: ZodType<TValues>                    // react-hook-form validation
    defaultValues: DefaultValues<TValues>       // initial blank state
    mapToFormValues: (data: unknown) => TValues // API → form (used on edit)
    toCreate: (values: TValues) => TCreate      // form → create payload
    toUpdate: (values: TValues) => TUpdate      // form → update payload
}
```

### Rules

- Always go through `unwrapApiData` in the mapper — it strips the `{ data }` envelope some endpoints return.
- Default `isActive` to `true` in `DEFAULT_*` and in `mapXToFormValues`; let `toUpdate` decide whether to send it.
- `description` / `address` / optional strings → `""` in defaults, trim in `toCreate` / `toUpdate`, and send `undefined` on create when empty.
- Reference relations (`parent` on categories) → store the `{ id, name }` object in the form, not the ID, so `RhfResourceSelect` can render it.

---

## 4. The form component (`<r>-form.tsx`)

Thin: calls the controller, renders the shell, lists the fields. **No `useForm`, no `useMutation`, no `useEffect` for `form.reset` here.**

```tsx
"use client"

import { useTranslations } from "next-intl"
import { type UnitsClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfCheckboxField, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { unitsFormConfig, type UnitFormValues } from "../units.config"

export function UnitsForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<UnitsClient>) {
    const t = useTranslations("business.resources.units")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<UnitsClient, UnitFormValues>({
        config: unitsFormConfig,
        getClient: (api) => api.units,
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfTextField name="name"            label={t("name")}            placeholder={t("namePlaceholder")}            required disabled={ctrl.isBusy} />
            <RhfTextField name="abbreviation"    label={t("abbreviation")}    placeholder={t("abbreviationPlaceholder")}    required disabled={ctrl.isBusy} />
            {ctrl.isEditing && (
                <RhfCheckboxField name="isActive" label={t("active")} description={tf("activeDescription")} disabled={ctrl.isBusy} />
            )}
        </ResourceFormShell>
    )
}
```

### Form props (injected by `ResourceFormDialog`)

```ts
type ResourceFormProps<TClient extends ICrudClient> = {
    resourceId: string | null          // null = create
    initialData: ResourceItem<TClient> | null  // present on edit (from selectedItem)
    onSuccess: () => void              // call after create/update success — invalidates the list
    paramKey?: string                  // forwarded to useFormDialog for close
}
```

### Conventions

- **Two translation hooks**: `t` for entity-specific strings (`business.resources.<r>.*`), `tf` for shared `system.resourceForm.*` strings.
- **Disable every field with `ctrl.isBusy`** — covers both submission and the initial edit fetch.
- **Show `isActive` only on edit** (`{ctrl.isEditing && ...}`). Defaults already make it `true` on create.
- **Relation selects** go through `RhfResourceSelect` and get the same client (`(api) => api[itemCategoryResource.key]`) the form uses.

---

## 5. The controller hook (`useResourceFormController`)

The single entry point for "wire a form to a CRUD client". It composes the three lower-level hooks and handles create-vs-update branching, toasts, dialog close, and form reset.

```ts
const ctrl = useResourceFormController<TClient, TValues, TCreate, TUpdate>({
    config:           <ResourceFormConfig>
    getClient:        (api) => api.<client>
    entityLabel:      t("entity")
    resourceId?:      string | null
    initialData?:     unknown
    paramKey?:        string
    onSuccess?:       () => void
    queryKey?:        QueryKey   // optional override
})
```

### Returns `ResourceFormController<TValues>`

```ts
{
    form:         UseFormReturn<TValues>   // pass to Rhform / useFormContext
    isEditing:    boolean                  // resourceId truthy
    isBusy:       boolean                  // isPending || isInitializing — disable fields
    error:        Error | null
    entityLabel:  string
    onSubmit:     (values: TValues) => void
}
```

### What it does for you

| Concern | Handled in controller |
|---------|----------------------|
| Branch create vs update by `resourceId` | yes |
| Fire `toast.promise` with create/update messages from `system.resourceForm` | yes |
| Call `form.reset(defaultValues)` + `close()` + `onSuccess?.()` on success | yes |
| Map API errors to per-field errors via `useFormMutation` + `ApiError.validationErrors` | yes |
| Initial fetch of entity on edit + `mapToFormValues` seeding | yes (via `useResourceForm`) |

---

## 6. The shell (`ResourceFormShell`)

Renders the shared scaffolding. **You never write `<form>`, error alerts, or submit buttons yourself.**

```tsx
<ResourceFormShell ctrl={ctrl}>
    {/* entity-specific fields only */}
</ResourceFormShell>
```

It renders, in order:

1. `<Rhform form={form} onSubmit={onSubmit}>` — the `<form>` element + `FormProvider` from RHF.
2. Destructive `<Alert>` with the localized error title + message (if `ctrl.error`).
3. `<FieldGroup>` containing `{children}` + the submit `<Button>`.
4. The submit button label/icon switches between **Create** (Plus) and **Update** (Save) automatically, and shows "Creating…" / "Updating…" while `isBusy`.

---

## 7. Available field components

All imported from `@/shared/components/form`. They are RHF-aware via `useController`, so you only pass `name` + label/placeholder/etc.

| Component | Renders | Use for |
|-----------|---------|---------|
| `RhfTextField` | `<TextInputField>` | Short free text (`name`, `code`, `abbreviation`, `address`) |
| `RhfTextareaField` | `<TextareaField>` | Long free text (`description`, `notes`) |
| `RhfCheckboxField` | `<CheckboxField>` with side label + description | `isActive` toggles (shown only on edit) |
| `RhfSelectField` | `<SelectField>` | Static options (enums) |
| `RhfAsyncSelectField` | `<AsyncSelectField>` | Server-driven options with debounced search |
| `RhfResourceSelect` | `<ResourceSelectField>` | **Pick an entity from another CRUD resource** (e.g. parent category) |
| `RhfResourceMultiSelect` | `<ResourceMultiSelectField>` | Pick many entities |
| `RhfFileField` / `RhfImageField` / `RhfDocumentField` | respective uploader | File / image / document uploads |
| `RhfField` | any control | Escape hatch for one-off controls |

### Common props for all `Rhf*Field`

```ts
{ name, label?, description?, required?, disabled?: boolean, ...controlSpecificProps }
```

### `RhfResourceSelect` example (parent category)

```tsx
<RhfResourceSelect
    name="parent"
    label={t("parent")}
    placeholder={t("parentPlaceholder")}
    client={(api) => api[itemCategoryResource.key]}
    getLabel={(item) => item.name}
    getValue={(item) => item}    // store the whole {id,name} object in the form
    pageSize={20}
    disabled={ctrl.isBusy}
/>
```

---

## 8. i18n keys

Forms rely on two namespaces:

| Namespace | Used for |
|-----------|----------|
| `business.resources.<r>.*` | Entity-specific: `name`, `namePlaceholder`, `active`, `entity`, … |
| `system.resourceForm.*` | Shared form chrome: `creating`, `updating`, `created`, `updated`, `createFailed`, `updateFailed`, `create`, `update`, `activeDescription` |

Both live in `packages/i18n/src/{en,ar,tr,ar-SY}/system.json` + `business.json`. See the current `resourceForm` block in `packages/i18n/src/en/system.json:101`.

When you add a new shared form string, **add it under `system.resourceForm`** in all four locales — never inline literals.

---

## 9. End-to-end request lifecycle

```
User clicks "Edit" on a row
    └─→ resource.setSelectedItem(row)            (ResourceContext)
        └─→ <ResourceFormDialog> opens
            └─→ <UnitsForm resourceId={row.id} initialData={row} onSuccess={invalidate} />
                └─→ useResourceFormController
                    ├─→ useResourceForm  → react-query GET client.show(id)
                    │   └─ on success, form.reset(mapToFormValues(data))
                    └─→ useFormMutation(form, { mutationFn })
                        └─ on submit: client.create | client.update
                            ├─→ toast.promise (loading / success / error)
                            └─ on success: form.reset(defaults) + close() + onSuccess()
                                └─ onSuccess() = resource.invalidateQuery()  → list refetches
```

---

## 10. Anti-patterns (do not do this)

| Anti-pattern | Why it's wrong |
|--------------|----------------|
| Calling `useForm()` directly in the form component | Bypasses the controller, re-implements mutation/dialog wiring. |
| Using `useEffect` to `form.reset(...)` based on `initialData` | `useResourceForm` already does this through `mapToFormValues`. |
| Putting `toast.promise` in the form component | Belongs in the controller so the message comes from `system.resourceForm`. |
| Hardcoding `disabled={isPending}` on fields | Use `disabled={ctrl.isBusy}` so the initial edit fetch also disables them. |
| Sending `isActive` on create | The create payload usually doesn't need it (server defaults to `true`). Gate it behind `toUpdate`. |
| Mapping `parent` to `string` ID in the form | `RhfResourceSelect` needs the full object so it can show the label. Convert to `parentId` only in `toCreate` / `toUpdate`. |
| Re-implementing `<form>`, error alert, submit button | All three are inside `ResourceFormShell`. |
| Importing the form from `apps/dashboard/modules/<r>/...` in `app/**/page.tsx` | Pages stay thin: `export default function Page() { return <RPage /> }` only. |
| Putting JSX in `*.config.ts` | Config must be pure TS so it can be imported by tests, validators, etc. |

---

## 11. Quick checklist for a new form

- [ ] `*.config.ts` exists with `schema`, `DEFAULT_*_FORM_VALUES`, `map*ToFormValues`, `*FormConfig: ResourceFormConfig<...>`
- [ ] `*FormValues` type exported, `DEFAULT_*_FORM_VALUES` exported, `map*ToFormValues` exported
- [ ] Config re-exported from `modules/<r>/index.ts`
- [ ] Form component calls `useResourceFormController<TClient, TFormValues, TCreate, TUpdate>({ config, getClient, entityLabel, resourceId, initialData, paramKey, onSuccess })`
- [ ] Form renders `<ResourceFormShell ctrl={ctrl}>...</ResourceFormShell>` with only the fields as children
- [ ] All fields have `disabled={ctrl.isBusy}`
- [ ] `isActive` checkbox is gated by `{ctrl.isEditing && ...}`
- [ ] Translations use `t("business.resources.<r>.*")` and `tf("system.resourceForm.*")` — no inline literals
- [ ] Page wires `actions={<Resource.FormDialog form={<R>Form} title={...} />}`
- [ ] Run `pnpm --filter @devloggers/dashboard lint` and fix any errors
