// 'use client'

// import { useEffect, useState } from 'react'
// import { useRouter, useSearchParams } from 'next/navigation'
// import { useAuth } from '@/contexts/AuthContext'
// import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

// export default function ResetPasswordPage() {
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState<string | null>(null)
//   const { session, isPasswordRecovery } = useAuth()
//   const router = useRouter()
//   const searchParams = useSearchParams()

//   useEffect(() => {
//     // Wait for auth state to initialize
//     const timer = setTimeout(() => {
//       if (session) {
//         // We have a session, let user reset password regardless of recovery state
//         // This handles the case where the user is logged in via the reset link
//         setLoading(false)
//       } else {
//         // No session means the reset link might be invalid or expired
//         setError('Link zum Zurücksetzen des Passworts ist abgelaufen oder ungültig. Bitte fordern Sie einen neuen Link an.')
//         setLoading(false)
//       }
//     }, 2000) // Give auth context time to process the recovery

//     return () => clearTimeout(timer)
//   }, [session, router])

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
//         <div className="sm:mx-auto sm:w-full sm:max-w-md">
//           <div className="text-center mb-8">
//             <h1 className="text-4xl font-bold text-blue-600">LiveWall</h1>
//             <p className="mt-2 text-gray-600">Live Event Fotowand</p>
//           </div>
          
//           <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
//             <div className="text-center">
//               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
//               <p className="text-gray-600">Link wird überprüft...</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     )
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
//         <div className="sm:mx-auto sm:w-full sm:max-w-md">
//           <div className="text-center mb-8">
//             <h1 className="text-4xl font-bold text-blue-600">LiveWall</h1>
//             <p className="mt-2 text-gray-600">Live Event Fotowand</p>
//           </div>
          
//           <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
//             <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
//               <h2 className="text-2xl font-bold text-gray-900 mb-2">Fehler</h2>
//               <p className="text-red-600 mb-6">{error}</p>
//               <button
//                 onClick={() => router.push('/auth')}
//                 className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
//               >
//                 Zur Anmeldung
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
//       <div className="sm:mx-auto sm:w-full sm:max-w-md">
//         <div className="text-center mb-8">
//           <h1 className="text-4xl font-bold text-blue-600">LiveWall</h1>
//           <p className="mt-2 text-gray-600">Live Event Fotowand</p>
//         </div>
        
//         <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
//           <ResetPasswordForm />
//         </div>
//       </div>
//     </div>
//   )
// }