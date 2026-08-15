import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// sem isso o Next otimiza a rota como estática (não lê request nem cookies) e
// o cron passaria a bater sempre na mesma resposta cacheada do build, sem
// nunca de fato consultar o banco -- destruiria o propósito do keep-alive.
export const dynamic = "force-dynamic";

// No plano Free do Neon o banco adormece depois de 5min sem uso, e a próxima
// query sofre um soluço de reconexão -- foi a causa de um bug real em produção
// (ver retry em lib/prisma.ts). Chamado pelo Vercel Cron (vercel.json) a cada
// poucos minutos pra manter o compute sempre acordado durante o evento.
export async function GET() {
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true, agora: new Date().toISOString() });
}
