// Shared IconActions chrome for user and assistant messages: copy,
// optional regeneration and branch wiring, and a date-aware clock.

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  IconBranchOutline16, IconCheckOutline16, IconCopyOutline16, IconRefreshOutline16, Tooltip, writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import { formatLatencySeconds, formatMessageClock, formatRunDuration, formatTokensPerSecond } from './message-chrome.ts'
import { useCalendarDay } from './use-calendar-day.ts'
import css from './MessageIconActions.module.css'

export interface MessageIconActionsProps {
  /** Plain text the copy action writes. */
  text: string
  /** Unix epoch ms for the clock label; omitted for transient messages. */
  time?: number | undefined
  /** Turn wall time in ms, appended to the clock as `· Ran for 15s`; omitted when the turn's start is unknown. */
  runMs?: number | undefined
  /** Turn first-step TTFT in ms, appended as `· TTFT 1.2s`; omitted when unrecorded. */
  ttftMs?: number | undefined
  /** Turn decode throughput, appended as `· 34 tok/s`; omitted when unrecorded. */
  tokensPerSecond?: number | undefined
  /** Clock before icons (user) or after (assistant). */
  clock: 'start' | 'end'
  /** Fork the session at this message; omission hides the branch action. */
  onBranch?: (() => void) | undefined
  /** Re-submit the original prompt, optionally extended by the popover draft. */
  onRegenerate?: ((supplement: string) => Promise<void>) | undefined
  /** The message is not a completed transcript tail, so branch stays visible but unavailable. */
  branchUnavailable?: boolean | undefined
  /** Parent layout class composed onto the actions row. */
  className?: string | undefined
  /**
   * Slot-rendered actions owned by independent plugins, placed before the
   * built-in branch control.
   */
  extraActions?: ReactNode
  /** The owning view's locale seat, passed down as a plain prop. */
  t: ChatViewSlotProps['t']
}

/**
 * Copy / regenerate / branch (/ clock) actions shared by user and assistant chrome.
 * @param props - Copy text, event time, clock side, callbacks, and className.
 * @returns The actions row element.
 */
