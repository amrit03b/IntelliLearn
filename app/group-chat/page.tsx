"use client";
import React, { useState, useEffect } from "react";
import { Plus, Send, Users, Mail, Lightbulb } from "lucide-react";
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
  const searchParams = useSearchParams();
  const [joinMessage, setJoinMessage] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState("");
  const [groupBreakdowns, setGroupBreakdowns] = useState<any[]>([]);
  const [selectedBreakdown, setSelectedBreakdown] = useState<any | null>(null);
  const [pendingLocalBreakdowns, setPendingLocalBreakdowns] = useState<any[]>([]);

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

  // Auto-join group via link if in pendingInvites
  useEffect(() => {
    if (!user || !groups.length) return;
    const groupId = searchParams.get("groupId");
    if (!groupId) return;
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    if (group.members.includes(user.uid)) {
      setSelectedGroupId(groupId);
      return;
    }
    if (group.pendingInvites && group.pendingInvites.includes(user.email?.toLowerCase())) {
      // Add user to group and remove from pendingInvites
      const update = async () => {
        await updateDoc(doc(db, "groups", groupId), {
          members: arrayUnion(user.uid),
          pendingInvites: group.pendingInvites.filter((e: string) => e !== user.email?.toLowerCase()),
        });
        setJoinMessage("You have joined the group!");
        setSelectedGroupId(groupId);
      };
      update();
    }
  }, [user, groups, searchParams]);

  // Listen for all generated breakdowns for the selected group
  useEffect(() => {
    if (!selectedGroupId) {
      setGroupBreakdowns([]);
      setSelectedBreakdown(null);
      setPendingLocalBreakdowns([]);
      return;
    }
    const q = query(
      collection(db, "groupGeneratedBreakdowns"),
      where("groupId", "==", selectedGroupId),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setGroupBreakdowns(docs);
      setSelectedBreakdown(docs[0] || null);
    });
    return () => unsub();
  }, [selectedGroupId]);

  // Merge local pending breakdowns after Firestore updates
  useEffect(() => {
    if (!selectedGroupId) return;
    setGroupBreakdowns((prev) => [
      ...prev,
      ...pendingLocalBreakdowns.filter(local => !prev.some(doc => doc.topic === local.topic && doc.userId === local.userId))
    ]);
    if (!selectedBreakdown && (pendingLocalBreakdowns[0] || groupBreakdowns[0])) {
      setSelectedBreakdown(pendingLocalBreakdowns[0] || groupBreakdowns[0]);
    }
    // eslint-disable-next-line
  }, [pendingLocalBreakdowns, selectedGroupId]);

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
      const response = await fetch("/api/generate-knowledge-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabusContent: topicInput.trim() }),
      });
      const data = await response.json();
      if (data.chapters) {
        // Show immediately in UI
        const localBreakdown = {
          id: `local-${Date.now()}`,
          groupId: selectedGroupId,
          userId: user.uid,
          userName: user.displayName || user.email || "User",
          topic: topicInput.trim(),
          breakdown: data.chapters,
          createdAt: Date.now(),
          isLocal: true,
        };
        setPendingLocalBreakdowns((prev) => [localBreakdown, ...prev]);
        setSelectedBreakdown(localBreakdown);
        setTopicInput("");
        // Save to Firestore in background
        addDoc(collection(db, "groupGeneratedBreakdowns"), {
          groupId: selectedGroupId,
          userId: user.uid,
          userName: user.displayName || user.email || "User",
          topic: localBreakdown.topic,
          breakdown: localBreakdown.breakdown,
          createdAt: serverTimestamp(),
        }).then(() => {
          // Remove from pendingLocalBreakdowns after Firestore confirms
          setPendingLocalBreakdowns((prev) => prev.filter(b => b.id !== localBreakdown.id));
        }).catch((err) => {
          setTopicError("Saved locally, but failed to save to group: " + (err.message || "Unknown error"));
        });
      } else {
        setTopicError(data.error || "Failed to generate content.");
      }
    } catch (err: any) {
      setTopicError(err.message || "Failed to generate content.");
    } finally {
      setTopicLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div className="flex items-center justify-center h-screen text-slate-400">Please log in to use group chat.</div>;

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const groupMessages = messages;

  console.log('GroupBreakdowns:', groupBreakdowns, 'SelectedBreakdown:', selectedBreakdown);

  return (
    <div className="flex h-screen">
      {/* Sidebar: Group List */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center"><Users className="h-5 w-5 mr-2" />Groups</h2>
          <button
            className="bg-blue-600 text-white rounded px-2 py-1 flex items-center hover:bg-blue-700"
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
                  className={`flex-1 text-left px-3 py-2 rounded ${selectedGroupId === group.id ? "bg-blue-100 text-blue-800 font-semibold" : "hover:bg-slate-100"}`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  {group.name}
                  <div className="text-xs text-slate-500">{group.description}</div>
                </button>
                {user && !group.members.includes(user.uid) && group.creatorId !== user.uid && (
                  <button
                    className="ml-2 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
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
        <div className="border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{selectedGroup ? selectedGroup.name : "Select a Group"}</h1>
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
                  {b.topic || `Topic ${idx + 1}`} <span className="text-xs text-slate-400">({b.userName}{b.isLocal ? ' (pending)' : ''})</span>
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
                      {selectedBreakdown.isLocal && <span className="ml-2 text-yellow-600">(pending save)</span>}
                    </p>
                  </div>
                </div>
                <ChapterBreakdown chapters={Array.isArray(selectedBreakdown.breakdown) ? selectedBreakdown.breakdown : []} key={selectedBreakdown.id} />
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
  );
} 