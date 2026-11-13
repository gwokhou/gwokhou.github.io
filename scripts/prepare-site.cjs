const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

const site = path.resolve(__dirname, '..', process.env.QUARTO_PROJECT_OUTPUT_DIR || '_site');
const origin = 'https://gwokhou.github.io';
const normalize = pathname => pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
const articles = ['rdna', 'cdna'].flatMap(family =>
  ['architecture-compare', 'llvm-dependencies'].map(kind => ({
    family, kind, file: `${family}-${kind}/index.html`,
  })));

for (const article of articles) {
  article.$ = cheerio.load(fs.readFileSync(path.join(site, article.file), 'utf8'));
  article.title = article.$('h1.title').text();
  article.description = article.$('meta[name="description"]').attr('content');
  if (!article.title || !article.description) throw new Error(`Missing article metadata: ${article.file}`);
}

for (const file of ['index.html', 'amd-gpu/index.html', '404.html', ...articles.map(a => a.file)]) {
  const article = articles.find(a => a.file === file);
  const $ = article?.$ || cheerio.load(fs.readFileSync(path.join(site, file), 'utf8'));
  const current = new URL(file, origin + '/');
  $('#quarto-header .dropdown-item').each((_, element) => {
    const link = $(element);
    const target = new URL(link.attr('href'), current);
    const active = target.origin === current.origin && normalize(target.pathname) === normalize(current.pathname);
    link.toggleClass('active', active);
    if (active) {
      link.attr('aria-current', 'page');
      link.closest('.dropdown').children('.dropdown-toggle').addClass('active');
    } else {
      link.removeAttr('aria-current');
    }
  });

  if (article) {
    const main = $('main.content');
    // The post-render pass may run again after an incremental preview render.
    main.children('.article-context, .article-reading-nav').remove();
    const label = `${article.family.toUpperCase()} ${article.kind === 'architecture-compare' ? 'architecture' : 'compiler analysis'}`;
    const context = $('<nav class="article-context" aria-label="Breadcrumb"><ol></ol></nav>');
    const crumbs = context.find('ol');
    crumbs.append($('<li></li>').append($('<a href="../index.html">Home</a>')));
    crumbs.append($('<li></li>').append($('<a href="../amd-gpu/index.html">AMD GPU</a>')));
    crumbs.append($('<li></li>').append($('<span aria-current="page"></span>').text(label)));
    main.children('#title-block-header').before(context);

    const related = $('<nav class="article-reading-nav" aria-label="Related reading"><p class="reading-nav-title">Continue exploring</p><div class="reading-destinations"></div><p class="topic-return"><a href="../amd-gpu/index.html">All AMD GPU articles →</a></p></nav>');
    const companion = articles.find(a => a.family === article.family && a.kind !== article.kind);
    const parallel = articles.find(a => a.family !== article.family && a.kind === article.kind);
    for (const [destination, kicker, description] of [
      [companion, 'Companion article', companion.kind === 'architecture-compare'
        ? 'Hardware rules, lane layouts and data paths.'
        : 'Compiler decisions, dependency cases and their limits.'],
      [parallel, article.kind === 'architecture-compare' ? 'Related architecture comparison' : 'Related compiler analysis',
        `Explore ${parallel.family.toUpperCase()} with its own targets and applicability conditions.`],
    ]) {
      const link = $('<a class="reading-destination"></a>').attr('href', '../' + destination.file);
      link.append($('<span class="reading-kicker"></span>').text(kicker));
      link.append($('<strong></strong>').text(destination.title));
      link.append($('<span class="reading-description"></span>').text(description));
      related.find('.reading-destinations').append(link);
    }
    main.append(related);
  }
  fs.writeFileSync(path.join(site, file), $.html());
}

// Quarto 1.11.9 removes only one doc-toc before indexing; left-body adds two.
// Use each article's authored description for its page-level search preview.
// Section entries, including the full technical content, remain untouched.
const searchPath = path.join(site, 'search.json');
const search = JSON.parse(fs.readFileSync(searchPath, 'utf8'));
for (const article of articles) {
  const entry = search.find(item => item.href === article.file);
  if (!entry) throw new Error(`Missing page-level search entry: ${article.file}`);
  entry.text = article.$('<span></span>').text(article.description).html();
}
fs.writeFileSync(searchPath, JSON.stringify(search, null, 2) + '\n');