export function MessageIconActions({
  text, time, runMs, ttftMs, tokensPerSecond, clock, onBranch, onRegenerate, branchUnavailable = false, className,
  extraActions, t,
}: MessageIconActionsProps) {
  const day = useCalendarDay()
  const reasonId = useId()
  // Same success chrome as CodeBlock: a short check swap after the write,
  // gated so re-clicks during the window neither re-copy nor stack timers.
  const [copied, setCopied] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [supplement, setSupplement] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [regenerateFailed, setRegenerateFailed] = useState(false)
  const regenerateRoot = useRef<HTMLDivElement | null>(null)
  const regenerateButton = useRef<HTMLButtonElement | null>(null)
  const regenerateEpoch = useRef(0)
  const copyPending = useRef(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyEpoch = useRef(0)
  useEffect(() => () => {
    copyEpoch.current += 1
    copyPending.current = false
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    regenerateEpoch.current += 1
  }, [])
  useEffect(() => {
    if (!regenerateOpen || regenerating) return
    const closeOnOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && regenerateRoot.current?.contains(event.target) === true) return
      setRegenerateOpen(false)
      setRegenerateFailed(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    return () => { document.removeEventListener('pointerdown', closeOnOutside) }
  }, [regenerateOpen, regenerating])
  const onCopy = useCallback(() => {
    if (copied || copyPending.current) return
    const epoch = copyEpoch.current
    copyPending.current = true
    void writeClipboard(text).then((ok) => {
      if (epoch !== copyEpoch.current) return
      copyPending.current = false
      if (!ok) return
      setCopied(true)
      copyTimer.current = window.setTimeout(() => {
        copyTimer.current = null
        setCopied(false)
      }, 1000)
    })
  }, [copied, text])
  const closeRegenerate = useCallback(() => {
    if (regenerating) return
    setRegenerateOpen(false)
    setRegenerateFailed(false)
    regenerateButton.current?.focus()
  }, [regenerating])
  const submitRegenerate = useCallback(() => {
    if (onRegenerate === undefined || regenerating) return
    const epoch = ++regenerateEpoch.current
    setRegenerating(true)
    setRegenerateFailed(false)
    void onRegenerate(supplement).then(() => {
      if (epoch !== regenerateEpoch.current) return
      setRegenerating(false)
      setRegenerateOpen(false)
      setSupplement('')
    }, () => {
      if (epoch !== regenerateEpoch.current) return
      setRegenerating(false)
      setRegenerateFailed(true)
    })
  }, [onRegenerate, regenerating, supplement])
  const onRegenerateKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeRegenerate()
      return
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      submitRegenerate()
    }
  }, [closeRegenerate, submitRegenerate])
  // The dot is decorative and stays hidden, but its margins separate the
  // readings only on screen: without the flanking spaces a reader hears one
  // run-on string ("Ran for 13sTTFT 0.2s12 tok/s") instead of three facts.
  const clockEl = time === undefined ? null : (
    <span className={clock === 'start' ? css.timeStart : css.timeEnd}>
      {formatMessageClock(time, t, day)}
      {runMs !== undefined && (
        <>
          {' '}
          <span className={css.runTimeDot} aria-hidden>·</span>
          {' '}
          {t('message.ranFor', { duration: formatRunDuration(runMs, t) })}
        </>
      )}
      {ttftMs !== undefined && (
        <>
          {' '}
          <span className={css.runTimeDot} aria-hidden>·</span>
          {' '}
          {t('message.ttft', { seconds: formatLatencySeconds(ttftMs) })}
        </>
      )}
      {tokensPerSecond !== undefined && (
        <>
          {' '}
          <span className={css.runTimeDot} aria-hidden>·</span>
          {' '}
          {t('message.tokensPerSecond', { tps: formatTokensPerSecond(tokensPerSecond) })}
        </>
      )}
    </span>
  )
  return (
    <div className={className === undefined ? css.actions : `${css.actions} ${className}`}>
      {clock === 'start' ? clockEl : null}
      <Tooltip label={copied ? t('copied') : t('copy')} side="bottom">
        <button type="button" className={css.action} aria-label={copied ? t('copied') : t('copy')} onClick={onCopy}>
          {copied ? <IconCheckOutline16 /> : <IconCopyOutline16 />}
        </button>
      </Tooltip>
      {onRegenerate !== undefined && (
        <div className={css.regenerateRoot} ref={regenerateRoot}>
          <Tooltip label={t('message.regenerate')} side="bottom" disabled={regenerateOpen}>
            <button
              ref={regenerateButton}
              type="button"
              className={css.action}
              aria-label={t('message.regenerate')}
              aria-haspopup="dialog"
              aria-expanded={regenerateOpen}
              onClick={() => {
                setRegenerateOpen(open => !open)
                setRegenerateFailed(false)
              }}
            >
              <IconRefreshOutline16 />
            </button>
          </Tooltip>
          {regenerateOpen && (
            <div className={css.regenerateBubble} role="dialog" aria-label={t('message.regenerate.dialog')}>
              <label className={css.regenerateLabel}>
                {t('message.regenerate.supplement')}
                <textarea
                  autoFocus
                  rows={3}
                  value={supplement}
                  placeholder={t('message.regenerate.placeholder')}
                  disabled={regenerating}
                  onChange={event => { setSupplement(event.currentTarget.value) }}
                  onKeyDown={onRegenerateKeyDown}
                />
              </label>
              {regenerateFailed && <p className={css.regenerateError} role="alert">{t('message.regenerate.failed')}</p>}
              <div className={css.regenerateActions}>
                <button type="button" disabled={regenerating} onClick={closeRegenerate}>{t('message.regenerate.cancel')}</button>
                <button type="button" data-primary disabled={regenerating} onClick={submitRegenerate}>
                  {regenerating ? t('message.regenerate.submitting') : t('message.regenerate.confirm')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {extraActions}
      {onBranch !== undefined && (
        <Tooltip label={branchUnavailable ? t('message.branchUnavailable') : t('message.branch')} side="bottom">
          {/* Native disabled buttons do not deliver the hover/focus events Tooltip needs. */}
          <button
            type="button"
            className={css.action}
            aria-label={t('message.branch')}
            aria-disabled={branchUnavailable || undefined}
            aria-describedby={branchUnavailable ? reasonId : undefined}
            data-unavailable={branchUnavailable || undefined}
            onClick={branchUnavailable ? undefined : onBranch}
          >
            <IconBranchOutline16 />
          </button>
        </Tooltip>
      )}
      {onBranch !== undefined && branchUnavailable && (
        <span id={reasonId} className={css.visuallyHidden}>{t('message.branchUnavailable')}</span>
      )}
      {clock === 'end' ? clockEl : null}
    </div>
  )
}
