import { createContext } from "react";
import { Api } from "../api";

export const ApiClientContext = createContext({
    api: null as Api | null,
})

