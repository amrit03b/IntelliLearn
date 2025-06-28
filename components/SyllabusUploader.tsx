"use client";
import React, { useState } from "react";
import KnowledgeTree from "./KnowledgeTree";

export default function SyllabusUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [syllabusText, setSyllabusText] = useState("");
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState("");
  const [knowledgeTree, setKnowledgeTree] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPastedText("");
      setKnowledgeTree(null);
      setSuccess("");
      setTreeError("");
      // Extract text from file
      let text = "";
      try {
        if (file.type === "application/pdf") {
          const pdfjsLib = await import("pdfjs-dist/build/pdf");
          (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
            `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(" ") + "\n";
          }
        } else if (file.type.startsWith("image/")) {
          const Tesseract = (await import("tesseract.js")).default;
          const { data } = await Tesseract.recognize(file, "eng");
          text = data.text;
        } else {
          setTreeError("Unsupported file type. Please upload a PDF or image.");
          return;
        }
        setSyllabusText(text);
        setSuccess("Syllabus text extracted. You can now generate the knowledge tree.");
      } catch (err: any) {
        setTreeError(err.message || "Failed to extract text from file.");
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPastedText(e.target.value);
    setSelectedFile(null);
    setKnowledgeTree(null);
    setSuccess("");
    setTreeError("");
    setSyllabusText(e.target.value);
  };

  const handleGenerateTree = async () => {
    setTreeLoading(true);
    setTreeError("");
    setKnowledgeTree(null);
    setSuccess("");
    try {
      const response = await fetch("/api/generate-knowledge-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabusContent: syllabusText }),
      });
      const data = await response.json();
      if (data.knowledgeTree) {
        setKnowledgeTree(data.knowledgeTree);
        setSuccess("Knowledge tree generated!");
      } else {
        setTreeError(data.error || "Failed to generate knowledge tree.");
      }
    } catch (err: any) {
      setTreeError(err.message || "Failed to generate knowledge tree.");
    } finally {
      setTreeLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-4">Upload or Paste Your Syllabus</h2>
      <input
        type="file"
        accept=".pdf,image/*"
        onChange={handleFileChange}
        className="mb-4"
      />
      <div className="mb-4">or</div>
      <textarea
        value={pastedText}
        onChange={handleTextChange}
        placeholder="Paste syllabus text here..."
        rows={6}
        className="w-full border rounded p-2"
      />
      <button
        onClick={handleGenerateTree}
        disabled={!syllabusText.trim() || treeLoading}
        className="mt-4 w-full py-3 px-4 rounded-lg font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
      >
        {treeLoading ? "Generating Knowledge Tree..." : "Generate Knowledge Tree"}
      </button>
      {treeError && <div className="mt-2 text-red-600">{treeError}</div>}
      {success && <div className="mt-2 text-green-600">{success}</div>}
      {knowledgeTree && (
        <div className="mt-8">
          <h3 className="text-md font-semibold text-slate-700 mb-2">Knowledge Tree</h3>
          <KnowledgeTree knowledgeTree={knowledgeTree} syllabusContent={syllabusText} />
        </div>
      )}
    </div>
  );
} 