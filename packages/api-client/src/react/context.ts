import { createContext } from "react";
import { ApiClient } from "../core/apiClient";

export const ApiClientContext = createContext({
    apiClient: null as ApiClient | null,
})
