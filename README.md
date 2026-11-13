# Guohao's Engineering Notes

Personal technical website: <https://gwokhou.github.io/>.
The first topic is AMD GPU architecture and LLVM behavior, with four articles
covering RDNA and CDNA. Other engineering topics can be added independently.

## Build and preview

Install [Quarto 1.11.9](https://github.com/quarto-dev/quarto-cli/releases/tag/v1.11.9).
From this repository's root:

```bash
quarto render
quarto preview --host 127.0.0.1 --port 44178 --no-browser
```

Open <http://127.0.0.1:44178/>. The site does not execute Python, R, or GPU code,
and has no dependency on vLLM. Generated `_site/` and `.quarto/` directories are
ignored by Git. Publish the entire `_site/`, including `site_libs` and `search.json`.

## Checks

Node.js 22 and the locked Playwright dependency are used for browser checks:

```bash
npm ci
npx playwright install chromium
npm run check
```

The check starts a local HTTP server, verifies local links, fragments and
accessible table references, exercises old compiler bookmarks and search,
and checks desktop widths of 1440, 1920 and 2560 pixels plus a 390-pixel screen.
Screenshots are written to the ignored `artifacts/` directory. To use an existing
Chrome installation, set `CHROME_PATH` to its executable. `SITE_BASE_URL` can
point the same browser checks at the deployed site after a local render.

These are document checks, not LLVM regression tests or GPU validation.

## Deployment

`.github/workflows/pages.yml` renders and checks changes on `main`, preparation
branches under `codex/`, and pull requests. Only a successful run on `main`
deploys the `_site/` artifact to GitHub Pages. Quarto, browser dependencies and
workflow actions are pinned. In repository Settings → Pages, the source is
**GitHub Actions**.

The Quarto site replaces the previous Hugo site with a fresh repository history.
Old articles, assets, theme, publishing configuration and branches are removed.

## Source layout

| Path | Purpose |
| --- | --- |
| `index.qmd` | Personal homepage |
| `amd-gpu/index.qmd` | AMD GPU topic and reading paths |
| `*-architecture-compare/` | RDNA and CDNA architecture articles |
| `*-llvm-dependencies/` | Their independent compiler articles |
| `_includes/`, `_styles/` | Shared navigation, evidence labels and presentation |
| `_templates/architecture.qmd` | Starting point for another comparison |
| `scripts/check-site.cjs` | Repeatable publication checks |
| `AUTHORING.md` | Content, evidence and presentation conventions |

Four article directories retain their existing URLs and semantic anchors.
Keep `html-table-processing: none` to preserve the complex comparison tables.
Source-audit files are historical research records: `/tmp/` paths in those logs
refer to local working files, not published resources or build dependencies.
The articles retain their source citations and explicit validation limits.

Add new topics to the homepage and navigation once they contain useful material.
List publishable pages explicitly under `project.render` in `_quarto.yml`.
Keep the technical content in its topic directories; the shared site identity
does not limit future topics to AMD GPUs.
