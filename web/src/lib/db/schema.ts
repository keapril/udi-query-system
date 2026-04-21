import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const udiData = sqliteTable('udi_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licenseNo: text('license_no').notNull(),
  productNameCN: text('product_name_cn'),
  productNameEN: text('product_name_en'),
  model: text('model'),
  spec: text('spec'),
  udiDI: text('udi_di').notNull(),
  brandName: text('brand_name'),
  manufacturer: text('manufacturer'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export type UdiData = typeof udiData.$inferSelect;
export type NewUdiData = typeof udiData.$inferInsert;
