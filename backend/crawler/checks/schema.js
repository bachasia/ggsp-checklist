// Structured data (JSON-LD) checks — Product, Organization, BreadcrumbList, AggregateRating
import { result, withTimeout } from '../utils.js';

export async function run(page, _url, emit) {
  const schemas = await parseJsonLd(page);

  await Promise.all([
    withTimeout(checkProductSchema(schemas, emit), 3000),
    withTimeout(checkOrgSchema(schemas, emit), 3000),
    withTimeout(checkBreadcrumbSchema(schemas, emit), 3000),
    withTimeout(checkRatingSchema(schemas, emit), 3000),
  ]);
}

// Extract all JSON-LD objects from page (flattened, handles @graph)
async function parseJsonLd(page) {
  return page.evaluate(() => {
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]')
    );
    const items = [];
    for (const s of scripts) {
      try {
        const parsed = JSON.parse(s.textContent);
        if (Array.isArray(parsed)) items.push(...parsed);
        else if (parsed['@graph']) items.push(...parsed['@graph']);
        else items.push(parsed);
      } catch { /* skip malformed */ }
    }
    return items;
  });
}

function findType(schemas, type) {
  return schemas.find(s => {
    const t = s['@type'];
    return Array.isArray(t) ? t.includes(type) : t === type;
  });
}

async function checkProductSchema(schemas, emit) {
  const product = findType(schemas, 'Product');
  emit(result('schema-product', product ? 'pass' : 'fail',
    product
      ? `Product schema có: "${(product.name || '').slice(0, 60)}"`
      : 'Không có Product schema (JSON-LD)'));
}

async function checkOrgSchema(schemas, emit) {
  const org = findType(schemas, 'Organization') || findType(schemas, 'LocalBusiness');
  emit(result('schema-org', org ? 'pass' : 'fail',
    org
      ? `Organization schema có: "${(org.name || '').slice(0, 60)}"`
      : 'Không có Organization/LocalBusiness schema'));
}

async function checkBreadcrumbSchema(schemas, emit) {
  const bc = findType(schemas, 'BreadcrumbList');
  emit(result('schema-breadcrumb', bc ? 'pass' : 'fail',
    bc ? 'BreadcrumbList schema có' : 'Không có BreadcrumbList schema'));
}

async function checkRatingSchema(schemas, emit) {
  // AggregateRating can be top-level or nested inside Product
  const topLevel = findType(schemas, 'AggregateRating');
  const nestedInProduct = schemas.find(
    s => s['@type'] === 'Product' && s.aggregateRating
  );
  const found = topLevel || nestedInProduct;
  emit(result('schema-rating', found ? 'pass' : 'manual',
    found ? 'AggregateRating schema có (social proof)' : 'Không có AggregateRating — kiểm tra trang sản phẩm'));
}
