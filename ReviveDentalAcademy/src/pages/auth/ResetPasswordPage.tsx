import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck, X } from 'lucide-react'
import { updatePassword } from '../../lib/supabase'

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await updatePassword(password)
      setComplete(true)
    } catch (err: any) {
      setError(err.message || 'We could not update your password. Request a new reset link and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <ShieldCheck className="h-10 w-10 text-brand-mint" />
            <div className="flex flex-col text-left">
              <span className="text-white font-bold text-2xl tracking-tight leading-none">REVIVE</span>
              <span className="text-brand-mint text-[10px] uppercase tracking-[0.2em] font-medium">Dental Academy</span>
            </div>
          </div>
        </div>

        <div className="bg-charcoal-light border border-white/10 rounded-2xl p-8">
          {complete ? (
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-brand-mint mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Password updated</h1>
              <p className="text-gray-400 text-sm mb-7">Your Academy account is ready to use.</p>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="w-full py-3 bg-brand-teal text-white font-bold rounded-lg hover:bg-brand-dark transition-all"
              >
                Continue to Academy
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Create a new password</h1>
              <p className="text-gray-400 text-sm mb-8">Use a new password with at least 8 characters.</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mb-6 flex items-center space-x-2">
                  <X className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-10 text-white placeholder-gray-500 focus:border-brand-mint/50 focus:outline-none"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:border-brand-mint/50 focus:outline-none"
                    minLength={8}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-brand-teal text-white font-bold rounded-lg hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
