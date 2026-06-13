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
    setLoading(true); setError('')
    const { error: err } = await signIn(email, password)
    if (err) setError('Credenciales incorrectas. Inténtalo de nuevo.')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 16,
      background: 'linear-gradient(135deg, var(--green-corp-dark) 0%, var(--green-corp) 60%, var(--gray-corp) 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo y nombre */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 14
          }}>
            <i className="ti ti-building-school" style={{ fontSize: 32, color: '#fff' }} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            IES Pío Baroja
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            Sistema de Gestión de Inventario
          </p>
        </div>

        {/* Formulario */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input
                className="input-field"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@piobajora.es"
                required autoFocus
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
                background: 'var(--red-light)',
                padding: '8px 12px', borderRadius: 'var(--radius)'
              }}>{error}</div>
            )}
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ justifyContent: 'center', padding: '10px', fontSize: 14, marginTop: 4 }}>
              {loading ? 'Accediendo…' : 'Entrar'}
            </button>
          </form>

          <div style={{
            marginTop: 20, paddingTop: 16,
            borderTop: '0.5px solid var(--border)',
            textAlign: 'center',
            fontSize: 11, color: 'var(--text3)'
          }}>
            IES Pío Baroja · Madrid · EducaMadrid
          </div>
        </div>
      </div>
    </div>
  )
}
