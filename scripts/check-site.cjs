const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const site = path.join(root, '_site');
const artifacts = path.join(root, 'artifacts');
const articles = ['rdna', 'cdna'].flatMap(f => [
  `${f}-architecture-compare/index.html`, `${f}-llvm-dependencies/index.html`,
]);
const pages = ['index.html', 'amd-gpu/index.html', ...articles, '404.html'];
const normalize = p => p.endsWith('/') ? p + 'index.html' : p;
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const server = http.createServer((req, res) => {
    const name = normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    const file = path.resolve(site, '.' + name);
    if (!file.startsWith(site + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end(fs.readFileSync(path.join(site, '404.html')));
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'text/plain' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.SITE_BASE_URL || `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const errors = [];
  let linkCount = 0;
  let layoutCount = 0;
  let bookmarkCount = 0;
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const documents = {};
    for (const file of pages) {
      documents[file] = await page.evaluate(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return {
          ids: [...doc.querySelectorAll('[id]')].map(e => e.id),
          links: [...doc.querySelectorAll('a[href], link[href], script[src], img[src]')]
            .map(e => e.getAttribute('href') || e.getAttribute('src')),
          references: [...doc.querySelectorAll('[headers], [aria-labelledby]')]
            .flatMap(e => [e.getAttribute('headers'), e.getAttribute('aria-labelledby')])
            .filter(Boolean).flatMap(v => v.split(/\s+/)),
          moved: [...doc.querySelectorAll('a[data-moved-fragment]')]
            .map(e => ({ id: e.id, href: e.getAttribute('href') })),
        };
      }, fs.readFileSync(path.join(site, file), 'utf8'));
    }
    for (const [file, doc] of Object.entries(documents)) {
      assert.equal(doc.ids.length, new Set(doc.ids).size, `${file}: duplicate IDs`);
      for (const id of doc.references) assert.ok(doc.ids.includes(id), `${file}: missing accessible reference ${id}`);
      for (const href of doc.links) {
        const u = new URL(href, 'https://gwokhou.github.io/' + file);
        if (u.origin !== 'https://gwokhou.github.io') continue;
        const target = normalize(decodeURIComponent(u.pathname.slice(1)));
        assert.ok(fs.existsSync(path.join(site, target)), `${file}: missing local resource ${href}`);
        if (u.hash && documents[target]) {
          assert.ok(documents[target].ids.includes(decodeURIComponent(u.hash.slice(1))), `${file}: missing fragment ${href}`);
        }
        linkCount++;
      }
    }
    const search = fs.readFileSync(path.join(site, 'search.json'), 'utf8');
    for (const file of pages.filter(f => f !== '404.html')) assert.ok(search.includes(file), `${file}: missing search entry`);
    for (const file of articles) {
      const entry = JSON.parse(search).find(item => item.href === file);
      assert.ok(entry?.text && !entry.text.includes('1. Findings and scope') &&
        !entry.text.includes('Quick comparison'), `${file}: contents leaked into search summary`);
    }

    for (const [width, height] of [[1440, 900], [1920, 1080], [2560, 1440], [390, 844]]) {
      await page.setViewportSize({ width, height });
      for (const file of pages) {
        const response = await page.goto(new URL(file, base).href, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200, file);
        assert.ok((await page.title()).replaceAll('’', "'").includes("Guohao's Engineering Notes"), file);
        if (width === 1920 && articles.includes(file)) {
          await page.screenshot({ path: path.join(artifacts, `${file.split('/')[0]}-top-${width}.png`) });
        }
        for (const open of [false, true]) {
          await page.evaluate(open => document.querySelectorAll('main details:not(.mobile-contents)').forEach(e => e.open = open), open);
          const overflow = await page.evaluate(() => ({
            document: document.documentElement.scrollWidth > innerWidth,
            elements: [...document.querySelectorAll('main *')].filter(e => {
              const r = e.getBoundingClientRect();
              if (!r.width || !r.height || e.closest('.table-scroll, .comparison-table thead')) return false;
              return r.left < -1 || r.right > innerWidth + 1;
            }).map(e => `${e.tagName}.${e.className}`),
          }));
          assert.equal(overflow.document, false, `${file}, ${width}: page overflow`);
          assert.deepEqual(overflow.elements, [], `${file}, ${width}: element overflow`);
          layoutCount++;
        }
        if (file === 'index.html' || file === 'amd-gpu/index.html') {
          await page.screenshot({ path: path.join(artifacts, `${file.split('/')[0].replace('.html', '')}-${width}.png`), fullPage: true });
          if (file === 'amd-gpu/index.html') {
            const overlaps = await page.locator('.topic-family').evaluateAll(groups => groups.flatMap(group => {
              const blocks = [...group.querySelectorAll('h2, h3, p, ul')].map(e => ({
                text: e.textContent.slice(0, 60), top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom,
              }));
              return blocks.filter((b, i) => i && b.top < blocks[i - 1].bottom - 1);
            }));
            assert.deepEqual(overlaps, [], `${width}: topic reading blocks overlap`);
          }
          if (width >= 1440) {
            const entries = page.locator('main a').filter({ hasText: /^(RDNA 3, RDNA 3.5, and RDNA 4|CDNA 3 and CDNA 4|LLVM on (RDNA|CDNA): .*)$/ });
            assert.equal(await entries.count(), 4, `${file}: four article entries`);
            for (const entry of await entries.all()) {
              const rect = await entry.boundingBox();
              assert.ok(rect.y + rect.height <= height, `${file}, ${width}: article entry below first screen`);
            }
            if (file === 'index.html') {
              const guide = await page.locator('#how-to-read-these-notes').boundingBox();
              const first = await entries.first().boundingBox();
              assert.ok(guide.y + guide.height < first.y, 'Reading guidance must precede article selection');
              const rdna = await entries.nth(1).boundingBox();
              const cdna = await entries.nth(3).boundingBox();
              assert.ok(Math.abs(rdna.y - cdna.y) < 1, 'Compiler entries should share a row');
            }
          }
        }
        if (articles.includes(file)) {
          const current = page.locator('#quarto-header .dropdown-item[aria-current="page"]');
          assert.equal(await current.count(), 1, `${file}: current article menu state`);
          assert.ok((await current.getAttribute('href')).includes(file.split('/')[0]));
          assert.equal(await page.locator('.article-context a').count(), 2);
          assert.equal(await page.locator('.article-reading-nav .reading-destination').count(), 2);
          if (width >= 1440) {
            await page.evaluate(() => document.querySelectorAll('main details').forEach(e => e.open = false));
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            await page.waitForTimeout(250);
            const toc = await page.locator('#TOC').evaluate(e => ({
              titleTop: e.querySelector('h2').getBoundingClientRect().top,
              navBottom: document.querySelector('#quarto-header').getBoundingClientRect().bottom,
            }));
            assert.ok(toc.titleTop >= toc.navBottom, `${file}, ${width}: footer pushes TOC behind navbar`);
            await page.screenshot({ path: path.join(artifacts, `${file.split('/')[0]}-bottom-${width}.png`) });
          }
        }
      }
    }

    await page.setViewportSize({ width: 1920, height: 1080 });
    for (const file of articles.filter(f => f.includes('architecture-compare'))) {
      for (const { id, href } of documents[file].moved) {
        const expected = new URL(href, new URL(file, base));
        await page.goto(new URL(file + '#' + id, base).href);
        await page.waitForURL(u => normalize(u.pathname) === normalize(expected.pathname) && u.hash === expected.hash);
        await page.waitForFunction(id => {
          const e = document.getElementById(id);
          return e && (!e.closest('details') || e.closest('details').open);
        }, id);
        bookmarkCount++;
      }
    }

    await page.goto(new URL('cdna-llvm-dependencies/', base).href);
    await page.locator('#compiler-behavior a').filter({ hasText: 'Distance accounting' }).click();
    await page.waitForURL(u => u.hash === '#mfma-distance-accounting');
    const geometry = await page.locator('#mfma-distance-accounting').evaluate(e => ({
      top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom,
      navBottom: document.querySelector('.navbar').getBoundingClientRect().bottom, height: innerHeight,
    }));
    assert.ok(geometry.top >= geometry.navBottom && geometry.bottom < geometry.height, 'Distance explanation obscured');
    await page.screenshot({ path: path.join(artifacts, 'distance-accounting-1920.png') });

    await page.goto(new URL('rdna-architecture-compare/', base).href, { waitUntil: 'networkidle' });
    await page.locator('#quarto-header .dropdown-toggle').click();
    await page.screenshot({ path: path.join(artifacts, 'navigation-1920.png') });
    await page.locator('#quarto-header .dropdown-item').filter({ hasText: 'LLVM on CDNA' }).click();
    await page.waitForURL(u => normalize(u.pathname) === '/cdna-llvm-dependencies/index.html');

    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('#quarto-search .aa-DetachedSearchButton').click();
    await page.locator('.aa-Input').fill('MFMA');
    await page.locator('.aa-Item').first().waitFor();
    assert.ok((await page.locator('.aa-Panel').innerText()).includes('MFMA'), 'No MFMA search results');
    assert.ok(!(await page.locator('.aa-Panel').innerText()).includes('1. Findings and scope 2. Operands'), 'Search preview contains a TOC');
    await page.screenshot({ path: path.join(artifacts, 'search-1920.png') });
    await page.locator('.aa-Panel a').first().click();
    await page.waitForURL(u => normalize(u.pathname) === '/cdna-llvm-dependencies/index.html');

    const plain = await browser.newPage({ javaScriptEnabled: false });
    await plain.goto(new URL('rdna-llvm-dependencies/', base).href);
    await plain.locator('.article-reading-nav .reading-destination').nth(1).click();
    await plain.waitForURL(u => normalize(u.pathname) === '/cdna-llvm-dependencies/index.html');
    await plain.locator('.article-reading-nav .reading-destination').first().click();
    await plain.waitForURL(u => normalize(u.pathname) === '/cdna-architecture-compare/index.html');
    await plain.locator('.article-context a').nth(1).click();
    await plain.waitForURL(u => normalize(u.pathname) === '/amd-gpu/index.html');
    await plain.goto(new URL('rdna-architecture-compare/#compiler', base).href);
    await plain.locator('#compiler details > summary').click();
    await plain.locator('#compiler details a:visible').filter({ hasText: 'Compiler targets and ISA tools' }).click();
    await plain.waitForURL(u => u.hash === '#compiler-target-lookup');
    await plain.close();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ pages: pages.length, localLinksAndAssets: linkCount,
      layoutStates: layoutCount, legacyBookmarks: bookmarkCount, search: 'passed', errors }));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
