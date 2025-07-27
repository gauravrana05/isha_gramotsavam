// src/app/[lang]/public/layout.tsx
import Header from '@/components/common/Header'
import Footer from '@/components/common/Footer'

export default function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { lang: string }
}) {
  return (
    <div className="min-h-screen bg-isha flex flex-col font-['FiraSans']">
      <Header lang={params.lang} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}