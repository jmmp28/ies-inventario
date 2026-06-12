import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const ESTADOS = ['disponible','prestamo','averia','baja','mantenimiento']
const ESTADO_BADGE = {
  disponible:    { cls: 'badge-green',  label: 'Disponible'    },
  prestamo:      { cls: 'badge-amber',  label: 'Préstamo'      },
  averia:        { cls: 'badge-red',    label: 'Avería'        },
  baja:          { cls: 'badge-gray',   label: 'Baja'          },
  mantenimiento: { cls: 'badge-blue',   label: 'Mantenimiento' },
}
const EMPTY_ITEM = { codigo:'', nombre:'', descripcion:'', marca:'', modelo:'',
  numero_serie:'', estado:'disponible', ubicacion:'', notas:'', subcategoria_id:'' }

export default function Inventario() {
  const { perfil } = useAuth()
  const canEdit = ['superadmin','editor'].includes(perfil?.rol)

  const [items, setItems] = useState([])
  const [subcats, setSubcats] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_ITEM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadItems() {
    setLoading(true)
    const { data } = await supabase.from('items').select(`
      *,
      subcategorias(nombre,
        categorias(nombre,
          talleres(nombre,
            departamentos(nombre)
          )
        )
      )
    `).order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function loadSubcats() {
    const { data } = await supabase.from('subcategorias').select(`
      id, nombre,
      categorias(nombre, talleres(nombre, departamentos(nombre)))
    `).eq('activo', true).order('nombre')
    setSubcats(data || [])
  }

  useEffect(() => { loadItems(); loadSubcats() }, [])

  const filtered = items.filter(it => {
    const matchEstado = filtroEstado === 'todos' || it.estado === filtroEstado
    const q = busqueda.toLowerCase()
    const matchQ = !q || it.nombre.toLowerCase().includes(q) ||
      it.codigo.toLowerCase().includes(q) || (it.ubicacion||'').toLowerCase().includes(q)
    return matchEstado && matchQ
  })

  function openNew() { setForm(EMPTY_ITEM); setError(''); setModal('new') }
  function openEdit(item) {
    setForm({ ...item, subcategoria_id: item.subcategoria_id || '' })
    setError(''); setModal('edit')
  }

  async function handleSave() {
    if (!form.codigo || !form.nombre || !form.subcategoria_id) {
      setError('Código, nombre y subcategoría son obligatorios.'); return
    }
    setSaving(true); setError('')
    const payload = { ...form }
    delete payload.subcategorias

    let err
    if (modal === 'new') {
      ;({ error: err } = await supabase.from('items').insert(payload))
    } else {
      ;({ error: err } = await supabase.from('items').update(payload).eq('id', form.id))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    setModal(null)
    loadItems()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este ítem? Esta acción no se puede deshacer.')) return
    await supabase.from('items').delete().eq('id', id)
    loadItems()
  }

  function subcatLabel(s) {
    const dept = s.categorias?.talleres?.departamentos?.nombre
    const taller = s.categorias?.talleres?.nombre
    const cat = s.categorias?.nombre
    return `${dept} › ${taller} › ${cat} › ${s.nombre}`
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg)', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500 }}>Inventario</h1>
        {canEdit && (
          <button className="btn btn-primary" onClick={openNew} style={{ fontSize: 12 }}>
            <i className="ti ti-plus" aria-hidden="true" />Añadir ítem
          </button>
        )}
      </div>

      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="input-field" placeholder="Buscar por nombre, código, ubicación…"
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: 200 }} />
        <select className="input-field" value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)} style={{ width: 160 }}>
          <option value="todos">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_BADGE[e].label}</option>)}
        </select>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {loading ? (
          <div className="empty-state">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-box-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} aria-hidden="true" />
            No hay ítems que coincidan
          </div>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Código</th><th>Nombre</th><th>Ubicación</th>
                  <th>Dept / Taller</th><th>Estado</th>
                  {canEdit && <th style={{ width: 80 }}></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const b = ESTADO_BADGE[item.estado] || ESTADO_BADGE.disponible
                  const dept = item.subcategorias?.categorias?.talleres?.departamentos?.nombre
                  const taller = item.subcategorias?.categorias?.talleres?.nombre
                  return (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text3)', fontFamily: 'monospace', fontSize: 12 }}>{item.codigo}</td>
                      <td style={{ fontWeight: 500 }}>{item.nombre}</td>
                      <td style={{ color: 'var(--text2)' }}>{item.ubicacion || '—'}</td>
                      <td style={{ color: 'var(--text2)', fontSize: 12 }}>
                        {dept && taller ? `${dept} › ${taller}` : '—'}
                      </td>
                      <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => openEdit(item)}>
                              <i className="ti ti-edit" aria-hidden="true" />
                            </button>
                            <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => handleDelete(item.id)}>
                              <i className="ti ti-trash" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span>{modal === 'new' ? 'Nuevo ítem' : 'Editar ítem'}</span>
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
                <Field label="Código *" value={form.codigo} onChange={v => setForm(f => ({...f, codigo: v}))} />
                <Field label="Nombre *" value={form.nombre} onChange={v => setForm(f => ({...f, nombre: v}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Subcategoría *</label>
                <select className="input-field" value={form.subcategoria_id}
                  onChange={e => setForm(f => ({...f, subcategoria_id: e.target.value}))}>
                  <option value="">— Selecciona —</option>
                  {subcats.map(s => <option key={s.id} value={s.id}>{subcatLabel(s)}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Marca" value={form.marca} onChange={v => setForm(f => ({...f, marca: v}))} />
                <Field label="Modelo" value={form.modelo} onChange={v => setForm(f => ({...f, modelo: v}))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Núm. serie" value={form.numero_serie} onChange={v => setForm(f => ({...f, numero_serie: v}))} />
                <Field label="Ubicación" value={form.ubicacion} onChange={v => setForm(f => ({...f, ubicacion: v}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="input-field" value={form.estado}
                  onChange={e => setForm(f => ({...f, estado: e.target.value}))}>
                  {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_BADGE[e].label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="input-field" rows={3} value={form.notas || ''}
                  onChange={e => setForm(f => ({...f, notas: e.target.value}))} />
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

function Field({ label, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="input-field" value={value || ''} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
