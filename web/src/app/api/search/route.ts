import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/d1';
import { udiData } from '@/lib/db/schema';
import { like, or, eq } from 'drizzle-orm';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json([]);
  }

  try {
    // 取得 Cloudflare D1 綁定
    const dbBinding = (process.env as any).DB as D1Database;
    if (!dbBinding) {
      console.error('D1 Database binding not found');
      return NextResponse.json({ error: 'Database binding missing' }, { status: 500 });
    }

    const db = drizzle(dbBinding);

    // 執行搜尋
    const results = await db
      .select()
      .from(udiData)
      .where(
        or(
          like(udiData.productNameCN, `%${query}%`),
          like(udiData.model, `%${query}%`),
          like(udiData.spec, `%${query}%`),
          eq(udiData.udiDI, query)
        )
      )
      .limit(50);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Search API Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
