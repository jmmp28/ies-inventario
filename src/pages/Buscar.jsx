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
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    setSelected(null)
    const { data } = await supabase.from('items').select(`
      *,
      subcategorias(nombre, categoria_id,
        categorias(id, nombre, taller_id,
          talleres(id, nombre,
            departamentos(id, nombre)
          )
        )
      )
    `)
    .or(`nombre.ilike.%${q}%,codigo.ilike.%${q}%,marca.ilike.%${q}%,modelo.ilike.%${q}%,numero_serie.ilike.%${q}%,ubicacion.ilike.%${q}%,notas.ilike.%${q}%`)
    .limit(20)
    setResults(data || [])
    setLoading(false)
    if (data?.length === 1) setSelected(data[0])
  }

  function handleInput(e) {
    setQ(e.target.value)
    if (!e.target.value.trim()) { setResults([]); setSelected(null) }
  }

  const b = selected ? (ESTADO_BADGE[selected.estado] || ESTADO_BADGE.disponible) : null
  const s = selected?.subcategorias
  const ruta = s ? [
    s.categorias?.talleres?.departamentos?.nombre,
    s.categorias?.talleres?.nombre,
    s.categorias?.nombre,
    s.nombre
  ].filter(Boolean) : []

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500 }}>Buscar ítem</h1>
      </div>

      <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input className="input-field" placeholder="Nombre, código, marca, modelo, núm. serie…"
            value={q} onChange={handleInput} style={{ flex: 1 }} autoFocus />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            <i className="ti ti-search" aria-hidden="true" />
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {/* Lista de resultados cuando hay más de 1 */}
        {results.length > 1 && !selected && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
              {results.length} resultado{results.length !== 1 ? 's' : ''} — selecciona uno para ver el detalle
            </div>
            <div className="card">
              {results.map((item, i) => {
                const b = ESTADO_BADGE[item.estado] || ESTADO_BADGE.disponible
                const dept = item.subcategorias?.categorias?.talleres?.departamentos?.nombre
                return (
                  <div key={item.id} onClick={() => setSelected(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', cursor: 'pointer',
                      borderBottom: i < results.length - 1 ? '0.5px solid var(--border)' : 'none'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {item.codigo} · {dept || '—'}
                      </div>
                    </div>
                    <span className={`badge ${b.cls}`}>{b.label}</span>
                    <i className="ti ti-chevron-right" style={{ fontSize: 14, color: 'var(--text3)' }} aria-hidden="true" />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sin resultados */}
        {results.length === 0 && q && !loading && (
          <div className="empty-state">
            <i className="ti ti-mood-empty" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} aria-hidden="true" />
            Sin resultados para "{q}"
          </div>
        )}

        {/* Estado inicial */}
        {!q && (
          <div className="empty-state">
            <i className="ti ti-search" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} aria-hidden="true" />
            Busca por nombre, código, marca, modelo o número de serie
          </div>
        )}

        {/* Ficha de detalle */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.length > 1 && (
              <button className="btn" style={{ alignSelf: 'flex-start', fontSize: 12 }}
                onClick={() => setSelected(null)}>
                <i className="ti ti-arrow-left" aria-hidden="true" />Volver a resultados
              </button>
            )}

            {/* Cabecera de la ficha */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{selected.nombre}</h2>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text3)' }}>{selected.codigo}</div>
                </div>
                <span className={`badge ${b.cls}`} style={{ fontSize: 13, padding: '4px 12px', flexShrink: 0 }}>
                  {b.label}
                </span>
              </div>

              {/* Ruta taxonómica */}
              {ruta.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                  padding: '8px 12px', background: 'var(--bg2)', borderRadius: 'var(--radius)',
                  marginBottom: 16 }}>
                  {ruta.map((r, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: i === ruta.length - 1 ? 'var(--text)' : 'var(--text3)' }}>{r}</span>
                      {i < ruta.length - 1 && <i className="ti ti-chevron-right" style={{ fontSize: 11, color: 'var(--text3)' }} aria-hidden="true" />}
                    </span>
                  ))}
                </div>
              )}

              {/* Campos en grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <DetalleField label="Cantidad" value={selected.cantidad || 1} />
                <DetalleField label="Ubicación" value={selected.ubicacion} />
                <DetalleField label="Marca" value={selected.marca} />
                <DetalleField label="Modelo" value={selected.modelo} />
                <DetalleField label="Núm. serie" value={selected.numero_serie} />
                <DetalleField label="Fecha adquisición" value={
                  selected.fecha_adquisicion
                    ? new Date(selected.fecha_adquisicion).toLocaleDateString('es-ES')
                    : null
                } />
                <DetalleField label="Valor (€)" value={
                  selected.valor_euros ? `${parseFloat(selected.valor_euros).toLocaleString('es-ES')} €` : null
                } />
                <DetalleField label="Última actualización" value={
                  new Date(selected.updated_at).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' })
                } />
              </div>

              {selected.descripcion && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, marginBottom: 4 }}>Descripción</div>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{selected.descripcion}</div>
                </div>
              )}

              {selected.notas && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, marginBottom: 4 }}>Notas</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg2)',
                    padding: '8px 12px', borderRadius: 'var(--radius)' }}>{selected.notas}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DetalleField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? 'var(--text)' : 'var(--text3)' }}>
        {value ?? '—'}
      </div>
    </div>
  )
}
