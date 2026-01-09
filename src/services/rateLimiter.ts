
export class RateLimiter {
    private queue: (() => Promise<void>)[] = [];
    private processing = false;
    private lastCallTime = 0;
    private minDelayMs: number;

    constructor(requestsPerMinute: number = 15) {
        // 60000ms / 15 = 4000ms gap
        // We add a small buffer (e.g. 100ms) to be safe
        this.minDelayMs = Math.ceil(60000 / requestsPerMinute) + 100;
    }

    async add<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await fn();
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const now = Date.now();
            const timeSinceLastCall = now - this.lastCallTime;

            if (timeSinceLastCall < this.minDelayMs) {
                await new Promise(resolve => setTimeout(resolve, this.minDelayMs - timeSinceLastCall));
            }

            const task = this.queue.shift();
            if (task) {
                this.lastCallTime = Date.now();
                await task();
            }
        }

        this.processing = false;
    }
}
