// Contact information checks — email, phone, address visibility
import { result, withTimeout } from '../utils.js';

export async function run(page, _url, emit) {
  await Promise.all([
    withTimeout(checkAddress(page, emit), 4000),
  ]);
  // email/phone already checked in meta.js (ids 12,13)
  // contact page existence checked in pages.js (id 43)
}

async function checkAddress(page, emit) {
  const text = await page.evaluate(() => document.body.innerText);

  // Vietnamese address patterns: street number + road/lane keywords
  const streetPatterns = [
    /\d+[\s\/]\w+.*?(đường|đ\.|phố|ph\.|ngõ|ngách|hẻm|alley|street|road|ave)/i,
    /(phường|phường|ward|quận|district|huyện|tỉnh|tp\.|thành phố)/i,
  ];
  const hasStreet = streetPatterns[0].test(text);
  const hasAdmin = streetPatterns[1].test(text);
  const hasAddress = hasStreet || hasAdmin;

  emit(result('14', hasAddress ? 'pass' : 'fail',
    hasAddress
      ? 'Địa chỉ doanh nghiệp phát hiện trên trang'
      : 'Không phát hiện địa chỉ doanh nghiệp — kiểm tra trang Liên hệ/Giới thiệu'));
}
