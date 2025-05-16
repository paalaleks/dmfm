# Epic 11 – Real-Time Track Timeline & Volume Pop-over

## Context / Why
Users need fine-grained control over playback (seek forward/back) and a clear sense of song progress. The timeline must stay accurate even when the player pop-over is opened late, and the UI should declutter by hiding the volume slider until it's needed.

## Business / User Value
- Higher engagement: users can re-listen to favourite parts or skip undesired sections easily.
- Perceived polish and parity with the native Spotify player.
- Cleaner UI with volume tucked away.

## Primary User Story
```gherkin
As a listener
I want to see a progress bar for the current song and drag or click it to seek
So that I can jump to any point in the track without losing my place when reopening the player.
```

## Acceptance Criteria
1. Timeline bar shows:
   a. Elapsed time on the left (mm:ss).
   b. **Total duration** on the right (mm:ss).
   c. Draggable slider thumb reflecting current position.
2. Slider position updates in real-time (≤ 500 ms lag) while playing; stops when paused.
3. Dragging or clicking the slider calls `player.seek(positionMs)` and updates immediately (seek triggered on pointer/touch release to avoid API spamming).
4. Timeline state (`positionMs`, `durationMs`, `seek()`) is provided by `MusicContext`; any component can subscribe and be current instantly.
5. If no track is loaded, timeline is disabled and shows `0:00 / ––`.
6. Volume control becomes a button with speaker icon. Clicking opens a pop-over containing the existing volume slider and mute toggle; the pop-over **auto-closes on outside click** and is keyboard accessible.
7. UI remains responsive on desktop ≥ 320 px and mobile; timeline shrinks gracefully.
8. Works whether shuffle/repeat are on or off, and with auto-skip ("Discover new") mode engaged.
9. No regression in current Player controls or previous epics; all unit/integration tests continue to pass.
10. Accessibility: both sliders have `role="slider"`, correct `aria-valuemin`, `aria-valuemax`, and `aria-valuenow` attributes, and are keyboard operable.

## Non-Goals / Out of Scope
- Waveform visualisation.
- Showing buffered vs. played portions (Spotify SDK doesn't expose this).
- Skip forward/back by fixed intervals (future enhancement).

## Implementation Notes (high-level)
1. **Extend `MusicContext`**
   - Add `trackPositionMs`, `trackDurationMs` state.
   - Add `seek(positionMs)` wrapper around `player.seek`.
   - Start `setInterval(500)` when a track is playing; clear when paused/null.
   - Listen to `player_state_changed` for authoritative updates to avoid drift.
2. **Refactor `PlayerUI`**
   - Replace the volume slider row with the timeline row (slider + timestamp labels).
   - Introduce `VolumePopover` component: icon button → pop-over with the existing volume slider & mute button.
3. **Update hooks/utilities** (e.g., `usePlayedTrackHistory`) if row order or context changes affect them.
4. **Styling & responsiveness**: ensure timeline fits and truncates text gracefully; pop-over width limited.
5. **Testing**
   - Jest: context exposes accurate values; `seek()` called correctly on slider interaction.
   - Cypress/Playwright: play a track, drag to ~50 %, verify elapsed time ≈ half duration (±2 s).

## Dependencies
- Spotify Web Playback SDK (already integrated).
- `@/components/ui/slider`, `@/components/ui/popover` (already available).

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Position drift between slider and actual playback | Combine interval updates with `player_state_changed` events; periodically resync using the SDK's `getCurrentState()` |
| Rapid slider scrubbing floods Spotify API | Trigger `seek()` only on drag end; throttle if needed |
| Mobile pop-over overflow | Limit pop-over width, use viewport-relative units |

## Test Plan
1. **Unit**: verify context time values increment while playing and pause when stopped.
2. **Integration (Browser)**: play track, open player after 30 s → timeline shows ≈ 30 s.
3. **Accessibility**: tab to slider, use arrow keys to adjust, confirm `seek()` fires.

## Decisions (Resolved Questions)
1. Show **total duration** (mm:ss) rather than remaining time.
2. **No** haptic feedback or toast notification on seek.
3. Pop-over **auto-closes on outside click**. 