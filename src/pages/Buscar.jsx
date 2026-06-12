import { useState } from 'react'
import { supabase } from '../lib/supabase'

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

  async function handleSearch(e) {
    e.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    const { data } = await supabase.from('items').select(`
      id, codigo, nombre, estado, ubicacion, marca, modelo,
      subcategorias(nombre,
        categorias(nombre,
          talleres(nombre,
            departamentos(nombre)
          )
        )
      )
    `).or(`nombre.ilike.%${q}%,codigo.ilike.%${q}%,ubicacion.ilike.%${q}%,marca.ilike.%${q}%,modelo.ilike.%${q}%`)
      .limit(50)
    setResults(data || [])
    setSearched(true)
    setLoading(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500 }}>Buscar</h1>
      </div>

      <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input className="input-field" placeholder="Nombre, código, ubicación, marca, modelo…"
            value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1 }} autoFocus />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            <i className="ti ti-search" aria-hidden="true" />
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {!searched && (
          <div className="empty-state">
            <i className="ti ti-search" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} aria-hidden="true" />
            Introduce un término para buscar en todo el inventario
          </div>
        )}

        {searched && results.length === 0 && (
          <div className="empty-state">
            <i className="ti ti-mood-empty" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} aria-hidden="true" />
            Sin resultados para "{q}"
          </div>
        )}

        {results.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {results.length} resultado{results.length !== 1 ? 's' : ''} para "{q}"
            </div>
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Código</th><th>Nombre</th><th>Marca / Modelo</th>
                    <th>Ubicación</th><th>Ruta</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(item => {
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
