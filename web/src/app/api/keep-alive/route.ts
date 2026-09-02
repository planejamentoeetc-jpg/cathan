import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// sem isso o Next otimiza a rota como estática (não lê request nem cookies) e
// a chamada passaria a bater sempre na mesma resposta cacheada do build, sem
// nunca de fato consultar o banco -- destruiria o propósito do keep-alive.
export const dynamic = "force-dynamic";

// A Neon suspende o compute depois de um tempo sem uso, e a próxima query
// sofre um soluço de reconexão -- é exatamente o que o retry em lib/prisma.ts
// (por query e por transação) já absorve automaticamente, então esta rota
// NÃO precisa mais rodar via cron 24h -- isso só mantinha o compute acordado
// sem necessidade e inflava a fatura de CU-hora sem nenhum benefício real.
// Deixada aqui pra "aquecer" o banco manualmente, batendo essa URL uma vez
// pouco antes de um evento começar, se algum dia fizer sentido.
export async function GET() {
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true, agora: new Date().toISOString() });
}
