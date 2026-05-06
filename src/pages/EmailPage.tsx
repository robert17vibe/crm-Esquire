import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useActivityStore } from '@/store/useActivityStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useDealStore } from '@/store/useDealStore'
import {
  Mail,
  Send,
  FileText,
  Archive,
  Trash2,
  Tag,
  Reply,
  Plus,
  Search,
  Forward,
  X,
  Loader2,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type LabelKey = 'importante' | 'follow-up' | 'cliente' | 'interno' | 'proposta'
type FolderKey = 'inbox' | 'sent' | 'drafts' | 'archived' | 'trash'

interface EmailFrom {
  name: string
  email: string
  initials: string
  color: string
}

interface EmailThread {
  id: string
  from: EmailFrom
  subject: string
  preview: string
  body: string
  date: string
  labels: LabelKey[]
  read: boolean
  folder: FolderKey
  previousFolder?: FolderKey
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

// Paleta de avatares: bordeaux e variações sóbrias — sem cores gritantes
const AVATAR_PALETTE = ['#7a1515', '#8b4a4a', '#6b5a6b', '#4a5e6b', '#5a6b5a', '#6b6248']

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

const MOCK_EMAILS: EmailThread[] = [
  {
    id: '1',
    from: { name: 'Ana Rodrigues', email: 'ana.rodrigues@globaltech.pt', initials: 'AR', color: avatarColor('Ana Rodrigues') },
    subject: 'Proposta Comercial — Licenças Enterprise Q2',
    preview: 'Conforme acordado na nossa reunião de terça, segue em anexo a proposta atualizada para as 50 licenças...',
    body: 'Boa tarde,\n\nConforme acordado na nossa reunião de terça-feira, segue em anexo a proposta atualizada para as 50 licenças Enterprise para o segundo trimestre.\n\nOs valores refletem o desconto de 15% negociado, com vigência de 12 meses e suporte prioritário incluído.\n\nAguardo a sua confirmação para prosseguirmos com a assinatura do contrato.\n\nCom os melhores cumprimentos,\nAna Rodrigues\nAccount Manager — GlobalTech',
    date: '10:32',
    labels: ['proposta', 'cliente'],
    read: false,
    folder: 'inbox',
  },
  {
    id: '2',
    from: { name: 'Marco Pinto', email: 'm.pinto@solucoesinfinitas.com', initials: 'MP', color: avatarColor('Marco Pinto') },
    subject: 'Re: Follow-up reunião de onboarding',
    preview: 'Olá equipa, ficou alguma dúvida sobre o processo de integração? Estou disponível esta semana para...',
    body: 'Olá equipa,\n\nFicou alguma dúvida sobre o processo de integração depois da sessão de onboarding de ontem?\n\nEstou disponível esta semana para uma chamada rápida de 30 minutos, caso necessitem de esclarecimentos adicionais sobre a configuração do módulo de relatórios.\n\nPor favor, avisem com pelo menos 2 horas de antecedência.\n\nCumprimentos,\nMarco Pinto\nCustomer Success',
    date: '09:15',
    labels: ['follow-up', 'cliente'],
    read: false,
    folder: 'inbox',
  },
  {
    id: '3',
    from: { name: 'Sofia Mendes', email: 'sofia@aureatech.io', initials: 'SM', color: avatarColor('Sofia Mendes') },
    subject: '[Interno] Revisão do pipeline Q2 — ação necessária',
    preview: 'Pessoal, precisamos fechar os deals em fase de negociação antes do dia 30. Segue a lista de...',
    body: 'Pessoal,\n\nPrecisamos fechar os deals em fase de negociação antes do final do mês para atingir o target do Q2.\n\nSegue a lista de oportunidades que requerem ação imediata:\n\n• GlobalTech — proposta enviada, aguardar aprovação\n• Infinitas — contrato em revisão legal\n• Nexaflow — demo agendada para sexta\n\nPor favor, atualizem o CRM com o estado atual até amanhã ao fim do dia.\n\nObrigada,\nSofia',
    date: 'Ontem',
    labels: ['interno', 'importante'],
    read: true,
    folder: 'inbox',
  },
  {
    id: '4',
    from: { name: 'Tomás Ferreira', email: 'tomas.ferreira@nexaflow.io', initials: 'TF', color: avatarColor('Tomás Ferreira') },
    subject: 'Confirmação demo — 26 Abril 14h00',
    preview: 'Confirmo a nossa demonstração para sexta-feira, dia 26 de Abril, às 14h00. Participarão da nossa...',
    body: 'Bom dia,\n\nConfirmo a nossa demonstração para sexta-feira, dia 26 de Abril, às 14h00 via Google Meet.\n\nParticiparão da nossa parte: eu (CEO), Carla Santos (CTO) e Ricardo Lima (Head of Ops).\n\nLink da reunião: meet.google.com/abc-defg-hij\n\nAté sexta!\nTomás Ferreira\nCEO — Nexaflow',
    date: 'Ontem',
    labels: ['cliente', 'importante'],
    read: true,
    folder: 'inbox',
  },
  {
    id: '5',
    from: { name: 'Beatriz Costa', email: 'beatriz@innovaprime.pt', initials: 'BC', color: avatarColor('Beatriz Costa') },
    subject: 'Dúvida sobre integração API REST',
    preview: 'Estamos a ter dificuldade em autenticar os pedidos para o endpoint /v2/webhooks. O erro retornado é...',
    body: 'Boa tarde,\n\nEstamos a ter dificuldade em autenticar os pedidos para o endpoint /v2/webhooks.\n\nO erro retornado é: 401 Unauthorized — "Invalid API key format".\n\nJá verificámos que a chave está correta no painel. Poderão confirmar se existe algum requisito adicional de cabeçalho na versão 2 da API?\n\nObrigada,\nBeatriz Costa\nDevOps Lead — InnovaPrime',
    date: '23 Abr',
    labels: ['cliente'],
    read: true,
    folder: 'inbox',
  },
  {
    id: '6',
    from: { name: 'Pedro Alves', email: 'pedro.alves@vectordata.pt', initials: 'PA', color: avatarColor('Pedro Alves') },
    subject: 'Re: Renovação de contrato — condições especiais',
    preview: 'Após análise interna, estamos dispostos a renovar por mais 2 anos com as condições discutidas. Precisamos...',
    body: 'Olá,\n\nApós análise interna, a nossa direção aprovou a renovação por mais 2 anos com as condições discutidas na reunião de março.\n\nPrecisamos, no entanto, de incluir uma cláusula de saída a 12 meses sem penalização. É algo que conseguem acomodar?\n\nSe sim, podemos avançar para a assinatura esta semana.\n\nCumprimentos,\nPedro Alves\nCFO — VectorData',
    date: '22 Abr',
    labels: ['proposta', 'importante'],
    read: true,
    folder: 'inbox',
  },
  {
    id: '7',
    from: { name: 'Inês Lopes', email: 'ines@aureatech.io', initials: 'IL', color: avatarColor('Inês Lopes') },
    subject: '[Interno] Templates de proposta atualizados',
    preview: 'Partilho os novos templates de proposta aprovados pelo marketing. Usem a versão 3.2 daqui para...',
    body: 'Olá equipa,\n\nPartilho os novos templates de proposta aprovados pelo marketing para o Q2.\n\nUsem a versão 3.2 daqui para a frente — a antiga versão não deve ser utilizada em novos envios.\n\nPrincipais alterações:\n• Novo layout de capa\n• Secção de casos de sucesso atualizada\n• Tabela de preços com IVA separado\n\nFicheiros disponíveis na pasta partilhada.\n\nInês',
    date: '21 Abr',
    labels: ['interno'],
    read: true,
    folder: 'inbox',
  },
  {
    id: '8',
    from: { name: 'Carlos Nunes', email: 'carlos.nunes@meridian.eu', initials: 'CN', color: avatarColor('Carlos Nunes') },
    subject: 'Interesse em solução para equipa de vendas (30 utilizadores)',
    preview: 'Vim ao vosso stand na Web Summit e fiquei interessado na solução. Somos uma empresa com 30 comerciais e...',
    body: 'Bom dia,\n\nVim ao vosso stand na Web Summit Lisboa e fiquei bastante interessado na solução CRM que apresentaram.\n\nSomos uma empresa com 30 comerciais distribuídos por 4 países europeus. O nosso principal desafio é a visibilidade do pipeline e a gestão de atividades cross-border.\n\nPoderiam agendar uma demo para a próxima semana? Tenho disponibilidade terça ou quarta depois das 15h.\n\nObrigado,\nCarlos Nunes\nSales Director — Meridian EU',
    date: '20 Abr',
    labels: ['cliente', 'importante'],
    read: true,
    folder: 'inbox',
  },
  {
    id: '9',
    from: { name: 'Marta Silva', email: 'marta@aureatech.io', initials: 'MS', color: avatarColor('Marta Silva') },
    subject: '[Interno] Reunião pipeline semanal — ata',
    preview: 'Segue a ata da reunião de pipeline de segunda-feira. Principais decisões: deal GlobalTech prioritário...',
    body: 'Boa tarde,\n\nSegue a ata da reunião de pipeline de segunda-feira.\n\nPrincipais decisões:\n• Deal GlobalTech elevado a prioridade máxima — Ana como owner\n• Nexaflow: avançar para demo esta semana\n• VectorData: preparar proposta de renovação com cláusula de saída\n• Meridian EU: qualificar lead e agendar discovery call\n\nPróxima reunião: segunda-feira, 10h00.\n\nMarta',
    date: '19 Abr',
    labels: ['interno'],
    read: true,
    folder: 'inbox',
  },
  {
    id: '10',
    from: { name: 'João Baptista', email: 'j.baptista@digitalpulse.pt', initials: 'JB', color: avatarColor('João Baptista') },
    subject: 'Proposta rejeitada — feedback',
    preview: 'Lamentamos informar que após avaliação interna decidimos não avançar com a vossa proposta nesta fase...',
    body: 'Bom dia,\n\nLamentamos informar que após avaliação interna decidimos não avançar com a vossa proposta nesta fase.\n\nOs principais motivos prendem-se com o custo da implementação inicial e o prazo de retorno estimado, que ficou acima das nossas expectativas para 2026.\n\nNão descartamos reavaliar a parceria no próximo exercício fiscal. Ficam com a porta aberta.\n\nCom os nossos cumprimentos,\nJoão Baptista\nCOO — DigitalPulse',
    date: '18 Abr',
    labels: ['cliente'],
    read: true,
    folder: 'inbox',
  },
  {
    id: '11',
    from: { name: 'Robert Ferreira', email: 'robert.sousa@aureatech.io', initials: 'RF', color: avatarColor('Robert Ferreira') },
    subject: 'Proposta enviada — GlobalTech Enterprise Q2',
    preview: 'Boa tarde Ana, conforme combinado, segue em anexo a proposta revisada para as 50 licenças Enterprise...',
    body: 'Boa tarde Ana,\n\nConforme combinado na nossa call desta manhã, segue em anexo a proposta revisada para as 50 licenças Enterprise com o desconto de 15% aplicado.\n\nValidade da proposta: 30 dias.\n\nQualquer dúvida, estou disponível.\n\nCumprimentos,\nRobert Ferreira',
    date: '22 Abr',
    labels: ['proposta'],
    read: true,
    folder: 'sent',
  },
  {
    id: '12',
    from: { name: 'Robert Ferreira', email: 'robert.sousa@aureatech.io', initials: 'RF', color: avatarColor('Robert Ferreira') },
    subject: 'Follow-up — Demo Nexaflow agendada',
    preview: 'Tomás, muito obrigado pela confirmação. Estamos a preparar a demonstração com foco nas funcionalidades...',
    body: 'Olá Tomás,\n\nMuito obrigado pela confirmação da disponibilidade para sexta-feira.\n\nEstamos a preparar a demonstração com foco especial nas funcionalidades de gestão de pipeline e automação de atividades, que parecem ser as áreas de maior interesse para a Nexaflow.\n\nAté sexta!\nRobert',
    date: '23 Abr',
    labels: ['follow-up'],
    read: true,
    folder: 'sent',
  },
  {
    id: '13',
    from: { name: 'Robert Ferreira', email: 'robert.sousa@aureatech.io', initials: 'RF', color: avatarColor('Robert Ferreira') },
    subject: '[Rascunho] Proposta renovação VectorData 2026-2028',
    preview: 'Pedro, na sequência da nossa conversa, preparei uma proposta de renovação que inclui a cláusula...',
    body: 'Pedro,\n\nNa sequência da nossa conversa, preparei uma proposta de renovação que inclui a cláusula de saída a 12 meses sem penalização solicitada.\n\nO valor anual mantém-se com um ajuste de 3% para inflação.\n\n[RASCUNHO — pendente revisão jurídica]',
    date: '24 Abr',
    labels: ['proposta'],
    read: true,
    folder: 'drafts',
  },
]

// ─── Label config ─────────────────────────────────────────────────────────────

const LABEL_CONFIG: Record<LabelKey, { label: string; color: string; bg: string }> = {
  'importante': { label: 'Importante', color: '#b83535', bg: 'rgba(184,53,53,0.10)' },
  'follow-up':  { label: 'Follow-up',  color: '#a88030', bg: 'rgba(168,128,48,0.10)' },
  'cliente':    { label: 'Cliente',    color: '#4d7aa8', bg: 'rgba(77,122,168,0.10)' },
  'interno':    { label: 'Interno',    color: '#7a7268', bg: 'rgba(122,114,104,0.10)' },
  'proposta':   { label: 'Proposta',   color: '#2c5545', bg: 'rgba(42,154,90,0.10)'  },
}

// ─── Folder config ────────────────────────────────────────────────────────────

const FOLDERS: { key: FolderKey; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }[] = [
  { key: 'inbox',    label: 'Caixa de entrada', icon: Mail     },
  { key: 'sent',     label: 'Enviados',          icon: Send     },
  { key: 'drafts',   label: 'Rascunhos',         icon: FileText },
  { key: 'archived', label: 'Arquivados',        icon: Archive  },
  { key: 'trash',    label: 'Lixeira',           icon: Trash2   },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function LabelBadge({ labelKey }: { labelKey: LabelKey }) {
  const cfg = LABEL_CONFIG[labelKey]
  return (
    <span style={{
      fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px',
      color: cfg.color, backgroundColor: cfg.bg,
      textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  )
}

function AvatarInitials({ initials, color, size = 32 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color: '#fff', fontSize: size * 0.34, fontWeight: 700,
    }}>
      {initials}
    </div>
  )
}

// ─── EmailPage ────────────────────────────────────────────────────────────────

export function EmailPage() {
  const isDark       = useThemeStore((s) => s.isDark)
  const addActivity  = useActivityStore((s) => s.addActivity)
  const profile      = useAuthStore((s) => s.profile)
  const deals        = useDealStore((s) => s.deals)
  const [searchParams] = useSearchParams()
  const [activeFolder, setActiveFolder] = useState<FolderKey>('inbox')
  const [activeLabel, setActiveLabel] = useState<LabelKey | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeSent, setComposeSent] = useState(false)
  const [emails, setEmails] = useState<EmailThread[]>(() => {
    try {
      const saved = localStorage.getItem('esq_emails_state_v1')
      if (saved) {
        const parsed = JSON.parse(saved) as EmailThread[]
        // merge saved state (folder, read, labels) onto MOCK_EMAILS so new mocks are included
        return MOCK_EMAILS.map((m) => {
          const s = parsed.find((p) => p.id === m.id)
          return s ? { ...m, folder: s.folder, read: s.read, labels: s.labels, previousFolder: s.previousFolder } : m
        })
      }
    } catch { /* ignore */ }
    return MOCK_EMAILS
  })
  const [replySent, setReplySent] = useState(false)
  const [showLabelMenu, setShowLabelMenu] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const owner = profile ? { id: profile.id, name: profile.full_name ?? '', initials: (profile.full_name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(), avatar_color: profile.avatar_color ?? '#6b6560' } : { id: '', name: '', initials: '?', avatar_color: '#6b6560' }

  function saveEmails(next: EmailThread[]) {
    try { localStorage.setItem('esq_emails_state_v1', JSON.stringify(next)) } catch { /* ignore */ }
  }

  function updateEmails(updater: (prev: EmailThread[]) => EmailThread[]) {
    setEmails((prev) => { const next = updater(prev); saveEmails(next); return next })
  }

  // Abrir compose pré-preenchido se vier de ?to=
  useEffect(() => {
    const to = searchParams.get('to')
    if (to) {
      setComposeTo(to)
      setShowCompose(true)
    }
  }, [searchParams])

  function findDealByEmail(email: string) {
    return deals.find((d) => d.contact_email === email)
  }

  function logEmail(toEmail: string, subject: string) {
    const deal = findDealByEmail(toEmail)
    if (deal && owner.id) {
      addActivity(deal.id, { type: 'email', subject: subject || `Email para ${toEmail}`, owner })
    }
  }

  // Load sent emails from Supabase and merge into state
  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('emails')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data?.length) return
        const dbEmails: EmailThread[] = data.map((row) => ({
          id: row.id,
          from: {
            name: row.from_name,
            email: row.from_email,
            initials: row.from_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(),
            color: profile.avatar_color ?? '#4d7aa8',
          },
          subject: row.subject,
          preview: row.body.slice(0, 100).replace(/\n/g, ' '),
          body: row.body,
          date: new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(row.created_at)),
          labels: (row.labels ?? []) as LabelKey[],
          read: row.read,
          folder: row.folder as FolderKey,
          previousFolder: row.previous_folder as FolderKey | undefined,
        }))
        setEmails((prev) => {
          // Remove existing DB emails (by uuid format) and prepend fresh ones
          const mockOnly = prev.filter((e) => !e.id.match(/^[0-9a-f-]{36}$/))
          return [...dbEmails, ...mockOnly]
        })
      })
  }, [profile?.id])

  async function sendEmail(to: string, subject: string, body: string, replyToId?: string): Promise<boolean> {
    setSendingEmail(true)
    setSendError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setSendError('Sessão expirada. Faz login novamente.'); return false }

      const res = await supabase.functions.invoke('send-email', {
        body: { to, subject, body, reply_to_id: replyToId },
      })

      // Extract real error — supabase wraps non-2xx in res.error but body is in res.data
      if (res.error || res.data?.error) {
        let msg = res.data?.error as string | undefined
        if (!msg && res.error) {
          // Try to read context body from FunctionsHttpError
          try {
            const ctx = (res.error as unknown as { context?: Response }).context
            if (ctx) {
              const json = await ctx.json().catch(() => null)
              msg = json?.error ?? json?.message
            }
          } catch { /* ignore */ }
        }
        setSendError(msg ?? res.error?.message ?? 'Erro ao enviar')
        return false
      }

      // Optimistically add to sent folder
      const newEmail: EmailThread = {
        id: res.data.email_id ?? `tmp-${Date.now()}`,
        from: {
          name: profile?.full_name ?? 'Eu',
          email: profile?.email ?? '',
          initials: (profile?.full_name ?? 'EU').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(),
          color: profile?.avatar_color ?? '#4d7aa8',
        },
        subject,
        preview: body.slice(0, 100).replace(/\n/g, ' '),
        body,
        date: new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
        labels: [],
        read: true,
        folder: 'sent',
      }
      setEmails((prev) => [newEmail, ...prev])
      logEmail(to, subject)
      return true
    } catch {
      setSendError('Erro de rede. Tenta novamente.')
      return false
    } finally {
      setSendingEmail(false)
    }
  }

  const accent   = isDark ? '#e05050' : '#b83535'
  const border   = isDark ? '#242422' : '#e4e0da'
  const text     = isDark ? '#e8e4dc' : '#1a1814'
  const muted    = isDark ? '#6b6560' : '#8a857d'
  const faint    = isDark ? '#3a3834' : '#c4bfb8'
  const cardBg   = isDark ? '#161614' : '#ffffff'
  const raisedBg = isDark ? '#111110' : '#f5f4f0'
  const hoverBg  = isDark ? '#1c1c1a' : '#f8f7f4'
  const inputBg  = isDark ? '#111110' : '#f5f4f1'

  const inboxUnread = emails.filter((e) => e.folder === 'inbox' && !e.read).length

  const visibleEmails = emails.filter((e) => {
    if (activeLabel) return e.labels.includes(activeLabel)
    if (e.folder !== activeFolder) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      e.from.name.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q) ||
      e.preview.toLowerCase().includes(q)
    )
  })

  const selectedEmail = emails.find((e) => e.id === selectedId) ?? null

  function archiveEmail(id: string) {
    updateEmails((prev) => prev.map((e) => e.id === id ? { ...e, previousFolder: e.folder, folder: 'archived' as FolderKey } : e))
    setSelectedId(null)
  }

  function deleteEmail(id: string) {
    updateEmails((prev) => {
      const email = prev.find((e) => e.id === id)
      if (email?.folder === 'trash') {
        // Restaurar para a pasta anterior, ou inbox se não houver
        const restore = email.previousFolder ?? 'inbox'
        return prev.map((e) => e.id === id ? { ...e, folder: restore, previousFolder: undefined } : e)
      }
      return prev.map((e) => e.id === id ? { ...e, previousFolder: e.folder, folder: 'trash' as FolderKey } : e)
    })
    setSelectedId(null)
  }

  function toggleLabel(id: string, label: LabelKey) {
    updateEmails((prev) => prev.map((e) => e.id === id
      ? { ...e, labels: e.labels.includes(label) ? e.labels.filter((l) => l !== label) : [...e.labels, label] }
      : e
    ))
  }

  function markRead(id: string) {
    updateEmails((prev) => prev.map((e) => e.id === id ? { ...e, read: true } : e))
  }

  function forwardEmail(email: EmailThread) {
    setComposeTo('')
    setComposeSubject(`Fwd: ${email.subject}`)
    setComposeBody(`\n\n--- Mensagem original ---\nDe: ${email.from.name} <${email.from.email}>\n\n${email.body}`)
    setComposeSent(false)
    setShowCompose(true)
  }

  return (
    <div style={{
      display: 'flex', height: '100%', overflow: 'hidden',
      backgroundColor: isDark ? '#0d0c0a' : '#f5f4f0',
    }}>

      {/* ── Left panel ── */}
      <aside style={{
        width: '220px', minWidth: '220px', flexShrink: 0,
        backgroundColor: raisedBg,
        borderRight: `1px solid ${border}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Title */}
        <div style={{ padding: '16px 16px 10px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <Mail size={18} color={text} />
            <p style={{ fontSize: '20px', fontWeight: 600, color: text, letterSpacing: '-0.03em', margin: 0 }}>Email</p>
          </div>
          <p style={{ fontSize: '13px', color: muted, marginTop: '2px' }}>
            {inboxUnread > 0 ? `${inboxUnread} não lido${inboxUnread > 1 ? 's' : ''}` : 'Tudo lido'}
          </p>
        </div>

        {/* Escrever button */}
        <div style={{ padding: '12px 12px 8px' }}>
          <button
            type="button"
            onClick={() => { setShowCompose(true); setComposeSent(false); setComposeTo(''); setComposeSubject(''); setComposeBody('') }}
            style={{
              width: '100%', height: '34px', borderRadius: '4px',
              backgroundColor: '#b83535',
              color: '#ffffff',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Plus style={{ width: '13px', height: '13px' }} />
            Escrever
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 12px 10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            height: '30px', borderRadius: '6px',
            backgroundColor: inputBg,
            border: `1px solid ${border}`, padding: '0 9px',
          }}>
            <Search style={{ width: '11px', height: '11px', color: faint, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'none', outline: 'none',
                fontSize: '12px', color: text,
              }}
            />
          </div>
        </div>

        {/* Folders */}
        <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {FOLDERS.map(({ key, label, icon: Icon }) => {
            const isActive = key === activeFolder
            const badge = key === 'inbox' ? inboxUnread : 0
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setActiveFolder(key); setActiveLabel(null); setSelectedId(null); setShowReply(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  height: '32px', padding: '0 10px', borderRadius: '0',
                  border: 'none', borderLeft: isActive ? `2px solid ${accent}` : '2px solid transparent',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  fontSize: '12px', fontWeight: isActive ? 600 : 500,
                  color: isActive ? accent : muted,
                  backgroundColor: isActive ? (isDark ? 'rgba(184,53,53,0.07)' : 'rgba(184,53,53,0.05)') : 'transparent',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = hoverBg }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <Icon style={{ width: '13px', height: '13px', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && (
                  <span style={{
                    fontSize: '9px', fontWeight: 700, minWidth: '18px', height: '16px',
                    borderRadius: '3px', backgroundColor: '#b83535', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Labels */}
        <div style={{ padding: '16px 12px 8px', marginTop: '8px', borderTop: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
            <Tag style={{ width: '10px', height: '10px', color: faint }} />
            <span style={{ fontSize: '9px', fontWeight: 700, color: faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Etiquetas
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {(Object.entries(LABEL_CONFIG) as [LabelKey, typeof LABEL_CONFIG[LabelKey]][]).map(([key, cfg]) => {
              const isActiveLbl = activeLabel === key
              const count = emails.filter((e) => e.labels.includes(key)).length
              return (
                <button key={key} type="button"
                  onClick={() => { setActiveLabel(isActiveLbl ? null : key); setSelectedId(null) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    height: '28px', padding: '0 10px', borderRadius: '6px', cursor: 'pointer',
                    border: 'none', width: '100%', textAlign: 'left',
                    backgroundColor: isActiveLbl ? `${cfg.color}14` : 'transparent',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => { if (!isActiveLbl) e.currentTarget.style.backgroundColor = hoverBg }}
                  onMouseLeave={(e) => { if (!isActiveLbl) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: isActiveLbl ? cfg.color : muted, fontWeight: isActiveLbl ? 600 : 400, flex: 1 }}>{cfg.label}</span>
                  {count > 0 && <span style={{ fontSize: '10px', color: isActiveLbl ? cfg.color : faint }}>{count}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </aside>

      {/* ── Center panel (email list) ── */}
      <div style={{
        width: '340px', minWidth: '300px', flexShrink: 0,
        borderRight: `1px solid ${border}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: cardBg,
      }}>
        {/* Header */}
        <div style={{
          height: '48px', minHeight: '48px', padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${border}`, flexShrink: 0,
          backgroundColor: isDark ? '#111110' : '#fafaf8',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {activeLabel ? LABEL_CONFIG[activeLabel].label : (FOLDERS.find((f) => f.key === activeFolder)?.label ?? 'Email')}
          </span>
          <span style={{ fontSize: '10px', color: muted }}>
            {visibleEmails.length} mensagem{visibleEmails.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {visibleEmails.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: faint, fontSize: '12px' }}>
              Nenhum email encontrado
            </div>
          ) : (
            visibleEmails.map((email) => {
              const isSelected = email.id === selectedId
              return (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => { setSelectedId(email.id); setShowReply(false); if (!email.read) markRead(email.id) }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    width: '100%', padding: '11px 16px', textAlign: 'left',
                    border: 'none', borderBottom: `1px solid ${border}`, cursor: 'pointer',
                    borderLeft: isSelected ? `3px solid ${accent}` : '3px solid transparent',
                    paddingLeft: isSelected ? '13px' : '16px',
                    backgroundColor: isSelected
                      ? (isDark ? 'rgba(184,53,53,0.08)' : 'rgba(184,53,53,0.06)')
                      : !email.read
                        ? (isDark ? '#161614' : '#fafaf8')
                        : 'transparent',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = hoverBg }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = !email.read ? (isDark ? '#161614' : '#fafaf8') : 'transparent' }}
                >
                  <AvatarInitials initials={email.from.initials} color={email.from.color} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '12px', fontWeight: !email.read ? 700 : 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                        {email.from.name}
                      </span>
                      <span style={{ fontSize: '10px', color: faint, flexShrink: 0 }}>{email.date}</span>
                    </div>
                    <p style={{ fontSize: '11.5px', fontWeight: !email.read ? 600 : 400, color: !email.read ? text : muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                      {email.subject}
                    </p>
                    <p style={{ fontSize: '11px', color: faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: email.labels.length > 0 ? '5px' : '0' }}>
                      {email.preview}
                    </p>
                    {email.labels.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {email.labels.map((lk) => <LabelBadge key={lk} labelKey={lk} />)}
                      </div>
                    )}
                  </div>
                  {!email.read && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#b83535', flexShrink: 0, marginTop: '6px' }} />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right panel (email view) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, backgroundColor: cardBg }}>
        {selectedEmail ? (
          <>
            {/* Email header */}
            <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: text, lineHeight: 1.3, flex: 1, marginRight: '16px' }}>
                  {selectedEmail.subject}
                </h2>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, position: 'relative' }}>
                  {/* Label picker */}
                  <button type="button"
                    onClick={() => setShowLabelMenu((v) => !v)}
                    title="Gerir etiquetas"
                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${showLabelMenu ? accent : border}`, backgroundColor: showLabelMenu ? 'rgba(184,53,53,0.08)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: showLabelMenu ? accent : muted }}
                    onMouseEnter={(e) => { if (!showLabelMenu) e.currentTarget.style.backgroundColor = hoverBg }}
                    onMouseLeave={(e) => { if (!showLabelMenu) e.currentTarget.style.backgroundColor = 'transparent' }}>
                    <Tag style={{ width: '12px', height: '12px' }} />
                  </button>
                  {/* Delete button */}
                  <button type="button"
                    onClick={() => deleteEmail(selectedEmail.id)}
                    title={selectedEmail.folder === 'trash' ? 'Restaurar email' : 'Mover para lixeira'}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={(e) => { const b = e.currentTarget; b.style.backgroundColor = 'rgba(184,53,53,0.08)'; b.style.borderColor = accent; b.style.color = accent }}
                    onMouseLeave={(e) => { const b = e.currentTarget; b.style.backgroundColor = 'transparent'; b.style.borderColor = border; b.style.color = muted }}>
                    <Trash2 style={{ width: '12px', height: '12px' }} />
                  </button>
                  {/* Dropdown */}
                  {showLabelMenu && (
                    <div style={{ position: 'absolute', top: '32px', right: 0, zIndex: 50, backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '10px', padding: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {(Object.entries(LABEL_CONFIG) as [LabelKey, typeof LABEL_CONFIG[LabelKey]][]).map(([key, cfg]) => {
                        const has = selectedEmail.labels.includes(key)
                        return (
                          <button key={key} type="button"
                            onClick={() => { toggleLabel(selectedEmail.id, key); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: has ? `${cfg.color}14` : 'transparent', width: '100%', textAlign: 'left' }}
                            onMouseEnter={(e) => { if (!has) e.currentTarget.style.backgroundColor = hoverBg }}
                            onMouseLeave={(e) => { if (!has) e.currentTarget.style.backgroundColor = 'transparent' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', fontWeight: has ? 600 : 400, color: has ? cfg.color : text, flex: 1 }}>{cfg.label}</span>
                            {has && <span style={{ fontSize: '10px', color: cfg.color }}>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AvatarInitials initials={selectedEmail.from.initials} color={selectedEmail.from.color} size={38} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: text }}>{selectedEmail.from.name}</span>
                    <span style={{ fontSize: '11px', color: muted, wordBreak: 'break-all' }}>&lt;{selectedEmail.from.email}&gt;</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: muted }}>Para: robert.sousa@aureatech.io</span>
                    <span style={{ color: faint, fontSize: '10px' }}>·</span>
                    <span style={{ fontSize: '11px', color: faint }}>{selectedEmail.date}</span>
                  </div>
                  {selectedEmail.labels.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                      {selectedEmail.labels.map((lk) => <LabelBadge key={lk} labelKey={lk} />)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{
                fontSize: '13.5px', lineHeight: 1.8, color: text,
                whiteSpace: 'pre-wrap', maxWidth: '640px',
              }}>
                {selectedEmail.body}
              </div>
            </div>

            {/* Reply compose area */}
            {showReply && (
              <div style={{
                margin: '0 24px 16px', borderRadius: '4px',
                border: `1px solid ${border}`,
                backgroundColor: isDark ? '#111110' : '#fafaf8',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${border}` }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: muted }}>
                    Responder a {selectedEmail.from.name}
                  </span>
                  <button type="button" onClick={() => setShowReply(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex', alignItems: 'center' }}>
                    <X style={{ width: '13px', height: '13px' }} />
                  </button>
                </div>
                <textarea
                  autoFocus
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escreva a sua resposta..."
                  style={{
                    width: '100%', minHeight: '100px', padding: '12px 14px',
                    border: 'none', outline: 'none', resize: 'none',
                    backgroundColor: 'transparent', color: text, fontSize: '13px',
                    lineHeight: 1.6, boxSizing: 'border-box',
                  }}
                />
                <div style={{ padding: '8px 14px', display: 'flex', gap: '8px', borderTop: `1px solid ${border}` }}>
                  {replySent ? (
                    <span style={{ fontSize: '12px', color: '#2c5545', fontWeight: 600, padding: '6px 0' }}>✓ Resposta enviada</span>
                  ) : (
                    <button type="button"
                      disabled={!replyText.trim() || sendingEmail}
                      onClick={async () => {
                        const ok = await sendEmail(selectedEmail.from.email, `Re: ${selectedEmail.subject}`, replyText.trim())
                        if (ok) { markRead(selectedEmail.id); setReplySent(true); setTimeout(() => { setShowReply(false); setReplyText(''); setReplySent(false) }, 1500) }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        height: '30px', padding: '0 14px', borderRadius: '4px',
                        backgroundColor: replyText.trim() ? '#b83535' : (isDark ? '#2a2a28' : '#e4e0da'),
                        color: replyText.trim() ? '#fff' : muted, border: 'none',
                        fontSize: '11px', fontWeight: 700, cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}
                      onMouseEnter={(e) => { if (replyText.trim()) e.currentTarget.style.opacity = '0.85' }}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <Send style={{ width: '11px', height: '11px' }} />
                      Enviar
                    </button>
                  )}
                  <button type="button" onClick={() => { setShowReply(false); setReplySent(false) }}
                    style={{
                      height: '30px', padding: '0 12px', borderRadius: '4px',
                      backgroundColor: 'transparent', border: `1px solid ${border}`,
                      color: muted, fontSize: '11px', cursor: 'pointer',
                    }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Action bar */}
            <div style={{ borderTop: `1px solid ${border}`, padding: '12px 24px', display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowReply((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  height: '32px', padding: '0 14px', borderRadius: '4px',
                  backgroundColor: showReply ? (isDark ? 'rgba(184,53,53,0.08)' : 'rgba(184,53,53,0.06)') : '#b83535',
                  color: showReply ? accent : '#fff',
                  border: showReply ? `1px solid ${accent}` : 'none',
                  cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Reply style={{ width: '12px', height: '12px' }} />
                Responder
              </button>
              {([
                { icon: Forward, label: 'Reencaminhar', action: () => forwardEmail(selectedEmail) },
                { icon: Archive, label: 'Arquivar',     action: () => archiveEmail(selectedEmail.id) },
              ] as { icon: React.ComponentType<{ style?: React.CSSProperties }>, label: string, action: () => void }[]).map(({ icon: Icon, label, action }) => (
                <button key={label} type="button" onClick={action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    height: '32px', padding: '0 12px', borderRadius: '4px',
                    backgroundColor: 'transparent', color: muted,
                    border: `1px solid ${border}`, cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    transition: 'border-color 0.12s ease, color 0.12s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted }}
                >
                  <Icon style={{ width: '12px', height: '12px' }} />
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              backgroundColor: raisedBg, border: `1px solid ${border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '4px',
            }}>
              <Mail style={{ width: '22px', height: '22px', color: muted }} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: text }}>
              Selecione um email
            </p>
            <p style={{ fontSize: '12px', color: muted }}>
              Escolha uma conversa na lista à esquerda
            </p>
          </div>
        )}
      </div>

      {/* ── Compose Modal ── */}
      {showCompose && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', pointerEvents: 'all' }}>
          <div style={{ width: 'min(720px, 92vw)', height: 'min(600px, 88vh)', backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: '14px', boxShadow: '0 24px 80px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', backgroundColor: isDark ? '#1a1a18' : '#1a1814', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Nova mensagem</span>
              <button type="button" onClick={() => setShowCompose(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: '2px', display: 'flex' }}>
                <X style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
            {composeSent ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>✓</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: text }}>Mensagem enviada</p>
                <p style={{ fontSize: '12px', color: muted, marginTop: '4px' }}>O email foi colocado na caixa de enviados.</p>
                <button type="button" onClick={() => setShowCompose(false)} style={{ marginTop: '16px', fontSize: '12px', fontWeight: 600, color: accent, background: 'none', border: 'none', cursor: 'pointer' }}>Fechar</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    { label: 'Para', value: composeTo, onChange: setComposeTo, placeholder: 'destinatario@email.com' },
                    { label: 'Assunto', value: composeSubject, onChange: setComposeSubject, placeholder: 'Assunto da mensagem' },
                  ].map(({ label, value, onChange, placeholder }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${border}`, overflow: 'hidden' }}>
                      <span style={{ width: '70px', minWidth: '70px', padding: '11px 12px 11px 16px', fontSize: '12px', color: muted, flexShrink: 0 }}>{label}</span>
                      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '13px', color: text, padding: '11px 16px 11px 0', fontFamily: 'inherit' }} />
                    </div>
                  ))}
                </div>
                <textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Escreva a sua mensagem..."
                  style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '13px', color: text, padding: '14px 16px', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6 }} />
                <div style={{ padding: '12px 16px', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button type="button"
                    disabled={!composeTo.trim() || !composeSubject.trim() || sendingEmail}
                    onClick={async () => {
                      const ok = await sendEmail(composeTo.trim(), composeSubject.trim(), composeBody.trim())
                      if (ok) setComposeSent(true)
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 18px', height: '34px', borderRadius: '4px', backgroundColor: (!composeTo.trim() || !composeSubject.trim() || sendingEmail) ? (isDark ? '#2a2a28' : '#e4e0da') : '#b83535', color: (!composeTo.trim() || !composeSubject.trim() || sendingEmail) ? muted : '#fff', border: 'none', cursor: (!composeTo.trim() || !composeSubject.trim() || sendingEmail) ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {sendingEmail
                      ? <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                      : <Send style={{ width: '12px', height: '12px' }} />
                    }
                    {sendingEmail ? 'A enviar...' : 'Enviar'}
                  </button>
                  <button type="button" onClick={() => { setShowCompose(false); setSendError(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: '12px', padding: '6px 10px' }}>Cancelar</button>
                  {sendError && <span style={{ fontSize: '11px', color: accent, flex: 1 }}>{sendError}</span>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
