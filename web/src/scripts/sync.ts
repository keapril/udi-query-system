import axios from 'axios';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// 載入 .env 檔案
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // 需要 Service Role Key 才能大量寫入
const supabase = createClient(supabaseUrl, supabaseKey);

// 政府資料開放平台 TUDID CSV 下載連結 (預期 URL)
const TUDID_CSV_URL = 'https://udid.fda.gov.tw/ManageEquipmentSearch.aspx'; // 這裡可能需要抓取實際的 CSV 載點

async function sync() {
  console.log('🚀 開始從 TFDA 同步 UDI 資料...');

  try {
    // 1. 抓取 CSV 資料 (示範 URL，實際需替換為 data.gov.tw 的下載 link)
    // 注意：實際開發中，我們會從 data.gov.tw 獲取具體的 CSV 下載位址
    const response = await axios.get(TUDID_CSV_URL, { responseType: 'text' });
    const csvData = response.data;

    // 2. 解析 CSV
    const results = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = results.data as any[];
    console.log(`📊 解析完成，共計 ${rows.length} 筆資料`);

    // 3. 映射資料欄位 (依據搜尋結果推測的欄位名)
    const formattedData = rows.map((row) => ({
      license_no: row['許可證字號'] || row['LicenseNo'],
      product_name_cn: row['產品中文名稱'] || row['ProductNameCN'],
      product_name_en: row['產品英文名稱'] || row['ProductNameEN'],
      model: row['型號'] || row['Model'],
      spec: row['規格'] || row['Spec'],
      udi_di: row['UDI-DI'] || row['UDI_DI'],
      brand_name: row['廠牌'] || row['BrandName'],
      manufacturer: row['製造廠名稱'] || row['Manufacturer'],
      updated_at: new Date(),
    }));

    // 4. 分批匯入 Supabase (避免一次過大)
    const batchSize = 1000;
    for (let i = 0; i < formattedData.length; i += batchSize) {
      const batch = formattedData.slice(i, i + batchSize);
      const { error } = await supabase
        .from('udi_data')
        .upsert(batch, { onConflict: 'udi_di' });

      if (error) {
        console.error(`❌ 批次 ${i / batchSize + 1} 匯入失敗:`, error.message);
      } else {
        console.log(`✅ 已匯入第 ${i + batch.length} 筆資料...`);
      }
    }

    console.log('✨ UDI 資料同步完成！');
  } catch (error: any) {
    console.error('❌ 同步過程中發生錯誤:', error.message);
  }
}

sync();
