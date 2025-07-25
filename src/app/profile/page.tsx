'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { User, Mail, Phone, LogOut, Save, Loader, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ProfileFormData {
  email: string
  phone: string
  displayName: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface FormErrors {
  email?: string
  phone?: string
  displayName?: string
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  general?: string
}

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState<ProfileFormData>({
    email: '',
    phone: '',
    displayName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [initialLoad, setInitialLoad] = useState(true)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [pendingEmailChange, setPendingEmailChange] = useState<string | null>(null)

  // Redirect to auth if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  // Load user data when component mounts
  useEffect(() => {
    if (user && initialLoad) {
      setFormData({
        email: user.email || '',
        phone: user.phone || '',
        displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      
      // Check if there's a pending email change
      if (user.new_email && user.new_email !== user.email) {
        setPendingEmailChange(user.new_email)
      }
      
      setInitialLoad(false)
    }
  }, [user, initialLoad])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'E-Mail-Adresse ist erforderlich'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse'
    }

    // Phone validation (optional but must be valid if provided)
    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{6,20}$/.test(formData.phone)) {
      newErrors.phone = 'Ungültige Telefonnummer'
    }

    // Display name validation
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Anzeigename ist erforderlich'
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Anzeigename muss mindestens 2 Zeichen lang sein'
    }

    // Password validation (only if user wants to change password)
    const isChangingPassword = formData.currentPassword || formData.newPassword || formData.confirmPassword
    
    if (isChangingPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Aktuelles Passwort ist erforderlich'
      }
      
      if (!formData.newPassword) {
        newErrors.newPassword = 'Neues Passwort ist erforderlich'
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Neues Passwort muss mindestens 6 Zeichen lang sein'
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwort bestätigen ist erforderlich'
      } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwörter stimmen nicht überein'
      }
      
      if (formData.currentPassword === formData.newPassword) {
        newErrors.newPassword = 'Neues Passwort muss sich vom aktuellen unterscheiden'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    
    // Clear success message when user starts editing
    if (successMessage) {
      setSuccessMessage(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})
    setSuccessMessage(null)

    try {
      const isChangingPassword = formData.currentPassword || formData.newPassword || formData.confirmPassword
      const isChangingEmail = formData.email !== (user?.email || '')
      
      // If changing password, verify current password first
      if (isChangingPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.currentPassword
        })
        
        if (signInError) {
          throw new Error('Aktuelles Passwort ist falsch')
        }
      }

      // Update user data using Supabase auth.updateUser
      const updateData = {
        email: formData.email,
        phone: formData.phone || undefined,
        ...(isChangingPassword && { password: formData.newPassword }),
        data: {
          display_name: formData.displayName.trim()
        }
      }

      const { error } = await supabase.auth.updateUser(updateData)

      if (error) {
        throw error
      }

      // Track pending email change
      if (isChangingEmail) {
        setPendingEmailChange(formData.email)
      }

      // Clear password fields after successful update
      if (isChangingPassword) {
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))
      }

      // Set appropriate success message
      let message = 'Profil erfolgreich aktualisiert'
      if (isChangingPassword && isChangingEmail) {
        message = 'Profil und Passwort aktualisiert. Bestätigungslinks für die E-Mail-Änderung wurden versendet.'
      } else if (isChangingPassword) {
        message = 'Profil und Passwort erfolgreich aktualisiert'
      } else if (isChangingEmail) {
        message = 'Profil aktualisiert. Bestätigungslinks für die E-Mail-Änderung wurden versendet.'
      }
      
      setSuccessMessage(message)
    } catch (error) {
      console.error('Error updating profile:', error)
      setErrors({
        general: (error as Error).message || 'Fehler beim Aktualisieren des Profils'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/')
    }
  }

  // Loading state while checking authentication
  if (authLoading || initialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Don't render if user is not authenticated
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                LiveWall
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Willkommen, {user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Profil-Einstellungen</h2>
            <p className="text-gray-600">Verwalten Sie Ihre persönlichen Informationen</p>
          </div>

          {/* Profile Form Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            {/* General Error Message */}
            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="ihre@email.com"
                    required
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
                
                {/* Pending email change notification */}
                {pendingEmailChange && pendingEmailChange !== user?.email && (
                  <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700">
                      <strong>E-Mail-Änderung ausstehend:</strong> Sie haben eine Änderung zu <strong>{pendingEmailChange}</strong> beantragt. Bitte prüfen Sie beide E-Mail-Adressen und bestätigen Sie die Links, um die Änderung abzuschließen. Bis zur Bestätigung bleibt Ihre aktuelle E-Mail-Adresse ({user?.email}) aktiv.
                    </p>
                  </div>
                )}
                
                {/* Email change security notice */}
                {formData.email !== (user?.email || '') && !pendingEmailChange && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Sicherheitshinweis:</strong> Bei einer E-Mail-Änderung erhalten Sie Bestätigungslinks sowohl an Ihre aktuelle E-Mail-Adresse ({user?.email}) als auch an die neue E-Mail-Adresse. Sie müssen beide Links bestätigen, um die Änderung abzuschließen.
                    </p>
                  </div>
                )}
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefonnummer <span className="text-gray-500">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="+49 123 456 7890"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              {/* Display Name Field */}
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                  Anzeigename
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="displayName"
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.displayName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Ihr Anzeigename"
                    required
                  />
                </div>
                {errors.displayName && (
                  <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
                )}
              </div>

              {/* Password Change Section */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Passwort ändern</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Lassen Sie die Felder leer, wenn Sie Ihr Passwort nicht ändern möchten.
                </p>
                
                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Aktuelles Passwort
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                        className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Ihr aktuelles Passwort"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Neues Passwort
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.newPassword ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Ihr neues Passwort"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Neues Passwort bestätigen
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Neues Passwort bestätigen"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Profil speichern
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>

          {/* Account Info Card */}
          <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Konto-Informationen</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Benutzer-ID:</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Konto erstellt:</span>
                <span className="text-gray-900">
                  {new Date(user.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Letzte Anmeldung:</span>
                <span className="text-gray-900">
                  {user.last_sign_in_at 
                    ? new Date(user.last_sign_in_at).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Nicht verfügbar'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}