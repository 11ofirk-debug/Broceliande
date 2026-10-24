# Broceliande — M1g Addendum: Drop Pop, Footstep Route Preview, Sound

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1F`). Everything there still applies unless this document overrides it. This addendum **overrides the main spec's "no sound" rule** (§2.2) in a limited way: simple synthesised sound effects only, no music, no audio files.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Drop pop animation

Overrides how drops appear in M1d §1.2. Final resting positions are unchanged.

### 1.1 Motion

- Each drop item starts at the enemy's death point and flies in a curved arc to its final resting position in the cluster.
- The arc rises `DROP_POP_HEIGHT` (about 35 px) above the straight line between start and end, then falls back to ground level. Use a simple parabola over `DROP_POP_TIME` (0.35 s).
- Draw a small ground shadow under each item that stays on the ground line, shrinking slightly as the item rises. This makes the height readable from the top-down view.
- On landing: a tiny squash-and-settle (about 0.08 s).
- If a single item drops, give it a short random final offset (a few pixels) so it still visibly arcs rather than popping straight up and down.

### 1.2 Stagger

- When an enemy drops more than one item, launch them `DROP_POP_STAGGER` (0.1 s) apart, in the order they're rolled.

### 1.3 Gameplay timing

- An item can't be targeted or collected by Squirrels until it has **landed**.
- Items still in the air when Combat ends (enter `ENDING`) freeze in place along with everything else.
- Drop animation uses simulation time (respects pause and speed).

---

## 2. Footstep route preview (step mode)

Replaces the dashed route-preview line from M1b §5.2.2. Everything else about the hover feedback (tooltip, step-bar preview, red blink) is unchanged.

### 2.1 Footprints

- Draw the route from the Druid's current position to the hovered marker as a trail of small footprints instead of a dashed line.
- **One footprint per step:** the number of footprints equals the step cost shown on the tooltip and bar, so the trail itself shows the cost.
- Footprints alternate left and right of the line (offset ±`FOOTPRINT_SIDE_OFFSET`, about 5 px) and are rotated to face the direction of travel.
- Evenly spaced along the line; the last footprint sits at the edge of the target's footprint circle, not on top of the object.
- Normal colour: soft, semi-transparent earthy tone. If unaffordable: red, matching the bar's red blink.

### 2.2 Animation

- When hover starts on a marker, footprints appear one after another from the Druid toward the target, completing over `FOOTPRINT_REVEAL_TIME` (0.5 s) regardless of distance.
- Each footprint fades in quickly (about 0.06 s) as it appears.
- Once complete, the trail **stays** until the cursor leaves that marker.
- Moving the cursor within the same marker does not restart the animation.
- Moving to a different marker clears the trail and starts a new one.
- The step-cost label appears beside the last footprint once the reveal finishes.
- The reveal uses real (UI) time, not simulation time, so it still animates while debug-paused.

### 2.3 Scope

Applies to hovering both searchable features and turret slots in step mode. The route trail of past visits (M1b §5.5) is unchanged.

---

## 3. Sound effects

### 3.1 Technology

- Web Audio API only. Every sound is **synthesised in code** (oscillators, filtered noise, short envelopes). No audio files, no libraries.
- Put all audio in `js/audio.js`. Sound definitions (volume, pitch, enabled) live in config as `SOUNDS`.

### 3.2 Keeping audio separate from gameplay

- Gameplay systems MUST NOT call audio directly. They emit named events through a small event bus (e.g. `events.emit('wolfDied', { x, y })`), and `audio.js` subscribes.
- Sounds never affect the simulation.
- The same event bus can be reused later for other feedback.

### 3.3 Browser rules

- Chrome blocks audio until the user interacts with the page. Create or resume the `AudioContext` on the first click or key press. Before that, sounds are silently skipped (no errors).

### 3.4 Sound list

Short and distinct. Pitch/character suggestions below are a starting point; recognisability matters more than realism.

| Event | Sound | Notes |
|---|---|---|
| **Sprinkler fires** | Very short, quiet high "tick" | Plays often; keep it subtle |
| **Toader fires** | Low wet "blorp" | |
| **Poison cloud bursts** | Soft hiss (filtered noise, quick fade) | |
| **Wolf bites** (Druid or summon) | Short crunchy noise burst, mid-low | |
| **Bear attacks** | Heavier, lower thump + crunch | |
| **Druid strike** | Quick whoosh into a soft thud, timed to the impact moment | |
| **Vulture pecks** | Sharp, dry click | |
| **Wolf dies** | Short descending yelp | |
| **Bear dies** | Low, longer descending growl | |
| **Resource gained** (search result, Squirrel pickup) | Bright chime; pitch by resource: Pits low, Reeds mid, Feathers high | One chime per collection event, not per unit |
| **Search** | Leafy rustle at start; resource chime(s) on completion | In step mode both play on arrival |
| **Build** | Two quick wooden knocks on completion | Optional quiet ratchet loop while building in timed mode |
| **Upgrade** | Ratchet ticks while upgrading; rising two-note chime on completion | Stop ticks immediately on cancel |
| **Summon** | Short rising shimmer; Vulture lower, Squirrel higher | Plays on placement |

### 3.5 Mixing and spam control

Combat can trigger dozens of events per second, especially at debug speed. To keep it readable:

- **Per-sound minimum gap** (`minGap`, e.g. 60 ms for Sprinkler, 80 ms for bites): a sound triggered within its gap of the previous one is skipped.
- **Per-sound voice cap** (`maxVoices`, e.g. 3): skip if that many copies are already playing.
- **Random pitch variation** of ±`SOUND_PITCH_JITTER` (5%) on each play, so repeats don't sound mechanical.
- **Master volume** `MASTER_VOLUME` (0.5) and per-sound `volume` in config.
- At debug speed above ×1, sounds still play but the gap and voice limits naturally thin them out.

### 3.6 Controls

| Key | Action |
|---|---|
| `V` | Toggle mute |

Add a small speaker icon to the HUD showing mute state; clicking it also toggles mute. Mute state SHOULD be remembered in `localStorage` (wrapped in try/catch; default unmuted).

---

## 4. Tuning values (summary)

| Constant | Value |
|---|---|
| `DROP_POP_HEIGHT` | 35 px |
| `DROP_POP_TIME` | 0.35 s |
| `DROP_POP_STAGGER` | 0.1 s |
| `FOOTPRINT_SIDE_OFFSET` | 5 px |
| `FOOTPRINT_REVEAL_TIME` | 0.5 s |
| `MASTER_VOLUME` | 0.5 |
| `SOUND_PITCH_JITTER` | 0.05 |
| `SOUNDS` | Per-sound `volume`, `minGap`, `maxVoices`, `enabled` |

---

## 5. Debug additions

Panel: sounds played vs skipped (by gap or voice cap) in the last 5 seconds, per sound. Helps tune spam limits.

---

## 6. Acceptance criteria

### Drop pop
- [ ] Items arc from the death point to their resting spot with a ground shadow, then settle.
- [ ] Multiple items launch 0.1 s apart.
- [ ] Squirrels only target landed items.
- [ ] Freezes during `ENDING`; respects pause and speed.

### Footstep preview
- [ ] Footprints replace the dashed preview line; one footprint per step.
- [ ] Alternating left/right, facing the direction of travel, ending at the target's edge.
- [ ] Reveal from Druid to target over 0.5 s; trail stays while hovering; restarts only on a new marker.
- [ ] Red when unaffordable; cost label appears at the end.
- [ ] Works for features and slots in step mode.

### Sound
- [ ] All listed events have distinct, recognisable synthesised sounds; no audio files.
- [ ] Gameplay emits events; only `audio.js` plays sounds.
- [ ] No errors before first interaction; audio starts after first click or key.
- [ ] Gap, voice cap and pitch jitter keep heavy combat readable.
- [ ] `V` and the HUD speaker icon toggle mute; state is remembered.
- [ ] Debug panel shows played/skipped counts.

### General
- [ ] Everything else still works in both Prep modes.
