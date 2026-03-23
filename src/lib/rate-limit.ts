/**
 * Simple rate limiter and request queue for API calls
 * Prevents API abuse and improves performance with caching
 */

interface QueueItem<T> {
  key: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

class RateLimiter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- queue stores heterogeneous generic types
  private queue: QueueItem<any>[] = [];
  private processing = false;
  private requestCounts = new Map<string, number[]>();
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private maxCacheSize: number;
  
  constructor(
    private maxRequestsPerMinute: number = 60,
    private cacheTTL: number = 30 * 60 * 1000, // 30 minutes
    maxCacheSize: number = 500
  ) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Evict oldest cache entries when limit reached
   */
  private evictOldCache(): void {
    if (this.cache.size < this.maxCacheSize) return;
    
    // Find and remove oldest entries
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20%
    const toRemove = Math.ceil(this.maxCacheSize * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Execute a request with rate limiting
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }

    // Check if we can make the request now
    if (this.canMakeRequest()) {
      this.recordRequest();
      try {
        const result = await fn();
        this.evictOldCache();
        this.cache.set(key, { data: result, timestamp: Date.now() });
        return result;
      } catch (error) {
        throw error;
      }
    }

    // Queue the request
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ key, execute: fn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Check if we can make a request based on rate limits
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    // Clean old entries
    for (const [key, timestamps] of this.requestCounts.entries()) {
      const recent = timestamps.filter(t => t > oneMinuteAgo);
      if (recent.length === 0) {
        this.requestCounts.delete(key);
      } else {
        this.requestCounts.set(key, recent);
      }
    }
    
    // Count recent requests
    let totalRecent = 0;
    for (const timestamps of this.requestCounts.values()) {
      totalRecent += timestamps.length;
    }
    
    return totalRecent < this.maxRequestsPerMinute;
  }

  /**
   * Record a request timestamp
   */
  private recordRequest(): void {
    const now = Date.now();
    const key = 'global';
    const timestamps = this.requestCounts.get(key) || [];
    timestamps.push(now);
    this.requestCounts.set(key, timestamps);
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.canMakeRequest()) {
      const item = this.queue.shift();
      if (!item) break;

      this.recordRequest();

      try {
        const result = await item.execute();
        this.cache.set(item.key, { data: result, timestamp: Date.now() });
        item.resolve(result);
      } catch (error) {
        item.reject(error as Error);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;

    // Continue processing if there are more items
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const apiRateLimiter = new RateLimiter(60, 30 * 60 * 1000); // 60 requests/min, 30min cache

/**
 * Debounce function for input handlers
 */
