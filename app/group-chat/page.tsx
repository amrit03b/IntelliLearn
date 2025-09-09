"use client";
export const dynamic = "force-dynamic";
import React, { useState, useEffect } from "react";
import { Plus, Send, Users, Mail, Lightbulb, ArrowLeft } from "lucide-react";
import { db } from "@/firebase/config";
import { collection, addDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import ChapterBreakdown from "@/components/ChapterBreakdown";

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  creatorId: string;
  createdAt?: any;
  pendingInvites?: string[];
}

interface GroupMessage {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  content: string;
  type: "ai-content" | "message" | "generated-content";
  createdAt: number;
  addedBy?: string;
  topic?: string;
}

export default function GroupChatPage() {
  const { user, loading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const router = useRouter();
  const [joinMessage, setJoinMessage] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState("");
  const [groupBreakdowns, setGroupBreakdowns] = useState<any[]>([]);
  const [selectedBreakdown, setSelectedBreakdown] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [autoJoinGroupId, setAutoJoinGroupId] = useState<string | null>(null);

  // Subscribe to all groups (not just where user is a member)
  useEffect(() => {
    const q = query(collection(db, "groups"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
    });
    return () => unsub();
  }, []);

  // Subscribe to messages for selected group
  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "groupMessages"),
      where("groupId", "==", selectedGroupId),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupMessage)));
    });
    return () => unsub();
  }, [selectedGroupId]);

  // Read groupId from query params on mount (client-side)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const groupId = params.get('groupId');
      if (groupId) setAutoJoinGroupId(groupId);
    }
  }, []);

  // Auto-join group if groupId is present in query params
  useEffect(() => {
    if (!user || !groups.length || !autoJoinGroupId) return;
    const group = groups.find(g => g.id === autoJoinGroupId);
    if (!group) return;
    if (group.members.includes(user.uid)) {
      setSelectedGroupId(autoJoinGroupId);
      return;
    }
    if (group.pendingInvites && group.pendingInvites.includes(user.email?.toLowerCase() || '')) {
      // Add user to group and remove from pendingInvites
      const update = async () => {
        await updateDoc(doc(db, "groups", autoJoinGroupId), {
          members: arrayUnion(user.uid),
          pendingInvites: group.pendingInvites?.filter((e: string) => e !== user.email?.toLowerCase()) || [],
        });
        setJoinMessage("You have joined the group!");
        setSelectedGroupId(autoJoinGroupId);
      };
      update();
    }
  }, [user, groups, autoJoinGroupId]);

  // Listen for all generated breakdowns for the selected group
  useEffect(() => {
    if (!selectedGroupId) {
      setGroupBreakdowns([]);
      setSelectedBreakdown(null);
      return;
    }
    
    console.log('Setting up listener for group:', selectedGroupId);
    
    try {
      const q = query(
        collection(db, "groupGeneratedBreakdowns"),
        where("groupId", "==", selectedGroupId),
        orderBy("createdAt", "desc")
      );
      
      const unsub = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        console.log('Received breakdowns from Firebase:', docs);
        setGroupBreakdowns(docs);
        
        // Always set the first breakdown as selected when data changes
        if (docs.length > 0) {
          setSelectedBreakdown(docs[0]);
        } else {
          setSelectedBreakdown(null);
        }
      }, (error) => {
        console.error('Error listening to group breakdowns:', error);
        // If there's an error, try without orderBy
        console.log('Trying query without orderBy...');
        const simpleQ = query(
          collection(db, "groupGeneratedBreakdowns"),
          where("groupId", "==", selectedGroupId)
        );
        
        const simpleUnsub = onSnapshot(simpleQ, (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          console.log('Received breakdowns (simple query):', docs);
          setGroupBreakdowns(docs);
          
          if (docs.length > 0) {
            setSelectedBreakdown(docs[0]);
          } else {
            setSelectedBreakdown(null);
          }
        });
        
        return () => simpleUnsub();
      });
      
      return () => {
        console.log('Cleaning up listener for group:', selectedGroupId);
        unsub();
      };
    } catch (error) {
      console.error('Error setting up query:', error);
    }
  }, [selectedGroupId]);

  // Create a new group in Firestore
  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    const docRef = await addDoc(collection(db, "groups"), {
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      members: [user.uid],
      creatorId: user.uid,
      createdAt: serverTimestamp(),
    });
    setShowCreateGroup(false);
    setNewGroupName("");
    setNewGroupDesc("");
    setSelectedGroupId(docRef.id);
  };

  // Update handleGenerateTopicContent to save to Firestore
  const handleGenerateTopicContent = async () => {
    if (!selectedGroupId || !topicInput.trim() || !user) return;
    setTopicLoading(true);
    setTopicError("");
    
    try {
      console.log('Generating content for topic:', topicInput.trim());
      
      const response = await fetch("/api/generate-knowledge-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabusContent: topicInput.trim() }),
      });
      
      const data = await response.json();
      console.log('API response:', data);
      
      if (data.chapters) {
        // Create the breakdown data
        const breakdownData = {
          groupId: selectedGroupId,
          userId: user.uid,
          userName: user.displayName || user.email || "User",
          topic: topicInput.trim(),
          breakdown: data.chapters,
          createdAt: serverTimestamp(),
        };
        
        console.log('Saving breakdown to Firebase:', breakdownData);
        
        // Save to Firestore first, then update UI
        const docRef = await addDoc(collection(db, "groupGeneratedBreakdowns"), breakdownData);
        console.log('Successfully saved to Firebase with ID:', docRef.id);
        
        // Clear input after successful save
        setTopicInput("");
        
        // Also add a message to the group chat about the new topic
        try {
          await addDoc(collection(db, "groupMessages"), {
            groupId: selectedGroupId,
            userId: user.uid,
            userName: user.displayName || user.email || "User",
            content: `Generated new topic: "${topicInput.trim()}" with ${data.chapters.length} chapters`,
            type: "generated-content",
            createdAt: serverTimestamp(),
            addedBy: user.displayName || user.email || "User",
            topic: topicInput.trim(),
          });
        } catch (messageErr) {
          console.error("Failed to add message about new topic:", messageErr);
        }
        
      } else {
        console.error('API returned no chapters:', data);
        setTopicError(data.error || "Failed to generate content. No chapters returned.");
      }
    } catch (err: any) {
      console.error("Error in handleGenerateTopicContent:", err);
      setTopicError(err.message || "Failed to generate content.");
    } finally {
      setTopicLoading(false);
    }
  };

  // Handle joining a group
  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "groups", groupId), {
        members: arrayUnion(user.uid)
      });
      setJoinMessage("Successfully joined the group!");
      setTimeout(() => setJoinMessage(""), 3000);
    } catch (err: any) {
      setJoinMessage("Failed to join group: " + err.message);
      setTimeout(() => setJoinMessage(""), 3000);
    }
  };

  // Send a message to the group
  const handleSendMessage = async () => {
    if (!selectedGroupId || !newMessage.trim() || !user || sendingMessage) return;
    
    setSendingMessage(true);
    try {
      await addDoc(collection(db, "groupMessages"), {
        groupId: selectedGroupId,
        userId: user.uid,
        userName: user.displayName || user.email || "User",
        content: newMessage.trim(),
        type: "message",
        createdAt: serverTimestamp(),
      });
      setNewMessage("");
    } catch (err: any) {
      console.error("Failed to send message:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div className="flex items-center justify-center h-screen text-slate-400">Please log in to use group chat.</div>;

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const groupMessages = messages;

  console.log('Current state:', {
    selectedGroupId,
    groupBreakdowns: groupBreakdowns.length,
    selectedBreakdown: selectedBreakdown?.id,
    groups: groups.length,
    messages: messages.length
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <Users className="w-6 h-6 text-white" />
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
      <div className="flex h-screen">
        {/* Sidebar: Group List */}
        <aside className="w-64 bg-slate-100 border-r border-slate-200 p-4 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center"><Users className="h-5 w-5 mr-2" />Groups</h2>
            <button
              className="bg-blue-600 text-white rounded px-2 py-1 flex items-center hover:bg-blue-700 shadow"
              onClick={() => setShowCreateGroup(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> New
            </button>
          </div>
          <ul className="space-y-2 flex-1 overflow-y-auto">
            {groups.length === 0 && <li className="text-slate-400">No groups yet.</li>}
            {groups.map(group => (
              <li key={group.id}>
                <div className="flex items-center justify-between w-full">
                  <button
                    className={`flex-1 text-left px-3 py-2 rounded font-semibold transition-colors shadow-sm ${selectedGroupId === group.id ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200 text-slate-700"}`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    {group.name}
                    <div className="text-xs text-slate-500">{group.description}</div>
                  </button>
                  {user && !group.members.includes(user.uid) && group.creatorId !== user.uid && (
                    <button
                      className="ml-2 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs shadow"
                      onClick={() => handleJoinGroup(group.id)}
                    >
                      Join
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </aside>
        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col h-full">
          <div className="border-b border-slate-200 px-8 py-4 flex items-center justify-between bg-white/80">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{selectedGroup ? selectedGroup.name : "Select a Group"}</h1>
              <p className="text-slate-500 text-sm">{selectedGroup?.description}</p>
            </div>
          </div>
          {selectedGroup && (
            <div className="mb-4 flex items-center space-x-2">
              <input
                className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
                placeholder="Enter a topic to generate content..."
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                disabled={topicLoading}
              />
              <button
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:bg-slate-300 flex items-center"
                onClick={handleGenerateTopicContent}
                disabled={topicLoading || !topicInput.trim()}
              >
                <Lightbulb className="h-4 w-4 mr-1" /> {topicLoading ? "Generating..." : "Generate"}
              </button>
            </div>
          )}
          {topicError && <div className="text-red-600 mb-2 text-sm">{topicError}</div>}
          
          {selectedGroup && groupBreakdowns.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold text-slate-700">Generated Topics:</span>
                {groupBreakdowns.map((b, idx) => (
                  <button
                    key={b.id}
                    className={`px-3 py-1 rounded text-sm border ${selectedBreakdown?.id === b.id ? "bg-blue-100 border-blue-400 text-blue-800 font-semibold" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                    onClick={() => setSelectedBreakdown(b)}
                  >
                    {b.topic || `Topic ${idx + 1}`} <span className="text-xs text-slate-400">({b.userName})</span>
                  </button>
                ))}
              </div>
              {selectedBreakdown && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">{selectedBreakdown.topic || "Topic"}</h2>
                      <p className="text-sm text-slate-500">
                        Added by {selectedBreakdown.userName} {selectedBreakdown.createdAt
                          ? (selectedBreakdown.createdAt.toDate
                              ? selectedBreakdown.createdAt.toDate().toLocaleString()
                              : new Date(selectedBreakdown.createdAt).toLocaleString())
                          : ""}
                      </p>
                    </div>
                  </div>
                  <ChapterBreakdown chapters={selectedBreakdown.breakdown} key={selectedBreakdown.id} />
                </div>
              )}
            </div>
          )}
          {selectedGroup && groupBreakdowns.length === 0 && (
            <div className="mb-6 text-slate-400 text-center">No generated topics for this group yet. Use the input above to generate one!</div>
          )}
          {selectedGroup ? (
            <div className="flex-1 flex flex-col px-8 py-4 overflow-y-auto">
              <div className="flex-1 space-y-4 mb-4">
                {groupMessages.length === 0 && <div className="text-slate-400">No messages yet. Start the discussion!</div>}
                {groupMessages.map(msg => (
                  <div key={msg.id} className={`rounded-lg p-3 ${msg.type === "ai-content" ? "bg-blue-50 border border-blue-200" : msg.type === "generated-content" ? "bg-yellow-50 border border-yellow-200" : "bg-slate-100 border border-slate-200"}`}>
                    <div className="flex items-center mb-1">
                      <span className={`font-semibold ${msg.userId === "ai" ? "text-blue-700" : "text-slate-800"}`}>{msg.userName}</span>
                      <span className="ml-2 text-xs text-slate-400">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                      {msg.type === "generated-content" && (
                        <span className="ml-2 text-xs text-yellow-700">(added by {msg.addedBy}{msg.topic ? `: ${msg.topic}` : ""})</span>
                      )}
                    </div>
                    <div className="text-slate-700 whitespace-pre-line">{msg.content}</div>
                  </div>
                ))}
              </div>
              
              {/* Message Input */}
              <div className="flex items-center space-x-2 mt-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={sendingMessage}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{sendingMessage ? "Sending..." : "Send"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Select a group to start chatting.
            </div>
          )}
        </main>
        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-2">Create New Group</h2>
              <input
                className="w-full border border-slate-300 rounded p-2 mb-3"
                placeholder="Group Name"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
              />
              <textarea
                className="w-full border border-slate-300 rounded p-2 mb-3"
                placeholder="Description (optional)"
                value={newGroupDesc}
                onChange={e => setNewGroupDesc(e.target.value)}
              />
              <div className="flex justify-end space-x-2">
                <button
                  className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
                  onClick={() => setShowCreateGroup(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
        {joinMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded shadow z-50">
            {joinMessage}
          </div>
        )}
      </div>
    </div>
  );
} 