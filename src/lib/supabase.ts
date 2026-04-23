import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;background:#f5f4f0;gap:16px;padding:24px">
      <p style="font-size:32px">⚠️</p>
      <p style="font-size:18px;font-weight:700;color:#1a1814">Variáveis de ambiente em falta</p>
      <p style="font-size:13px;color:#8a857d;text-align:center;max-width:400px;line-height:1.6">
        <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> não estão configuradas.<br/>
        Adiciona-as nas Environment Variables do Vercel e faz redeploy.
      </p>
    </div>
  `
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url as string, key as string, {
  auth: {
    lock: (_name, _acquireTimeout, fn) => fn(),
  },
})
