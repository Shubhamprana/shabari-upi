import AsyncStorage from "@react-native-async-storage/async-storage";
import { isTrustedByUser } from "./trusted-domains";

/**
 * Link safety check result
 */
export interface LinkCheckResult {
  url: string;
  originalUrl: string;
  isExpanded: boolean;
  domain: string;
  isSafe: boolean;
  riskLevel: "safe" | "suspicious" | "dangerous";
  riskScore: number; // 0-100 (higher = safer)
  warnings: string[];
  trustedByUser: boolean; // User has whitelisted this domain
  checks: {
    isShortener: boolean;
    isKnownPhishing: boolean;
    hasSuspiciousPattern: boolean;
    isHTTPS: boolean;
    domainAge: "new" | "established" | "unknown";
  };
}

/**
 * Known URL shortener domains
 */
const URL_SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
  "is.gd", "buff.ly", "adf.ly", "j.mp", "tr.im",
  "cli.gs", "short.to", "budurl.com", "ping.fm", "post.ly",
  "just.as", "bkite.com", "snipr.com", "fic.kr", "loopt.us",
  "doiop.com", "short.ie", "kl.am", "wp.me", "rubyurl.com",
  "om.ly", "to.ly", "bit.do", "lnkd.in", "db.tt",
  "qr.ae", "cur.lv", "ity.im", "q.gs", "po.st",
  "bc.vc", "twitthis.com", "u.telegrambot.com", "v.gd", "rb.gy",
  "shorturl.at", "cutt.ly", "t.ly", "rebrand.ly", "bl.ink",
];

/**
 * Known phishing/scam domain patterns
 */
const PHISHING_PATTERNS = [
  // Fake banking domains
  /sbi.*login/i, /hdfc.*secure/i, /icici.*verify/i, /axis.*update/i,
  // Fake payment domains
  /paytm.*verify/i, /phonepe.*claim/i, /gpay.*reward/i, /upi.*prize/i,
  // Fake government domains
  /gov.*subsidy/i, /aadhaar.*update/i, /pan.*verify/i,
  // Generic phishing patterns
  /login.*secure.*update/i, /verify.*account.*now/i, /claim.*prize.*winner/i,
  /urgent.*action.*required/i, /password.*expire/i, /suspended.*account/i,
  // Typosquatting patterns
  /amaz0n/i, /g00gle/i, /faceb00k/i, /whatsap+/i, /telegr[a@]m/i,
  /flipk[a@]rt/i, /myntr[a@]/i, /swiggy.*offer/i, /zomato.*free/i,
];

/**
 * Suspicious TLDs often used in scams
 */
const SUSPICIOUS_TLDS = [
  ".xyz", ".top", ".club", ".work", ".click", ".link",
  ".info", ".online", ".site", ".website", ".space",
  ".fun", ".icu", ".buzz", ".monster", ".cam",
];

/**
 * Trusted domains that are always safe
 */
const TRUSTED_DOMAINS = [
  "google.com", "youtube.com", "facebook.com", "instagram.com",
  "twitter.com", "x.com", "linkedin.com", "amazon.in", "amazon.com",
  "flipkart.com", "myntra.com", "ajio.com", "nykaa.com",
  "paytm.com", "phonepe.com", "gpay.app", "razorpay.com",
  "sbi.co.in", "hdfcbank.com", "icicibank.com", "axisbank.com",
  "gov.in", "nic.in", "india.gov.in", "incometax.gov.in",
  "irctc.co.in", "uidai.gov.in", "npci.org.in",
  "whatsapp.com", "telegram.org", "signal.org",
  "microsoft.com", "apple.com", "github.com", "stackoverflow.com",
];

const LINK_HISTORY_KEY = "shabari_link_history";
const MAX_LINK_HISTORY = 500;

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Check if domain is a URL shortener
 */
function isUrlShortener(domain: string): boolean {
  return URL_SHORTENERS.some((shortener) => 
    domain === shortener || domain.endsWith(`.${shortener}`)
  );
}

/**
 * Check if URL matches phishing patterns
 */
