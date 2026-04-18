import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: '12px', padding: '40px',
        }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#8a857d', textAlign: 'center' }}>
            Algo deu errado
          </p>
          <p style={{ fontSize: '12px', color: '#c4bfb8', textAlign: 'center', maxWidth: '360px', lineHeight: 1.6 }}>
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{
              fontSize: '12px', fontWeight: 600, color: '#2c5545',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
