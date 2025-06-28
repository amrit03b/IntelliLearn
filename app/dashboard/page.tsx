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
import KnowledgeTree from "../../components/KnowledgeTree"
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Syllabus Upload Section */}
              <div className="lg:col-span-2">
                <SyllabusUploader onSyllabusUploaded={handleSyllabusUploaded} />
              </div>

              {/* Knowledge Tree Visualization */}
              <div className="space-y-6 mt-8">
                {syllabusLoading && <div>Loading your syllabuses...</div>}
                {syllabusError && <div className="text-red-600">{syllabusError}</div>}
                {syllabuses.length === 0 && !syllabusLoading && (
                  <div className="text-slate-400">No syllabuses uploaded yet.</div>
                )}
                {syllabuses.map((syllabus) => (
                  <div key={syllabus.id} className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-2">
                      Syllabus ({syllabus.createdAt?.toDate?.().toLocaleString?.() || ""})
                    </h2>
                    <div className="mb-2 text-slate-600 text-sm">
                      {syllabus.syllabusContent?.slice(0, 120)}{syllabus.syllabusContent?.length > 120 ? "..." : ""}
                    </div>
                    <h3 className="text-md font-semibold text-slate-700 mb-2">Knowledge Tree</h3>
                    <KnowledgeTree knowledgeTree={syllabus.knowledgeTree} syllabusContent={syllabus.syllabusContent} />
                  </div>
                ))}
              </div>

              {/* AI Insights Panel */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
                    AI Insights
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <FileVideo className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Video Summaries</p>
                        <p className="text-xs text-slate-500">AI-generated insights</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Smart Notes</p>
                        <p className="text-xs text-slate-500">Automated note generation</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Flashcards</p>
                        <p className="text-xs text-slate-500">Interactive study cards</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 text-center">
                    AI features will activate once you upload content
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Syllabuses</span>
                      <span className="font-semibold text-slate-800">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Study Groups</span>
                      <span className="font-semibold text-slate-800">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Study Hours</span>
                      <span className="font-semibold text-slate-800">0h</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
