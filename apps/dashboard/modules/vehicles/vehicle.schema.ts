import { z } from "zod"

export const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

export const vehicleFormSchema = z.object({
    // ── Relations ──
    shop_type: relationFieldSchema,
    vehicle_body_type: relationFieldSchema,
    vehicle_fuel_type: relationFieldSchema,
    vehicle_transmission: relationFieldSchema,
    vehicle_color: relationFieldSchema,

    // ── Vehicle identity ──
    make: z.string().optional(),
    model: z.string().optional(),
    year: z.string().optional(),
    sub_model: z.string().optional(),

    // ── License & identifiers ──
    license_plate: z.string().optional(),
    vin_number: z.string().optional(),

    // ── Technical specs ──
    engine_size: z.string().optional(),
    drivetrain: z.string().optional(),
    mileage: z.string().optional(),
    owners_number: z.string().optional(),

    // ── Notes ──
    note: z.string().optional(),

    // ── Image ──
    image: z.any().optional(),
})

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>
