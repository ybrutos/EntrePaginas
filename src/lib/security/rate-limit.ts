/**
 * Implementação leve em memória para Rate Limiting no Next.js (Vercel Serverless).
 * 
 * NOTA: Como a Vercel Serverless/Edge escala instanciando múltiplos contêineres, 
 * este mapa em memória não é compartilhado globalmente entre todas as requisições do mundo.
 * No entanto, para o plano Hobby, ele é suficiente para proteger contra ataques de força bruta 
 * vindo de um mesmo node, prevenindo abusos diretos de bots sem a complexidade/custo de um Redis (Upstash).
 */

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

const rateLimitCache = new Map<string, RateLimitTracker>();

// Limpeza automática para evitar vazamento de memória do Map (Roda a cada 5 min se acessado)
let lastCleanup = Date.now();
function cleanupCache() {
  const now = Date.now();
  if (now - lastCleanup > 5 * 60 * 1000) {
    for (const [key, tracker] of rateLimitCache.entries()) {
      if (now > tracker.resetTime) {
        rateLimitCache.delete(key);
      }
    }
    lastCleanup = now;
  }
}

/**
 * Checa o limite de requisições. Retorna `true` se passou do limite, `false` se está OK.
 * 
 * @param identifier Identificador único (IP, Email, etc.)
 * @param limit Número máximo de requisições
 * @param windowMs Janela de tempo em milissegundos
 */
export function isRateLimited(identifier: string, limit: number, windowMs: number): boolean {
  cleanupCache();
  
  const now = Date.now();
  const tracker = rateLimitCache.get(identifier);

  if (!tracker) {
    rateLimitCache.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  // Janela expirou, reseta.
  if (now > tracker.resetTime) {
    rateLimitCache.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  // Ainda dentro da janela, incrementa.
  tracker.count += 1;
  
  if (tracker.count > limit) {
    return true; // Bloqueado
  }

  return false;
}
