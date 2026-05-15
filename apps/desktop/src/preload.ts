import { contextBridge } from "electron"

// Expose a safe, minimal API surface to the renderer (the dashboard web app).
// Add more entries here as native features are needed (e.g. file dialogs, notifications).
contextBridge.exposeInMainWorld("electronAPI", {
    platform: process.platform,
})
