# Agent Note: Streaming-safe conversation index refresh

Status: implemented

## Problem

The conversation index originally observed every text and child mutation under the rendered transcript. Each mutation synchronously rescanned every chat row and heading and serialized the complete index for comparison. Assistant streaming changes ordinary text frequently, so the observer duplicated work already performed by the conversation renderer and could monopolize the browser main thread on long sessions. Session events remained durable and switching conversations rendered the accumulated snapshot, but the active transcript could appear stale while streaming.

## Decision

The rendered DOM remains the source for index headings, but observation is limited to mutations that can change indexed data:

- ordinary text mutations outside `H1` through `H3` are ignored;
- added or removed chat rows and `H1` through `H3` structures request a refresh;
- heading text mutations request a refresh;
- repeated requests are coalesced into one `requestAnimationFrame` callback;
- hiding the index disconnects its streaming observer;
- index equality uses an explicit field comparison instead of serializing the complete value.

Changes to the conversation row order still trigger the existing synchronous layout-effect scan, so newly appended turns and prepended history are indexed before paint. A persisted hidden index performs that structural scan so its restore control remains available, but it does not subscribe to subsequent streaming mutations.

## Verification

The component test drives a synthetic mutation observer and animation-frame queue. It proves that ordinary paragraph streaming schedules no scan, repeated heading mutations schedule one frame, the heading entry updates after that frame, and hiding the index disconnects the observer.
