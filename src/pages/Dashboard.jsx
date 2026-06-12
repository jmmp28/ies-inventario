import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

const ESTADO_BADGE = {
  disponible:    { cls: 'badge-green',  label: 'Disponible'    },
  prestamo:      { cls: 'badge-amber',  label: 'Préstamo'      },
  averia:        { cls: 'badge-red',    label: 'Avería'        },
  baja:          { cls: 'badge-gray',   label: 'Baja'          },
  mantenimiento: { cls: 'badge-blue',   label: 'Mantenimiento' },
}

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, disponibles: 0, incidencias: 0, talleres: 0 })
  const [departs, setDeparts] = useState([])
  const [recientes, setRecientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [itemsRes, tallRes, depRes, recRes] = await Promise.all([
        supabase.from('items').select('estado', { count: 'exact' }),
        supabase.from('talleres').select('id', { count: 'exact' }),
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
          id, codigo, nombre, estado, updated_at,
          subcategorias(nombre, categorias(nombre, talleres(nombre, departamentos(nombre))))
        `).order('updated_at', { ascending: false }).limit(5)
      ])

      const items = itemsRes.data || []
      const total = items.length
      const disponibles = items.filter(i => i.estado === 'disponible').length
      const incidencias = items.filter(i => ['averia', 'mantenimiento'].includes(i.estado)).length

      setStats({ total, disponibles, incidencias, talleres: tallRes.count || 0 })
      setDeparts(depRes.data || [])
      setRecientes(recRes.data || [])
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

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
          <StatCard label="Total ítems" value={stats.total} sub="registrados" />
          <StatCard label="Disponibles" value={stats.disponibles}
            sub={`${stats.total ? Math.round(stats.disponibles/stats.total*100) : 0}%`} color="var(--green-dark)" />
          <StatCard label="Talleres" value={stats.talleres} sub="activos" />
          <StatCard label="Incidencias" value={stats.incidencias} sub="pendientes" color={stats.incidencias > 0 ? 'var(--red-dark)' : undefined} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Departamentos</div>
            <div className="card">
              {departs.length === 0 && <div className="empty-state">Sin departamentos</div>}
              {departs.map((d, i) => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: i < departs.length - 1 ? '0.5px solid var(--border)' : 'none'
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {d.talleres?.length || 0} taller{d.talleres?.length !== 1 ? 'es' : ''}
                    </div>
                  </div>
                  <span className="badge badge-gray">{countItemsInDept(d)} ítems</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Últimas actualizaciones</div>
            <div className="card">
              {recientes.length === 0 && <div className="empty-state">Sin ítems aún</div>}
              {recientes.map((item, i) => {
                const b = ESTADO_BADGE[item.estado] || ESTADO_BADGE.disponible
                const dept = item.subcategorias?.categorias?.talleres?.departamentos?.nombre
                return (
                  <div key={item.id} style={{
                    padding: '10px 14px',
                    borderBottom: i < recientes.length - 1 ? '0.5px solid var(--border)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.nombre}
                      </div>
                      <span className={`badge ${b.cls}`} style={{ flexShrink: 0 }}>{b.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {item.codigo} · {dept || '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, color: color || 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</div>
    </div>
  )
}
