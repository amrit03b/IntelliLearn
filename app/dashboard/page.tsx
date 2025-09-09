"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Brain,
  Upload,
  FileText,
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
import { useRouter, useSearchParams } from "next/navigation"
import SyllabusUploader from "../../components/SyllabusUploader"
import ChapterBreakdown from "../../components/ChapterBreakdown"
import { db } from "../../firebase/config"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [syllabuses, setSyllabuses] = useState<any[]>([])
  const [syllabusLoading, setSyllabusLoading] = useState(false)
  const [syllabusError, setSyllabusError] = useState("")
  const [refresh, setRefresh] = useState(0)
  const [breakdowns, setBreakdowns] = useState<any[]>([])
  const [selectedBreakdown, setSelectedBreakdown] = useState<any | null>(null)
  const [loadingBreakdowns, setLoadingBreakdowns] = useState(false)
  const [breakdownError, setBreakdownError] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

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

  // Fetch all syllabusBreakdowns for the user
  const fetchBreakdowns = async (uid: string) => {
    setLoadingBreakdowns(true)
    setBreakdownError("")
    try {
      const q = query(
        collection(db, "syllabusBreakdowns"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
      )
      const querySnapshot = await getDocs(q)
      const docs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      console.log('Fetched breakdowns:', docs)
      setBreakdowns(docs)
      if (docs.length > 0) {
        console.log('Setting selected breakdown:', docs[0])
        setSelectedBreakdown(docs[0])
      } else {
        setSelectedBreakdown(null)
      }
    } catch (err: any) {
      console.error(err);
      setBreakdownError(err.message || "Failed to fetch past chats.")
    } finally {
      setLoadingBreakdowns(false)
    }
  }

  useEffect(() => {
    if (!loading && user) {
      fetchBreakdowns(user.uid)
    }
  }, [user, loading, refresh])

  // Handle URL parameter for specific chat
  useEffect(() => {
    if (breakdowns.length > 0) {
      const chatId = searchParams.get('chat')
      if (chatId) {
        const targetBreakdown = breakdowns.find(b => b.id === chatId)
        if (targetBreakdown) {
          setSelectedBreakdown(targetBreakdown)
        }
      } else if (breakdowns.length > 0 && !selectedBreakdown) {
        setSelectedBreakdown(breakdowns[0])
      }
    }
  }, [breakdowns, searchParams, selectedBreakdown])

  // Debug logging for selectedBreakdown
  useEffect(() => {
    if (selectedBreakdown) {
      console.log('Selected breakdown:', selectedBreakdown)
      console.log('Breakdown chapters:', selectedBreakdown.breakdown)
    }
  }, [selectedBreakdown])

  if (loading) return <div>Loading...</div>
  if (!user) return null

  // const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0]
  //   if (file) {
  //     setSelectedFile(file)
  //   }
  // }

  // const handleDragOver = (e: React.DragEvent) => {
  //   e.preventDefault()
  // }

  // const handleDrop = (e: React.DragEvent) => {
  //   e.preventDefault()
  //   const file = e.dataTransfer.files[0]
  //   if (file) {
  //     setSelectedFile(file)
  //   }
  // }

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center logo-animation shadow-md">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold brand-text-animation tracking-tight">
              <span className="text-blue-600">Edu</span><span className="text-slate-900">Sphere</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center shadow">
                  <span className="text-white text-base font-bold">{initials}</span>
                </div>
                <span className="text-slate-800 font-semibold">{displayName}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2">
                  <button 
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:bg-blue-50 w-full text-left font-semibold"
                  >
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
        {/* Sidebar: Past Chats */}
        <aside className="w-72 bg-slate-100 border-r border-slate-200 min-h-screen flex flex-col shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-md font-bold text-slate-700 mb-4 tracking-tight">Past Chats</h3>
            {loadingBreakdowns ? (
              <div className="text-slate-400">Loading...</div>
            ) : breakdownError ? (
              <div className="text-red-600">{breakdownError}</div>
            ) : breakdowns.length === 0 ? (
              <div className="text-slate-400">No past chats yet.</div>
            ) : (
              <ul className="space-y-2">
                {breakdowns.map((b) => (
                  <li key={b.id}>
                    <button
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm ${selectedBreakdown?.id === b.id ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200 text-slate-700"}`}
                      onClick={() => setSelectedBreakdown(b)}
                    >
                      <div className="truncate font-bold text-base">{b.title}</div>
                      <div className="text-xs text-slate-500 truncate">{b.createdAt?.toDate?.().toLocaleString?.() || ""}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-10">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Welcome back, {displayName}!</h1>
              <p className="text-slate-600 text-lg">Ready to continue your learning journey?</p>
            </div>

            <div className="space-y-8">
              {/* Syllabus Upload Section */}
              <div>
                <SyllabusUploader onSyllabusUploaded={handleSyllabusUploaded} />
              </div>

              {/* Chapter Breakdown */}
              {selectedBreakdown ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {selectedBreakdown.title || "Syllabus"}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {selectedBreakdown.createdAt?.toDate?.().toLocaleString?.() || ""}
                      </p>
                    </div>
                  </div>
                  <ChapterBreakdown 
                    chapters={selectedBreakdown.breakdown} 
                    key={selectedBreakdown.id}
                    chatId={selectedBreakdown.id}
                    chatTitle={selectedBreakdown.title || "Untitled Chat"}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-md">
                  <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 mb-2">No Syllabus Selected</h3>
                  <p className="text-slate-600 mb-4">Select a past chat or upload a new syllabus to get started.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
