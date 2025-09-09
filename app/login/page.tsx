"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { auth } from "../../firebase/config"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center logo-animation">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-800 brand-text-animation">EduSphere</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to EduSphere</h1>
            <p className="text-slate-600">Sign in with your Google account to continue your learning journey</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-slate-700 py-3 px-4 rounded-lg font-semibold border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_17_40)">
                <path d="M47.5 24.5C47.5 22.6 47.3 20.8 47 19H24V29.1H37.4C36.7 32.2 34.7 34.7 31.8 36.4V42.1H39.5C44 38.1 47.5 32.1 47.5 24.5Z" fill="#4285F4"/>
                <path d="M24 48C30.6 48 36.1 45.9 39.5 42.1L31.8 36.4C29.9 37.6 27.3 38.4 24 38.4C17.7 38.4 12.2 34.3 10.3 28.7H2.3V34.6C5.7 41.1 14.1 48 24 48Z" fill="#34A853"/>
                <path d="M10.3 28.7C9.7 26.6 9.7 24.4 10.3 22.3V16.4H2.3C-0.2 21.1-0.2 26.9 2.3 34.6L10.3 28.7Z" fill="#FBBC05"/>
                <path d="M24 9.6C27.6 9.6 30.6 10.8 32.7 12.7L39.7 5.7C36.1 2.4 30.6 0 24 0C14.1 0 5.7 6.9 2.3 16.4L10.3 22.3C12.2 16.7 17.7 12.6 24 12.6V9.6Z" fill="#EA4335"/>
              </g>
              <defs>
                <clipPath id="clip0_17_40">
                  <rect width="48" height="48" fill="white"/>
                </clipPath>
              </defs>
            </svg>
            <span>{loading ? "Signing in..." : "Sign in with Google"}</span>
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              By signing in, you agree to our{" "}
              <Link href="#" className="text-blue-600 hover:text-blue-700">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="#" className="text-blue-600 hover:text-blue-700">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
