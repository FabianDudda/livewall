'use client'

import { useState } from 'react'
import SignInForm from '@/components/auth/SignInForm'
import SignUpForm from '@/components/auth/SignUpForm'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword'

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<AuthMode>('signIn')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">LiveWall</h1>
          <p className="mt-2 text-gray-600">Live Event Fotowand</p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {authMode === 'signUp' ? (
            <SignUpForm onToggleMode={() => setAuthMode('signIn')} />
          ) : authMode === 'forgotPassword' ? (
            <ForgotPasswordForm onBack={() => setAuthMode('signIn')} />
          ) : (
            <SignInForm 
              onToggleMode={() => setAuthMode('signUp')} 
              onForgotPassword={() => setAuthMode('forgotPassword')}
            />
          )}
        </div>
      </div>
    </div>
  )
}