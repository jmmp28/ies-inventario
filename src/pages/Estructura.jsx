import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TIPO_LABEL = { departamentos:'Departamento', talleres:'Taller', categorias:'Categoría', subcategorias:'Subcategoría' }

export default function Estructura() {
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('departamentos').select(`
      id, nombre, descripcion, activo,
      talleres(id, nombre, ubicacion, activo,
        categorias(id, nombre, activo,
          subcategorias(id, nombre, activo)
        )
      )
    `).order('nombre')
    setTree(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openModal(tipo, parent = null, item = null) {
    setForm(item ? { nombre: item.nombre, descripcion: item.descripcion || '', ubicacion: item.ubicacion || '' }
      : { nombre: '', descripcion: '', ubicacion: '' })
    setModal({ tipo, parent, item })
  }

  async function handleSave() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const { tipo, parent, item } = modal
    const payload = { nombre: form.nombre.trim(), descripcion: form.descripcion || null }
    if (tipo === 'talleres') payload.ubicacion = form.ubicacion || null

    if (item) {
      await supabase.from(tipo).update(payload).eq('id', item.id)
    } else {
      const fk = { departamentos: null, talleres: 'departamento_id',
        categorias: 'taller_id', subcategorias: 'categoria_id' }
      if (fk[tipo]) payload[fk[tipo]] = parent
      await supabase.from(tipo).insert(payload)
    }
    setSaving(false)
    setModal(null)
    load()
  }

  async function handleToggle(tipo, id, activo) {
    await supabase.from(tipo).update({ activo: !activo }).eq('id', id)
    load()
  }

  // Cuenta cuántos ítems/elementos hijos cuelgan de un nodo (para el mensaje de confirmación)
  function countDescendants(tipo, node) {
    let talleres = 0, categorias = 0, subcategorias = 0, items = 0
    function countItems(sub) { items += (sub._itemsCount || 0) }
    if (tipo === 'departamentos') {
      talleres = node.talleres?.length || 0
      node.talleres?.forEach(t => {
        categorias += t.categorias?.length || 0
        t.categorias?.forEach(c => subcategorias += c.subcategorias?.length || 0)
      })
    } else if (tipo === 'talleres') {
      categorias = node.categorias?.length || 0
      node.categorias?.forEach(c => subcategorias += c.subcategorias?.length || 0)
    } else if (tipo === 'categorias') {
      subcategorias = node.subcategorias?.length || 0
    }
    return { talleres, categorias, subcategorias }
  }

  async function handleDelete(tipo, node) {
    const { talleres, categorias, subcategorias } = countDescendants(tipo, node)
    const partes = []
    if (talleres) partes.push(`${talleres} taller${talleres !== 1 ? 'es' : ''}`)
    if (categorias) partes.push(`${categorias} categoría${categorias !== 1 ? 's' : ''}`)
    if (subcategorias) partes.push(`${subcategorias} subcategoría${subcategorias !== 1 ? 's' : ''}`)

    let msg = `¿Eliminar "${node.nombre}"?`
    if (partes.length > 0) {
      msg += `\n\nEsto eliminará también: ${partes.join(', ')}.`
    }
    msg += '\n\nSi hay ítems del inventario dentro de esta rama, no se podrá eliminar hasta moverlos o borrarlos primero.'

    if (!confirm(msg)) return

    const { error } = await supabase.from(tipo).delete().eq('id', node.id)
    if (error) {
      if (error.code === '23503') {
        setDeleteError(
          `No se puede eliminar "${node.nombre}" porque todavía hay ítems del inventario asociados a esta rama. ` +
          `Mueve o elimina esos ítems desde Inventario antes de borrar esta entrada.`
        )
      } else {
        setDeleteError(`Error al eliminar: ${error.message}`)
      }
      return
    }
    setDeleteError(null)
    load()
  }

  if (loading) return <div className="empty-state">Cargando…</div>

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500 }}>Estructura del inventario</h1>
        <button className="btn btn-primary" onClick={() => openModal('departamentos')} style={{ fontSize: 12 }}>
          <i className="ti ti-plus" aria-hidden="true" />Departamento
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {deleteError && (
          <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--red-dark)', background: 'var(--red-light)',
            padding: '10px 14px', borderRadius: 'var(--radius)', display: 'flex',
            alignItems: 'flex-start', gap: 8 }}>
            <i className="ti ti-alert-triangle" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <div style={{ flex: 1 }}>{deleteError}</div>
            <button className="btn" style={{ padding: '2px 8px', fontSize: 11, flexShrink: 0 }}
              onClick={() => setDeleteError(null)}>
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>
        )}

        {tree.length === 0 && <div className="empty-state">Sin departamentos. Añade el primero.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tree.map(dept => (
            <div key={dept.id} className="card">
              <TreeRow
                icon="ti-building" label={dept.nombre} tipo="Departamento"
                activo={dept.activo}
                onEdit={() => openModal('departamentos', null, dept)}
                onToggle={() => handleToggle('departamentos', dept.id, dept.activo)}
                onDelete={() => handleDelete('departamentos', dept)}
                onAdd={() => openModal('talleres', dept.id)}
                addLabel="Taller"
                depth={0}
              />
              {dept.talleres?.map(taller => (
                <div key={taller.id}>
                  <TreeRow
                    icon="ti-tool" label={taller.nombre}
                    sub={taller.ubicacion} tipo="Taller"
                    activo={taller.activo}
                    onEdit={() => openModal('talleres', dept.id, taller)}
                    onToggle={() => handleToggle('talleres', taller.id, taller.activo)}
                    onDelete={() => handleDelete('talleres', taller)}
                    onAdd={() => openModal('categorias', taller.id)}
                    addLabel="Categoría"
                    depth={1}
                  />
                  {taller.categorias?.map(cat => (
                    <div key={cat.id}>
                      <TreeRow
                        icon="ti-tag" label={cat.nombre} tipo="Categoría"
                        activo={cat.activo}
                        onEdit={() => openModal('categorias', taller.id, cat)}
                        onToggle={() => handleToggle('categorias', cat.id, cat.activo)}
                        onDelete={() => handleDelete('categorias', cat)}
                        onAdd={() => openModal('subcategorias', cat.id)}
                        addLabel="Subcategoría"
                        depth={2}
                      />
                      {cat.subcategorias?.map(sub => (
                        <TreeRow
                          key={sub.id}
                          icon="ti-point" label={sub.nombre} tipo="Subcategoría"
                          activo={sub.activo}
                          onEdit={() => openModal('subcategorias', cat.id, sub)}
                          onToggle={() => handleToggle('subcategorias', sub.id, sub.activo)}
                          onDelete={() => handleDelete('subcategorias', sub)}
                          depth={3}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span>{modal.item ? 'Editar' : 'Nuevo'} {TIPO_LABEL[modal.tipo]}</span>
              <button className="btn" style={{ padding: '3px 8px' }} onClick={() => setModal(null)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="input-field" value={form.nombre}
                  onChange={e => setForm(f => ({...f, nombre: e.target.value}))} autoFocus />
              </div>
              {modal.tipo === 'talleres' && (
                <div className="form-group">
                  <label className="form-label">Ubicación</label>
                  <input className="input-field" value={form.ubicacion || ''}
                    onChange={e => setForm(f => ({...f, ubicacion: e.target.value}))}
                    placeholder="Ej: Planta 2, aula 2.04" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="input-field" rows={2} value={form.descripcion || ''}
                  onChange={e => setForm(f => ({...f, descripcion: e.target.value}))} />
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

function TreeRow({ icon, label, sub, tipo, activo, onEdit, onToggle, onDelete, onAdd, addLabel, depth }) {
  const pad = depth * 20
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: `9px 14px 9px ${14 + pad}px`,
      borderBottom: '0.5px solid var(--border)',
      opacity: activo ? 1 : 0.5
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 14, color: 'var(--text3)', flexShrink: 0 }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: depth === 0 ? 500 : 400 }}>{label}</span>
        {sub && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>{sub}</span>}
        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>({tipo})</span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {onAdd && (
          <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={onAdd}>
            <i className="ti ti-plus" aria-hidden="true" />{addLabel}
          </button>
        )}
        <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={onEdit}>
          <i className="ti ti-edit" aria-hidden="true" />
        </button>
        <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={onToggle}
          title={activo ? 'Desactivar' : 'Activar'}>
          <i className={`ti ${activo ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
        </button>
        <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={onDelete}
          title="Eliminar">
          <i className="ti ti-trash" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
