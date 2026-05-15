import { app, BrowserWindow, shell } from "electron"
import path from "path"

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "http://localhost:3000"
const isDev = !app.isPackaged

function createWindow(): BrowserWindow {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        show: false, // prevent white flash on startup
        titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,   // renderer cannot access Node APIs
            nodeIntegration: false,   // no Node in renderer
            sandbox: true,            // extra OS-level isolation
            allowRunningInsecureContent: false,
        },
    })

    win.loadURL(DASHBOARD_URL)

    // Show only once fully ready — avoids white flash
    win.once("ready-to-show", () => {
        win.show()
        if (isDev) {
            win.webContents.openDevTools({ mode: "detach" })
        }
    })

    // External links open in the system browser, not inside the app
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith(DASHBOARD_URL)) {
            return { action: "allow" }
        }
        shell.openExternal(url)
        return { action: "deny" }
    })

    return win
}

app.whenReady().then(() => {
    createWindow()

    // macOS: re-create window when dock icon is clicked and no windows are open
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

// Quit when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})
