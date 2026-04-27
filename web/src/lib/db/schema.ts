import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const udiData = sqliteTable('udi_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  basicDI: text('basic_di').notNull(),          // 00389701018806
  productNameCN: text('product_name_cn'),       // 產品中文品名
  specialMaterialCode: text('special_material_code'), // 特材代碼
  model: text('model'),                         // 型號 (新增加！)
  licenseNo: text('license_no'),                // 許可證字號
  createdAt: text('created_at').default(sql`(datetime('now', 'localtime'))`),
});

export type UdiData = typeof udiData.$inferSelect;
export type NewUdiData = typeof udiData.$inferInsert;
