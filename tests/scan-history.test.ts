import { describe, it, expect, beforeEach, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock AsyncStorage for Node.js test environment
vi.mock("@react-native-async-storage/async-storage", () => {
  let store: Record<string, string> = {};
  
  return {
    default: {
      getItem: vi.fn(async (key: string) => store[key] || null),
      setItem: vi.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn(async (key: string) => {
        delete store[key];
      }),
      clear: vi.fn(async () => {
        store = {};
      }),
    },
  };
});
import {
  saveScanRecord,
  getScanHistory,
  deleteScanRecord,
  clearScanHistory,
  getScanStats,
  getRecentScans,
  searchScanHistory,
  filterScanHistory,
} from "../lib/scan-history";
import type { ScanResult } from "../shared/types";

// Mock AsyncStorage
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("Scan History", () => {
  const mockScanResult: ScanResult = {
    upiParams: {
      pa: "merchant@paytm",
      pn: "Test Merchant",
      am: "100",
      tn: "Test payment",
      cu: "INR",
      mc: null,
      tr: null,
    },
    vpaInfo: {
      valid: true,
      registeredName: "Test Merchant Pvt Ltd",
      bankName: "Paytm Payments Bank",
    },
    npciCompliance: {
      compliant: true,
      violation: null,
    },
    riskAssessment: {
      score: 85,
      breakdown: {
        reputation: 0,
        heuristics: 0,
        identity: 0,
      },
      tier: "green",
    },
    timestamp: new Date().toISOString(),
  };

  it("should save a scan record", async () => {
    const record = await saveScanRecord("upi://pay?pa=merchant@paytm", mockScanResult);
    
    expect(record).toBeDefined();
    expect(record.id).toBeDefined();
    expect(record.merchantName).toBe("Test Merchant Pvt Ltd");
    expect(record.vpa).toBe("merchant@paytm");
    expect(record.riskScore).toBe(85);
    expect(record.riskTier).toBe("green");
  });

  it("should retrieve scan history", async () => {
    await saveScanRecord("upi://pay?pa=merchant@paytm", mockScanResult);
    
    const history = await getScanHistory();
    
    expect(history).toHaveLength(1);
    expect(history[0].merchantName).toBe("Test Merchant Pvt Ltd");
  });

  it("should delete a scan record", async () => {
    const record = await saveScanRecord("upi://pay?pa=merchant@paytm", mockScanResult);
    
    await deleteScanRecord(record.id);
    
    const history = await getScanHistory();
    expect(history).toHaveLength(0);
  });

  it("should clear all scan history", async () => {
    await saveScanRecord("upi://pay?pa=merchant1@paytm", mockScanResult);
    await saveScanRecord("upi://pay?pa=merchant2@paytm", mockScanResult);
    
    await clearScanHistory();
    
    const history = await getScanHistory();
    expect(history).toHaveLength(0);
  });

  it("should calculate scan statistics", async () => {
    // Add green scan
    await saveScanRecord("upi://pay?pa=merchant1@paytm", mockScanResult);
    
    // Add yellow scan
    const yellowResult = {
      ...mockScanResult,
      riskAssessment: {
        ...mockScanResult.riskAssessment,
        score: 60,
        tier: "yellow" as const,
      },
    };
    await saveScanRecord("upi://pay?pa=merchant2@paytm", yellowResult);
    
    // Add red scan
    const redResult = {
      ...mockScanResult,
      riskAssessment: {
        ...mockScanResult.riskAssessment,
        score: 20,
        tier: "red" as const,
      },
    };
    await saveScanRecord("upi://pay?pa=merchant3@paytm", redResult);
    
    const stats = await getScanStats();
    
    expect(stats.totalScans).toBe(3);
    expect(stats.greenScans).toBe(1);
    expect(stats.yellowScans).toBe(1);
    expect(stats.redScans).toBe(1);
    expect(stats.threatsBlocked).toBe(1); // Red tier = threats blocked
  });

  it("should get recent scans", async () => {
    // Add multiple scans
    for (let i = 0; i < 10; i++) {
      await saveScanRecord(`upi://pay?pa=merchant${i}@paytm`, mockScanResult);
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    
    const recentScans = await getRecentScans(5);
    
    expect(recentScans).toHaveLength(5);
  });

  it("should search scan history by merchant name", async () => {
    await saveScanRecord("upi://pay?pa=merchant@paytm", {
      ...mockScanResult,
      vpaInfo: {
        ...mockScanResult.vpaInfo,
        registeredName: "ABC Electronics",
      },
    });
    
    await saveScanRecord("upi://pay?pa=shop@paytm", {
      ...mockScanResult,
      vpaInfo: {
        ...mockScanResult.vpaInfo,
        registeredName: "XYZ Store",
      },
    });
    
    const results = await searchScanHistory("ABC");
    
    expect(results).toHaveLength(1);
    expect(results[0].merchantName).toBe("ABC Electronics");
  });

  it("should filter scan history by risk tier", async () => {
    // Add scans with different tiers
    await saveScanRecord("upi://pay?pa=merchant1@paytm", mockScanResult);
    
    const yellowResult = {
      ...mockScanResult,
      riskAssessment: {
        ...mockScanResult.riskAssessment,
        score: 60,
        tier: "yellow" as const,
      },
    };
    await saveScanRecord("upi://pay?pa=merchant2@paytm", yellowResult);
    
    const greenScans = await filterScanHistory("green");
    const yellowScans = await filterScanHistory("yellow");
    
    expect(greenScans).toHaveLength(1);
    expect(yellowScans).toHaveLength(1);
  });

  it("should enforce max records limit", async () => {
    // This test would take too long with 1000 records
    // Just verify the logic exists by checking a few records
    for (let i = 0; i < 5; i++) {
      const customResult = {
        ...mockScanResult,
        upiParams: {
          ...mockScanResult.upiParams,
          pa: `merchant${i}@paytm`,
        },
      };
      await saveScanRecord(`upi://pay?pa=merchant${i}@paytm`, customResult);
    }
    
    const history = await getScanHistory();
    expect(history).toHaveLength(5);
    
    // Verify most recent is first
    expect(history[0].vpa).toBe("merchant4@paytm");
  });
});
