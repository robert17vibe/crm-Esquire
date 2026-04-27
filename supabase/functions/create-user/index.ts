import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cliente com a chave anon do caller — para verificar quem está a chamar
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    // Verificar que o utilizador está autenticado e é admin
    const { data: { user } } = await supabaseAnon.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    // Cliente admin com service role — para criar utilizadores
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Sem permissão de administrador' }), { status: 403, headers: corsHeaders })
    }

    const body = await req.json()
    const { email, password, full_name, is_admin, avatar_color, team_id } = body

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email e password são obrigatórios' }), { status: 400, headers: corsHeaders })
    }

    // Criar utilizador no Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split('@')[0] },
    })

    if (authErr) {
      return new Response(JSON.stringify({ error: authErr.message }), { status: 400, headers: corsHeaders })
    }

    // Criar/atualizar perfil
    if (authData.user) {
      await supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        email,
        full_name: full_name || email.split('@')[0],
        is_admin: is_admin ?? false,
        avatar_color: avatar_color ?? '#e31e24',
        team_id: team_id || null,
        invited_at: new Date().toISOString(),
      })
    }

    return new Response(
      JSON.stringify({ user: authData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }),
      { status: 500, headers: corsHeaders },
    )
  }
})
