import { create } from "zustand"

type AppStore = {
  lastLoginEmail: string
  sidebarOpen: boolean
  setLastLoginEmail: (email: string) => void
  setSidebarOpen: (open: boolean) => void
  reset: () => void
}

const initialState = {
  lastLoginEmail: "",
  sidebarOpen: true,
}

const useAppStore = create<AppStore>()((set) => ({
  ...initialState,
  setLastLoginEmail: (email) => set({ lastLoginEmail: email }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  reset: () => set(initialState),
}))

export { useAppStore }