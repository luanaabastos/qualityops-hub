export class DemoCapacityError extends Error {
  constructor() {
    super('Demo capacity reached. Try again shortly.');
  }
}

export class DemoConcurrencyLimiter {
  private active = 0;

  constructor(private readonly maximum: number) {}

  acquire(): (() => void) | null {
    if (this.active >= this.maximum) return null;
    this.active += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active = Math.max(0, this.active - 1);
    };
  }

  get activeCount(): number {
    return this.active;
  }
}

type RequestRecord = { windowStartedAt: number; count: number; lastAcceptedAt: number | null };

export class DemoRequestLimiter {
  private readonly records = new Map<string, RequestRecord>();

  constructor(
    private readonly maximum: number,
    private readonly windowMs: number,
    private readonly cooldownMs: number
  ) {}

  check(clientId: string, now = Date.now()): { allowed: true } | { allowed: false; retryAfterMs: number } {
    const existing = this.records.get(clientId);
    const record = !existing || now - existing.windowStartedAt >= this.windowMs
      ? { windowStartedAt: now, count: 0, lastAcceptedAt: null }
      : existing;
    this.records.set(clientId, record);

    if (record.lastAcceptedAt !== null && now - record.lastAcceptedAt < this.cooldownMs) {
      return { allowed: false, retryAfterMs: this.cooldownMs - (now - record.lastAcceptedAt) };
    }
    if (record.count >= this.maximum) {
      return { allowed: false, retryAfterMs: Math.max(1, this.windowMs - (now - record.windowStartedAt)) };
    }
    record.count += 1;
    record.lastAcceptedAt = now;
    if (this.records.size > 10_000) this.prune(now);
    return { allowed: true };
  }

  private prune(now: number): void {
    for (const [clientId, record] of this.records) {
      if (now - record.windowStartedAt >= this.windowMs) this.records.delete(clientId);
    }
  }
}
