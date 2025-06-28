"use client";
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface SyllabusUploaderProps {
  onSyllabusUploaded?: () => void;
}

export default function SyllabusUploader({ onSyllabusUploaded }: SyllabusUploaderProps) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [syllabusText, setSyllabusText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPastedText("");
      setUploadError("");
      setUploadSuccess("");
      
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
          setUploadError("Unsupported file type. Please upload a PDF or image.");
          return;
        }
        setSyllabusText(text);
        setUploadSuccess("Syllabus text extracted successfully!");
      } catch (err: any) {
        setUploadError(err.message || "Failed to extract text from file.");
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPastedText(e.target.value);
    setSelectedFile(null);
    setUploadError("");
    setUploadSuccess("");
    setSyllabusText(e.target.value);
  };

  const handleUploadSyllabus = async () => {
    if (!user) {
      setUploadError("Please log in to upload a syllabus.");
      return;
    }

    if (!syllabusText.trim()) {
      setUploadError("Please provide syllabus content.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      // Save to Firestore
      await addDoc(collection(db, "syllabuses"), {
        userId: user.uid,
        syllabusContent: syllabusText,
        fileName: selectedFile?.name || "Pasted Text",
        createdAt: serverTimestamp(),
      });

      setUploadSuccess("Syllabus uploaded successfully! Chapter breakdown will be generated automatically.");
      
      // Clear form
      setSelectedFile(null);
      setPastedText("");
      setSyllabusText("");
      
      // Notify parent component
      if (onSyllabusUploaded) {
        onSyllabusUploaded();
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload syllabus.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Upload className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-slate-800">Upload Your Syllabus</h2>
      </div>
      
      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Upload File (PDF or Image)
          </label>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="text-center text-slate-500">or</div>

        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Paste Syllabus Text
          </label>
          <textarea
            value={pastedText}
            onChange={handleTextChange}
            placeholder="Paste your syllabus content here..."
            rows={6}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUploadSyllabus}
          disabled={!syllabusText.trim() || uploading}
          className="w-full py-3 px-4 rounded-lg font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center space-x-2"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Uploading Syllabus...</span>
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              <span>Upload Syllabus</span>
            </>
          )}
        </button>

        {/* Status Messages */}
        {uploadError && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-red-600">{uploadError}</span>
          </div>
        )}
        
        {uploadSuccess && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-green-600">{uploadSuccess}</span>
          </div>
        )}
      </div>
    </div>
  );
} 