// Policy pages & navigation checks — shipping, return, privacy, terms, contact, search
import { fetchHead, result, withTimeout } from '../utils.js';

// Exported so contact.js can reuse without re-scraping
export let detectedPages = {};

export async function run(page, _url, emit) {
  const links = await extractAllLinks(page);
  detectedPages = {};

  await Promise.all([
    withTimeout(checkPolicyPage(links, 'shipping', ['vận chuyển', 'shipping', 'giao hàng'], '50', emit), 5000),
    withTimeout(checkPolicyPage(links, 'return', ['đổi trả', 'hoàn tiền', 'return', 'refund', 'đổi hàng'], '61', emit), 5000),
    withTimeout(checkPolicyPage(links, 'privacy', ['bảo mật', 'privacy', 'riêng tư'], '72', emit), 5000),
    withTimeout(checkPolicyPage(links, 'terms', ['điều khoản', 'terms', 'dịch vụ'], '87', emit), 5000),
    withTimeout(checkPolicyPage(links, 'contact', ['liên hệ', 'contact', 'liên lạc'], '43', emit), 5000),
    withTimeout(checkSearchFunction(page, emit), 4000),
  ]);
}

async function extractAllLinks(page) {
  return page.$$eval('a[href]', (anchors) =>
    anchors.map(a => ({
      text: a.textContent.trim().toLowerCase(),
      href: a.href,
    }))
  );
}

async function checkPolicyPage(links, key, keywords, id, emit) {
  // Match by link text or URL path
  const match = links.find(({ text, href }) =>
    keywords.some(kw => text.includes(kw) || href.toLowerCase().includes(kw))
  );

  if (!match) {
    detectedPages[key] = null;
    emit(result(id, 'fail', `Không tìm thấy trang ${key} trong navigation`));
    return;
  }

  // Verify page actually loads (not 404)
  const { ok } = await fetchHead(match.href, 4000);
  detectedPages[key] = ok ? match.href : null;
  emit(result(id, ok ? 'pass' : 'fail',
    ok ? `Trang ${key}: ${match.href}` : `Liên kết ${key} bị lỗi: ${match.href}`));
}

async function checkSearchFunction(page, emit) {
  const found = await page.evaluate(() => {
    return !!(
      document.querySelector('form[role="search"]') ||
      document.querySelector('input[type="search"]') ||
      document.querySelector('input[name="q"]') ||
      document.querySelector('input[name="s"]') ||
      document.querySelector('input[placeholder*="tìm" i]') ||
      document.querySelector('input[placeholder*="search" i]') ||
      document.querySelector('[class*="search-bar" i]') ||
      document.querySelector('[class*="searchbar" i]')
    );
  });
  emit(result('search', found ? 'pass' : 'manual',
    found ? 'Tính năng tìm kiếm phát hiện trên trang' : 'Không phát hiện thanh tìm kiếm — kiểm tra thủ công'));
}
