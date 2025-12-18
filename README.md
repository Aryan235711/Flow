<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1y2a1ni1pLS1n59-9z-bTjvLMrhFirpvt

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Version Control Workflow

- Main stays protected: develop on short-lived branches (e.g., `fix/pagetransition-key`, `feat/<topic>`), then PR to `main`.
- Before new work: `git switch main` and `git pull --ff-only` to stay up to date.
- For changes: `git switch -c <branch>` → edit → `npm test`/`npm run build` as needed → `git add -A && git commit -m "<type>: <summary>"` → `git push -u origin <branch>`.
- Open a PR on GitHub, get review, then merge to `main`; delete the branch after merge.
- Keep secrets out of git (`.env.local` is ignored). Tag milestones when stable (e.g., `git tag -a v0.1.0 -m "first drop"; git push --tags`).

## Hardening Plan (AI, Storage, Quality)

- Gemini server-side proxy: move AI calls off the client. Create a minimal Node/Express (or serverless) endpoint `/api/insight` that holds the Gemini key server-side; client should `fetch` this endpoint instead of constructing `GoogleGenAI` in the browser. Remove `process.env.*` injection for the key once proxy is live.
- Storage scoping: use targeted key removal (no `localStorage.clear()`); keep app data under the existing namespaced keys and avoid storing pseudo-tokens client-side.
- Quality gates: use `npm run typecheck` (tsc --noEmit) as the first CI gate; add a lint config later, or alias lint to typecheck for now.
- Tests to add: logging flow (create/edit/delete), streak/freeze logic, paywall gating (premium-only actions and CSV export).
