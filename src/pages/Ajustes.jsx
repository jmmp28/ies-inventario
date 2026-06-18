import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Ajustes() {
  const [ubicaciones, setUbicaciones] = useState([])
  const [expanded, setExpanded] = useState({}) // qué ubicaciones tienen sublugares visibles
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  // modal: null | { tipo: 'ubicacion'|'sublugar', mode: 'new'|id, parent?: ubicacion_id }
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('ubicaciones').select(`
      *, sublugares(id, nombre, descripcion, activo)
    `).order('nombre')
    setUbicaciones(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Ubicaciones ──────────────────────────────────────────
  function openNewUbicacion() {
    setForm({ nombre: '', descripcion: '' })
    setError(''); setModal({ tipo: 'ubicacion', mode: 'new' })
  }
  function openEditUbicacion(u) {
    setForm({ nombre: u.nombre, descripcion: u.descripcion || '' })
    setError(''); setModal({ tipo: 'ubicacion', mode: u.id })
  }
  async function handleToggleUbicacion(id, activo) {
    await supabase.from('ubicaciones').update({ activo: !activo }).eq('id', id)
    load()
  }
  async function handleDeleteUbicacion(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}" y todos sus sublugares?`)) return
    const { error } = await supabase.from('ubicaciones').delete().eq('id', id)
    if (error) { alert('No se pudo eliminar. Puede haber ítems asignados a esta ubicación.'); return }
    load()
  }

  // ── Sublugares ───────────────────────────────────────────
  function openNewSublugar(ubicacion_id) {
    setForm({ nombre: '', descripcion: '' })
    setError(''); setModal({ tipo: 'sublugar', mode: 'new', parent: ubicacion_id })
  }
  function openEditSublugar(s, ubicacion_id) {
    setForm({ nombre: s.nombre, descripcion: s.descripcion || '' })
    setError(''); setModal({ tipo: 'sublugar', mode: s.id, parent: ubicacion_id })
  }
  async function handleToggleSublugar(id, activo) {
    await supabase.from('sublugares').update({ activo: !activo }).eq('id', id)
    load()
  }
  async function handleDeleteSublugar(id, nombre) {
    if (!confirm(`¿Eliminar el sublugar "${nombre}"?`)) return
    await supabase.from('sublugares').delete().eq('id', id)
    load()
  }

  // ── Guardar (ubicación o sublugar) ───────────────────────
  async function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError('')
    const { tipo, mode, parent } = modal
    const payload = { nombre: form.nombre.trim(), descripcion: form.descripcion || null }
    let err

    if (tipo === 'ubicacion') {
      if (mode === 'new') {
        ;({ error: err } = await supabase.from('ubicaciones').insert(payload))
      } else {
        ;({ error: err } = await supabase.from('ubicaciones').update(payload).eq('id', mode))
      }
    } else {
      if (mode === 'new') {
        ;({ error: err } = await supabase.from('sublugares').insert({ ...payload, ubicacion_id: parent }))
      } else {
        ;({ error: err } = await supabase.from('sublugares').update(payload).eq('id', mode))
      }
    }

    setSaving(false)
    if (err) {
      setError(err.code === '23505' ? 'Ya existe un elemento con ese nombre en esta ubicación.' : err.message)
      return
    }
    // Auto-expandir la ubicación padre al añadir sublugar
    if (tipo === 'sublugar' && mode === 'new') setExpanded(e => ({ ...e, [parent]: true }))
    setModal(null); load()
  }

  function toggleExpand(id) {
    setExpanded(e => ({ ...e, [id]: !e[id] }))
  }

  if (loading) return <div className="empty-state">Cargando…</div>

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500 }}>Ajustes</h1>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Ubicaciones y sublugares */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Ubicaciones físicas</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                Lugares y sublugares disponibles al registrar ítems
              </div>
            </div>
            <button className="btn btn-primary" onClick={openNewUbicacion} style={{ fontSize: 12 }}>
              <i className="ti ti-plus" aria-hidden="true" />Nueva ubicación
            </button>
          </div>

          {ubicaciones.length === 0 ? (
            <div className="empty-state">No hay ubicaciones. Añade la primera.</div>
          ) : (
            <div className="card">
              {ubicaciones.map((u, i) => {
                const subs = u.sublugares || []
                const isOpen = expanded[u.id]
                return (
                  <div key={u.id}>
                    {/* Fila de ubicación */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px',
                      borderBottom: (!isOpen || subs.length === 0) && i < ubicaciones.length - 1
                        ? '0.5px solid var(--border)' : 'none',
                      opacity: u.activo ? 1 : 0.5,
                      background: 'var(--bg2)'
                    }}>
                      {/* Toggle expandir */}
                      <button onClick={() => toggleExpand(u.id)} style={{
                        background: 'none', border: 'none', padding: '2px 4px',
                        cursor: subs.length > 0 ? 'pointer' : 'default',
                        color: 'var(--text3)', flexShrink: 0
                      }}>
                        <i className={`ti ${subs.length > 0 ? (isOpen ? 'ti-chevron-down' : 'ti-chevron-right') : 'ti-point'}`}
                          style={{ fontSize: 13 }} aria-hidden="true" />
                      </button>
                      <i className="ti ti-map-pin" style={{ fontSize: 15, color: 'var(--text2)', flexShrink: 0 }} aria-hidden="true" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{u.nombre}</span>
                        {subs.length > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
                            {subs.length} sublugar{subs.length !== 1 ? 'es' : ''}
                          </span>
                        )}
                        {u.descripcion && (
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{u.descripcion}</div>
                        )}
                      </div>
                      {!u.activo && <span className="badge badge-gray">Inactiva</span>}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => openNewSublugar(u.id)} title="Añadir sublugar">
                          <i className="ti ti-plus" aria-hidden="true" />Sublugar
                        </button>
                        <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => openEditUbicacion(u)}>
                          <i className="ti ti-edit" aria-hidden="true" />
                        </button>
                        <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => handleToggleUbicacion(u.id, u.activo)}>
                          <i className={`ti ${u.activo ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => handleDeleteUbicacion(u.id, u.nombre)}>
                          <i className="ti ti-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Sublugares expandidos */}
                    {isOpen && subs.map((s, j) => (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px 8px 44px',
                        borderBottom: (j < subs.length - 1 || i < ubicaciones.length - 1)
                          ? '0.5px solid var(--border)' : 'none',
                        opacity: s.activo ? 1 : 0.5
                      }}>
                        <i className="ti ti-corner-down-right" style={{ fontSize: 13, color: 'var(--text3)', flexShrink: 0 }} aria-hidden="true" />
                        <i className="ti ti-map-pin-2" style={{ fontSize: 14, color: 'var(--text3)', flexShrink: 0 }} aria-hidden="true" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13 }}>{s.nombre}</span>
                          {s.descripcion && (
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{s.descripcion}</div>
                          )}
                        </div>
                        {!s.activo && <span className="badge badge-gray">Inactivo</span>}
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => openEditSublugar(s, u.id)}>
                            <i className="ti ti-edit" aria-hidden="true" />
                          </button>
                          <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => handleToggleSublugar(s.id, s.activo)}>
                            <i className={`ti ${s.activo ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                          </button>
                          <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => handleDeleteSublugar(s.id, s.nombre)}>
                            <i className="ti ti-trash" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
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

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span>
                {modal.mode === 'new'
                  ? `Nueva ${modal.tipo === 'ubicacion' ? 'ubicación' : 'sublugar'}`
                  : `Editar ${modal.tipo === 'ubicacion' ? 'ubicación' : 'sublugar'}`}
              </span>
              <button className="btn" style={{ padding: '3px 8px' }} onClick={() => setModal(null)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{ fontSize: 12, color: 'var(--red-dark)', background: 'var(--red-light)',
                  padding: '8px 12px', borderRadius: 'var(--radius)' }}>{error}</div>
              )}
              {modal.tipo === 'sublugar' && modal.mode === 'new' && (
                <div style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg2)',
                  padding: '8px 12px', borderRadius: 'var(--radius)' }}>
                  <i className="ti ti-map-pin" style={{ marginRight: 6 }} aria-hidden="true" />
                  Sublugar de: <strong>{ubicaciones.find(u => u.id === modal.parent)?.nombre}</strong>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="input-field" value={form.nombre} autoFocus
                  onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
                  placeholder={modal.tipo === 'ubicacion' ? 'Ej: Taller MBE, Almacén planta 1…' : 'Ej: Armario 01, Estantería A…'} />
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
