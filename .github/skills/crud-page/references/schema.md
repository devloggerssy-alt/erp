# Schema Reference

## File Location

`apps/dashboard/modules/<feature>/<feature>.schema.ts`

## Template

```ts
import { z } from "zod"

// Reusable relation field schema — use for all foreign-key / lookup fields
const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

const <feature>FormSchema = z.object({
    // ── Relations (stored as { value, label } objects, mapped to IDs on submit) ──
    // category: relationFieldSchema,

    // ── Required strings ──
    // name: z.string().min(1, "Name is required"),

    // ── Optional strings ──
    // description: z.string().optional(),

    // ── Optional email (allows empty string) ──
    // email: z.union([
    //     z.string().email("Enter a valid email address"),
    //     z.literal(""),
    // ]).optional(),

    // ── Optional phone ──
    // phone: z.string().optional(),

    // ── Boolean ──
    // is_active: z.boolean().default(true),

    // ── Number ──
    // quantity: z.coerce.number().min(0),

    // ── Date ──
    // due_date: z.string().optional(),
})

type <Feature>FormValues = z.infer<typeof <feature>FormSchema>

export { <feature>FormSchema, relationFieldSchema }
export type { <Feature>FormValues }
```

## Field Type Patterns

### Required string
```ts
name: z.string().min(1, "Name is required"),
```

### Optional string
```ts
notes: z.string().optional(),
```

### Optional email (allows empty)
```ts
email: z.union([
    z.string().email("Enter a valid email address"),
    z.literal(""),
]).optional(),
```

### Relation / Foreign key
```ts
const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

// In schema:
department: relationFieldSchema,
```

### Required relation
```ts
department: z
    .object({ value: z.string(), label: z.string() })
    .refine((v) => v !== null, { message: "Department is required" }),
```

### Boolean with default
```ts
is_active: z.boolean().default(true),
```

### Number (from string input)
```ts
quantity: z.coerce.number().min(0, "Must be non-negative"),
price: z.coerce.number().min(0),
```

### Static enum select
```ts
status: z.enum(["active", "inactive", "pending"]).default("active"),
salutation: z.string().optional(),
```

## Real Example: CustomerFormSchema

```ts
import { z } from "zod"

const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

type RelationField = z.infer<typeof relationFieldSchema>

const customerFormSchema = z.object({
    customer_type: relationFieldSchema,
    referral_source: relationFieldSchema,
    payment_terms: relationFieldSchema,
    country: relationFieldSchema,
    state: relationFieldSchema,
    salutation: z.string().optional(),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    company_name: z.string().optional(),
    email: z.union([
        z.string().email("Enter a valid email address"),
        z.literal(""),
    ]).optional(),
    phone: z.string().optional(),
    alternate_phone: z.string().optional(),
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    city: z.string().optional(),
    zip_code: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof customerFormSchema>

export { customerFormSchema, relationFieldSchema }
export type { CustomerFormValues, RelationField }
```
