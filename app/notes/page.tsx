"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useRouter } from "next/navigation"
import { db } from "../../firebase/config"
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore"
import { BookOpen, Search, Trash2, ExternalLink, Calendar, FileText, ArrowLeft } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"

interface Note {
  id: string
  title: string
  content: string
  chatId: string
  chatTitle: string
  chapterId: string
  chapterTitle: string
  createdAt: any
  updatedAt: any
}

export default function NotesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const fetchNotes = async (uid: string) => {
    setLoadingNotes(true)
    try {
      console.log("Fetching notes for user:", uid);
      console.log("Firebase db object:", !!db);
      
      const q = query(
        collection(db, "notes"),
        where("userId", "==", uid),
        orderBy("updatedAt", "desc")
      )
      const querySnapshot = await getDocs(q)
      const notesData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Note[]
      console.log("Fetched notes:", notesData);
      setNotes(notesData)
    } catch (err: any) {
      console.error("Failed to fetch notes:", err)
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
    } finally {
      setLoadingNotes(false)
    }
  }

  useEffect(() => {
    if (!loading && user) {
      fetchNotes(user.uid)
    }
  }, [user, loading])

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return

    try {
      await deleteDoc(doc(db, "notes", noteId))
      fetchNotes(user.uid)
    } catch (err: any) {
      console.error("Failed to delete note:", err)
    }
  }

  const navigateToChat = (chatId: string) => {
    router.push(`/dashboard?chat=${chatId}`)
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.chatTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.chapterTitle.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div>Loading...</div>
  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-blue-600">Intelli</span><span className="text-slate-900">Learn</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-700 font-semibold shadow transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">My Notes</h1>
          <p className="text-slate-600 text-lg">Important concepts saved from your learning sessions</p>
        </div>
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {/* Notes List */}
        {loadingNotes ? (
          <div className="text-center py-8">
            <div className="text-slate-400">Loading notes...</div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <Card className="text-center py-12 shadow-md">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">No Notes Yet</h3>
            <p className="text-slate-600 mb-4">
              {searchTerm ? "No notes match your search." : "Select text from explanations to create your first note."}
            </p>
            {!searchTerm && (
              <Button onClick={() => router.push('/dashboard')} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 shadow font-semibold">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-lg transition-shadow shadow-md rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{note.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-slate-500 mb-3">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{note.updatedAt?.toDate?.().toLocaleDateString() || ""}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {note.chatTitle}
                        </Badge>
                        {note.chapterTitle && (
                          <Badge variant="outline" className="text-xs">
                            {note.chapterTitle}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => navigateToChat(note.chatId)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-semibold"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>View Original Chat</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 