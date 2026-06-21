import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'

const ESTADO_BADGE = {
  disponible:    { cls: 'badge-green',  label: 'Disponible',    color: 'var(--green-dark)', hex: '#2E7D32' },
  prestamo:      { cls: 'badge-amber',  label: 'Préstamo',      color: 'var(--amber-dark)', hex: '#F57F17' },
  averia:        { cls: 'badge-red',    label: 'Avería',        color: 'var(--red-dark)',   hex: '#C62828' },
  baja:          { cls: 'badge-gray',   label: 'Baja',          color: 'var(--text3)',      hex: '#90A4AE' },
  mantenimiento: { cls: 'badge-blue',   label: 'Mantenimiento', color: 'var(--blue-dark)',  hex: '#1565C0' },
}
const ESTADOS_ORDEN = ['disponible', 'prestamo', 'mantenimiento', 'averia', 'baja']

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, talleres: 0, porEstado: {} })
  const [departs, setDeparts] = useState([])
  const [atencion, setAtencion] = useState([]) // ítems con avería/mantenimiento
  const [sinInventariar, setSinInventariar] = useState([]) // talleres sin ítems
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [itemsRes, tallRes, depRes, atencionRes] = await Promise.all([
        supabase.from('items').select('estado', { count: 'exact' }),
        supabase.from('talleres').select('id, nombre, departamento_id, departamentos(nombre)').eq('activo', true),
        supabase.from('departamentos').select(`
          id, nombre,
          talleres(id, nombre,
            categorias(id,
              subcategorias(id,
                items(id, estado)
              )
            )
          )
        `).eq('activo', true),
        supabase.from('items').select(`
          id, codigo, nombre, estado, ubicacion,
          subcategorias(categorias(talleres(nombre, departamentos(nombre))))
        `).in('estado', ['averia', 'mantenimiento']).order('updated_at', { ascending: false }).limit(8)
      ])

      const items = itemsRes.data || []
      const total = items.length
      const porEstado = {}
      ESTADOS_ORDEN.forEach(e => porEstado[e] = items.filter(i => i.estado === e).length)

      setStats({ total, talleres: tallRes.data?.length || 0, porEstado })
      setDeparts(depRes.data || [])
      setAtencion(atencionRes.data || [])

      // Talleres sin ningún ítem registrado
      const sinItems = (depRes.data || []).flatMap(d =>
        (d.talleres || [])
          .filter(t => {
            const n = (t.categorias || []).reduce((acc, c) =>
              acc + (c.subcategorias || []).reduce((a2, s) => a2 + (s.items?.length || 0), 0), 0)
            return n === 0
          })
          .map(t => ({ ...t, departamento: d.nombre }))
      )
      setSinInventariar(sinItems)
      setLoading(false)
    }
    load()
  }, [])

  function countItemsInDept(dept) {
    let n = 0
    dept.talleres?.forEach(t =>
      t.categorias?.forEach(c =>
        c.subcategorias?.forEach(s => n += s.items?.length || 0)
      )
    )
    return n
  }

  if (loading) return <div className="empty-state">Cargando…</div>

  const maxDept = Math.max(1, ...departs.map(countItemsInDept))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500 }}>Panel general</h1>
        <Link to="/inventario" className="btn" style={{ fontSize: 12 }}>
          <i className="ti ti-boxes" aria-hidden="true" />Ver inventario
        </Link>
      </div>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, flex: 1, overflow: 'auto' }}>

        {/* Stats + gráfico de estados */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          {/* Tarjetas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
            <StatCard label="Total ítems" value={stats.total} sub="registrados" icon="ti-boxes" />
            <StatCard label="Talleres" value={stats.talleres} sub="activos" icon="ti-tool" />
            <StatCard label="Disponibles" value={stats.porEstado.disponible || 0}
              sub={`${stats.total ? Math.round((stats.porEstado.disponible||0)/stats.total*100) : 0}%`}
              color="var(--green-dark)" icon="ti-circle-check" />
            <StatCard label="Necesitan atención" value={(stats.porEstado.averia||0) + (stats.porEstado.mantenimiento||0)}
              sub="avería + mantenim." color={((stats.porEstado.averia||0) + (stats.porEstado.mantenimiento||0)) > 0 ? 'var(--red-dark)' : undefined}
              icon="ti-alert-triangle" />
          </div>

          {/* Gráfico de estados (barra horizontal apilada + leyenda) */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>
              Distribución por estado
            </div>
            {stats.total === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Sin ítems registrados</div>
            ) : (
              <>
                <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                  {ESTADOS_ORDEN.map(e => {
                    const n = stats.porEstado[e] || 0
                    if (n === 0) return null
                    const pct = (n / stats.total) * 100
                    return <div key={e} style={{ width: `${pct}%`, background: ESTADO_BADGE[e].hex }} title={`${ESTADO_BADGE[e].label}: ${n}`} />
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ESTADOS_ORDEN.filter(e => stats.porEstado[e] > 0).map(e => (
                    <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: ESTADO_BADGE[e].hex, flexShrink: 0 }} />
                      <span style={{ color: 'var(--text2)', flex: 1 }}>{ESTADO_BADGE[e].label}</span>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{stats.porEstado[e]}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Necesita atención */}
        {atencion.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 15, color: 'var(--red-dark)' }} aria-hidden="true" />
              <div style={{ fontSize: 13, fontWeight: 500 }}>Necesita atención</div>
              <span className="badge badge-red">{atencion.length}</span>
            </div>
            <div className="card">
              {atencion.map((item, i) => {
                const b = ESTADO_BADGE[item.estado]
                const ruta = item.subcategorias?.categorias?.talleres
                return (
                  <div key={item.id} onClick={() => navigate('/inventario')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', cursor: 'pointer',
                      borderBottom: i < atencion.length - 1 ? '0.5px solid var(--border)' : 'none'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span className={`badge ${b.cls}`} style={{ flexShrink: 0 }}>{b.label}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {item.codigo} · {ruta?.departamentos?.nombre || '—'} {ruta?.nombre ? `› ${ruta.nombre}` : ''}
                        {item.ubicacion ? ` · ${item.ubicacion}` : ''}
                      </div>
                    </div>
                    <i className="ti ti-chevron-right" style={{ fontSize: 14, color: 'var(--text3)', flexShrink: 0 }} aria-hidden="true" />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Desglose por departamento con barra de progreso */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Ítems por departamento</div>
            <div className="card">
              {departs.length === 0 && <div className="empty-state">Sin departamentos</div>}
              {departs.map((d, i) => {
                const n = countItemsInDept(d)
                const pct = Math.round((n / maxDept) * 100)
                return (
                  <div key={d.id} style={{
                    padding: '10px 14px',
                    borderBottom: i < departs.length - 1 ? '0.5px solid var(--border)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{d.nombre}</div>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{n} ítems</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Talleres sin inventariar */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
              Talleres sin inventariar
              {sinInventariar.length > 0 && <span className="badge badge-amber" style={{ marginLeft: 8 }}>{sinInventariar.length}</span>}
            </div>
            <div className="card">
              {sinInventariar.length === 0 ? (
                <div style={{ padding: '20px 14px', textAlign: 'center' }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 20, color: 'var(--green-dark)', display: 'block', marginBottom: 6 }} aria-hidden="true" />
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Todos los talleres tienen ítems registrados</div>
                </div>
              ) : (
                sinInventariar.map((t, i) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    borderBottom: i < sinInventariar.length - 1 ? '0.5px solid var(--border)' : 'none'
                  }}>
                    <i className="ti ti-tool" style={{ fontSize: 14, color: 'var(--text3)' }} aria-hidden="true" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{t.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.departamento}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 13, color: 'var(--text3)' }} aria-hidden="true" />}
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{label}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 500, color: color || 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</div>
    </div>
  )
}
