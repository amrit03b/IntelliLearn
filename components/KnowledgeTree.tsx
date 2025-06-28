import React, { useState } from "react";

type TreeNode = {
  name: string;
  children?: TreeNode[];
};

type VideoSuggestion = { title: string; url: string };

function parseTree(tree: string | object): TreeNode | null {
  if (!tree) return null;
  try {
    if (typeof tree === "string") {
      return JSON.parse(tree);
    }
    return tree as TreeNode;
  } catch {
    return null;
  }
}

interface TreeProps {
  node: TreeNode;
  syllabusContent: string;
}

const Tree: React.FC<TreeProps> = ({ node, syllabusContent }) => {
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videos, setVideos] = useState<VideoSuggestion[] | null>(null);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState("");
  const hasChildren = node.children && node.children.length > 0;

  const handleExpand = async () => {
    setExpanded((e) => !e);
    if (!expanded && !explanation) {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/explain-subtopic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subtopicName: node.name, syllabusContent }),
        });
        const data = await response.json();
        if (data.explanation) {
          setExplanation(data.explanation);
        } else {
          setError(data.error || "Failed to fetch explanation.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch explanation.");
      } finally {
        setLoading(false);
      }
    }
    if (!expanded && !videos) {
      setVideosLoading(true);
      setVideosError("");
      try {
        const response = await fetch("/api/youtube-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subtopicName: node.name, syllabusContent }),
        });
        const data = await response.json();
        if (data.videos) {
          setVideos(data.videos);
        } else {
          setVideosError(data.error || "Failed to fetch video suggestions.");
        }
      } catch (err: any) {
        setVideosError(err.message || "Failed to fetch video suggestions.");
      } finally {
        setVideosLoading(false);
      }
    }
  };

  return (
    <div style={{ marginLeft: 16 }}>
      <div style={{ display: "flex", alignItems: "center", cursor: hasChildren ? "pointer" : "default" }}>
        {hasChildren && (
          <span
            onClick={handleExpand}
            style={{ marginRight: 4, fontWeight: "bold", userSelect: "none" }}
          >
            {expanded ? "-" : "+"}
          </span>
        )}
        <span>{node.name}</span>
      </div>
      {expanded && (
        <div>
          {loading && <div className="text-slate-400">Loading explanation...</div>}
          {error && <div className="text-red-600">{error}</div>}
          {explanation && <div className="text-blue-700 mb-2">{explanation}</div>}
          {videosLoading && <div className="text-slate-400">Loading video suggestions...</div>}
          {videosError && <div className="text-red-600">{videosError}</div>}
          {videos && videos.length > 0 && (
            <div className="mb-2">
              <div className="font-semibold text-slate-700">YouTube Video Suggestions:</div>
              <ul className="list-disc ml-6">
                {videos.map((video, idx) => (
                  <li key={idx}>
                    <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      {video.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasChildren && node.children!.map((child, idx) => (
            <Tree key={idx} node={child} syllabusContent={syllabusContent} />
          ))}
        </div>
      )}
    </div>
  );
};

const KnowledgeTree: React.FC<{ knowledgeTree: string | object | null; syllabusContent?: string }> = ({ knowledgeTree, syllabusContent = "" }) => {
  const tree = parseTree(knowledgeTree || "");
  if (!tree) return <div className="text-slate-400">No knowledge tree available.</div>;
  return <Tree node={tree} syllabusContent={syllabusContent} />;
};

export default KnowledgeTree; 