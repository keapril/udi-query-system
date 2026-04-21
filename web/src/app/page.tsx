'use client';

import React, { useState, useEffect } from 'react';
import { Search, ScanBarcode, Filter, Info, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScannerDialog from '@/components/ScannerDialog';
import { supabase } from '@/lib/utils/supabase';

export default function UdiSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 搜尋連動邏輯
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setResults(data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("搜尋錯誤:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = (text: string) => {
    setSearchQuery(text);
    setIsScanning(false);
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-[var(--md-sys-color-background)]">
      {/* Decorative Organic Shapes (Material You Style) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[var(--md-sys-color-primary)]/10 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-[var(--md-sys-color-tertiary)]/10 blur-[100px]" />
        <div className="absolute top-[40%] left-[20%] w-[200px] h-[200px] rounded-full bg-[var(--md-sys-color-secondary-container)]/15 blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header Area */}
        <header className="px-6 pt-12 pb-6">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-bold tracking-tight text-[var(--md-sys-color-primary)] mb-2"
          >
            UDI 查詢系統
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[var(--md-sys-color-on-surface-variant)] text-sm font-medium"
          >
            快速核對醫療器材識別碼與許可證資訊
          </motion.p>
        </header>

        {/* Search Section */}
        <section className="px-6 mb-8 sticky top-0 z-20 pt-2 pb-4 bg-[var(--md-sys-color-background)]/80 backdrop-blur-md">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--md-sys-color-on-surface-variant)]">
              <Search size={20} />
            </div>
            <input
              type="text"
              className="m3-input-filled pl-12 pr-12 h-14 text-lg shadow-sm group-hover:shadow-md"
              placeholder="搜尋品名、型號或規格..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              onClick={() => setIsScanning(true)}
              className="absolute inset-y-0 right-4 flex items-center text-[var(--md-sys-color-primary)] hover:scale-110 active:scale-95 transition-transform"
            >
              <ScanBarcode size={24} />
            </button>
          </div>
          
          {/* Chips / Filters */}
          <div className="flex gap-3 mt-5 overflow-x-auto pb-2 scrollbar-none">
            <button className="m3-button-pill m3-button-primary m3-press-feedback text-xs px-5 h-9">
              全部
            </button>
            <button className="m3-button-pill m3-button-tonal m3-press-feedback text-xs px-5 h-9">
              許可證號
            </button>
            <button className="m3-button-pill m3-button-tonal m3-press-feedback text-xs px-5 h-9">
              產品型號
            </button>
          </div>
        </section>

        {/* Results Section */}
        <section className="px-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest">
              {isLoading ? '搜尋中...' : `查詢結果 (${results.length})`}
            </span>
          </div>

          <AnimatePresence>
            {results.length > 0 ? (
              results.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 100 }}
                  className="m3-card group cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-[var(--md-sys-color-on-surface)] line-clamp-2 leading-snug">
                        {item.product_name_cn || item.product_name_en}
                      </h3>
                      <p className="text-xs text-[var(--md-sys-color-primary)] font-bold bg-[var(--md-sys-color-secondary-container)] px-3 py-1 rounded-full inline-block mt-2">
                        {item.license_no}
                      </p>
                    </div>
                    <button className="m-1 p-2 rounded-full hover:bg-[var(--md-sys-color-primary)]/10 text-[var(--md-sys-color-primary)] transition-colors">
                      <ArrowRight size={24} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mt-5">
                    <div className="space-y-1">
                      <span className="block text-[var(--md-sys-color-on-surface-variant)] text-[10px] uppercase font-black tracking-tighter">型號</span>
                      <span className="text-base font-semibold">{item.model || '無'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[var(--md-sys-color-on-surface-variant)] text-[10px] uppercase font-black tracking-tighter">規格</span>
                      <span className="text-base font-semibold line-clamp-1">{item.spec || '無'}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-[var(--md-sys-color-outline)]/10 flex items-center justify-between">
                    <div>
                      <span className="block text-[var(--md-sys-color-on-surface-variant)] text-[10px] uppercase font-black tracking-tighter">UDI 碼 (DI)</span>
                      <code className="text-sm font-mono font-bold text-[var(--md-sys-color-primary)] tracking-wide">{item.udi_di}</code>
                    </div>
                    <div className="p-2 bg-[var(--md-sys-color-surface-container-low)] rounded-full">
                      <Info size={16} className="text-[var(--md-sys-color-primary)]" />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : !isLoading && searchQuery && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-24 text-center"
              >
                <div className="inline-flex p-6 bg-[var(--md-sys-color-surface-container)] rounded-full mb-4">
                  <Search size={32} className="text-[var(--md-sys-color-on-surface-variant)] opacity-20" />
                </div>
                <p className="text-[var(--md-sys-color-on-surface-variant)] font-medium text-lg">找不到符合條件的產品</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Floating Action Button (FAB) */}
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsScanning(true)}
          className="m3-fab fixed bottom-10 right-8 w-16 h-16 flex items-center justify-center z-30"
        >
          <ScanBarcode size={32} />
        </motion.button>

        {/* Bottom Spacing */}
        <div className="h-24" />
      </div>

      {/* Scanner Dialog */}
      <ScannerDialog 
        isOpen={isScanning} 
        onClose={() => setIsScanning(false)} 
        onScan={handleScan} 
      />
    </main>
  );
}
