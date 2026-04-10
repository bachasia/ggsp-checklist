// Technical & Security checks — ids: 1,2,3,4,7,10,11 + cookie-banner, img-alt
import { fetchHead, fetchText, checkSslCert, result, withTimeout } from '../utils.js';

export async function run(page, url, emit) {
  const origin = new URL(url).origin;
  const hostname = new URL(url).hostname;

  await Promise.all([
    withTimeout(checkHttps(url, emit), 6000),
    withTimeout(checkHttpRedirect(origin, emit), 6000),
    withTimeout(checkSsl(hostname, emit), 6000),
    withTimeout(checkBrokenLinks(page, emit), 8000),
    withTimeout(checkRobotsTxt(origin, emit), 5000),
    withTimeout(checkSitemapXml(origin, emit), 5000),
    withTimeout(checkViewportMeta(page, emit), 4000),
    withTimeout(checkCookieBanner(page, emit), 4000),
    withTimeout(checkImgAltCoverage(page, emit), 4000),
  ]);
}

async function checkHttps(url, emit) {
  const isHttps = url.startsWith('https://');
  emit(result('1', isHttps ? 'pass' : 'fail',
    isHttps ? 'Website đang dùng HTTPS' : 'Website không dùng HTTPS'));
}

async function checkHttpRedirect(origin, emit) {
  const httpUrl = origin.replace('https://', 'http://');
  const { finalUrl } = await fetchHead(httpUrl);
  const redirected = finalUrl.startsWith('https://');
  emit(result('2', redirected ? 'pass' : 'fail',
    redirected ? 'HTTP tự động chuyển hướng sang HTTPS' : 'HTTP không chuyển hướng sang HTTPS'));
}

async function checkSsl(hostname, emit) {
  const { valid, daysLeft, expires } = await checkSslCert(hostname);
  if (!valid) {
    emit(result('3', 'fail', 'SSL không hợp lệ hoặc đã hết hạn'));
  } else if (daysLeft < 30) {
    emit(result('3', 'fail', `SSL hết hạn sớm: còn ${daysLeft} ngày (${expires})`));
  } else {
    emit(result('3', 'pass', `SSL hợp lệ, hết hạn: ${expires} (còn ${daysLeft} ngày)`));
  }
}

async function checkBrokenLinks(page, emit) {
  // Sample top 20 internal links and check for 404
  const links = await page.$$eval('a[href]', (anchors) =>
    anchors
      .map(a => a.href)
      .filter(h => h && h.startsWith('http'))
      .slice(0, 20)
  );
  const checks = await Promise.all(
    links.map(link => fetchHead(link, 4000))
  );
  const broken = checks.filter(r => r.status === 404).length;
  emit(result('4', broken === 0 ? 'pass' : 'fail',
    broken === 0
      ? `Không có liên kết hỏng (kiểm tra ${links.length} liên kết)`
      : `Tìm thấy ${broken} liên kết 404 trong ${links.length} liên kết kiểm tra`));
}

async function checkRobotsTxt(origin, emit) {
  const text = await fetchText(`${origin}/robots.txt`);
  if (!text) {
    emit(result('10', 'fail', 'Không tìm thấy robots.txt'));
    return;
  }
  // Warn if Googlebot is disallowed
  const blocksAll = /Disallow:\s*\//i.test(text) && /User-agent:\s*\*/i.test(text);
  const blocksGoogle = /User-agent:\s*Googlebot[\s\S]*?Disallow:\s*\//i.test(text);
  if (blocksGoogle) {
    emit(result('10', 'fail', 'robots.txt chặn Googlebot'));
  } else if (blocksAll) {
    emit(result('10', 'fail', 'robots.txt chặn tất cả crawlers'));
  } else {
    emit(result('10', 'pass', 'robots.txt tồn tại và không chặn Googlebot'));
  }
}

async function checkSitemapXml(origin, emit) {
  const res = await fetchHead(`${origin}/sitemap.xml`);
  emit(result('11', res.ok ? 'pass' : 'fail',
    res.ok ? 'sitemap.xml tồn tại' : 'Không tìm thấy sitemap.xml'));
}

async function checkViewportMeta(page, emit) {
  const viewport = await page.$eval(
    'meta[name="viewport"]',
    el => el.content,
  ).catch(() => null);
  const ok = viewport && viewport.includes('width=device-width');
  emit(result('7', ok ? 'pass' : 'fail',
    ok ? `Viewport meta: "${viewport}"` : 'Thiếu meta viewport cho mobile'));
}

async function checkCookieBanner(page, emit) {
  // Detect common cookie consent elements
  const selectors = [
    '#cookie-banner', '#cookie-consent', '#cookieBanner',
    '.cookie-banner', '.cookie-consent', '.cookie-notice',
    '[aria-label*="cookie" i]', '[class*="cookieyes"]',
    '[class*="osano"]', '[id*="cookie" i]',
  ];
  let found = false;
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) { found = true; break; }
  }
  // Cookie banner = good (shows GDPR/privacy awareness)
  emit(result('cookie-banner', found ? 'pass' : 'manual',
    found ? 'Phát hiện cookie consent banner' : 'Không phát hiện cookie banner — kiểm tra thủ công'));
}

async function checkImgAltCoverage(page, emit) {
  const { total, withAlt } = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return {
      total: imgs.length,
      withAlt: imgs.filter(img => img.alt && img.alt.trim()).length,
    };
  });
  if (total === 0) {
    emit(result('img-alt', 'manual', 'Không tìm thấy ảnh trên trang'));
    return;
  }
  const pct = Math.round((withAlt / total) * 100);
  emit(result('img-alt', pct >= 80 ? 'pass' : 'fail',
    `${withAlt}/${total} ảnh có alt text (${pct}%) — cần ≥80%`));
}
