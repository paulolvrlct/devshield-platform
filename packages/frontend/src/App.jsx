import { Routes, Route, Navigate } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard/index.jsx'
import OnboardingForm from './pages/Onboarding/index.jsx'
import Submissions from './pages/Onboarding/Submissions.jsx'
import ClientsPage from './pages/Clients/index.jsx'
import InvoicesPage from './pages/Invoices/index.jsx'
import AuditPage from './pages/Audit/index.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Route publique — formulaire d'onboarding */}
      <Route path="/onboarding" element={<OnboardingForm />} />
      {/* Routes protégées (admin) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/onboarding"
        element={
          <ProtectedRoute>
            <Layout>
              <Submissions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clients"
        element={
          <ProtectedRoute>
            <Layout>
              <ClientsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/invoices"
        element={
          <ProtectedRoute>
            <Layout>
              <InvoicesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audits"
        element={
          <ProtectedRoute>
            <Layout>
              <AuditPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
