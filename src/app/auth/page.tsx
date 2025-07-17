'use client'

import { useState } from 'react'
import SignInForm from '@/components/auth/SignInForm'
import SignUpForm from '@/components/auth/SignUpForm'

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">LiveWall</h1>
          <p className="mt-2 text-gray-600">Live Event Fotowand</p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {isSignUp ? (
            <SignUpForm onToggleMode={() => setIsSignUp(false)} />
          ) : (
            <SignInForm onToggleMode={() => setIsSignUp(true)} />
          )}
        </div>
      </div>
    </div>
  )
}