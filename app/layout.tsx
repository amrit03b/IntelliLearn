import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "../contexts/AuthContext"

export const metadata: Metadata = {
  title: "IntelliLearn - Master Your Studies, Together",
  description: "A modern learning platform that helps you master your studies with AI-powered tools and collaborative features.",
  keywords: "AI learning, collaborative study, knowledge trees, educational technology",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Libertinus+Math&display=swap" rel="stylesheet" />
      </head>
      <body className="libertinus-math-regular">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
