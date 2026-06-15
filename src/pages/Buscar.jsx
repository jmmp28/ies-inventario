import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ESTADOS = ['disponible','prestamo','averia','baja','mantenimiento']
const ESTADO_BADGE = {
  disponible:    { cls: 'badge-green',  label: 'Disponible'    },
  prestamo:      { cls: 'badge-amber',  label: 'Préstamo'      },
  averia:        { cls: 'badge-red',    label: 'Avería'        },
  baja:          { cls: 'badge-gray',   label: 'Baja'          },
  mantenimiento: { cls: 'badge-blue',   label: 'Mantenimiento' },
}

export default function Buscar() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  // Filtros
  const [departamentos, setDepartamentos] = useState([])
  const [talleres, setTalleres] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [filtroDept, setFiltroDept] = useState('')
  const [filtroCat, setFiltroCat] = useState('')
  const [filtroSubcat, setFiltroSubcat] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => {
    async function load() {
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
    load()
  }, [])

  const categoriasFiltro = filtroDept
    ? categorias.filter(c => talleres.find(t => t.id === c.taller_id)?.departamento_id === filtroDept)
    : categorias
  const subcategoriasFiltro = filtroCat
    ? subcategorias.filter(s => s.categoria_id === filtroCat)
    : (filtroDept ? subcategorias.filter(s => categoriasFiltro.some(c => c.id === s.categoria_id)) : subcategorias)

  function onFiltroDept(id) { setFiltroDept(id); setFiltroCat(''); setFiltroSubcat('') }
  function onFiltroCat(id) { setFiltroCat(id); setFiltroSubcat('') }

  const hayFiltros = filtroDept || filtroCat || filtroSubcat || filtroEstado

  function limpiarFiltros() {
    setFiltroDept(''); setFiltroCat(''); setFiltroSubcat(''); setFiltroEstado('')
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!q.trim() && !hayFiltros) return
    setLoading(true)

    let query = supabase.from('items').select(`
      id, codigo, nombre, estado, ubicacion, marca, modelo, cantidad,
      subcategoria_id,
      subcategorias(nombre, categoria_id,
        categorias(id, nombre, taller_id,
          talleres(nombre, departamento_id,
            departamentos(id, nombre)
          )
        )
      )
    `).limit(100)

    if (q.trim()) {
      query = query.or(`nombre.ilike.%${q}%,codigo.ilike.%${q}%,ubicacion.ilike.%${q}%,marca.ilike.%${q}%,modelo.ilike.%${q}%,notas.ilike.%${q}%`)
    }
    if (filtroEstado) query = query.eq('estado', filtroEstado)
    if (filtroSubcat) query = query.eq('subcategoria_id', filtroSubcat)

    const { data } = await query

    // Filtros de categoría / departamento se aplican en cliente (relaciones anidadas)
    let filteredData = data || []
    if (filtroCat) {
      filteredData = filteredData.filter(it => it.subcategorias?.categoria_id === filtroCat)
    }
    if (filtroDept) {
      filteredData = filteredData.filter(it => it.subcategorias?.categorias?.talleres?.departamentos?.id === filtroDept)
    }

    setResults(filteredData)
    setSearched(true)
    setLoading(false)
    setSortKey(null)
  }

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function getSortValue(item, key) {
    switch (key) {
      case 'codigo':   return item.codigo || ''
      case 'nombre':   return item.nombre || ''
      case 'cantidad': return item.cantidad || 1
      case 'marcaModelo': return [item.marca, item.modelo].filter(Boolean).join(' ')
      case 'ubicacion': return item.ubicacion || ''
      case 'ruta': {
        const s = item.subcategorias
        return s ? [s.categorias?.talleres?.departamentos?.nombre, s.categorias?.talleres?.nombre, s.categorias?.nombre, s.nombre].filter(Boolean).join(' › ') : ''
      }
      case 'estado': return ESTADO_BADGE[item.estado]?.label || item.estado || ''
      default: return ''
    }
  }

  const sortedResults = sortKey ? [...results].sort((a, b) => {
    const va = getSortValue(a, sortKey)
    const vb = getSortValue(b, sortKey)
    let cmp
    if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb
    } else {
      cmp = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base', numeric: true })
    }
    return sortDir === 'asc' ? cmp : -cmp
  }) : results

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500 }}>Buscar</h1>
      </div>

      <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input-field" placeholder="Nombre, código, ubicación, marca, modelo, notas…"
              value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1 }} autoFocus />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              <i className="ti ti-search" aria-hidden="true" />
              {loading ? 'Buscando…' : 'Buscar'}
            </button>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="input-field" value={filtroDept}
              onChange={e => onFiltroDept(e.target.value)} style={{ width: 170 }}>
              <option value="">Todos los departamentos</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <select className="input-field" value={filtroCat}
              onChange={e => onFiltroCat(e.target.value)} style={{ width: 160 }}>
              <option value="">Todas las categorías</option>
              {categoriasFiltro.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select className="input-field" value={filtroSubcat}
              onChange={e => setFiltroSubcat(e.target.value)} style={{ width: 170 }}>
              <option value="">Todas las subcategorías</option>
              {subcategoriasFiltro.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <select className="input-field" value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)} style={{ width: 150 }}>
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_BADGE[e].label}</option>)}
            </select>
            {hayFiltros && (
              <button type="button" className="btn" style={{ fontSize: 12 }} onClick={limpiarFiltros}>
                <i className="ti ti-x" aria-hidden="true" />Limpiar filtros
              </button>
            )}
          </div>
        </form>

        {!searched && (
          <div className="empty-state">
            <i className="ti ti-search" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} aria-hidden="true" />
            Introduce un término y/o aplica filtros para buscar en el inventario
          </div>
        )}

        {searched && results.length === 0 && (
          <div className="empty-state">
            <i className="ti ti-mood-empty" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} aria-hidden="true" />
            Sin resultados
          </div>
        )}

        {results.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {sortedResults.length} resultado{sortedResults.length !== 1 ? 's' : ''}
            </div>
            <div className="card" style={{ overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <SortTH label="Código" col="codigo" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortTH label="Nombre" col="nombre" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortTH label="Cant." col="cantidad" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                    <SortTH label="Marca / Modelo" col="marcaModelo" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortTH label="Ubicación" col="ubicacion" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortTH label="Ruta" col="ruta" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortTH label="Estado" col="estado" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map(item => {
                    const b = ESTADO_BADGE[item.estado] || ESTADO_BADGE.disponible
                    const s = item.subcategorias
                    const ruta = s ? [
                      s.categorias?.talleres?.departamentos?.nombre,
                      s.categorias?.talleres?.nombre,
                      s.categorias?.nombre,
                      s.nombre
                    ].filter(Boolean).join(' › ') : '—'
                    return (
                      <tr key={item.id}>
                        <td style={{ color: 'var(--text3)', fontFamily: 'monospace', fontSize: 12 }}>{item.codigo}</td>
                        <td style={{ fontWeight: 500 }}>{item.nombre}</td>
                        <td style={{ textAlign: 'center', color: item.cantidad > 1 ? 'var(--text)' : 'var(--text3)' }}>
                          {item.cantidad || 1}
                        </td>
                        <td style={{ color: 'var(--text2)', fontSize: 12 }}>
                          {[item.marca, item.modelo].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td style={{ color: 'var(--text2)' }}>{item.ubicacion || '—'}</td>
                        <td style={{ color: 'var(--text3)', fontSize: 11 }}>{ruta}</td>
                        <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SortTH({ label, col, sortKey, sortDir, onClick, align }) {
  const active = sortKey === col
  return (
    <th onClick={() => onClick(col)} style={{
      cursor: 'pointer', userSelect: 'none',
      textAlign: align || 'left',
      color: active ? 'var(--text)' : undefined
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <i className={`ti ti-arrow-${active && sortDir === 'desc' ? 'down' : 'up'}`}
          style={{ fontSize: 12, opacity: active ? 1 : 0.25 }} aria-hidden="true" />
      </span>
    </th>
  )
}
