import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Tenta uma query levíssima para validar a conexão do Prisma ao Supabase
    await db.$queryRaw`SELECT 1`;
    
    return NextResponse.json({ 
      status: 'ok', 
      app: 'entre-paginas',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Health Check] Database error:', error);
    
    // Retorna 503 Service Unavailable se o banco estiver fora
    return NextResponse.json({ 
      status: 'error', 
      app: 'entre-paginas',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
