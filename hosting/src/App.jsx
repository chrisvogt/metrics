import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { Layout } from './layout/Layout'
import { AuthSection } from './sections/AuthSection'
import { ApiTestingSection } from './sections/ApiTestingSection'
import FloatingLines from './components/FloatingLines'

function AppContent() {
  const { user, loading } = useAuth()
  const [activeSection, setActiveSection] = useState('auth')

  // When user logs in, switch to API page (not auth)
  useEffect(() => {
    if (user && activeSection === 'auth') setActiveSection('api')
  }, [user, activeSection])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" aria-hidden />
        <span style={{ marginLeft: 12 }}>Loading…</span>
      </div>
    )
  }

  return (
    <Layout
      user={user}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {!user ? (
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
            <FloatingLines
              enabledWaves={['top', 'middle', 'bottom']}
              lineCount={5}
              lineDistance={5}
              bendRadius={5}
              bendStrength={-0.5}
              interactive={true}
              parallax={true}
            />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <AuthSection />
          </div>
        </>
      ) : (
        <ApiTestingSection activeSection={activeSection} />
      )}
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
