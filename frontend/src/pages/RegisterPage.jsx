import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdPerson, MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdLibraryMusic } from 'react-icons/md';
import useAuthStore from '../store/useAuthStore';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { registerUser, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const passwordStrength = () => {
    if (password.length === 0) return { level: 0, text: '', color: '' };
    if (password.length < 6) return { level: 1, text: 'Too short', color: 'bg-red-500' };
    if (password.length < 8) return { level: 2, text: 'Weak', color: 'bg-orange-500' };
    if (/(?=.*[A-Z])(?=.*[0-9])/.test(password)) return { level: 4, text: 'Strong', color: 'bg-green-500' };
    return { level: 3, text: 'Medium', color: 'bg-yellow-500' };
  };

  const strength = passwordStrength();
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (password !== confirmPassword) return;
    if (password.length < 6) return;
    const result = await registerUser(name, email, password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[10%] right-[15%] w-[40vw] h-[40vw] bg-secondary/15 blur-[150px] rounded-full pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[15%] left-[10%] w-[35vw] h-[35vw] bg-primary/20 blur-[130px] rounded-full pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4 my-8"
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

          <h1 className="text-center text-3xl font-display font-black mb-2">Create Account</h1>
          <p className="text-center text-textMuted text-sm mb-8">Join the music revolution</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-textMuted mb-2">Full Name</label>
              <div className="relative">
                <MdPerson className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted text-lg" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  placeholder="Your name"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30 transition-all text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-textMuted mb-2">Email</label>
              <div className="relative">
                <MdEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted text-lg" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-textMuted mb-2">Password</label>
              <div className="relative">
                <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted text-lg" />
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-white transition-colors"
                >
                  {showPass ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${(strength.level / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-textMuted">{strength.text}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-textMuted mb-2">Confirm Password</label>
              <div className="relative">
                <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted text-lg" />
                <input
                  id="register-confirm-password"
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat password"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border text-white placeholder:text-white/30 focus:outline-none transition-all text-sm ${
                    !passwordsMatch ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/10 focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30'
                  }`}
                />
              </div>
              {!passwordsMatch && (
                <p className="mt-1 text-xs text-red-400">Passwords don't match</p>
              )}
            </div>

            {/* Submit */}
            <motion.button
              id="register-submit"
              type="submit"
              disabled={loading || !passwordsMatch || password.length < 6}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-secondary to-cyan-600 text-white shadow-[0_0_30px_rgba(0,240,255,0.3)] hover:shadow-[0_0_40px_rgba(0,240,255,0.5)] transition-all disabled:opacity-60 disabled:cursor-wait mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </motion.button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-textMuted">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <p className="text-center text-sm text-textMuted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-textMuted hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
