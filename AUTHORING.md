# Authoring engineering notes

## Authoring conventions

- Keep conclusions, applicable targets/configurations, and evidence together.
  A diagram must retain its scope and must not turn an unknown mechanism into
  an asserted hardware structure.
- Begin each chapter with a short takeaway and reading path. Introduce operands
  before dependency rules, and accompany dense mappings with a worked substitution.
- Present compiler outcomes before pass implementation details. Keep artifact
  hashes, source bindings, and validation coverage in a linked evidence appendix;
  preserve exact citations and result-changing conditions beside each claim.
- Compare availability using the same fields on both sides: targets, native
  compiler support at the pinned revision, and the reviewed ISA inventory.
  Missing inventory entries do not establish hardware absence.
- Reuse `_includes/evidence-labels.html` in the scope or evidence disclosure. Use
  `Listed / Not listed` for the named ISA inventory and `Enabled / Not enabled`
  for LLVM's default target features. Keep feature reports, unspecified mechanisms,
  and actual validation results distinct.
- Keep architecture section 7 brief, ordered as target support, compiler
  takeaways, and applicability/validation limits. Link each takeaway to the
  companion's full conditions and evidence. Compiler companions introduce
  targets and operands before interfaces, pipelines and dependency cases, and
  finish with developer boundaries and validation. Avoid duplicating detailed
  pass logic in the architecture article. Section 8 records evidence status and limits;
  place any migration priorities in their own subsection. Preserve existing
  fragment IDs when reorganizing content.
- Keep compiler openings concise: target scope, short revision, validation
  boundary and findings. Put the full revision and review date in section 8,
  with separate records for source inspection, regression expectations,
  document checks and tests not performed. Each companion owns this record;
  label links to architecture-only evidence with the destination article.
- Apply the shared prose width to nested sections and ordinary lists. Tables
  and diagrams retain their wider layout; page-specific overrides are unnecessary
  for ordinary paragraph widths.
- Write headings and ordinary prose in Markdown. Use an explicit stable ID,
  such as `## Memory movement {#memory}`, for a linkable section. Keep headings
  outside decorative containers when they need to appear in the contents.
- Include paths beginning with `/` are relative to this Quarto project, not the
  filesystem. Included files and directories use `_` prefixes and are not pages.
- Complex HTML tables are deliberately rendered with
  `html-table-processing: none`. This preserves merged cells, exact formulas,
  row IDs, accessible scroll regions, and disclosure markup.
- Existing PDF page links and pinned compiler commit/line links remain explicit
  Markdown or HTML links. The RDNA source list is preserved, not converted into
  a generated bibliography. Future documents may add a `.bib` file and Quarto
  citations where bibliographic references are appropriate, while retaining
  exact evidence locators next to claims.
- Keep diagram IDs, SVG title/description IDs, and `aria-labelledby` targets
  unique across the document. Diagrams remain editable SVG/HTML, not screenshots.
- Before finishing a content or style change, render and check full-screen
  desktop widths, contents links, wide tables, and open disclosures. Do a basic
  narrow-screen check as well. Source review and rendering are not GPU validation.

## Adding another architecture comparison

1. Create a new comparison directory and `index.qmd` from
   `_templates/architecture.qmd`. Fill in the actual targets, source revisions,
   conditions, and findings established by that research.
2. Add the new file to `project.render` and `the relevant topic navigation` in `_quarto.yml`.
3. Link it from the landing page once it has useful content. Split long chapters
   and complex figures/tables into includes as needed, following the RDNA layout.
4. Run the same render and visual checks. Do not infer one architecture's behavior
   from another merely because the documents share a template.

This project currently targets HTML. Its raw SVG/HTML figures and complex tables
have not been adapted or validated for PDF or Word output.
