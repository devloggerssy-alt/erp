"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/** `@tailwindcss/typography` is not configured in the dashboard, so markdown uses plain utility classes. */
export function TextPart({ text }: { text: string }) {
    return (
        <div
            className="space-y-2 text-sm leading-relaxed break-words [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_ol]:list-decimal [&_ol]:ps-5 [&_pre]:overflow-x-auto [&_table]:text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:ps-5"
            dir="auto"
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
    )
}
