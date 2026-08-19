import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import css from './ConversationIndex.module.css'

interface IndexHeading {
  readonly id: string
  readonly depth: 1 | 2 | 3
  readonly label: string
}

interface IndexTurn {
  readonly turn: string
  readonly targetId: string
  readonly label: string
  readonly headings: readonly IndexHeading[]
}

function sameIndex(left: readonly IndexTurn[], right: readonly IndexTurn[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function targetById(root: HTMLElement, id: string): HTMLElement | null {
  for (const target of root.querySelectorAll<HTMLElement>('[data-conversation-index-target]')) {
    if (target.id === id) return target
  }
  return null
}

/** Build the navigation model from the semantic transcript the reader actually sees. */
function scanIndex(root: HTMLElement, turnLabel: (turn: string) => string): IndexTurn[] {
  const entries = new Map<string, { target: HTMLElement; label: string; headings: IndexHeading[] }>()
  let pendingUser: { target: HTMLElement; label: string | undefined } | null = null

  for (const row of root.querySelectorAll<HTMLElement>('[data-chat-flow-key]')) {
    if (row.dataset.chatFlowKind === 'user') {
      pendingUser = { target: row, label: row.dataset.chatIndexTitle }
    }
    const turn = row.dataset.chatTurn
    if (turn === undefined) continue
    let entry = entries.get(turn)
    if (entry === undefined) {
      const target = pendingUser?.target ?? row
      const targetId = `dsh-conversation-turn-${turn}`
      target.id = targetId
      target.dataset.conversationIndexTarget = 'turn'
      entry = { target, label: pendingUser?.label ?? turnLabel(turn), headings: [] }
      entries.set(turn, entry)
      pendingUser = null
    }
    for (const heading of row.querySelectorAll<HTMLHeadingElement>('h1, h2, h3')) {
      const label = heading.textContent.replace(/\s+/g, ' ').trim()
      if (label === '') continue
      const depth = Number(heading.tagName.slice(1)) as 1 | 2 | 3
      const id = `dsh-conversation-turn-${turn}-heading-${entry.headings.length + 1}`
      heading.id = id
      heading.dataset.conversationIndexTarget = 'heading'
      entry.headings.push({ id, depth, label })
    }
  }

  return [...entries].map(([turn, entry]) => ({
    turn,
    targetId: entry.target.id,
    label: entry.label,
    headings: entry.headings,
  }))
}

/** Wide-screen, turn-card index over the rendered conversation and its H1-H3 headings. */
export function ConversationIndex({ flowRef, revision, t }: {
  /** The rendered Chat flow whose rows and semantic headings are indexed. */
  flowRef: RefObject<HTMLDivElement>
  /** Flow-order identity used to rescan synchronously after paging or a new row. */
  revision: readonly string[]
  /** Conversation locale translator. */
  t: ChatViewSlotProps['t']
}) {
  const [turns, setTurns] = useState<readonly IndexTurn[]>([])
  const timerRef = useRef<number | undefined>()

  useLayoutEffect(() => {
    const flow = flowRef.current
    if (flow === null) return
    const update = (): void => {
      const next = scanIndex(flow, turn => t('chat.index.turn', { turn }))
      setTurns(current => sameIndex(current, next) ? current : next)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(flow, { childList: true, characterData: true, subtree: true })
    return () => {
      observer.disconnect()
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    }
  }, [flowRef, revision, t])

  if (turns.length === 0) return null

  const locate = (id: string): void => {
    const flow = flowRef.current
    if (flow === null) return
    const target = targetById(flow, id)
    if (target === null) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    target.dataset.conversationIndexLocated = 'true'
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      delete target.dataset.conversationIndexLocated
      timerRef.current = undefined
    }, 1200)
  }

  return (
    <nav className={css.index} aria-label={t('chat.index.title')}>
      <div className={css.title}>{t('chat.index.title')}</div>
      <div className={css.cards}>
        {turns.map((turn, index) => (
          <section className={css.card} key={turn.turn}>
            <button className={css.turn} type="button" onClick={() => { locate(turn.targetId) }}>
              <span className={css.number}>{String(index + 1).padStart(2, '0')}</span>
              <span className={css.turnLabel}>{turn.label}</span>
            </button>
            {turn.headings.length > 0 && (
              <div className={css.headings}>
                {turn.headings.map(heading => (
                  <button
                    className={css.heading}
                    data-depth={heading.depth}
                    key={heading.id}
                    type="button"
                    title={heading.label}
                    onClick={() => { locate(heading.id) }}
                  >
                    {heading.label}
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </nav>
  )
}
