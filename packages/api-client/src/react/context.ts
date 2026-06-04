import { createContext } from "react";
import { Api } from "../api";

export const ApiContext = createContext({
    api: null as Api | null,
})

