<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Pages consume data only through `src/services` (contracts + factory in `src/services/index.ts`); never import `src/services/mock/*` from UI, so the mock can be swapped for a real backend in one place.
- Domain types/rules live in `src/domain/` with no React deps; money is integer COP, dates ISO, formatting via `src/lib/format.ts`.
- Role portals are separate route trees (`/admin`, `/inquilino`) wrapped by `AppShell`, which does the visual role check; real authorization must be repeated server-side.
