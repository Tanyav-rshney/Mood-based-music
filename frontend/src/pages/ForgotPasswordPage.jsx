import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdEmail, MdLibraryMusic, MdCheckCircle } from 'react-icons/md';
import useAuthStore from '../store/useAuthStore';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [resetData, setResetData] = useState(null);
  const { forgotPassword, loading, error, clearError } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const result = await forgotPassword(email);
    if (result.success) {
      setSent(true);
      setResetData(result.data);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.25, 0.12] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[30%] left-[20%] w-[35vw] h-[35vw] bg-yellow-500/15 blur-[140px] rounded-full pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="acrylic rounded-3xl p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-[0_0_25px_rgba(255,0,127,0.5)]">
              <MdLibraryMusic className="text-white text-xl" />
            </div>
            <span className="font-display font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-textMuted">
              NeonPulse
            </span>
          </div>

          {!sent ? (
            <>
              <h1 className="text-center text-3xl font-display font-black mb-2">Forgot Password</h1>
              <p className="text-center text-textMuted text-sm mb-8">
                Enter your email and we'll send you a reset link
              </p>

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
                  <label className="block text-sm font-semibold text-textMuted mb-2">Email Address</label>
                  <div className="relative">
                    <MdEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted text-lg" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                    />
                  </div>
                </div>

                <motion.button
                  id="forgot-submit"
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:shadow-[0_0_40px_rgba(234,179,8,0.5)] transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </motion.button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <MdCheckCircle className="text-green-400 text-5xl mx-auto mb-4" />
              <h2 className="text-2xl font-display font-black mb-2">Check Your Email</h2>
              <p className="text-textMuted text-sm mb-6">
                A password reset link has been sent to <span className="text-white font-semibold">{email}</span>
              </p>

              {/* Dev mode: show reset token */}
              {resetData?.resetToken && (
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-left">
                  <p className="text-xs text-textMuted mb-2 font-semibold">🔧 Dev Mode — Reset Token:</p>
                  <p className="text-xs text-secondary font-mono break-all">{resetData.resetToken}</p>
                  <Link
                    to={`/reset-password/${resetData.resetToken}`}
                    className="mt-3 inline-block text-xs text-primary font-bold hover:underline"
                  >
                    → Click here to reset password
                  </Link>
                </div>
              )}
            </motion.div>
          )}

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

export default ForgotPasswordPage;
