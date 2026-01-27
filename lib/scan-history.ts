import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ScanRecord, ScanStats, ScanResult } from "@/shared/types";

const STORAGE_KEY = "shabari_scan_history";
const MAX_RECORDS = 1000;

/**
 * Generate a unique ID for scan records
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all scan records from AsyncStorage
 */
export async function getScanHistory(): Promise<ScanRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const records: ScanRecord[] = JSON.parse(data);
    return records.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  } catch (error) {
    console.error("Error loading scan history:", error);
    return [];
  }
}

/**
 * Save a new scan record to AsyncStorage
 */
export async function saveScanRecord(
  upiString: string,
  scanResult: ScanResult
): Promise<ScanRecord> {
  try {
    const { upiParams, vpaInfo, riskAssessment } = scanResult;
    
    // Create scan record
    const record: ScanRecord = {
      id: generateId(),
      upiString,
      merchantName: vpaInfo.registeredName || upiParams.pn || "Unknown Merchant",
      vpa: upiParams.pa || "",
      amount: upiParams.am,
      riskScore: riskAssessment.score,
      riskTier: riskAssessment.tier,
      timestamp: Date.now(),
      scanResult,
    };
    
    // Load existing records
    const existingRecords = await getScanHistory();
    
    // Add new record at the beginning
    const updatedRecords = [record, ...existingRecords];
    
    // Enforce max records limit
    const trimmedRecords = updatedRecords.slice(0, MAX_RECORDS);
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedRecords));
    
    return record;
  } catch (error) {
    console.error("Error saving scan record:", error);
    throw error;
  }
}

/**
 * Delete a scan record by ID
 */
export async function deleteScanRecord(id: string): Promise<void> {
  try {
    const records = await getScanHistory();
    const filteredRecords = records.filter((record) => record.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredRecords));
  } catch (error) {
    console.error("Error deleting scan record:", error);
    throw error;
  }
}

/**
 * Clear all scan history
 */
export async function clearScanHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing scan history:", error);
    throw error;
  }
}

/**
 * Get scan statistics
 */
export async function getScanStats(): Promise<ScanStats> {
  try {
    const records = await getScanHistory();
    
    // Calculate today's timestamp (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    // Count scans by tier
    let greenScans = 0;
    let yellowScans = 0;
    let redScans = 0;
    let scansToday = 0;
    
    records.forEach((record) => {
      // Count by tier
      if (record.riskTier === "green") greenScans++;
      else if (record.riskTier === "yellow") yellowScans++;
      else if (record.riskTier === "red") redScans++;
      
      // Count today's scans
      if (record.timestamp >= todayTimestamp) {
        scansToday++;
      }
    });
    
    return {
      totalScans: records.length,
      scansToday,
      threatsBlocked: redScans, // Red tier = threats blocked
      greenScans,
      yellowScans,
      redScans,
    };
  } catch (error) {
    console.error("Error calculating scan stats:", error);
    return {
      totalScans: 0,
      scansToday: 0,
      threatsBlocked: 0,
      greenScans: 0,
      yellowScans: 0,
      redScans: 0,
    };
  }
}

/**
 * Get recent scans (last N records)
 */
export async function getRecentScans(limit: number = 5): Promise<ScanRecord[]> {
  try {
    const records = await getScanHistory();
    return records.slice(0, limit);
  } catch (error) {
    console.error("Error loading recent scans:", error);
    return [];
  }
}

/**
 * Search scan history by merchant name or VPA
 */
export async function searchScanHistory(query: string): Promise<ScanRecord[]> {
  try {
    const records = await getScanHistory();
    const lowerQuery = query.toLowerCase();
    
    return records.filter((record) => {
      const merchantMatch = record.merchantName.toLowerCase().includes(lowerQuery);
      const vpaMatch = record.vpa.toLowerCase().includes(lowerQuery);
      return merchantMatch || vpaMatch;
    });
  } catch (error) {
    console.error("Error searching scan history:", error);
    return [];
  }
}

/**
 * Filter scan history by risk tier
 */
export async function filterScanHistory(
  tier: "all" | "green" | "yellow" | "red"
): Promise<ScanRecord[]> {
  try {
    const records = await getScanHistory();
    
    if (tier === "all") return records;
    
    return records.filter((record) => record.riskTier === tier);
  } catch (error) {
    console.error("Error filtering scan history:", error);
    return [];
  }
}
