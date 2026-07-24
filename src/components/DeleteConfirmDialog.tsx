import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  wordName?: string;
}

export function DeleteConfirmDialog({ isOpen, onClose, onConfirm, wordName }: DeleteConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[#1A1A2E]/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-6 w-6 text-[#FF3B30]" strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[#1A1A2E]">Are you sure?</h3>
              <p className="mb-6 text-sm text-[#6B6B80]">
                This will permanently delete <strong className="text-[#1A1A2E]">{wordName || 'this word'}</strong> from your vocabulary list.
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-[10px] border border-[#E5E5DD] bg-white py-2.5 text-sm font-medium text-[#1A1A2E] transition-colors hover:bg-[#F5F5F0]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 rounded-[10px] bg-[#FF3B30] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
