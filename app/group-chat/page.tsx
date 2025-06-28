"use client";
import React, { useState, useEffect } from "react";
import { Plus, Send, Users, Mail } from "lucide-react";
import { db } from "@/firebase/config";
import { collection, addDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";

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
  type: "ai-content" | "message";
  createdAt: number;
}

export default function GroupChatPage() {
  const { user, loading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [joinMessage, setJoinMessage] = useState("");

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

  // Send a message to Firestore
  const handleSend = async () => {
    if (!user || !input.trim() || !selectedGroupId) return;
    await addDoc(collection(db, "groupMessages"), {
      groupId: selectedGroupId,
      userId: user.uid,
      userName: user.displayName || user.email || "User",
      content: input.trim(),
      type: "message",
      createdAt: serverTimestamp(),
    });
    setInput("");
  };

  // Generate AI content (mocked, but stored in Firestore)
  const handleGenerateAI = async () => {
    if (!selectedGroupId) return;
    setAiLoading(true);
    setTimeout(async () => {
      await addDoc(collection(db, "groupMessages"), {
        groupId: selectedGroupId,
        userId: "ai",
        userName: "AI",
        content: `AI-generated content for topic at ${new Date().toLocaleTimeString()}`,
        type: "ai-content",
        createdAt: serverTimestamp(),
      });
      setAiLoading(false);
    }, 1200);
  };

  // Join group handler
  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;
    await updateDoc(doc(db, "groups", groupId), {
      members: arrayUnion(user.uid),
    });
    setJoinMessage("You have joined the group!");
    setSelectedGroupId(groupId);
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div className="flex items-center justify-center h-screen text-slate-400">Please log in to use group chat.</div>;

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const groupMessages = messages;

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
          {selectedGroup && (
            <button
              className="flex items-center px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
              onClick={() => setShowInviteModal(true)}
            >
              <Mail className="h-4 w-4 mr-2" /> Invite
            </button>
          )}
        </div>
        {selectedGroup ? (
          <div className="flex-1 flex flex-col px-8 py-4 overflow-y-auto">
            <div className="flex-1 space-y-4 mb-4">
              {groupMessages.length === 0 && <div className="text-slate-400">No messages yet. Start the discussion!</div>}
              {groupMessages.map(msg => (
                <div key={msg.id} className={`rounded-lg p-3 ${msg.type === "ai-content" ? "bg-blue-50 border border-blue-200" : "bg-slate-100 border border-slate-200"}`}>
                  <div className="flex items-center mb-1">
                    <span className={`font-semibold ${msg.userId === "ai" ? "text-blue-700" : "text-slate-800"}`}>{msg.userName}</span>
                    <span className="ml-2 text-xs text-slate-400">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-700 whitespace-pre-line">{msg.content}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2 mt-auto">
              <input
                className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
                placeholder="Type a message or topic..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                disabled={aiLoading}
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-slate-300"
                onClick={handleSend}
                disabled={aiLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </button>
              <button
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-slate-300"
                onClick={handleGenerateAI}
                disabled={aiLoading}
              >
                {aiLoading ? "Generating..." : "AI Generate"}
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
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Invite User to Group</h2>
            <input
              className="w-full border border-slate-300 rounded p-2 mb-3"
              placeholder="User Email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              type="email"
            />
            {inviteError && <div className="text-red-600 mb-2 text-sm">{inviteError}</div>}
            {inviteSuccess && <div className="text-green-600 mb-2 text-sm">{inviteSuccess}</div>}
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
                onClick={() => { setShowInviteModal(false); setInviteEmail(""); setInviteError(""); setInviteSuccess(""); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleInvite}
                disabled={!inviteEmail.trim()}
              >
                Send Invite
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