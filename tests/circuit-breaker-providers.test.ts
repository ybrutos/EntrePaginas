import { describe, it, expect } from 'vitest';
import { CircuitBreaker } from '../src/lib/providers/circuit-breaker';

describe('CircuitBreaker & Resiliência de Provedores', () => {
  it('deve inicializar no estado CLOSED e executar chamadas com sucesso', async () => {
    const cb = new CircuitBreaker('test_provider', { timeoutMs: 500, maxRetries: 1 });
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.isAvailable()).toBe(true);

    const result = await cb.execute(async () => 'sucesso');
    expect(result).toBe('sucesso');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('deve abrir o circuito após atingir o limite de falhas consecutivas', async () => {
    const cb = new CircuitBreaker('failing_provider', {
      failureThreshold: 2,
      timeoutMs: 100,
      maxRetries: 0,
    });

    // Falha 1
    await expect(cb.execute(async () => {
      const err: any = new Error('Erro 500');
      err.status = 500;
      throw err;
    })).rejects.toThrow();

    expect(cb.getState()).toBe('CLOSED');

    // Falha 2 -> atinge threshold
    await expect(cb.execute(async () => {
      const err: any = new Error('Erro 500');
      err.status = 500;
      throw err;
    })).rejects.toThrow();

    expect(cb.getState()).toBe('OPEN');
    expect(cb.isAvailable()).toBe(false);

    // Chamada bloqueada imediatamente pelo circuito aberto
    await expect(cb.execute(async () => 'nunca executa')).rejects.toThrow('Circuito aberto');
  });

  it('não deve insistir com retries em erros de autorização (401 / 403)', async () => {
    const cb = new CircuitBreaker('auth_provider', { maxRetries: 3, timeoutMs: 200 });
    let attempts = 0;

    await expect(cb.execute(async () => {
      attempts++;
      const err: any = new Error('Forbidden');
      err.status = 403;
      throw err;
    })).rejects.toThrow('Forbidden');

    // Não deve ter executado 3 tentativas
    expect(attempts).toBe(1);
  });
});
