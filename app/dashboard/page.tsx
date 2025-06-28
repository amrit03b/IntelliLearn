"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Brain,
  Upload,
  FileText,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Home,
  BookOpen,
  Search,
  Lightbulb,
  FileVideo,
  CreditCard,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useRouter } from "next/navigation"
import SyllabusUploader from "../../components/SyllabusUploader"
import ChapterBreakdown from "../../components/ChapterBreakdown"
import { db } from "../../firebase/config"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [syllabuses, setSyllabuses] = useState<any[]>([])
  const [syllabusLoading, setSyllabusLoading] = useState(false)
  const [syllabusError, setSyllabusError] = useState("")
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const fetchSyllabuses = async (uid: string) => {
    setSyllabusLoading(true)
    setSyllabusError("")
    try {
      const q = query(
        collection(db, "syllabuses"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
      )
      const querySnapshot = await getDocs(q)
      setSyllabuses(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    } catch (err: any) {
      setSyllabusError(err.message || "Failed to fetch syllabuses.")
    } finally {
      setSyllabusLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && user) {
      fetchSyllabuses(user.uid)
    }
  }, [user, loading, refresh])

  if (loading) return <div>Loading...</div>
  if (!user) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  // Get user display name or fallback to email
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Pass a callback to SyllabusUploader to trigger refresh after upload
  const handleSyllabusUploaded = () => setRefresh((r) => r + 1);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center logo-animation">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800 brand-text-animation">IntelliLearn</span>
          </div>

          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
              <Users className="h-4 w-4 text-slate-600" />
              <span className="text-sm text-slate-600">My Groups</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{initials}</span>
                </div>
                <span className="text-slate-700">{displayName}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2">
                  <button className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:bg-slate-50 w-full text-left">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:bg-slate-50 w-full text-left">
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-screen">
          <nav className="p-6">
            <div className="space-y-2">
              <button className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 w-full text-left">
                <Home className="h-5 w-5" />
                <span>Dashboard</span>
              </button>
              <button className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 w-full text-left">
                <FileText className="h-5 w-5" />
                <span>My Syllabuses</span>
              </button>
              <button className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 w-full text-left">
                <Search className="h-5 w-5" />
                <span>Explore Topics</span>
              </button>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">My Study Groups</h3>
                <button className="text-blue-600 hover:text-blue-700">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No groups yet</p>
                <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">Create New Group</button>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome back, {displayName}!</h1>
              <p className="text-slate-600">Ready to continue your learning journey?</p>
            </div>

            <div className="space-y-8">
              {/* Syllabus Upload Section */}
              <div>
                <SyllabusUploader onSyllabusUploaded={handleSyllabusUploaded} />
              </div>

              {/* Chapter Breakdown */}
              <div className="space-y-6">
                {syllabusLoading && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                )}
                {syllabusError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="text-red-600">{syllabusError}</div>
                  </div>
                )}
                {syllabuses.length === 0 && !syllabusLoading && (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Syllabuses Yet</h3>
                    <p className="text-slate-600 mb-4">Upload your first syllabus to get started with chapter breakdowns.</p>
                  </div>
                )}
                {syllabuses.map((syllabus) => (
                  <div key={syllabus.id} className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                          {syllabus.fileName || "Syllabus"}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {syllabus.createdAt?.toDate?.().toLocaleString?.() || ""}
                        </p>
                      </div>
                    </div>
                    <ChapterBreakdown syllabusContent={syllabus.syllabusContent} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
