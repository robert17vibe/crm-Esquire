import { useState } from 'react'
import {
  Mail,
  Send,
  FileText,
  Archive,
  Trash2,
  Tag,
  Reply,
  Link2,
  Plus,
  Search,
  Forward,
  Star,
  MoreHorizontal,
  X,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type LabelKey = 'importante' | 'follow-up' | 'cliente' | 'interno' | 'proposta'
type FolderKey = 'inbox' | 'sent' | 'drafts' | 'archived'

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
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_EMAILS: EmailThread[] = [
  {
    id: '1',
    from: { name: 'Ana Rodrigues', email: 'ana.rodrigues@globaltech.pt', initials: 'AR', color: '#3b5bdb' },
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
    from: { name: 'Marco Pinto', email: 'm.pinto@solucoesinfinitas.com', initials: 'MP', color: '#2f9e44' },
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
    from: { name: 'Sofia Mendes', email: 'sofia@aureatech.io', initials: 'SM', color: '#e67700' },
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
    from: { name: 'Tomás Ferreira', email: 'tomas.ferreira@nexaflow.io', initials: 'TF', color: '#7048e8' },
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
    from: { name: 'Beatriz Costa', email: 'beatriz@innovaprime.pt', initials: 'BC', color: '#c2255c' },
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
    from: { name: 'Pedro Alves', email: 'pedro.alves@vectordata.pt', initials: 'PA', color: '#0c8599' },
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
    from: { name: 'Inês Lopes', email: 'ines@aureatech.io', initials: 'IL', color: '#5c7cfa' },
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
    from: { name: 'Carlos Nunes', email: 'carlos.nunes@meridian.eu', initials: 'CN', color: '#339af0' },
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
    from: { name: 'Marta Silva', email: 'marta@aureatech.io', initials: 'MS', color: '#f76707' },
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
    from: { name: 'João Baptista', email: 'j.baptista@digitalpulse.pt', initials: 'JB', color: '#2f9e44' },
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
    from: { name: 'Robert Ferreira', email: 'robert.sousa@aureatech.io', initials: 'RF', color: '#3b5bdb' },
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
    from: { name: 'Robert Ferreira', email: 'robert.sousa@aureatech.io', initials: 'RF', color: '#3b5bdb' },
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
    from: { name: 'Robert Ferreira', email: 'robert.sousa@aureatech.io', initials: 'RF', color: '#3b5bdb' },
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
  'importante': { label: 'Importante', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  'follow-up':  { label: 'Follow-up',  color: '#d97706', bg: 'rgba(217,119,6,0.12)'  },
  'cliente':    { label: 'Cliente',    color: '#2563eb', bg: 'rgba(37,99,235,0.12)'   },
  'interno':    { label: 'Interno',    color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  'proposta':   { label: 'Proposta',   color: '#16a34a', bg: 'rgba(22,163,74,0.12)'   },
}

// ─── Folder config ────────────────────────────────────────────────────────────

const FOLDERS: { key: FolderKey; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }[] = [
  { key: 'inbox',    label: 'Caixa de entrada', icon: Mail     },
  { key: 'sent',     label: 'Enviados',          icon: Send     },
  { key: 'drafts',   label: 'Rascunhos',         icon: FileText },
  { key: 'archived', label: 'Arquivados',        icon: Archive  },
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
  const isDark = useThemeStore((s) => s.isDark)
  const [activeFolder, setActiveFolder] = useState<FolderKey>('inbox')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')

  const border   = isDark ? '#242422' : '#e4e0da'
  const text     = isDark ? '#e8e4dc' : '#1a1814'
  const muted    = isDark ? '#6b6560' : '#8a857d'
  const faint    = isDark ? '#3a3834' : '#c4bfb8'
  const cardBg   = isDark ? '#161614' : '#ffffff'
  const raisedBg = isDark ? '#111110' : '#f5f4f0'
  const hoverBg  = isDark ? '#1c1c1a' : '#f8f7f4'
  const inputBg  = isDark ? '#111110' : '#f5f4f1'

  const inboxUnread = MOCK_EMAILS.filter((e) => e.folder === 'inbox' && !e.read).length

  const visibleEmails = MOCK_EMAILS.filter((e) => {
    if (e.folder !== activeFolder) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      e.from.name.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q) ||
      e.preview.toLowerCase().includes(q)
    )
  })

  const selectedEmail = MOCK_EMAILS.find((e) => e.id === selectedId) ?? null

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
          <p style={{ fontSize: '13px', fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>Email</p>
          <p style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>
            {inboxUnread > 0 ? `${inboxUnread} não lido${inboxUnread > 1 ? 's' : ''}` : 'Tudo lido'}
          </p>
        </div>

        {/* Escrever button */}
        <div style={{ padding: '12px 12px 8px' }}>
          <button
            type="button"
            style={{
              width: '100%', height: '34px', borderRadius: '8px',
              backgroundColor: isDark ? '#f0ede5' : '#0f0e0c',
              color: isDark ? '#0f0e0c' : '#f0ede5',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', fontSize: '12px', fontWeight: 700,
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
                onClick={() => { setActiveFolder(key); setSelectedId(null); setShowReply(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  height: '32px', padding: '0 10px', borderRadius: '7px',
                  border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                  fontSize: '12px', fontWeight: isActive ? 600 : 500,
                  color: isActive ? text : muted,
                  backgroundColor: isActive ? (isDark ? '#1e1e1c' : '#eeece8') : 'transparent',
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
                    borderRadius: '99px', backgroundColor: '#2c5545', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => { setActiveFolder('archived'); setSelectedId(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              height: '32px', padding: '0 10px', borderRadius: '7px',
              border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
              fontSize: '12px', fontWeight: 500, color: muted, backgroundColor: 'transparent',
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Trash2 style={{ width: '13px', height: '13px', flexShrink: 0 }} />
            <span>Lixeira</span>
          </button>
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
            {(Object.entries(LABEL_CONFIG) as [LabelKey, typeof LABEL_CONFIG[LabelKey]][]).map(([key, cfg]) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                height: '28px', padding: '0 10px', borderRadius: '6px', cursor: 'pointer',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: muted }}>{cfg.label}</span>
              </div>
            ))}
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
            {FOLDERS.find((f) => f.key === activeFolder)?.label ?? 'Email'}
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
                  onClick={() => { setSelectedId(email.id); setShowReply(false) }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    width: '100%', padding: '11px 16px', textAlign: 'left',
                    border: 'none', borderBottom: `1px solid ${border}`, cursor: 'pointer',
                    borderLeft: isSelected ? '3px solid #2c5545' : '3px solid transparent',
                    paddingLeft: isSelected ? '13px' : '16px',
                    backgroundColor: isSelected
                      ? (isDark ? '#0d1a14' : '#f0f7f3')
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
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2c5545', flexShrink: 0, marginTop: '6px' }} />
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
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button type="button" style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <Star style={{ width: '12px', height: '12px' }} />
                  </button>
                  <button type="button" style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <MoreHorizontal style={{ width: '12px', height: '12px' }} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AvatarInitials initials={selectedEmail.from.initials} color={selectedEmail.from.color} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: text }}>{selectedEmail.from.name}</span>
                    <span style={{ fontSize: '11px', color: muted }}>&lt;{selectedEmail.from.email}&gt;</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: muted }}>Para: robert.sousa@aureatech.io</span>
                    <span style={{ fontSize: '11px', color: faint }}>{selectedEmail.date}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {selectedEmail.labels.map((lk) => <LabelBadge key={lk} labelKey={lk} />)}
                    </div>
                  </div>
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
                margin: '0 24px 16px', borderRadius: '10px',
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
                  <button type="button"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      height: '30px', padding: '0 14px', borderRadius: '7px',
                      backgroundColor: '#2c5545', color: '#fff', border: 'none',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <Send style={{ width: '11px', height: '11px' }} />
                    Enviar
                  </button>
                  <button type="button" onClick={() => setShowReply(false)}
                    style={{
                      height: '30px', padding: '0 12px', borderRadius: '7px',
                      backgroundColor: 'transparent', border: `1px solid ${border}`,
                      color: muted, fontSize: '12px', cursor: 'pointer',
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
                  height: '32px', padding: '0 14px', borderRadius: '8px',
                  backgroundColor: showReply ? (isDark ? '#0d1a14' : '#f0f7f3') : '#2c5545',
                  color: showReply ? '#2c5545' : '#fff',
                  border: showReply ? '1px solid #2c5545' : 'none',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Reply style={{ width: '12px', height: '12px' }} />
                Responder
              </button>
              {[
                { icon: Forward, label: 'Reencaminhar' },
                { icon: Archive, label: 'Arquivar' },
                { icon: Link2,   label: 'Associar deal' },
              ].map(({ icon: Icon, label }) => (
                <button key={label} type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    height: '32px', padding: '0 12px', borderRadius: '8px',
                    backgroundColor: 'transparent', color: muted,
                    border: `1px solid ${border}`, cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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

    </div>
  )
}
