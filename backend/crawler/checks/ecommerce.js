// E-commerce checks — product image, price, cart button, currency
// Navigates to a product page if available; falls back to homepage
import { result, withTimeout } from '../utils.js';

export async function run(page, url, emit) {
  // Try to find a product page link
  const productUrl = await findProductPage(page, url);

  let productPage = page;
  let navigated = false;

  if (productUrl && productUrl !== url) {
    try {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
      navigated = true;
      productPage = page;
    } catch {
      // Fall back to current page
    }
  }

  await Promise.all([
    withTimeout(checkProductImage(productPage, emit), 4000),
    withTimeout(checkPrice(productPage, emit), 4000),
    withTimeout(checkAddToCart(productPage, emit), 4000),
    withTimeout(checkCurrency(productPage, emit), 4000),
  ]);

  // Navigate back if we moved away
  if (navigated) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
  }
}

// Heuristic: find first product-looking link in nav or grid
async function findProductPage(page, baseUrl) {
  return page.evaluate((base) => {
    const keywords = ['product', 'san-pham', 'sản-phẩm', 'item', 'hang-hoa', 'shop', '/p/'];
    const links = Array.from(document.querySelectorAll('a[href]'));
    for (const link of links) {
      const href = link.href;
      if (!href.startsWith(base)) continue;
      if (keywords.some(kw => href.toLowerCase().includes(kw))) return href;
    }
    return null;
  }, new URL(baseUrl).origin);
}

async function checkProductImage(page, emit) {
  // Look for product images: large enough (>100px), inside a product container or article
  const found = await page.evaluate(() => {
    const selectors = [
      '.product img', '[class*="product"] img', 'article img',
      '[class*="item"] img', 'main img',
    ];
    for (const sel of selectors) {
      const img = document.querySelector(sel);
      if (img && img.naturalWidth >= 100) return true;
    }
    // Fallback: any img >= 200px wide
    return Array.from(document.querySelectorAll('img'))
      .some(img => img.naturalWidth >= 200);
  });
  emit(result('product-img', found ? 'pass' : 'fail',
    found ? 'Ảnh sản phẩm ≥100px phát hiện' : 'Không phát hiện ảnh sản phẩm đủ kích thước'));
}

async function checkPrice(page, emit) {
  const text = await page.evaluate(() => document.body.innerText);
  // Price patterns: VND amounts, currency symbols
  const pricePattern = /(\d{1,3}([.,]\d{3})+|\d+)\s*(đ|vnđ|vnd|₫|\$|usd)/i;
  const hasPrice = pricePattern.test(text);
  emit(result('product-price', hasPrice ? 'pass' : 'fail',
    hasPrice ? 'Giá sản phẩm phát hiện trên trang' : 'Không phát hiện giá sản phẩm rõ ràng'));
}

async function checkAddToCart(page, emit) {
  const found = await page.evaluate(() => {
    const keywords = [
      'thêm vào giỏ', 'add to cart', 'mua ngay', 'buy now',
      'đặt hàng', 'order now', 'thêm vào túi', 'add to bag',
    ];
    const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
    return buttons.some(el =>
      keywords.some(kw => el.textContent.toLowerCase().includes(kw))
    );
  });
  emit(result('add-to-cart', found ? 'pass' : 'fail',
    found ? 'Nút thêm vào giỏ hàng phát hiện' : 'Không phát hiện nút mua/thêm giỏ hàng'));
}

async function checkCurrency(page, emit) {
  const text = await page.evaluate(() => document.body.innerText);
  const currencyPatterns = [/₫/, /vnđ/i, /vnd/i, /\$/];
  const found = currencyPatterns.find(p => p.test(text));
  emit(result('currency', found ? 'pass' : 'fail',
    found ? 'Ký hiệu tiền tệ phát hiện trên trang' : 'Không phát hiện đơn vị tiền tệ rõ ràng'));
}
