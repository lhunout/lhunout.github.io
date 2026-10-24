<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules

Personal portfolio, statically exported to GitHub Pages (`output: 'export'`): no server, no API routes.

- **Content**: every visible text lives in `data/cv-data.ts`. The chatbot prompt is generated from it, so new visible content goes there, never hard-coded in a component.
- **Design tokens**: colors, fonts, text sizes and shadows are defined only in `app/globals.css` (`@theme`). No hex, rgb or arbitrary `text-[…]` values in components. WebGL code reads tokens through `lib/theme.ts`.
- **Hero**: don't change `components/Hero.tsx` layout or copy unless explicitly asked.
- **Chat**: calls the Groq API from the browser with `NEXT_PUBLIC_GROQ_API_KEY`. The key is public by design, so it must stay on Groq's free plan.
- **Code**: comments in English, short, only for constraints the code can't show. No dead code, no unused exports or assets.
- **Before handing work back**: `npm run format`, `npm run lint`, `npm run typecheck`, and `npm run build` for structural changes.
