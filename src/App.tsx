import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
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
      <Routes>
        <Route path="/" element={<Layout />}>
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
    </BrowserRouter>
  )
}
