/**
 * Circuit Breaker com Exponential Backoff para Provedores Externos • Entre Páginas V2
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Número de falhas consecutivas para abrir o circuito (default: 3)
  resetTimeoutMs?: number;   // Tempo de repouso antes de testar HALF_OPEN (default: 30000ms)
  timeoutMs?: number;        // Timeout individual por requisição (default: 8000ms)
  maxRetries?: number;       // Tentativas com backoff para erros temporários (default: 2)
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(public readonly providerId: string, options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 3;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 30000;
    this.timeoutMs = options?.timeoutMs ?? 8000;
    this.maxRetries = options?.maxRetries ?? 2;
  }

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  isAvailable(): boolean {
    return this.getState() !== 'OPEN';
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure(isFatal = false) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (isFatal || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Executa uma função protegida por timeout, retries e circuit breaker
   */
  async execute<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === 'OPEN') {
      throw new Error(`[CircuitBreaker] Circuito aberto para ${this.providerId}. Provedor temporariamente indisponível.`);
    }

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const result = await fn(controller.signal);
        clearTimeout(timer);
        this.recordSuccess();
        return result;
      } catch (err: any) {
        clearTimeout(timer);

        const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
        const status = err.status || err.statusCode;
        const isRetryable = isTimeout || status === 429 || (status >= 500 && status <= 504);

        if (!isRetryable || attempt >= this.maxRetries) {
          this.recordFailure(currentState === 'HALF_OPEN');
          throw err;
        }

        // Exponential backoff: 300ms, 600ms, etc.
        const delay = Math.min(2000, 300 * Math.pow(2, attempt));
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      }
    }

    throw new Error(`[CircuitBreaker] Máximo de tentativas excedido para ${this.providerId}`);
  }
}
