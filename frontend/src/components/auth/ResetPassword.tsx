import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { PasswordResetService } from '../../services/passwordResetService'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    const verifyToken = async () => {
      if (!token || !email) {
        setError('Invalid reset link. Please request a new password reset.')
        setIsVerifying(false)
        return
      }

      try {
        const response = await PasswordResetService.verifyResetToken({ token, email })
        if (response.valid) {
          setIsTokenValid(true)
        } else {
          setError('This reset link has expired or is invalid. Please request a new password reset.')
        }
      } catch (err: any) {
        setError('Unable to verify reset link. Please try requesting a new password reset.')
      } finally {
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [token, email])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const validatePasswords = () => {
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validatePasswords()) return
    if (!token || !email) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await PasswordResetService.resetPassword({
        token,
        email,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      })
      
      setIsSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4">
          <div className="bg-accent/50 rounded-lg p-8 border text-center">
            <div className="text-4xl mb-4">🔄</div>
            <h2 className="text-xl font-bold mb-2">Verifying Reset Link</h2>
            <p className="text-muted-foreground">Please wait while we verify your password reset link...</p>
          </div>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4">
          <div className="bg-accent/50 rounded-lg p-8 border">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold mb-4">Password Reset Successful!</h2>
              <p className="text-muted-foreground mb-6">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
              <Link
                to="/login"
                className="inline-block w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-center"
              >
                Continue to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4">
          <div className="bg-accent/50 rounded-lg p-8 border">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold mb-4">Invalid Reset Link</h2>
              <p className="text-muted-foreground mb-6">
                {error || 'This password reset link is invalid or has expired.'}
              </p>
              <div className="space-y-3">
                <Link
                  to="/forgot-password"
                  className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-center"
                >
                  Request New Reset Link
                </Link>
                <Link
                  to="/login"
                  className="block w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-center"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4">
        <div className="bg-accent/50 rounded-lg p-8 border">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔑</div>
            <h2 className="text-2xl font-bold mb-2">Reset Your Password</h2>
            <p className="text-muted-foreground">
              Enter your new password below. Make sure it's strong and secure.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password"
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
                disabled={isLoading}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 6 characters long
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !formData.newPassword || !formData.confirmPassword}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword