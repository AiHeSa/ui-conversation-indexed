# Regenerate completed response

Status: implemented

## Problem

Completed Assistant answers exposed Copy and Branch actions, but users could not request another answer to the same question without manually reconstructing the original prompt and attachments.

## Decision

Add a Regenerate action immediately after Copy on completed turn tails. The action owns a small anchored dialog with an optional clarification field. Confirmation submits the turn-opening user content as a new queued prompt; durable image attachments are read from the active session and serialized again. A non-empty clarification is trimmed and appended as a final text block.

The feature deliberately creates a new turn. It does not rewrite event history, delete the old answer, or create a forked session.

## Interaction

- Empty confirmation repeats the original question unchanged.
- `Ctrl+Enter` and `Command+Enter` confirm.
- `Escape`, Cancel, and outside pointer input dismiss an idle dialog.
- While submission is pending, inputs remain disabled and the dialog cannot be dismissed.
- A business or attachment failure keeps the draft visible and presents a retryable localized error.

## Boundaries

- The opening user node must be present in the loaded chat projection.
- Only direct user text and durable image blocks are replayed.
- Existing composer, queue, branch, and transcript-history behavior is unchanged.

## Verification

Component tests cover completed-turn visibility, supplemented and blank submission, keyboard confirmation, failure feedback, and dismissal. Controller tests cover text replay, durable image serialization, trimming, and blank-supplement fidelity.
