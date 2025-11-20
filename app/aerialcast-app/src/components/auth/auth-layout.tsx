import type { ReactNode } from "react"
import Link from "next/link"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  alternateLink: {
    href: string
    text: string
    question: string
  }
}

export function AuthLayout({ children, title, subtitle, alternateLink }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center px-4 py-12">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-xl shadow-2xl backdrop-blur-sm p-8 mb-6">{children}</div>

        {/* Alternate Link */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            {alternateLink.question}{" "}
            <Link href={alternateLink.href} className="text-primary hover:text-accent font-semibold transition-colors">
              {alternateLink.text}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
