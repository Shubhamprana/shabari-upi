import axios from "axios";

/**
 * Link & Malware Scanner Module
 * Integrates Google Safe Browsing API and VirusTotal API
 */

// Environment variables for API keys
const GOOGLE_SAFE_BROWSING_API_KEY = process.env.GOOGLE_SAFE_BROWSING_API_KEY || "";
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY || "";

/**
 * Extract URLs from text (UPI transaction notes, QR data)
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * URL Unshortener
 * Resolves shortened URLs (bit.ly, tinyurl, etc.) to final destination
 */
export async function unshortenUrl(shortUrl: string): Promise<string> {
  try {
    // Follow redirects to get final URL
    const response = await axios.get(shortUrl, {
      maxRedirects: 10,
      validateStatus: (status) => status < 400,
      timeout: 5000,
    });
    
    return response.request.res.responseUrl || shortUrl;
  } catch (error) {
    console.error("Error unshortening URL:", error);
    return shortUrl; // Return original if unshortening fails
  }
}

/**
 * Google Safe Browsing API v4 Integration
 * Checks URLs against phishing and malware databases
 */
export async function checkGoogleSafeBrowsing(urls: string[]): Promise<{
  safe: boolean;
  threats: Array<{
    url: string;
    threatType: string;
    platformType: string;
  }>;
}> {
  if (!GOOGLE_SAFE_BROWSING_API_KEY) {
    console.warn("Google Safe Browsing API key not configured");
    return { safe: true, threats: [] };
  }

  if (urls.length === 0) {
    return { safe: true, threats: [] };
  }

  try {
    const response = await axios.post(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_API_KEY}`,
      {
        client: {
          clientId: "shabari-fraud-detection",
          clientVersion: "1.0.0",
        },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION",
          ],
          platformTypes: ["ANY_PLATFORM", "ANDROID", "IOS"],
          threatEntryTypes: ["URL"],
          threatEntries: urls.map((url) => ({ url })),
        },
      },
      {
        timeout: 5000,
      }
    );

    const matches = response.data.matches || [];
    
    if (matches.length > 0) {
      return {
        safe: false,
        threats: matches.map((match: any) => ({
          url: match.threat.url,
          threatType: match.threatType,
          platformType: match.platformType,
        })),
      };
    }

    return { safe: true, threats: [] };
  } catch (error) {
    console.error("Google Safe Browsing API error:", error);
    // Fail open (assume safe) if API is unavailable
    return { safe: true, threats: [] };
  }
}

/**
 * VirusTotal API v3 Integration
 * Scans URLs and file hashes for malware
 */
export async function checkVirusTotal(url: string): Promise<{
  safe: boolean;
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  scanId?: string;
}> {
  if (!VIRUSTOTAL_API_KEY) {
    console.warn("VirusTotal API key not configured");
    return {
      safe: true,
      malicious: 0,
      suspicious: 0,
      harmless: 0,
      undetected: 0,
    };
  }

  try {
    // Step 1: Submit URL for scanning
    const submitResponse = await axios.post(
      "https://www.virustotal.com/api/v3/urls",
      new URLSearchParams({ url }),
      {
        headers: {
          "x-apikey": VIRUSTOTAL_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 5000,
      }
    );

    const scanId = submitResponse.data.data.id;

    // Step 2: Get scan results (may need to wait for analysis)
    const resultResponse = await axios.get(
      `https://www.virustotal.com/api/v3/analyses/${scanId}`,
      {
        headers: {
          "x-apikey": VIRUSTOTAL_API_KEY,
        },
        timeout: 5000,
      }
    );

    const stats = resultResponse.data.data.attributes.stats;

    return {
      safe: stats.malicious === 0 && stats.suspicious === 0,
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      harmless: stats.harmless || 0,
      undetected: stats.undetected || 0,
      scanId,
    };
  } catch (error) {
    console.error("VirusTotal API error:", error);
    // Fail open (assume safe) if API is unavailable
    return {
      safe: true,
      malicious: 0,
      suspicious: 0,
      harmless: 0,
      undetected: 0,
    };
  }
}

/**
 * Comprehensive Link & Malware Scan
 * Combines URL extraction, unshortening, Safe Browsing, and VirusTotal
 */
export async function scanLinks(text: string): Promise<{
  safe: boolean;
  urlsFound: number;
  phishingDetected: boolean;
  malwareDetected: boolean;
  threats: Array<{
    url: string;
    expandedUrl?: string;
    threatType: string;
    source: "google" | "virustotal";
  }>;
}> {
  // Extract URLs from text
  const urls = extractUrls(text);

  if (urls.length === 0) {
    return {
      safe: true,
      urlsFound: 0,
      phishingDetected: false,
      malwareDetected: false,
      threats: [],
    };
  }

  // Unshorten URLs
  const expandedUrls = await Promise.all(
    urls.map(async (url) => ({
      original: url,
      expanded: await unshortenUrl(url),
    }))
  );

  // Check with Google Safe Browsing
  const safeBrowsingResult = await checkGoogleSafeBrowsing(
    expandedUrls.map((u) => u.expanded)
  );

  // Check with VirusTotal (only first URL to avoid rate limits)
  let virusTotalResult = {
    safe: true,
    malicious: 0,
    suspicious: 0,
    harmless: 0,
    undetected: 0,
  };

  if (expandedUrls.length > 0) {
    virusTotalResult = await checkVirusTotal(expandedUrls[0].expanded);
  }

  // Combine results
  const threats: Array<{
    url: string;
    expandedUrl?: string;
    threatType: string;
    source: "google" | "virustotal";
  }> = [];

  // Add Google Safe Browsing threats
  safeBrowsingResult.threats.forEach((threat) => {
    const urlPair = expandedUrls.find((u) => u.expanded === threat.url);
    threats.push({
      url: urlPair?.original || threat.url,
      expandedUrl: urlPair?.expanded,
      threatType: threat.threatType,
      source: "google",
    });
  });

  // Add VirusTotal threats
  if (!virusTotalResult.safe) {
    threats.push({
      url: expandedUrls[0].original,
      expandedUrl: expandedUrls[0].expanded,
      threatType: `Malicious: ${virusTotalResult.malicious}, Suspicious: ${virusTotalResult.suspicious}`,
      source: "virustotal",
    });
  }

  return {
    safe: threats.length === 0,
    urlsFound: urls.length,
    phishingDetected: safeBrowsingResult.threats.some(
      (t) => t.threatType === "SOCIAL_ENGINEERING"
    ),
    malwareDetected: !virusTotalResult.safe || safeBrowsingResult.threats.some(
      (t) => t.threatType === "MALWARE"
    ),
    threats,
  };
}

/**
 * Check if URL is a download link (.apk, .zip, .exe, etc.)
 */
export function isDownloadLink(url: string): boolean {
  const downloadExtensions = [".apk", ".zip", ".exe", ".rar", ".7z", ".tar", ".gz"];
  const lowerUrl = url.toLowerCase();
  return downloadExtensions.some((ext) => lowerUrl.includes(ext));
}
