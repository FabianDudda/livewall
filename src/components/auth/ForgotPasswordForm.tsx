'use client'

import { useState } from 'react'
import { Mail, ArrowLeft, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ForgotPasswordFormProps {
  onBack: () => void
}

export default function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!email.trim()) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein')
      setLoading(false)
      return
    }

    if (!validateEmail(email)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        if (error.message.includes('Invalid email')) {
          setError('Diese E-Mail-Adresse ist nicht registriert')
        } else if (error.message.includes('rate limit')) {
          setError('Zu viele Anfragen. Bitte versuchen Sie es später erneut')
        } else {
          setError('Fehler beim Senden der E-Mail. Bitte versuchen Sie es erneut')
        }
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut')
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">E-Mail gesendet</h2>
          <p className="text-gray-600 mb-6">
            Wir haben Ihnen eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts an{' '}
            <strong>{email}</strong> gesendet.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Überprüfen Sie auch Ihren Spam-Ordner, falls die E-Mail nicht in Ihrem Posteingang ankommt.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-500 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Passwort zurücksetzen</h2>
        <p className="text-gray-600">
          Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
            E-Mail-Adresse
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ihre@email.com"
              required
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'E-Mail wird gesendet...' : 'Link zum Zurücksetzen senden'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-500 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Anmeldung
        </button>
      </div>
    </div>
  )
}