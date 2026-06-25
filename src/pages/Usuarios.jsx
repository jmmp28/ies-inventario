import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const ROLES = ['superadmin', 'editor', 'usuario']
const ROL_BADGE = {
  superadmin: { cls: 'badge-purple', label: 'Superadmin' },
  editor:     { cls: 'badge-green',  label: 'Editor'     },
  usuario:    { cls: 'badge-blue',   label: 'Usuario'    },
}

const SUPABASE_URL = 'https://lhwfuwmbdtsaoudsocwj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod2Z1d21iZHRzYW91ZHNvY3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjk1NzgsImV4cCI6MjA5NjcwNTU3OH0.rInxGwebKbmw_yc69Z-32RqMe6l3QPl8KAGdvCg3W2k'

export default function Usuarios() {
  const { perfil: myProfile } = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState(null) // email del último usuario creado

  async function load() {
    setLoading(true)
    const [p, d] = await Promise.all([
      supabase.from('perfiles').select('*, departamentos(nombre)').order('nombre'),
      supabase.from('departamentos').select('id, nombre').eq('activo', true).order('nombre')
    ])
    setPerfiles(p.data || [])
    setDepartamentos(d.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openEdit(p) {
    setForm({ id: p.id, nombre: p.nombre, apellidos: p.apellidos || '',
      rol: p.rol, departamento_id: p.departamento_id || '', activo: p.activo })
    setError(''); setModal('edit')
  }

  function openNew() {
    setForm({ nombre: '', apellidos: '', email: '', password: '', rol: 'usuario', departamento_id: '' })
    setError(''); setNuevoEmail(null); setModal('new')
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (form.rol === 'usuario' && !form.departamento_id) {
      setError('Los usuarios con rol "Usuario" deben tener un departamento asignado.'); return
    }
    setSaving(true); setError('')

    if (modal === 'new') {
      if (!form.email || !form.password) {
        setError('Email y contraseña son obligatorios.'); setSaving(false); return
      }

      // Crear en Supabase Auth
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: form.email, password: form.password })
      })
      const data = await res.json()

      if (!data.id) {
        setError('Error: ' + (data.msg || data.error_description || JSON.stringify(data)))
        setSaving(false); return
      }

      // Actualizar perfil con nombre, rol y departamento
      await supabase.from('perfiles').upsert({
        id: data.id,
        nombre: form.nombre.trim(),
        apellidos: form.apellidos || null,
        rol: form.rol,
        departamento_id: form.departamento_id || null,
        activo: true
      })

      // Confirmar email automáticamente via RPC
      await supabase.rpc('confirm_user_email', { user_id: data.id }).catch(() => {})

      setSaving(false)
      setModal(null)
      setNuevoEmail(null) // ya no hace falta el aviso
      load()

    } else {
      const { error: err } = await supabase.from('perfiles').update({
        nombre: form.nombre.trim(),
        apellidos: form.apellidos || null,
        rol: form.rol,
        departamento_id: form.departamento_id || null,
        activo: form.activo
      }).eq('id', form.id)
      setSaving(false)
      if (err) { setError(err.message); return }
      setModal(null)
      load()
    }
  }

  if (loading) return <div className="empty-state">Cargando…</div>

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500 }}>Usuarios</h1>
        <button className="btn btn-primary" onClick={openNew} style={{ fontSize: 12 }}>
          <i className="ti ti-plus" aria-hidden="true" />Nuevo usuario
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Aviso tras crear usuario — muestra SQL a ejecutar */}
        {nuevoEmail && (
          <div style={{ background: 'var(--amber-light)', border: '0.5px solid var(--amber-dark)',
            borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--amber-dark)', marginBottom: 6 }}>
              <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} aria-hidden="true" />
              Usuario creado — falta activarlo
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
              Ve a <strong>Supabase → SQL Editor</strong> y ejecuta esto para que pueda iniciar sesión:
            </div>
            <code style={{ display: 'block', padding: '8px 12px', background: 'var(--bg)',
              borderRadius: 4, fontFamily: 'monospace', fontSize: 12,
              border: '0.5px solid var(--border)', userSelect: 'all' }}>
              UPDATE auth.users SET email_confirmed_at = now() WHERE email = '{nuevoEmail}';
            </code>
            <button className="btn" style={{ marginTop: 10, fontSize: 11 }}
              onClick={() => setNuevoEmail(null)}>
              Entendido
            </button>
          </div>
        )}

        {/* Tabla de permisos */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>Permisos por rol</div>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Permiso</th>
                  <th style={{ textAlign: 'center' }}>Superadmin</th>
                  <th style={{ textAlign: 'center' }}>Editor</th>
                  <th style={{ textAlign: 'center' }}>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Ver inventario completo',       true,  true,  false],
                  ['Ver inventario de su depto.',   true,  true,  true ],
                  ['Buscar ítems',                  true,  true,  true ],
                  ['Añadir / editar ítems',         true,  true,  false],
                  ['Exportar a Excel / CSV',         true,  true,  false],
                  ['Gestionar estructura',           true,  false, false],
                  ['Gestionar usuarios',             true,  false, false],
                ].map(([perm, sa, ed, us]) => (
                  <tr key={perm}>
                    <td style={{ fontSize: 13 }}>{perm}</td>
                    {[sa, ed, us].map((v, i) => (
                      <td key={i} style={{ textAlign: 'center' }}>
                        <i className={`ti ${v ? 'ti-check' : 'ti-x'}`}
                          style={{ color: v ? 'var(--green-dark)' : 'var(--red-dark)', fontSize: 14 }}
                          aria-label={v ? 'sí' : 'no'} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lista de usuarios */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>
            Usuarios ({perfiles.length})
          </div>
          <div className="card">
            <table>
              <thead>
                <tr><th>Nombre</th><th>Rol</th><th>Departamento</th><th>Estado</th><th style={{ width: 60 }}></th></tr>
              </thead>
              <tbody>
                {perfiles.map(p => {
                  const b = ROL_BADGE[p.rol]
                  const sinDepto = p.rol === 'usuario' && !p.departamento_id
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{p.nombre} {p.apellidos || ''}</td>
                      <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                      <td>
                        {sinDepto ? (
                          <span style={{ fontSize: 12, color: 'var(--red-dark)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} aria-hidden="true" />Sin asignar
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text2)', fontSize: 12 }}>{p.departamentos?.nombre || '—'}</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${p.activo ? 'badge-green' : 'badge-gray'}`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => openEdit(p)} disabled={p.id === myProfile?.id}>
                          <i className="ti ti-edit" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span>{modal === 'new' ? 'Nuevo usuario' : 'Editar usuario'}</span>
              <button className="btn" style={{ padding: '3px 8px' }} onClick={() => setModal(null)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{ fontSize: 12, color: 'var(--red-dark)', background: 'var(--red-light)',
                  padding: '8px 12px', borderRadius: 'var(--radius)' }}>{error}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Nombre *" value={form.nombre} onChange={v => setForm(f => ({...f, nombre: v}))} />
                <Field label="Apellidos" value={form.apellidos} onChange={v => setForm(f => ({...f, apellidos: v}))} />
              </div>
              {modal === 'new' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Email *" value={form.email} type="email" onChange={v => setForm(f => ({...f, email: v}))} />
                  <Field label="Contraseña *" value={form.password} type="password" onChange={v => setForm(f => ({...f, password: v}))} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="input-field" value={form.rol}
                    onChange={e => setForm(f => ({...f, rol: e.target.value, departamento_id: e.target.value !== 'usuario' ? '' : f.departamento_id}))}>
                    {ROLES.map(r => <option key={r} value={r}>{ROL_BADGE[r].label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Departamento
                    {form.rol === 'usuario'
                      ? <span style={{ color: 'var(--red-dark)', marginLeft: 3 }}>*</span>
                      : <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 4 }}>(opcional)</span>}
                  </label>
                  <select className="input-field" value={form.departamento_id}
                    onChange={e => setForm(f => ({...f, departamento_id: e.target.value}))}>
                    <option value="">— Sin asignar —</option>
                    {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>
              </div>
              {form.rol === 'usuario' && !form.departamento_id && (
                <div style={{ fontSize: 12, color: 'var(--amber-dark)', background: 'var(--amber-light)',
                  padding: '8px 12px', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-alert-triangle" aria-hidden="true" />
                  Sin departamento este usuario no verá ningún ítem.
                </div>
              )}
              {modal === 'edit' && (
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="input-field" value={form.activo ? 'activo' : 'inactivo'}
                    onChange={e => setForm(f => ({...f, activo: e.target.value === 'activo'}))}>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Creando…' : modal === 'new' ? 'Crear usuario' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="input-field" type={type} value={value || ''} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
