import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { Layout } from './layout/Layout'
import { AuthSection } from './sections/AuthSection'
import { ApiTestingSection } from './sections/ApiTestingSection'

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
        <AuthSection />
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
