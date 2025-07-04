import { api } from '../lib/api'

export interface ForgotPasswordRequest {
  email: string
}

export interface VerifyResetTokenRequest {
  token: string
  email: string
}

export interface ResetPasswordRequest {
  token: string
  email: string
  newPassword: string
  confirmPassword: string
}

export class PasswordResetService {
  static async forgotPassword(request: ForgotPasswordRequest): Promise<{ message: string }> {
    const response = await api.post('/auth/forgot-password', request)
    return response.data
  }

  static async verifyResetToken(request: VerifyResetTokenRequest): Promise<{ valid: boolean; message?: string }> {
    const response = await api.post('/auth/verify-reset-token', request)
    return response.data
  }

  static async resetPassword(request: ResetPasswordRequest): Promise<{ message: string }> {
    const response = await api.post('/auth/reset-password', request)
    return response.data
  }
}