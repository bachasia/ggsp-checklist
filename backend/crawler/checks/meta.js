// Meta & Business Info checks — logo, email, phone, OG tags, canonical, og:image
import { result, withTimeout } from '../utils.js';

export async function run(page, _url, emit) {
  await Promise.all([
    withTimeout(checkLogo(page, emit), 4000),
    withTimeout(checkEmail(page, emit), 4000),
    withTimeout(checkPhone(page, emit), 4000),
    withTimeout(checkOgTags(page, emit), 4000),
    withTimeout(checkOgImage(page, emit), 4000),
    withTimeout(checkMetaDesc(page, emit), 4000),
    withTimeout(checkCanonical(page, emit), 4000),
  ]);
}

async function checkLogo(page, emit) {
  // Logo: img with "logo" in alt/class/id, or first img inside header
  const found = await page.evaluate(() => {
    const byAttr = document.querySelector(
      'img[alt*="logo" i], img[class*="logo" i], img[id*="logo" i]'
    );
    if (byAttr) return true;
    const headerImg = document.querySelector('header img, nav img, .header img');
    return !!headerImg;
  });
  emit(result('20', found ? 'pass' : 'fail',
    found ? 'Logo phát hiện trong header/nav' : 'Không phát hiện logo trên trang'));
}

async function checkEmail(page, emit) {
  const text = await page.evaluate(() => document.body.innerText);
  // Standard email pattern
  const match = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  if (!match) {
    emit(result('12', 'fail', 'Không tìm thấy email doanh nghiệp trên trang'));
    return;
  }
  const email = match[0];
  // Warn if personal Gmail/Yahoo
  const isPersonal = /@(gmail|yahoo|hotmail|outlook)\./i.test(email);
  emit(result('12', isPersonal ? 'fail' : 'pass',
    isPersonal
      ? `Email cá nhân phát hiện: ${email} — cần dùng email tên miền doanh nghiệp`
      : `Email doanh nghiệp: ${email}`));
}

async function checkPhone(page, emit) {
  const text = await page.evaluate(() => document.body.innerText);
  // Vietnamese phone: 0[0-9]{8,9} or +84...
  const match = text.match(/(\+84|0)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}/);
  const hasPhone = !!match;
  emit(result('13', hasPhone ? 'pass' : 'fail',
    hasPhone ? `Số điện thoại: ${match[0]}` : 'Không tìm thấy số điện thoại'));
}

async function checkOgTags(page, emit) {
  const { title, desc } = await page.evaluate(() => ({
    title: document.querySelector('meta[property="og:title"]')?.content || '',
    desc: document.querySelector('meta[property="og:description"]')?.content || '',
  }));
  const ok = title.length > 0 && desc.length > 0;
  emit(result('og-tags', ok ? 'pass' : 'fail',
    ok
      ? `OG title: "${title.slice(0, 50)}"…`
      : `Thiếu ${!title ? 'og:title' : ''} ${!desc ? 'og:description' : ''}`.trim()));
}

async function checkOgImage(page, emit) {
  const src = await page.evaluate(() =>
    document.querySelector('meta[property="og:image"]')?.content || ''
  );
  emit(result('og-image', src ? 'pass' : 'fail',
    src ? `og:image: ${src.slice(0, 80)}` : 'Thiếu og:image — ảnh chia sẻ mạng xã hội'));
}

async function checkMetaDesc(page, emit) {
  const desc = await page.evaluate(() =>
    document.querySelector('meta[name="description"]')?.content || ''
  );
  const ok = desc.length >= 50 && desc.length <= 160;
  emit(result('meta-desc', ok ? 'pass' : (desc ? 'fail' : 'fail'),
    desc
      ? (ok ? `Meta description (${desc.length} ký tự)` : `Meta description ${desc.length < 50 ? 'quá ngắn' : 'quá dài'} (${desc.length} ký tự, cần 50-160)`)
      : 'Thiếu meta description'));
}

async function checkCanonical(page, emit) {
  const href = await page.evaluate(() =>
    document.querySelector('link[rel="canonical"]')?.href || ''
  );
  emit(result('canonical', href ? 'pass' : 'fail',
    href ? `Canonical: ${href}` : 'Thiếu thẻ canonical'));
}
