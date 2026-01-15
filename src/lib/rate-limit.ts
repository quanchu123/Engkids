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
  private queue: QueueItem<any>[] = [];
  private processing = false;
  private requestCounts = new Map<string, number[]>();
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  constructor(
    private maxRequestsPerMinute: number = 60,
    private cacheTTL: number = 30 * 60 * 1000 // 30 minutes
  ) {}

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
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
