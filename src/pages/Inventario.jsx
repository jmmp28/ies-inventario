import { useEffect, useState, useRef } from 'react'
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
  numero_serie:'', estado:'disponible', ubicacion:'', notas:'', subcategoria_id:'', cantidad: 1 }
const EMPTY_SEL = { departamento_id:'', taller_id:'', categoria_id:'', subcategoria_id:'' }

// Genera iniciales de hasta 3 letras a partir de un nombre
function iniciales(nombre) {
  return (nombre || '')
    .split(/\s+/)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

export default function Inventario() {
  const { perfil } = useAuth()
  const canEdit = ['superadmin','editor'].includes(perfil?.rol)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroDept, setFiltroDept] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [departamentos, setDepartamentos] = useState([])
  const [talleres, setTalleres] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [talleresF, setTalleresF] = useState([])
  const [categoriasF, setCategoriasF] = useState([])
  const [subcategoriasF, setSubcategoriasF] = useState([])

  const lastSel = useRef(EMPTY_SEL)
  const codigoEditado = useRef(false) // true si el usuario tocó el código manualmente

  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_ITEM)
  const [sel, setSel] = useState(EMPTY_SEL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadItems() {
    setLoading(true)
    const { data } = await supabase.from('items').select(`
      *,
      subcategorias(nombre,
        categorias(nombre,
          talleres(nombre,
            departamentos(id, nombre)
          )
        )
      )
    `).order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function loadEstructura() {
    const [d, t, c, s] = await Promise.all([
      supabase.from('departamentos').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('talleres').select('id, nombre, departamento_id').eq('activo', true).order('nombre'),
      supabase.from('categorias').select('id, nombre, taller_id').eq('activo', true).order('nombre'),
      supabase.from('subcategorias').select('id, nombre, categoria_id').eq('activo', true).order('nombre'),
    ])
    setDepartamentos(d.data || [])
    setTalleres(t.data || [])
    setCategorias(c.data || [])
    setSubcategorias(s.data || [])
  }

  useEffect(() => { loadItems(); loadEstructura() }, [])

  // Genera código automático a partir de la selección actual
  async function generarCodigo(deptId, tallerId, catId) {
    if (!deptId || !tallerId || !catId) return ''
    const dept = departamentos.find(d => d.id === deptId)
    const taller = talleres.find(t => t.id === tallerId)
    const cat = categorias.find(c => c.id === catId)
    const prefijo = [iniciales(dept?.nombre), iniciales(taller?.nombre), iniciales(cat?.nombre)]
      .filter(Boolean).join('-')
    // Busca el último código con ese prefijo para incrementar
    const { data } = await supabase.from('items')
      .select('codigo')
      .like('codigo', `${prefijo}-%`)
      .order('codigo', { ascending: false })
      .limit(1)
    let siguiente = 1
    if (data && data.length > 0) {
      const ultimo = data[0].codigo
      const num = parseInt(ultimo.split('-').pop(), 10)
      if (!isNaN(num)) siguiente = num + 1
    }
    return `${prefijo}-${String(siguiente).padStart(4, '0')}`
  }

  function applySel(newSel) {
    setSel(newSel)
    lastSel.current = newSel
    setTalleresF(newSel.departamento_id ? talleres.filter(x => x.departamento_id === newSel.departamento_id) : [])
    setCategoriasF(newSel.taller_id ? categorias.filter(x => x.taller_id === newSel.taller_id) : [])
    setSubcategoriasF(newSel.categoria_id ? subcategorias.filter(x => x.categoria_id === newSel.categoria_id) : [])
  }

  async function onSelDept(id) {
    applySel({ departamento_id: id, taller_id:'', categoria_id:'', subcategoria_id:'' })
    setForm(f => ({ ...f, subcategoria_id: '', codigo: codigoEditado.current ? f.codigo : '' }))
  }
  async function onSelTaller(id) {
    const newSel = { ...sel, taller_id: id, categoria_id:'', subcategoria_id:'' }
    applySel(newSel)
    setForm(f => ({ ...f, subcategoria_id: '', codigo: codigoEditado.current ? f.codigo : '' }))
  }
  async function onSelCategoria(id) {
    const newSel = { ...sel, categoria_id: id, subcategoria_id:'' }
    applySel(newSel)
    setForm(f => ({ ...f, subcategoria_id: '' }))
    if (!codigoEditado.current) {
      const cod = await generarCodigo(newSel.departamento_id, newSel.taller_id, id)
      setForm(f => ({ ...f, codigo: cod }))
    }
  }
  function onSelSubcat(id) {
    applySel({ ...sel, subcategoria_id: id })
    setForm(f => ({ ...f, subcategoria_id: id }))
  }

  function openNew() {
    codigoEditado.current = false
    setForm(EMPTY_ITEM)
    setError('')
    const s = lastSel.current
    applySel(s)
    setForm(f => ({ ...f, subcategoria_id: s.subcategoria_id || '' }))
    // Si ya hay categoría seleccionada, regenerar código
    if (s.departamento_id && s.taller_id && s.categoria_id) {
      generarCodigo(s.departamento_id, s.taller_id, s.categoria_id).then(cod => {
        setForm(f => ({ ...f, subcategoria_id: s.subcategoria_id || '', codigo: cod }))
      })
    }
    setModal('new')
  }

  function openEdit(item) {
    codigoEditado.current = true // en edición no autogenerar
    setForm({ ...item, cantidad: item.cantidad || 1 })
    setError('')
    const subcat = subcategorias.find(s => s.id === item.subcategoria_id)
    const cat = subcat ? categorias.find(c => c.id === subcat.categoria_id) : null
    const taller = cat ? talleres.find(t => t.id === cat.taller_id) : null
    const dept = taller ? departamentos.find(d => d.id === taller.departamento_id) : null
    applySel({
      departamento_id: dept?.id || '',
      taller_id: taller?.id || '',
      categoria_id: cat?.id || '',
      subcategoria_id: item.subcategoria_id || ''
    })
    setModal('edit')
  }

  async function handleSave() {
    if (!form.nombre || !form.subcategoria_id) {
      setError('Nombre y subcategoría son obligatorios.'); return
    }
    setSaving(true); setError('')
    const payload = { ...form, cantidad: form.cantidad || 1 }
    delete payload.subcategorias

    // Si no hay código, generar uno
    if (!payload.codigo) {
      payload.codigo = await generarCodigo(sel.departamento_id, sel.taller_id, sel.categoria_id)
    }

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

  const filtered = items.filter(it => {
    const matchEstado = filtroEstado === 'todos' || it.estado === filtroEstado
    const matchDept = !filtroDept || it.subcategorias?.categorias?.talleres?.departamentos?.id === filtroDept
    const q = busqueda.toLowerCase()
    const matchQ = !q || it.nombre.toLowerCase().includes(q) ||
      it.codigo.toLowerCase().includes(q) || (it.ubicacion||'').toLowerCase().includes(q)
    return matchEstado && matchDept && matchQ
  })

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

      <div style={{ padding: '12px 24px', borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="input-field" placeholder="Buscar por nombre, código, ubicación…"
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: 180 }} />
        <select className="input-field" value={filtroDept}
          onChange={e => setFiltroDept(e.target.value)} style={{ width: 180 }}>
          <option value="">Todos los departamentos</option>
          {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
        <select className="input-field" value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)} style={{ width: 150 }}>
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
            <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text3)',
              borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)' }}>
              {filtered.length} ítem{filtered.length !== 1 ? 's' : ''}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Código</th><th>Nombre</th><th>Cant.</th><th>Ubicación</th>
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
                      <td style={{ textAlign: 'center', color: item.cantidad > 1 ? 'var(--text)' : 'var(--text3)' }}>
                        {item.cantidad || 1}
                      </td>
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

              <Field label="Nombre *" value={form.nombre} onChange={v => setForm(f => ({...f, nombre: v}))} />

              {/* Selector en cascada */}
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)',
                padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>
                  Ubicación en la taxonomía *
                  <span style={{ fontWeight: 400, marginLeft: 6, color: 'var(--text3)' }}>(se recuerda entre ítems)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Departamento</label>
                    <select className="input-field" value={sel.departamento_id} onChange={e => onSelDept(e.target.value)}>
                      <option value="">— Selecciona —</option>
                      {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Taller</label>
                    <select className="input-field" value={sel.taller_id}
                      onChange={e => onSelTaller(e.target.value)} disabled={!sel.departamento_id}>
                      <option value="">— Selecciona —</option>
                      {talleresF.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select className="input-field" value={sel.categoria_id}
                      onChange={e => onSelCategoria(e.target.value)} disabled={!sel.taller_id}>
                      <option value="">— Selecciona —</option>
                      {categoriasF.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subcategoría</label>
                    <select className="input-field" value={sel.subcategoria_id}
                      onChange={e => onSelSubcat(e.target.value)} disabled={!sel.categoria_id}>
                      <option value="">— Selecciona —</option>
                      {subcategoriasF.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Código y cantidad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">
                    Código
                    <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: 6 }}>
                      (automático — editable)
                    </span>
                  </label>
                  <input className="input-field" value={form.codigo || ''}
                    onChange={e => { codigoEditado.current = true; setForm(f => ({...f, codigo: e.target.value})) }}
                    placeholder="Se genera al seleccionar categoría" />
                </div>
                <div className="form-group" style={{ width: 90 }}>
                  <label className="form-label">Cantidad</label>
                  <input className="input-field" type="number" min={1} max={9999}
                    value={form.cantidad || 1}
                    onChange={e => setForm(f => ({...f, cantidad: Math.max(1, parseInt(e.target.value)||1)}))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Marca" value={form.marca} onChange={v => setForm(f => ({...f, marca: v}))} />
                <Field label="Modelo" value={form.modelo} onChange={v => setForm(f => ({...f, modelo: v}))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Núm. serie" value={form.numero_serie} onChange={v => setForm(f => ({...f, numero_serie: v}))} />
                <Field label="Ubicación física" value={form.ubicacion} onChange={v => setForm(f => ({...f, ubicacion: v}))} />
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
                <textarea className="input-field" rows={2} value={form.notas || ''}
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
