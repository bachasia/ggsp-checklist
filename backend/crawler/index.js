// Crawler orchestrator — launches Playwright, runs all check modules in parallel
import { chromium } from 'playwright';
import * as technical from './checks/technical.js';
import * as meta from './checks/meta.js';
import * as schema from './checks/schema.js';
import * as pages from './checks/pages.js';
import * as contact from './checks/contact.js';
import * as ecommerce from './checks/ecommerce.js';

const MODULE_TIMEOUT_MS = 10000;

/**
 * Run full audit on a URL.
 * @param {string} url - Target URL
 * @param {function} emit - Called with each Result as checks complete: { id, status, detail }
 * @returns {Promise<{pass,fail,manual,total}>} summary
 */
export async function runCrawler(url, emit) {
  const summary = { pass: 0, fail: 0, manual: 0, total: 0 };

  // Wrap emit to track summary counts
  const track = (result) => {
    summary[result.status] = (summary[result.status] || 0) + 1;
    summary.total++;
    emit(result);
  };

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; GMC-Audit-Bot/1.0)',
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Navigate — fail fast if unreachable
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Ecommerce gets its own page since it navigates to product pages
    const ecommercePage = await context.newPage();
    await ecommercePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const sharedModules = [
      { name: 'technical', mod: technical, pg: page },
      { name: 'meta', mod: meta, pg: page },
      { name: 'schema', mod: schema, pg: page },
      { name: 'pages', mod: pages, pg: page },
      { name: 'contact', mod: contact, pg: page },
      { name: 'ecommerce', mod: ecommerce, pg: ecommercePage },
    ];

    await Promise.all(
      sharedModules.map(({ name, mod, pg }) => runModule(name, mod, pg, url, track))
    );

    await context.close();
  } finally {
    await browser.close();
  }

  return summary;
}

// Run one module with timeout + error boundary
function runModule(name, mod, pg, url, emit) {
  const page = pg;
  const timeout = new Promise((resolve) =>
    setTimeout(() => {
      emit({ id: `${name}-timeout`, status: 'manual', detail: `Module ${name} hết thời gian (>${MODULE_TIMEOUT_MS / 1000}s)` });
      resolve();
    }, MODULE_TIMEOUT_MS)
  );

  const run = mod.run(page, url, emit).catch((err) => {
    emit({ id: `${name}-error`, status: 'manual', detail: `Lỗi module ${name}: ${err.message}` });
  });

  return Promise.race([run, timeout]);
}
