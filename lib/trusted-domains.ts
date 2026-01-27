import AsyncStorage from "@react-native-async-storage/async-storage";

const TRUSTED_DOMAINS_KEY = "shabari_trusted_domains";

/**
 * Trusted domain record
 */
export interface TrustedDomain {
  domain: string;
  addedAt: number;
  note?: string;
}

/**
 * Get all user-trusted domains
 */
export async function getTrustedDomains(): Promise<TrustedDomain[]> {
  try {
    const data = await AsyncStorage.getItem(TRUSTED_DOMAINS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading trusted domains:", error);
    return [];
  }
}

/**
 * Check if a domain is trusted by the user
 */
export async function isTrustedByUser(domain: string): Promise<boolean> {
  try {
    const trustedDomains = await getTrustedDomains();
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
    
    return trustedDomains.some((td) => {
      const trustedNormalized = td.domain.toLowerCase().replace(/^www\./, "");
      // Match exact domain or subdomains
      return normalizedDomain === trustedNormalized || 
             normalizedDomain.endsWith(`.${trustedNormalized}`);
    });
  } catch (error) {
    console.error("Error checking trusted domain:", error);
    return false;
  }
}

/**
 * Add a domain to the trusted list
 */
export async function addTrustedDomain(domain: string, note?: string): Promise<boolean> {
  try {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
    const trustedDomains = await getTrustedDomains();
    
    // Check if already exists
    const exists = trustedDomains.some(
      (td) => td.domain.toLowerCase().replace(/^www\./, "") === normalizedDomain
    );
    
    if (exists) {
      return false; // Already trusted
    }
    
    const newDomain: TrustedDomain = {
      domain: normalizedDomain,
      addedAt: Date.now(),
      note,
    };
    
    trustedDomains.unshift(newDomain);
    await AsyncStorage.setItem(TRUSTED_DOMAINS_KEY, JSON.stringify(trustedDomains));
    
    return true;
  } catch (error) {
    console.error("Error adding trusted domain:", error);
    return false;
  }
}

/**
 * Remove a domain from the trusted list
 */
export async function removeTrustedDomain(domain: string): Promise<boolean> {
  try {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
    const trustedDomains = await getTrustedDomains();
    
    const filteredDomains = trustedDomains.filter(
      (td) => td.domain.toLowerCase().replace(/^www\./, "") !== normalizedDomain
    );
    
    if (filteredDomains.length === trustedDomains.length) {
      return false; // Domain not found
    }
    
    await AsyncStorage.setItem(TRUSTED_DOMAINS_KEY, JSON.stringify(filteredDomains));
    return true;
  } catch (error) {
    console.error("Error removing trusted domain:", error);
    return false;
  }
}

/**
 * Clear all trusted domains
 */
export async function clearTrustedDomains(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TRUSTED_DOMAINS_KEY);
  } catch (error) {
    console.error("Error clearing trusted domains:", error);
  }
}

/**
 * Get count of trusted domains
 */
export async function getTrustedDomainsCount(): Promise<number> {
  try {
    const trustedDomains = await getTrustedDomains();
    return trustedDomains.length;
  } catch (error) {
    console.error("Error getting trusted domains count:", error);
    return 0;
  }
}
