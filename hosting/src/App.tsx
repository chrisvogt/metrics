import { useState, useEffect, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { Layout } from './layout/Layout'
import type { SectionId } from './layout/Layout'
import { AuthSection } from './sections/AuthSection'
import { ApiTestingSection } from './sections/ApiTestingSection'
import { SchemaSection } from './sections/SchemaSection'
import { StatusSection } from './sections/StatusSection'

const FloatingLines = lazy(() => import('./components/FloatingLines'))

function AppContent() {
  const { user, loading } = useAuth()
  const [activeSection, setActiveSection] = useState<SectionId>('schema')

  useEffect(() => {
    if (!user && (activeSection === 'api' || activeSection === 'sync')) {
      setActiveSection('schema')
    }
  }, [user, activeSection])

  useEffect(() => {
    if (user && activeSection === 'auth') {
      setActiveSection('schema')
    }
  }, [user, activeSection])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" aria-hidden />
        <span style={{ marginLeft: 12 }}>Loading…</span>
      </div>
    )
  }

  const mainContent =
    activeSection === 'auth' && !user ? (
      <>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            width: '100%',
            height: '100%',
          }}
          aria-hidden
        >
          <Suspense fallback={null}>
            <FloatingLines
              enabledWaves={['top', 'middle', 'bottom']}
              lineCount={5}
              lineDistance={5}
              bendRadius={5}
              bendStrength={-0.5}
              interactive={true}
              parallax={true}
            />
          </Suspense>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <AuthSection />
        </div>
      </>
    ) : activeSection === 'schema' ? (
      <SchemaSection />
    ) : activeSection === 'status' ? (
      <StatusSection />
    ) : user ? (
      <ApiTestingSection activeSection={activeSection} />
    ) : null

  return (
    <Layout user={user} activeSection={activeSection} onSectionChange={setActiveSection}>
      {mainContent}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
