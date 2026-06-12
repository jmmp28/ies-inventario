import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const ROLES = ['superadmin', 'editor', 'usuario']
const ROL_BADGE = {
  superadmin: { cls: 'badge-purple', label: 'Superadmin' },
  editor:     { cls: 'badge-green',  label: 'Editor'     },
  usuario:    { cls: 'badge-blue',   label: 'Usuario'    },
}

export default function Usuarios() {
  const { perfil: myProfile } = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [newUserModal, setNewUserModal] = useState(false)
  const [newUserForm, setNewUserForm] = useState({ email: '', password: '', nombre: '', rol: 'usuario' })
  const [newUserError, setNewUserError] = useState('')
  const [newUserSaving, setNewUserSaving] = useState(false)

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
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('perfiles').update({
      nombre: form.nombre,
      apellidos: form.apellidos || null,
      rol: form.rol,
      departamento_id: form.departamento_id || null,
      activo: form.activo
    }).eq('id', form.id)
    setSaving(false)
    setModal(null)
    load()
  }

  async function handleNewUser() {
    if (!newUserForm.email || !newUserForm.password || !newUserForm.nombre) {
      setNewUserError('Email, contraseña y nombre son obligatorios.'); return
    }
    setNewUserSaving(true); setNewUserError('')
    const { data, error } = await supabase.auth.admin.createUser({
      email: newUserForm.email,
      password: newUserForm.password,
      email_confirm: true,
      user_metadata: { nombre: newUserForm.nombre }
    })
    if (error) {
      setNewUserError('Error: ' + error.message)
      setNewUserSaving(false); return
    }
    if (newUserForm.rol !== 'usuario') {
      await supabase.from('perfiles').update({ rol: newUserForm.rol }).eq('id', data.user.id)
    }
    setNewUserSaving(false)
    setNewUserModal(false)
    setNewUserForm({ email: '', password: '', nombre: '', rol: 'usuario' })
    setTimeout(load, 800)
  }

  if (loading) return <div className="empty-state">Cargando…</div>

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500 }}>Usuarios</h1>
        <button className="btn btn-primary" onClick={() => setNewUserModal(true)} style={{ fontSize: 12 }}>
          <i className="ti ti-plus" aria-hidden="true" />Nuevo usuario
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
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
                  ['Ver inventario completo', true, true, true],
                  ['Buscar ítems', true, true, true],
                  ['Añadir / editar ítems', true, true, false],
                  ['Gestionar estructura', true, false, false],
                  ['Gestionar usuarios', true, false, false],
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

        <div className="card">
          <table>
            <thead>
              <tr><th>Usuario</th><th>Rol</th><th>Departamento</th><th>Estado</th><th style={{ width: 60 }}></th></tr>
            </thead>
            <tbody>
              {perfiles.map(p => {
                const b = ROL_BADGE[p.rol]
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{p.nombre} {p.apellidos || ''}</div>
                    </td>
                    <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{p.departamentos?.nombre || '—'}</td>
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

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span>Editar usuario</span>
              <button className="btn" style={{ padding: '3px 8px' }} onClick={() => setModal(null)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="input-field" value={form.nombre}
                    onChange={e => setForm(f => ({...f, nombre: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellidos</label>
                  <input className="input-field" value={form.apellidos}
                    onChange={e => setForm(f => ({...f, apellidos: e.target.value}))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="input-field" value={form.rol}
                  onChange={e => setForm(f => ({...f, rol: e.target.value}))}>
                  {ROLES.map(r => <option key={r} value={r}>{ROL_BADGE[r].label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Departamento</label>
                <select className="input-field" value={form.departamento_id}
                  onChange={e => setForm(f => ({...f, departamento_id: e.target.value}))}>
                  <option value="">— Sin asignar —</option>
                  {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="input-field" value={form.activo ? 'activo' : 'inactivo'}
                  onChange={e => setForm(f => ({...f, activo: e.target.value === 'activo'}))}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {newUserModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNewUserModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span>Crear nuevo usuario</span>
              <button className="btn" style={{ padding: '3px 8px' }} onClick={() => setNewUserModal(false)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body">
              {newUserError && (
                <div style={{ fontSize: 12, color: 'var(--red-dark)', background: 'var(--red-light)',
                  padding: '8px 12px', borderRadius: 'var(--radius)' }}>{newUserError}</div>
              )}
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="input-field" value={newUserForm.nombre}
                  onChange={e => setNewUserForm(f => ({...f, nombre: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="input-field" type="email" value={newUserForm.email}
                  onChange={e => setNewUserForm(f => ({...f, email: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña *</label>
                <input className="input-field" type="password" value={newUserForm.password}
                  onChange={e => setNewUserForm(f => ({...f, password: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="input-field" value={newUserForm.rol}
                  onChange={e => setNewUserForm(f => ({...f, rol: e.target.value}))}>
                  {ROLES.map(r => <option key={r} value={r}>{ROL_BADGE[r].label}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--bg2)',
                padding: '10px 12px', borderRadius: 'var(--radius)' }}>
                <i className="ti ti-info-circle" style={{ marginRight: 6 }} aria-hidden="true" />
                La creación de usuarios requiere la <strong>service_role key</strong> en producción.
                Alternativamente, los usuarios pueden registrarse desde Supabase Auth → Users.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setNewUserModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleNewUser} disabled={newUserSaving}>
                {newUserSaving ? 'Creando…' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
