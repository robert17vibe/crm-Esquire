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
} from 'lucide-react'

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
  const [activeFolder, setActiveFolder] = useState<FolderKey>('inbox')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
      backgroundColor: 'var(--surface-card)',
    }}>

      {/* ── Left panel ── */}
      <aside style={{
        width: '280px', minWidth: '280px', flexShrink: 0,
        backgroundColor: 'var(--surface-raised)',
        borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Escrever button */}
        <div style={{ padding: '16px 14px 12px' }}>
          <button
            type="button"
            style={{
              width: '100%', height: '36px', borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--brand)', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '7px', fontSize: '13px', fontWeight: 600,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Plus style={{ width: '14px', height: '14px' }} />
            Escrever
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 14px 12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            height: '32px', borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--line)', padding: '0 10px',
          }}>
            <Search style={{ width: '12px', height: '12px', color: 'var(--ink-faint)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Pesquisar emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'none', outline: 'none',
                fontSize: '12px', color: 'var(--ink-base)',
              }}
            />
          </div>
        </div>

        {/* Folders */}
        <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {FOLDERS.map(({ key, label, icon: Icon }) => {
            const isActive = key === activeFolder
            const badge = key === 'inbox' ? inboxUnread : 0
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setActiveFolder(key); setSelectedId(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  height: '34px', padding: '0 10px', borderRadius: 'var(--radius-sm)',
                  border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                  fontSize: '13px', fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--ink-base)' : 'var(--ink-muted)',
                  backgroundColor: isActive ? 'var(--surface-card)' : 'transparent',
                  transition: 'background-color 0.12s ease, color 0.12s ease',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <Icon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && (
                  <span style={{
                    fontSize: '9px', fontWeight: 700, minWidth: '16px', height: '16px',
                    borderRadius: '99px', backgroundColor: 'var(--brand)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            )
          })}

          {/* Trash */}
          <button
            type="button"
            onClick={() => { setActiveFolder('archived'); setSelectedId(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              height: '34px', padding: '0 10px', borderRadius: 'var(--radius-sm)',
              border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
              fontSize: '13px', fontWeight: 500,
              color: 'var(--ink-muted)', backgroundColor: 'transparent',
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Trash2 style={{ width: '14px', height: '14px', flexShrink: 0 }} />
            <span>Lixeira</span>
          </button>
        </nav>

        {/* Labels */}
        <div style={{ padding: '20px 14px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Tag style={{ width: '11px', height: '11px', color: 'var(--ink-faint)' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Etiquetas
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {(Object.entries(LABEL_CONFIG) as [LabelKey, typeof LABEL_CONFIG[LabelKey]][]).map(([key, cfg]) => (
              <div
                key={key}
                style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  height: '30px', padding: '0 10px', borderRadius: 'var(--radius-sm)',
                  cursor: 'default',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Center panel (email list) ── */}
      <div style={{
        width: '380px', minWidth: '380px', flexShrink: 0,
        borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          height: '52px', minHeight: '52px', padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--line)', flexShrink: 0,
        }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-base)' }}>
            {FOLDERS.find((f) => f.key === activeFolder)?.label ?? 'Email'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>
            {visibleEmails.length} mensagem{visibleEmails.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {visibleEmails.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: '13px' }}>
              Nenhum email encontrado
            </div>
          ) : (
            visibleEmails.map((email) => {
              const isSelected = email.id === selectedId
              return (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => setSelectedId(email.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    width: '100%', padding: '12px 16px', textAlign: 'left',
                    border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                    borderLeft: isSelected ? '3px solid var(--brand)' : '3px solid transparent',
                    paddingLeft: isSelected ? '13px' : '16px',
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--brand) 7%, var(--surface-card))'
                      : !email.read
                        ? 'var(--surface-raised)'
                        : 'var(--surface-card)',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-raised)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = !email.read ? 'var(--surface-raised)' : 'var(--surface-card)'
                  }}
                >
                  <AvatarInitials initials={email.from.initials} color={email.from.color} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: !email.read ? 700 : 500, color: 'var(--ink-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                        {email.from.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--ink-faint)', flexShrink: 0 }}>{email.date}</span>
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: !email.read ? 600 : 400, color: 'var(--ink-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '5px' }}>
                      {email.subject}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>
                      {email.preview}
                    </p>
                    {email.labels.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {email.labels.map((lk) => <LabelBadge key={lk} labelKey={lk} />)}
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right panel (email view) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {selectedEmail ? (
          <>
            {/* Email header */}
            <div style={{
              padding: '20px 28px 16px',
              borderBottom: '1px solid var(--line)', flexShrink: 0,
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink-base)', marginBottom: '14px', lineHeight: 1.3 }}>
                {selectedEmail.subject}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AvatarInitials initials={selectedEmail.from.initials} color={selectedEmail.from.color} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink-base)' }}>{selectedEmail.from.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>&lt;{selectedEmail.from.email}&gt;</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Para: robert.sousa@aureatech.io</span>
                    <span style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>{selectedEmail.date}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {selectedEmail.labels.map((lk) => <LabelBadge key={lk} labelKey={lk} />)}
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
              <div style={{
                fontSize: '14px', lineHeight: 1.75, color: 'var(--ink-base)',
                whiteSpace: 'pre-wrap', maxWidth: '680px',
              }}>
                {selectedEmail.body}
              </div>
            </div>

            {/* Action bar */}
            <div style={{
              borderTop: '1px solid var(--line)', padding: '14px 28px',
              display: 'flex', gap: '8px', flexShrink: 0,
            }}>
              <button
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  height: '32px', padding: '0 14px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--brand)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Reply style={{ width: '13px', height: '13px' }} />
                Responder
              </button>
              <button
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  height: '32px', padding: '0 14px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-raised)', color: 'var(--ink-base)',
                  border: '1px solid var(--line)', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-card)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-raised)')}
              >
                <Archive style={{ width: '13px', height: '13px' }} />
                Arquivar
              </button>
              <button
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  height: '32px', padding: '0 14px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-raised)', color: 'var(--ink-base)',
                  border: '1px solid var(--line)', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-card)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-raised)')}
              >
                <Link2 style={{ width: '13px', height: '13px' }} />
                Associar deal
              </button>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              backgroundColor: 'var(--surface-raised)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '4px',
            }}>
              <Mail style={{ width: '22px', height: '22px', color: 'var(--ink-faint)' }} />
            </div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink-base)' }}>
              Selecione um email
            </p>
            <p style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
              Escolha uma conversa na lista à esquerda
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
