import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    // Verify user
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { to, subject, body, reply_to_id } = await req.json() as {
      to: string
      subject: string
      body: string
      reply_to_id?: string
    }

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: to, subject, body' }), { status: 400, headers: corsHeaders })
    }

    // Get sender profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const fromName  = profile?.full_name ?? 'CRM Esquire'
    const fromEmail = 'onboarding@resend.dev'

    // Resend free plan only allows sending to the account owner's email.
    // Redirect to sender's own email with intended recipient in subject.
    const ownerEmail = profile?.email ?? user.email ?? ''
    const actualTo      = ownerEmail
    const actualSubject = to !== ownerEmail ? `[Para: ${to}] ${subject}` : subject

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [actualTo],
        subject: actualSubject,
        text: body,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      const errMsg = resendData?.message ?? resendData?.name ?? JSON.stringify(resendData)
      console.error('Resend error:', errMsg)
      return new Response(
        JSON.stringify({ error: `Resend: ${errMsg}` }),
        { status: 500, headers: corsHeaders },
      )
    }

    // Persist in emails table
    const { data: saved, error: dbErr } = await supabase
      .from('emails')
      .insert({
        user_id:     user.id,
        resend_id:   resendData.id,
        folder:      'sent',
        from_name:   fromName,
        from_email:  profile?.email ?? user.email ?? '',
        to_email:    to,
        subject,
        body,
        reply_to_id: reply_to_id ?? null,
        read:        true,
      })
      .select()
      .single()

    if (dbErr) {
      console.error('DB error saving email:', dbErr)
    }

    return new Response(
      JSON.stringify({ success: true, email_id: saved?.id, resend_id: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Unexpected error:', msg)
    return new Response(
      JSON.stringify({ error: `Erro interno: ${msg}` }),
      { status: 500, headers: corsHeaders },
    )
  }
})
