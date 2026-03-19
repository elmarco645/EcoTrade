import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }: LogoutConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 outline-none focus:outline-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Content container to help with centering */}
          <div className="relative mx-auto flex w-full max-w-sm items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 0 }}
              className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none focus:outline-none"
            >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <LogOut className="h-7 w-7" />
              </div>
              
              <h3 className="mb-2 text-xl font-bold text-slate-900">
                Confirm Logout
              </h3>
              
              <p className="mb-8 text-slate-600">
                Are you sure you want to log out of EcoTrade? You'll need to sign in again to access your account.
              </p>

              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 active:scale-95"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )}
  </AnimatePresence>
  );
}
