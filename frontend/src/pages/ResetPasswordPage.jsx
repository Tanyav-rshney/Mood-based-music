import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdLock, MdVisibility, MdVisibilityOff, MdLibraryMusic } from 'react-icons/md';
import useAuthStore from '../store/useAuthStore';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { resetPassword, loading, error, clearError } = useAuthStore();

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (password !== confirmPassword || password.length < 6) return;
    const result = await resetPassword(token, password);
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[25%] right-[20%] w-[35vw] h-[35vw] bg-green-500/15 blur-[140px] rounded-full pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="acrylic rounded-3xl p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-[0_0_25px_rgba(255,0,127,0.5)]">
              <MdLibraryMusic className="text-white text-xl" />
            </div>
            <span className="font-display font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-textMuted">
              NeonPulse
            </span>
          </div>

          <h1 className="text-center text-3xl font-display font-black mb-2">Reset Password</h1>
          <p className="text-center text-textMuted text-sm mb-8">Choose a new password for your account</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-textMuted mb-2">New Password</label>
              <div className="relative">
                <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted text-lg" />
                <input
                  id="reset-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-white transition-colors"
                >
                  {showPass ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-textMuted mb-2">Confirm New Password</label>
              <div className="relative">
                <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted text-lg" />
                <input
                  id="reset-confirm-password"
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat new password"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border text-white placeholder:text-white/30 focus:outline-none transition-all text-sm ${
                    !passwordsMatch ? 'border-red-500/50' : 'border-white/10 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30'
                  }`}
                />
              </div>
              {!passwordsMatch && <p className="mt-1 text-xs text-red-400">Passwords don't match</p>}
            </div>

            <motion.button
              id="reset-submit"
              type="submit"
              disabled={loading || !passwordsMatch || password.length < 6}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] transition-all disabled:opacity-60"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetting...
                </div>
              ) : (
                'Reset Password'
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-textMuted hover:text-white transition-colors">
              ← Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
