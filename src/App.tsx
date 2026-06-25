import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import SignIn from './pages/SignIn'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Content from './pages/Content'
import Releases from './pages/Releases'
import Accountability from './pages/Accountability'
import Revenue from './pages/Revenue'
import Milestones from './pages/Milestones'
import Suggestions from './pages/Suggestions'
import Connections from './pages/Connections'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="content" element={<Content />} />
            <Route path="releases" element={<Releases />} />
            <Route path="accountability" element={<Accountability />} />
            <Route path="revenue" element={<Revenue />} />
            <Route path="milestones" element={<Milestones />} />
            <Route path="suggestions" element={<Suggestions />} />
            <Route path="connections" element={<Connections />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
