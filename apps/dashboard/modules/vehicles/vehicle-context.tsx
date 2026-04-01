"use client"

import { createContext, useContext } from "react"

type VehicleContextValue = {
    id: string
    label: string
}

const VehicleContext = createContext<VehicleContextValue | null>(null)

export function VehicleProvider({ vehicle, children }: { vehicle: VehicleContextValue; children: React.ReactNode }) {
    return <VehicleContext.Provider value={vehicle}>{children}</VehicleContext.Provider>
}

export function useVehicle() {
    return useContext(VehicleContext)
}
