import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { Toast } from '@/hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: 'text-[#34C759]',
  error: 'text-[#FF3B30]',
  info: 'text-[#4A90E2]',
  warning: 'text-[#F5A623]',
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative flex w-[320px] items-start gap-3 rounded-xl bg-[#1A1A2E] p-4 text-white shadow-lg"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${colorMap[toast.type]}`} strokeWidth={1.5} />
              <p className="flex-1 text-sm">{toast.message}</p>
              <button
                onClick={() => onRemove(toast.id)}
                className="shrink-0 text-white/50 hover:text-white"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-xl bg-white/10">
                <div
                  className="toast-progress h-full rounded-b-xl bg-[#F5A623]"
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
