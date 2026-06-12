import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Buscar from './pages/Buscar'
import Estructura from './pages/Estructura'
import Usuarios from './pages/Usuarios'

function PrivateRoute({ children, roles }) {
  const { session, perfil } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (roles && perfil && !roles.includes(perfil.rol)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { session } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="buscar" element={<Buscar />} />
        <Route path="estructura" element={
          <PrivateRoute roles={['superadmin']}><Estructura /></PrivateRoute>
        } />
        <Route path="usuarios" element={
          <PrivateRoute roles={['superadmin']}><Usuarios /></PrivateRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
