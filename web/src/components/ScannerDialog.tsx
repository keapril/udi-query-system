'use client';

import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export default function ScannerDialog({ isOpen, onClose, onScan }: ScannerDialogProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 延遲初始化確保 DOM 已渲染
      const timer = setTimeout(() => {
        scannerRef.current = new Html5QrcodeScanner(
          'reader',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );
        scannerRef.current.render(
          (text) => {
            onScan(text);
            stopScanner();
          },
          (error) => {
            // 掃描過程中的錯誤通常可以忽略
          }
        );
      }, 100);

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    }
  }, [isOpen]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[var(--background)] w-full max-w-md rounded-[var(--radius-xl)] overflow-hidden relative shadow-2xl"
      >
        <div className="p-4 border-b border-[var(--outline)]/10 flex justify-between items-center bg-[var(--primary)] text-white">
          <h2 className="font-bold flex items-center gap-2">
            條碼掃描
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div id="reader" className="overflow-hidden rounded-xl bg-black/5 aspect-square flex items-center justify-center">
             <p className="text-sm text-[var(--secondary)]">啟動相機中...</p>
          </div>
          <p className="mt-4 text-center text-xs text-[var(--secondary)]">
            請將 UDI 條碼置於框內進行掃描
          </p>
        </div>
      </motion.div>
    </div>
  );
}
