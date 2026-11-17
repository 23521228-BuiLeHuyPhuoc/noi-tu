# Android polish plan

Each phase ends with an APK installed on the USB phone, screenshots of the
changed flows, and user review before the next phase. Build the store AAB only
after the user accepts the device test.

## Phase 1: Avatars and gameplay layout (in progress)

- Restore all 26 preset portraits and custom character SVGs on Android.
- Provide a visible portrait fallback when an uploaded image fails.
- Fix clipped or compressed content in room and game screens.
- Reproduce word-chain typing flashes with USB screen recording. Verify
  sustained typing, deleting, and keyboard reopening on the final APK.
- Inspect home, profile, lobby, Vietnamese/English word chain, Bau Cua and
  Ty Phu on the phone, including keyboard transitions and long player names.
- Preserve the existing web artwork and visual language.

Acceptance: visible avatars, readable game information, accessible primary
actions, no disappearing game content while typing, and no new runtime errors
in the inspected flows.

### Device checkpoint: 2026-11-13

Installed APK build `7433c3d1-cb01-4815-b0eb-dff0db25b446` on the Galaxy A14.
Verified all 26 original character portraits in the profile picker. A 25-second
USB recording of continuous word-chain typing and deletion shows the input
remaining visible, with no recurrence of the disappearing game content seen
in the before recording. Typecheck, lint and Android/web exports passed.

Remaining before Phase 1 review: retest English word chain, chat keyboard
transitions, Bau Cua and landscape Ty Phu on this APK. USB device disconnected
during the remaining checks. Long word definitions can still require scrolling
while typing; prioritize the word and timer when reorganizing screens in Phase 2.

## Phase 2: Buttons and screen organization

- Standardize touch targets, spacing, selected/disabled states and placement.
- Keep primary game actions visible; split secondary content into tabs or sheets.
- Reduce unnecessary scrolling without shrinking text or touch targets.
- Prioritize landscape for Ty Phu. Keep portrait usable with a rotation hint
  if needed; do not stretch the board to fill a tall portrait screen.
- Keep scrolling for genuinely long catalogs and histories.

Acceptance: primary actions remain easy to reach on the test phone, including
with the keyboard open.

## Phase 3: Effects and social interactions

- Audit effect origin/target coordinates, clipping, stacking and timing.
- Improve the visual consistency of chat, stickers, throws and hit effects.
- Simplify player targeting and chat/sticker selection.
- Add new effects after the existing set behaves correctly.
- Check simultaneous effects and performance on the test phone.

Acceptance: effects stay attached to their intended targets after layout and
keyboard changes, and do not obstruct essential game controls.
