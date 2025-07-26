'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()

  const validatePassword = (password: string) => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('mindestens 8 Zeichen')
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('einen Kleinbuchstaben')
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('einen Großbuchstaben')
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('eine Zahl')
    }
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!password || !confirmPassword) {
      setError('Bitte füllen Sie alle Felder aus')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      setLoading(false)
      return
    }

    const passwordErrors = validatePassword(password)
    if (passwordErrors.length > 0) {
      setError(`Passwort muss enthalten: ${passwordErrors.join(', ')}`)
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        if (error.message.includes('session_not_found')) {
          setError('Sitzung abgelaufen. Bitte fordern Sie einen neuen Link zum Zurücksetzen an')
        } else if (error.message.includes('same_password')) {
          setError('Das neue Passwort muss sich vom aktuellen Passwort unterscheiden')
        } else {
          setError('Fehler beim Aktualisieren des Passworts. Bitte versuchen Sie es erneut')
        }
      } else {
        setSuccess(true)
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Passwort erfolgreich aktualisiert</h2>
          <p className="text-gray-600 mb-4">
            Ihr Passwort wurde erfolgreich geändert. Sie werden automatisch angemeldet.
          </p>
          <p className="text-sm text-gray-500">
            Sie werden in wenigen Sekunden weitergeleitet...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Neues Passwort erstellen</h2>
        <p className="text-gray-600">
          Erstellen Sie ein sicheres neues Passwort für Ihr Konto
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
            Neues Passwort
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mindestens 8 Zeichen"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {password && (
            <div className="mt-2 text-xs text-gray-500">
              <p className="mb-1">Ihr Passwort muss enthalten:</p>
              <ul className="space-y-1">
                <li className={`flex items-center gap-1 ${password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                  <Check className={`w-3 h-3 ${password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`} />
                  Mindestens 8 Zeichen
                </li>
                <li className={`flex items-center gap-1 ${/(?=.*[a-z])/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <Check className={`w-3 h-3 ${/(?=.*[a-z])/.test(password) ? 'text-green-600' : 'text-gray-400'}`} />
                  Einen Kleinbuchstaben
                </li>
                <li className={`flex items-center gap-1 ${/(?=.*[A-Z])/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <Check className={`w-3 h-3 ${/(?=.*[A-Z])/.test(password) ? 'text-green-600' : 'text-gray-400'}`} />
                  Einen Großbuchstaben
                </li>
                <li className={`flex items-center gap-1 ${/(?=.*\d)/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <Check className={`w-3 h-3 ${/(?=.*\d)/.test(password) ? 'text-green-600' : 'text-gray-400'}`} />
                  Eine Zahl
                </li>
              </ul>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-2">
            Passwort bestätigen
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="confirm-new-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Passwort wiederholen"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-xs text-red-500">Passwörter stimmen nicht überein</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword || password !== confirmPassword}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Passwort wird aktualisiert...' : 'Passwort aktualisieren'}
        </button>
      </form>
    </div>
  )
}