import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Ajustes() {
  const [ubicaciones, setUbicaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('ubicaciones').select('*').order('nombre')
    setUbicaciones(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ nombre: '', descripcion: '' })
    setError(''); setModal('new')
  }

  function openEdit(u) {
    setForm({ nombre: u.nombre, descripcion: u.descripcion || '' })
    setError(''); setModal(u.id)
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError('')
    const payload = { nombre: form.nombre.trim(), descripcion: form.descripcion || null }
    let err
    if (modal === 'new') {
      ;({ error: err } = await supabase.from('ubicaciones').insert(payload))
    } else {
      ;({ error: err } = await supabase.from('ubicaciones').update(payload).eq('id', modal))
    }
    setSaving(false)
    if (err) { setError(err.code === '23505' ? 'Ya existe una ubicación con ese nombre.' : err.message); return }
    setModal(null); load()
  }

  async function handleToggle(id, activo) {
    await supabase.from('ubicaciones').update({ activo: !activo }).eq('id', id)
    load()
  }

  async function handleDelete(id, nombre) {
    if (!confirm(`¿Eliminar la ubicación "${nombre}"?`)) return
    const { error } = await supabase.from('ubicaciones').delete().eq('id', id)
    if (error) {
      alert('No se pudo eliminar. Es posible que haya ítems asignados a esta ubicación.')
      return
    }
    load()
  }

  if (loading) return <div className="empty-state">Cargando…</div>

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500 }}>Ajustes</h1>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Ubicaciones */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Ubicaciones físicas</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                Lista de ubicaciones disponibles al registrar ítems
              </div>
            </div>
            <button className="btn btn-primary" onClick={openNew} style={{ fontSize: 12 }}>
              <i className="ti ti-plus" aria-hidden="true" />Nueva ubicación
            </button>
          </div>

          {ubicaciones.length === 0 ? (
            <div className="empty-state">No hay ubicaciones. Añade la primera.</div>
          ) : (
            <div className="card">
              {ubicaciones.map((u, i) => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  borderBottom: i < ubicaciones.length - 1 ? '0.5px solid var(--border)' : 'none',
                  opacity: u.activo ? 1 : 0.5
                }}>
                  <i className="ti ti-map-pin" style={{ fontSize: 15, color: 'var(--text3)', flexShrink: 0 }} aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{u.nombre}</div>
                    {u.descripcion && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{u.descripcion}</div>
                    )}
                  </div>
                  {!u.activo && <span className="badge badge-gray">Inactiva</span>}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => openEdit(u)}>
                      <i className="ti ti-edit" aria-hidden="true" />
                    </button>
                    <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }}
                      onClick={() => handleToggle(u.id, u.activo)} title={u.activo ? 'Desactivar' : 'Activar'}>
                      <i className={`ti ${u.activo ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                    </button>
                    <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }}
                      onClick={() => handleDelete(u.id, u.nombre)}>
                      <i className="ti ti-trash" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info del sistema */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Sistema</div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, marginBottom: 2 }}>Centro</div>
                <div style={{ fontSize: 13 }}>IES Pío Baroja</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, marginBottom: 2 }}>Plataforma</div>
                <div style={{ fontSize: 13 }}>Supabase + Vercel</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, marginBottom: 2 }}>Versión</div>
                <div style={{ fontSize: 13 }}>1.0</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, marginBottom: 2 }}>Coste</div>
                <div style={{ fontSize: 13, color: 'var(--green-dark)' }}>Gratuito</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span>{modal === 'new' ? 'Nueva ubicación' : 'Editar ubicación'}</span>
              <button className="btn" style={{ padding: '3px 8px' }} onClick={() => setModal(null)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{ fontSize: 12, color: 'var(--red-dark)', background: 'var(--red-light)',
                  padding: '8px 12px', borderRadius: 'var(--radius)' }}>{error}</div>
              )}
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="input-field" value={form.nombre} autoFocus
                  onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
                  placeholder="Ej: Aula 2.04, Almacén planta 1…" />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input className="input-field" value={form.descripcion}
                  onChange={e => setForm(f => ({...f, descripcion: e.target.value}))}
                  placeholder="Descripción opcional" />
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
    </div>
  )
}
