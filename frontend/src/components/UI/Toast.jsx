import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose, MdCheckCircle, MdError, MdInfo } from 'react-icons/md';
import useToastStore from '../../store/useToastStore';

const iconMap = {
  success: <MdCheckCircle className="text-xl text-green-400" />,
  error: <MdError className="text-xl text-red-400" />,
  info: <MdInfo className="text-xl text-secondary" />,
};

const bgMap = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-secondary/30 bg-secondary/10',
};

const Toast = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] min-w-[280px] max-w-[380px] ${bgMap[toast.type] || bgMap.info}`}
          >
            {iconMap[toast.type] || iconMap.info}
            <span className="text-sm font-semibold text-white flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/40 hover:text-white transition-colors flex-shrink-0"
            >
              <MdClose className="text-lg" />
            </button>
            {/* Progress bar */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: (toast.duration || 3000) / 1000, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-0.5 bg-white/20 rounded-full"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast;
