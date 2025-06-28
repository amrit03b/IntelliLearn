import Link from "next/link"
import { Brain, Users, Video, BookOpen, ArrowRight } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center logo-animation">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-800 brand-text-animation">IntelliLearn</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-center text-slate-900 mb-6 hero-title">
            IntelliLearn: Master Your Studies, <span className="text-blue-600">Together</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto hero-subtitle">
            Transforming syllabuses into interactive knowledge, powered by AI & enhanced by community.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl hero-button"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

        {/* Hero Illustration */}
        <div className="mt-16 flex justify-center">
          <div className="relative hero-illustration">
            <div className="w-64 h-64 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center">
              <div className="relative">
                <Brain className="h-24 w-24 text-blue-600" />
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow feature-card">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">AI-Powered Knowledge Trees</h3>
            <p className="text-slate-600">Transform your syllabus into interactive, visual knowledge structures.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow feature-card">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Video className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Intelligent Video Summaries</h3>
            <p className="text-slate-600">Get AI-generated summaries and key insights from educational videos.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow feature-card">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Collaborative Study Spaces</h3>
            <p className="text-slate-600">Study together with peers in shared, interactive learning environments.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow feature-card">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Personalized Study Tools</h3>
            <p className="text-slate-600">Adaptive flashcards, quizzes, and study plans tailored to your progress.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
