import { createClient } from "redis";
import crypto from "crypto";

/**
 * Redis Cache & Bloom Filter Module
 * Fast hot-list scammer lookup (<50ms)
 */

// Redis client singleton
let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize Redis connection
 */
export async function initRedis() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    redisClient = createClient({
      url: redisUrl,
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    await redisClient.connect();
    console.log("Redis connected successfully");
    
    return redisClient;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    // Return null if Redis is unavailable (fail gracefully)
    return null;
  }
}

/**
 * Get Redis client (initialize if needed)
 */
async function getRedisClient() {
  if (!redisClient) {
    return await initRedis();
  }
  return redisClient;
}

/**
 * Bloom Filter Implementation
 * Probabilistic data structure for fast membership testing
 */
class BloomFilter {
  private readonly key: string;
  private readonly size: number;
  private readonly hashCount: number;

  constructor(key: string, size: number = 10000, hashCount: number = 7) {
    this.key = key;
    this.size = size;
    this.hashCount = hashCount;
  }

  /**
   * Generate hash indices for an item
   */
  private getHashIndices(item: string): number[] {
    const indices: number[] = [];
    
    for (let i = 0; i < this.hashCount; i++) {
      const hash = crypto
        .createHash("sha256")
        .update(item + i.toString())
        .digest("hex");
      const index = parseInt(hash.substring(0, 8), 16) % this.size;
      indices.push(index);
    }
    
    return indices;
  }

  /**
   * Add item to Bloom filter
   */
  async add(item: string): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    const indices = this.getHashIndices(item);
    
    try {
      for (const index of indices) {
        await client.setBit(this.key, index, 1);
      }
      return true;
    } catch (error) {
      console.error("Bloom filter add error:", error);
      return false;
    }
  }

  /**
   * Check if item might exist in Bloom filter
   * Returns: true = might exist, false = definitely does not exist
   */
  async mightContain(item: string): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    const indices = this.getHashIndices(item);
    
    try {
      for (const index of indices) {
        const bit = await client.getBit(this.key, index);
        if (bit === 0) {
          return false; // Definitely not in set
        }
      }
      return true; // Might be in set
    } catch (error) {
      console.error("Bloom filter check error:", error);
      return false;
    }
  }

  /**
   * Clear the Bloom filter
   */
  async clear(): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      await client.del(this.key);
      return true;
    } catch (error) {
      console.error("Bloom filter clear error:", error);
      return false;
    }
  }
}

// Global Bloom filter instances
const vpaBloomFilter = new BloomFilter("shabari:bloom:vpa", 100000, 7);
const urlBloomFilter = new BloomFilter("shabari:bloom:url", 100000, 7);

/**
 * Add VPA to blacklist cache
 */
export async function addVpaToCache(vpaHash: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    // Add to Redis set
    await client.sAdd("shabari:blacklist:vpa", vpaHash);
    
    // Add to Bloom filter
    await vpaBloomFilter.add(vpaHash);
    
    // Set expiry (30 days)
    await client.expire("shabari:blacklist:vpa", 30 * 24 * 60 * 60);
  } catch (error) {
    console.error("Error adding VPA to cache:", error);
  }
}

/**
 * Check if VPA is in blacklist cache (fast lookup)
 */
export async function isVpaInCache(vpaHash: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    // First check Bloom filter (fast, probabilistic)
    const mightExist = await vpaBloomFilter.mightContain(vpaHash) as boolean;
    
    if (!mightExist) {
      return false; // Definitely not in blacklist
    }
    
    // Bloom filter says it might exist, check Redis set (slower, definitive)
    const exists = await client.sIsMember("shabari:blacklist:vpa", vpaHash);
    return Boolean(exists);
  } catch (error) {
    console.error("Error checking VPA in cache:", error);
    return false;
  }
}

/**
 * Add URL to blacklist cache
 */
export async function addUrlToCache(urlHash: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    await client.sAdd("shabari:blacklist:url", urlHash);
    await urlBloomFilter.add(urlHash);
    await client.expire("shabari:blacklist:url", 30 * 24 * 60 * 60);
  } catch (error) {
    console.error("Error adding URL to cache:", error);
  }
}

/**
 * Check if URL is in blacklist cache
 */
export async function isUrlInCache(urlHash: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    const mightExist = await urlBloomFilter.mightContain(urlHash) as boolean;
    
    if (!mightExist) {
      return false;
    }
    
    const exists = await client.sIsMember("shabari:blacklist:url", urlHash);
    return Boolean(exists);
  } catch (error) {
    console.error("Error checking URL in cache:", error);
    return false;
  }
}

/**
 * Get scan statistics from cache
 */
export async function getScanStats(): Promise<{
  totalScans: number;
  threatsBlocked: number;
  lastUpdated: string;
} | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const stats = await client.hGetAll("shabari:stats:scans");
    
    if (!stats || Object.keys(stats).length === 0) {
      return null;
    }
    
    return {
      totalScans: parseInt(stats.totalScans || "0"),
      threatsBlocked: parseInt(stats.threatsBlocked || "0"),
      lastUpdated: stats.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting scan stats:", error);
    return null;
  }
}

/**
 * Update scan statistics in cache
 */
export async function updateScanStats(threatDetected: boolean): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    await client.hIncrBy("shabari:stats:scans", "totalScans", 1);
    
    if (threatDetected) {
      await client.hIncrBy("shabari:stats:scans", "threatsBlocked", 1);
    }
    
    await client.hSet("shabari:stats:scans", "lastUpdated", new Date().toISOString());
  } catch (error) {
    console.error("Error updating scan stats:", error);
  }
}

/**
 * Preload blacklist from database to Redis cache
 * Should be called on server startup
 */
export async function preloadBlacklist(
  vpaHashes: string[],
  urlHashes: string[]
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    // Preload VPA blacklist
    if (vpaHashes.length > 0) {
      await client.sAdd("shabari:blacklist:vpa", vpaHashes);
      
      for (const hash of vpaHashes) {
        await vpaBloomFilter.add(hash);
      }
    }
    
    // Preload URL blacklist
    if (urlHashes.length > 0) {
      await client.sAdd("shabari:blacklist:url", urlHashes);
      
      for (const hash of urlHashes) {
        await urlBloomFilter.add(hash);
      }
    }
    
    console.log(`Preloaded ${vpaHashes.length} VPAs and ${urlHashes.length} URLs to cache`);
  } catch (error) {
    console.error("Error preloading blacklist:", error);
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
