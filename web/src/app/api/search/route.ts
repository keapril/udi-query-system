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

    // ── 神秘力量驅散邏輯：清理搜尋字串 ──
    // 1. 去除首尾空格
    // 2. 如果是純數字，去除中間可能出現的奇怪字元
    let cleanQuery = query.trim();
    if (/^\d[\d\s-]*\d$/.test(cleanQuery)) {
        cleanQuery = cleanQuery.replace(/[\s-]/g, '');
    }

    // 處理 UDI 補零邏輯 (GS1 標準 14 碼)
    const paddedQuery = cleanQuery.length < 14 && /^\d+$/.test(cleanQuery) 
      ? cleanQuery.padStart(14, '0') 
      : cleanQuery;

    // ── 產品名稱模糊強化 ──
    // 將輸入字串逐字拆開並加入 %，讓 "泰爾茂止血器" 能搜到 "泰爾茂 止血器"
    const fuzzyName = `%${cleanQuery.split('').join('%')}%`;

    // 執行搜尋
    const results = await db
      .select()
      .from(udiData)
      .where(
        or(
          eq(udiData.basicDI, cleanQuery),      // 精確比對原始輸入
          eq(udiData.basicDI, paddedQuery),    // 精確比對補零後的 14 碼
          like(udiData.basicDI, `%${cleanQuery}%`),    // 模糊比對 DI 碼
          like(udiData.productNameCN, fuzzyName),      // 超強模糊比對 (忽略空格)
          eq(udiData.model, cleanQuery),                // 精確比對型號
          like(udiData.model, `%${cleanQuery}%`),       // 模糊比對型號
          eq(udiData.specialMaterialCode, cleanQuery),    // 精確比對特材代碼
          like(udiData.licenseNo, `%${cleanQuery}%`)      // 模糊比對許可證字號
        )
      )
      .limit(50);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Search API Error:', error.message);
    return NextResponse.json({ error: '搜尋發生錯誤，請稍後再試' }, { status: 500 });
  }
}
