// src/app/[lang]/public/layout.tsx
import Header from '@/components/common/Header'
import Footer from '@/components/common/Footer'
import { PublicOfflineProvider } from '@/context/PublicOfflineContext'
import { PublicOfflineIndicator } from '@/components/public/PublicOfflineIndicator'

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { lang: string }
}) {
  const {lang} = await params;
  return (
    <PublicOfflineProvider>
      <div className="min-h-screen bg-isha flex flex-col font-['FiraSans']"> 
        {/* Offline Status Indicator */}
        <PublicOfflineIndicator />
        
        <Header lang={lang} />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </PublicOfflineProvider>
  )
}