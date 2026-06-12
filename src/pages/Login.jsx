import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await signIn(email, password)
    if (err) setError('Credenciales incorrectas. Inténtalo de nuevo.')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg3)', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--purple)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 12
          }}>
            <i className="ti ti-building-school" style={{ fontSize: 24, color: '#fff' }} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>IES Inventario</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
            Gestión de inventario del instituto
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input
                className="input-field"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@instituto.es"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                className="input-field"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div style={{
                fontSize: 12, color: 'var(--red-dark)',
                background: 'var(--red-light)', padding: '8px 12px',
                borderRadius: 'var(--radius)'
              }}>{error}</div>
            )}
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ justifyContent: 'center', marginTop: 4 }}>
              {loading ? 'Accediendo…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