function matchesPhishingPattern(url: string): boolean {
  return PHISHING_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Check if domain has suspicious TLD
 */
function hasSuspiciousTLD(domain: string): boolean {
  return SUSPICIOUS_TLDS.some((tld) => domain.endsWith(tld));
}

/**
 * Check if domain is trusted
 */
function isTrustedDomain(domain: string): boolean {
  return TRUSTED_DOMAINS.some((trusted) => 
    domain === trusted || domain.endsWith(`.${trusted}`)
  );
}

/**
 * Expand shortened URL (simple implementation)
 */
async function expandUrl(url: string): Promise<string> {
  try {
    // Use HEAD request to follow redirects
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.url || url;
  } catch {
    // If expansion fails, return original URL
    return url;
  }
}

/**
 * Check a URL for safety
 */
export async function checkLink(url: string): Promise<LinkCheckResult> {
  const warnings: string[] = [];
  let riskScore = 100; // Start with safe score
  
  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  
  const originalUrl = normalizedUrl;
  let expandedUrl = normalizedUrl;
  let isExpanded = false;
  
  // Extract domain
  let domain = extractDomain(normalizedUrl);
  
  // Check if user has whitelisted this domain - instant safe result
  const userTrusted = await isTrustedByUser(domain);
  if (userTrusted) {
    return {
      url: normalizedUrl,
      originalUrl,
      isExpanded: false,
      domain,
      isSafe: true,
      riskLevel: "safe",
      riskScore: 100,
      warnings: [],
      trustedByUser: true,
      checks: {
        isShortener: false,
        isKnownPhishing: false,
        hasSuspiciousPattern: false,
        isHTTPS: normalizedUrl.startsWith("https://"),
        domainAge: "established",
      },
    };
  }
  
  // Check if it's a URL shortener
  const isShortener = isUrlShortener(domain);
  if (isShortener) {
    warnings.push("This is a shortened URL - destination hidden");
    riskScore -= 20;
    
    // Try to expand the URL
    try {
      expandedUrl = await expandUrl(normalizedUrl);
      if (expandedUrl !== normalizedUrl) {
        isExpanded = true;
        domain = extractDomain(expandedUrl);
      }
    } catch {
      warnings.push("Could not expand shortened URL");
      riskScore -= 10;
    }
  }
  
  // Check HTTPS
  const isHTTPS = expandedUrl.startsWith("https://");
  if (!isHTTPS) {
    warnings.push("Connection is not secure (HTTP)");
    riskScore -= 15;
  }
  
  // Check if trusted domain
  const isTrusted = isTrustedDomain(domain);
  if (isTrusted) {
    riskScore = Math.max(riskScore, 90);
  }
  
  // Check for phishing patterns
  const isKnownPhishing = matchesPhishingPattern(expandedUrl) || matchesPhishingPattern(domain);
  if (isKnownPhishing) {
    warnings.push("URL matches known phishing patterns");
    riskScore -= 50;
  }
  
  // Check for suspicious TLD
  const hasSuspiciousTld = hasSuspiciousTLD(domain);
  if (hasSuspiciousTld && !isTrusted) {
    warnings.push("Domain uses a suspicious extension");
    riskScore -= 15;
  }
  
  // Check for suspicious patterns in URL
  const hasSuspiciousPattern = 
    /[0-9]{10,}/.test(expandedUrl) || // Long numbers
    /@/.test(expandedUrl.split("?")[0]) || // @ in path (credential stealing)
    /\.(exe|apk|zip|rar|msi|bat|cmd|scr|js)$/i.test(expandedUrl) || // Executable files
    expandedUrl.split(".").length > 5; // Too many subdomains
  
  if (hasSuspiciousPattern) {
    warnings.push("URL contains suspicious patterns");
    riskScore -= 20;
  }
  
  // Determine risk level
  riskScore = Math.max(0, Math.min(100, riskScore));
  let riskLevel: "safe" | "suspicious" | "dangerous";
  if (riskScore >= 70) {
    riskLevel = "safe";
  } else if (riskScore >= 40) {
    riskLevel = "suspicious";
  } else {
    riskLevel = "dangerous";
  }
  
  // Determine if safe
  const isSafe = riskLevel === "safe";
  
  return {
    url: expandedUrl,
    originalUrl,
    isExpanded,
    domain,
    isSafe,
    riskLevel,
    riskScore,
    warnings,
    trustedByUser: false,
    checks: {
      isShortener,
      isKnownPhishing,
      hasSuspiciousPattern,
      isHTTPS,
      domainAge: isTrusted ? "established" : "unknown",
    },
  };
}

/**
 * Link history record
 */
export interface LinkRecord {
  id: string;
  url: string;
  domain: string;
  riskLevel: "safe" | "suspicious" | "dangerous";
  riskScore: number;
  timestamp: number;
  action: "opened" | "blocked";
}

/**
 * Save link check to history
 */
export async function saveLinkRecord(
  result: LinkCheckResult,
  action: "opened" | "blocked"
): Promise<void> {
  try {
    const record: LinkRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: result.url,
      domain: result.domain,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      timestamp: Date.now(),
      action,
    };
    
    const data = await AsyncStorage.getItem(LINK_HISTORY_KEY);
    const history: LinkRecord[] = data ? JSON.parse(data) : [];
    
    // Add new record and limit size
    history.unshift(record);
    const trimmedHistory = history.slice(0, MAX_LINK_HISTORY);
    
    await AsyncStorage.setItem(LINK_HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error("Error saving link record:", error);
  }
}

/**
 * Get link check history
 */
export async function getLinkHistory(): Promise<LinkRecord[]> {
  try {
    const data = await AsyncStorage.getItem(LINK_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading link history:", error);
    return [];
  }
}

/**
 * Clear link history
 */
export async function clearLinkHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LINK_HISTORY_KEY);
  } catch (error) {
    console.error("Error clearing link history:", error);
  }
}
