import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ROL_LABEL = { superadmin: 'Superadmin', editor: 'Editor', usuario: 'Usuario' }
const ROL_CLASS = { superadmin: 'badge-purple', editor: 'badge-green', usuario: 'badge-blue' }

export default function Layout() {
  const { perfil, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isSA = perfil?.rol === 'superadmin'

  function closMenu() { setMenuOpen(false) }

  const sidebarContent = (
    <>
      {/* Header del sidebar */}
      <div style={{
        padding: '16px',
        borderBottom: '0.5px solid rgba(255,255,255,0.15)',
        background: 'var(--green-corp-dark)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <i className="ti ti-building-school" style={{ fontSize: 18, color: '#fff' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>IES Pío Baroja</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>Sistema de Inventario</div>
          </div>
        </div>

        {perfil && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.10)',
            borderRadius: 8, padding: '8px 10px'
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0
            }}>
              {(perfil.nombre || '?')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {perfil.nombre}
              </div>
              <span className={`badge ${ROL_CLASS[perfil.rol]}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                {ROL_LABEL[perfil.rol]}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav style={{ flex: 1, padding: 8, overflowY: 'auto', background: 'var(--green-corp)' }}>
        <NavSection label="Principal" />
        <NavItem to="/" icon="ti-layout-dashboard" label="Panel general" onClick={closMenu} />
        <NavItem to="/inventario" icon="ti-boxes" label="Inventario" onClick={closMenu} />
        <NavItem to="/buscar" icon="ti-search" label="Buscar" onClick={closMenu} />
        {isSA && (
          <>
            <NavSection label="Administración" />
            <NavItem to="/estructura" icon="ti-sitemap" label="Estructura" onClick={closMenu} />
            <NavItem to="/usuarios" icon="ti-users" label="Usuarios" onClick={closMenu} />
              <NavItem to="/ajustes" icon="ti-settings" label="Ajustes" onClick={closMenu} />
          </>
        )}
      </nav>

      {/* Cerrar sesión */}
      <div style={{ padding: 8, borderTop: '0.5px solid rgba(255,255,255,0.15)', background: 'var(--green-corp)' }}>
        <button onClick={handleSignOut} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: '8px', borderRadius: 'var(--radius)',
          border: '0.5px solid rgba(255,255,255,0.20)',
          background: 'transparent', color: 'rgba(255,255,255,0.75)',
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit'
        }}>
          <i className="ti ti-logout" aria-hidden="true" />Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar desktop (≥768px) */}
      <aside style={{
        width: 220, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--green-corp)'
      }} className="sidebar-desktop">
        {sidebarContent}
      </aside>

      {/* Overlay móvil */}
      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={closMenu}
        />
      )}

      {/* Sidebar móvil (drawer) */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 240, zIndex: 50,
        display: 'flex', flexDirection: 'column',
        background: 'var(--green-corp)',
        transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease'
      }} className="sidebar-mobile">
        {sidebarContent}
      </aside>

      {/* Contenido principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar móvil con hamburguesa */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px',
          background: 'var(--green-corp-dark)',
          borderBottom: '0.5px solid rgba(255,255,255,0.10)'
        }} className="mobile-topbar">
          <button onClick={() => setMenuOpen(m => !m)} style={{
            background: 'transparent', border: 'none', color: '#fff',
            fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1,
            display: 'flex', alignItems: 'center'
          }} aria-label="Abrir menú">
            <i className="ti ti-menu-2" aria-hidden="true" />
          </button>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>IES Pío Baroja</div>
        </div>

        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .sidebar-desktop { display: flex !important; }
          .sidebar-mobile { display: none !important; }
          .mobile-topbar { display: none !important; }
        }
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile { display: flex !important; }
          .mobile-topbar { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

function NavSection({ label }) {
  return (
    <div style={{
      fontSize: 10, color: 'rgba(255,255,255,0.5)',
      padding: '10px 10px 4px',
      textTransform: 'uppercase', letterSpacing: '0.08em'
    }}>
      {label}
    </div>
  )
}

function NavItem({ to, icon, label, onClick }) {
  return (
    <NavLink to={to} end={to === '/'} onClick={onClick} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 'var(--radius)',
      fontSize: 13,
      color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
      background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
      fontWeight: isActive ? 500 : 400,
      textDecoration: 'none', marginBottom: 2,
      transition: 'background 0.12s'
    })}>
      <i className={`ti ${icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
      {label}
    </NavLink>
  )
}
