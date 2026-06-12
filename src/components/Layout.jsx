import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ROL_LABEL = { superadmin: 'Superadmin', editor: 'Editor', usuario: 'Usuario' }
const ROL_CLASS = { superadmin: 'badge-purple', editor: 'badge-green', usuario: 'badge-blue' }

export default function Layout() {
  const { perfil, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isSA = perfil?.rol === 'superadmin'
  const isEditor = perfil?.rol === 'editor' || isSA

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <aside style={{
        width: 220, flexShrink: 0, background: 'var(--bg)',
        borderRight: '0.5px solid var(--border)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--purple)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <i className="ti ti-building-school" style={{ fontSize: 16, color: '#fff' }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>IES Inventario</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Madrid</div>
            </div>
          </div>
          {perfil && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--bg3)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 500, color: 'var(--text2)', flexShrink: 0
              }}>
                {(perfil.nombre || '?')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {perfil.nombre}
                </div>
                <span className={`badge ${ROL_CLASS[perfil.rol]}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                  {ROL_LABEL[perfil.rol]}
                </span>
              </div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: 8, overflowY: 'auto' }}>
          <NavSection label="Principal" />
          <NavItem to="/" icon="ti-layout-dashboard" label="Panel general" />
          <NavItem to="/inventario" icon="ti-boxes" label="Inventario" />
          <NavItem to="/buscar" icon="ti-search" label="Buscar" />
          {isSA && (
            <>
              <NavSection label="Administración" />
              <NavItem to="/estructura" icon="ti-sitemap" label="Estructura" />
              <NavItem to="/usuarios" icon="ti-users" label="Usuarios" />
            </>
          )}
        </nav>

        <div style={{ padding: 8, borderTop: '0.5px solid var(--border)' }}>
          <button className="btn" onClick={handleSignOut}
            style={{ width: '100%', justifyContent: 'center', fontSize: 12, color: 'var(--text2)' }}>
            <i className="ti ti-logout" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  )
}

function NavSection({ label }) {
  return (
    <div style={{ fontSize: 10, color: 'var(--text3)', padding: '8px 8px 4px',
      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </div>
  )
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink to={to} end={to === '/'} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', borderRadius: 'var(--radius)',
      fontSize: 13, color: isActive ? 'var(--text)' : 'var(--text2)',
      background: isActive ? 'var(--bg2)' : 'transparent',
      fontWeight: isActive ? 500 : 400,
      textDecoration: 'none', marginBottom: 2,
      transition: 'background 0.12s'
    })}>
      <i className={`ti ${icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
      {label}
    </NavLink>
  )
}
