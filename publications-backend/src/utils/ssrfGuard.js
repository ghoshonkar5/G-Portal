const ALLOWED_HOSTS = [
  'api.elsevier.com',        // Scopus
  'api.clarivate.com',       // Web of Science
  'scholar.google.com',      // Google Scholar scraping
  'serpapi.com',             // SerpAPI fallback
  'api.serpapi.com',
  'www.scimagojr.com',       // Scimago
];

const isAllowedUrl = (url) => {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some(allowed => 
      hostname === allowed || hostname.endsWith('.' + allowed)
    );
  } catch {
    return false;
  }
};

const guardedFetch = async (url, options = {}) => {
  if (!isAllowedUrl(url)) {
    const { logSecurityEvent } = require('./securityLogger');
    logSecurityEvent('SSRF_BLOCKED', { blockedUrl: url });
    throw new Error(`SSRF protection: request to ${url} is not allowed`);
  }
  return fetch(url, options);
};

module.exports = { guardedFetch, isAllowedUrl };
