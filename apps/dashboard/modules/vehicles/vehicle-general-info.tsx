import {
    Car,
    Calendar,
    Gauge,
    Fuel,
    Cog,
    Palette,
    Hash,
    FileText,
    Users,
    Shield,
    Wrench,
    CircleDot,
} from "lucide-react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Separator } from "@/shared/components/ui/separator"

type VehicleData = {
    id?: number
    make?: string
    model?: string
    year?: string
    sub_model?: string
    license_plate?: string
    vin_number?: string
    engine_number?: string | null
    engine_size?: string
    drivetrain?: string
    mileage?: string
    owners_number?: string
    front_tire_size?: string | null
    rear_tire_size?: string | null
    note?: string
    image_url?: string | null
    reg_date?: string | null
    mfg_date?: string | null
    created_at?: string
    updated_at?: string
    shop_type?: { id?: number; title?: string }
    vehicle_body_type?: { id?: number; title?: string }
    vehicle_fuel_type?: { id?: number; title?: string }
    vehicle_transmission?: { id?: number; title?: string }
    vehicle_color?: { id?: number; title?: string; code?: string }
}

type VehicleGeneralInfoProps = {
    vehicle: VehicleData
}

function InfoItem({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value?: string | null
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">
                    {value || <span className="text-muted-foreground">—</span>}
                </span>
            </div>
        </div>
    )
}

export function VehicleGeneralInfo({ vehicle }: VehicleGeneralInfoProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Vehicle Identity */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Car className="size-4" />
                        Vehicle Identity
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                            {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Unknown"}
                        </Badge>
                        {vehicle.year && <Badge variant="outline">{vehicle.year}</Badge>}
                        {vehicle.sub_model && (
                            <Badge variant="outline">{vehicle.sub_model}</Badge>
                        )}
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InfoItem
                            icon={Hash}
                            label="License Plate"
                            value={vehicle.license_plate}
                        />
                        <InfoItem
                            icon={Shield}
                            label="VIN Number"
                            value={vehicle.vin_number}
                        />
                        <InfoItem
                            icon={FileText}
                            label="Engine Number"
                            value={vehicle.engine_number}
                        />
                        <InfoItem
                            icon={Users}
                            label="Number of Owners"
                            value={vehicle.owners_number}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Technical Specifications */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wrench className="size-4" />
                        Technical Specifications
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {vehicle.vehicle_body_type?.title && (
                            <Badge variant="secondary">{vehicle.vehicle_body_type.title}</Badge>
                        )}
                        {vehicle.vehicle_transmission?.title && (
                            <Badge variant="outline">{vehicle.vehicle_transmission.title}</Badge>
                        )}
                        {vehicle.vehicle_fuel_type?.title && (
                            <Badge variant="outline">{vehicle.vehicle_fuel_type.title}</Badge>
                        )}
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InfoItem
                            icon={Cog}
                            label="Engine Size"
                            value={vehicle.engine_size}
                        />
                        <InfoItem
                            icon={CircleDot}
                            label="Drivetrain"
                            value={vehicle.drivetrain}
                        />
                        <InfoItem
                            icon={Gauge}
                            label="Mileage"
                            value={vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : null}
                        />
                        <InfoItem
                            icon={Fuel}
                            label="Fuel Type"
                            value={vehicle.vehicle_fuel_type?.title}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Appearance & Shop */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="size-4" />
                        Appearance
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <InfoItem
                        icon={Palette}
                        label="Color"
                        value={vehicle.vehicle_color?.title}
                    />
                    <InfoItem
                        icon={Wrench}
                        label="Shop Type"
                        value={vehicle.shop_type?.title}
                    />
                    <InfoItem
                        icon={CircleDot}
                        label="Front Tire Size"
                        value={vehicle.front_tire_size}
                    />
                    <InfoItem
                        icon={CircleDot}
                        label="Rear Tire Size"
                        value={vehicle.rear_tire_size}
                    />
                </CardContent>
            </Card>

            {/* Dates & Notes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="size-4" />
                        Dates & Notes
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InfoItem
                            icon={Calendar}
                            label="Registration Date"
                            value={vehicle.reg_date ? new Date(vehicle.reg_date).toLocaleDateString() : null}
                        />
                        <InfoItem
                            icon={Calendar}
                            label="Manufacturing Date"
                            value={vehicle.mfg_date ? new Date(vehicle.mfg_date).toLocaleDateString() : null}
                        />
                    </div>
                    {vehicle.note && (
                        <>
                            <Separator />
                            <div className="flex items-start gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                    <FileText className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-muted-foreground">Note</span>
                                    <p className="text-sm whitespace-pre-wrap">{vehicle.note}</p>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
