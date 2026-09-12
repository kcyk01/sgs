# Card scanning

Point the rear camera at a character card and get the card page. Runs entirely on
the client, with no model weights, no inference runtime and no network request.

## How it works

The roster is a **closed set** — ~70 character printings, each with exactly one
clean reference image in `public/cards/`. That makes this a retrieval problem
rather than a classification one, so there is nothing to train: recognition is a
nearest-neighbour lookup against precomputed descriptors, and adding a card is a
row in a generated table rather than a retrained model.

```
video frame
  -> reticle crop          model/frame.ts        the part the user is aiming at
  -> corner detection      pipeline/rectify.ts   find the card's four corners
  -> perspective warp      pipeline/homography.ts flatten to a canonical card
  -> 16 artwork crops      pipeline/rectify.ts   candidate regions (see below)
  -> 280-byte descriptors  pipeline/descriptor.ts 16x16 luma grid + hue histogram
  -> nearest neighbour     pipeline/match.ts     ~70 references, best crop each
  -> temporal vote         pipeline/vote.ts      agree across frames before showing
```

The warp is what makes the rest cheap. Scale, rotation and perspective are the
three things a matcher would otherwise have to be invariant to; removing them
geometrically means the comparison downstream can be a fixed 16x16 grid instead
of a keypoint search, which is the entire reason this needs no OpenCV.js.

| File | Role |
| --- | --- |
| `types.ts` | `CardRecognizer` interface + `CardMatch` result shape |
| `recognizer.ts` | Single load point, behind a dynamic `import()` |
| `useCamera.ts` | `getUserMedia` lifecycle (rear camera, cleanup, permissions) |
| `model/frame.ts` | The only DOM-aware file: video -> pixels, and reticle geometry |
| `model/localRecognizer.ts` | Wires the pipeline to `CardRecognizer` |
| `model/references.ts` | GENERATED descriptors — `npm run descriptors` |
| `pipeline/*.ts` | Platform-free image maths, shared with the build scripts |
| `../../routes/ScanPage.tsx` | UI: viewport, reticle, status, match result |

## The artwork window

The single most important thing to know when changing this: **the reference
images are artwork crops, not whole cards.** No frame, no name, no health, no
rules box. And they were cropped by hand from assorted sources, so each sits at a
slightly different scale and offset within its card — there is no one correct
window to cut.

So `ART_WINDOWS` in `pipeline/rectify.ts` holds 16 candidate crops, and each
reference is scored at whichever one suits it best. Searching that nuisance
parameter rather than guessing it took top-1 from **43% to 71%** on real photos:
by far the largest single gain in the pipeline, and the reason the cheap
descriptor was worth keeping rather than replacing.

Re-measure with `npm run scan:eval -- --sweep`, which reports each window alone
and all of them together. If the reference crops are ever regenerated to a
consistent frame, that gap should close and the list can collapse to one entry.

## Measuring it

`npm run scan:eval` runs the real pipeline over photographs in `eval-photos/`,
named `<character-id>.<note>.jpg`, and reports top-1 and top-5 recall. The script
header explains what to shoot. Collect a *test* set, not a training set — 5-10
deliberately awkward photos each of ~20 cards — and treat the result as a
verdict:

| top-5 recall | Action |
| --- | --- |
| > 95% | Ship it. |
| 80-95% | Add a rerank stage over the top candidates before reaching for a model. |
| < 80% | Replace the descriptor with a learned embedding (below). |

### Where it currently stands

On 14 real card photos (`npm run scan:eval -- --in test-images`):

```
top-1 recall     71.4%
top-5 recall     78.6%
card detected   100.0%
```

Treat single figures here with suspicion: at n=14 one photo is 7.1%, so top-5
moves a whole band when one card shifts by one rank. Growing the photo set is the
cheapest way to make this number mean something.

Every failure is a photo where the *card* was not cleanly isolated: one shot
inside a box of other cards, one held in fingers at a steep angle, both with
holographic foil washing out the artwork. Corner detection reported success and
locked onto the surrounding clutter. Two caveats on reading those numbers:

- **The eval is harsher than the app.** It searches the whole photo, whereas the
  app searches only the reticle the user is aiming through, which excludes most
  of the clutter that caused these failures.
- **It is single-frame.** The app votes over 5 consecutive frames, and these
  failures are exactly the transient kind voting is meant to absorb.

So real scanner accuracy should sit above these figures — but that is an argument
for measuring in the app, not for assuming it. Synthetic photos (reference art
composited into a card frame, tilted, dimmed, blurred) score 100% top-1, which
confirms the machinery is sound and isolates the gap to the domain shift between
digital art and photographed foil-finished prints.

A full `recognize()` costs ~10 ms per frame on a laptop — rectify 4.3 ms,
16 windows 4.6 ms, match 0.4 ms — against a 250 ms sampling interval.

## Escalating

Every step is designed to be replaced independently.

- **Recognition is wrong on hard photos.** Swap the descriptor for an
  off-the-shelf image embedding (MobileNet / CLIP via `onnxruntime-web`), keeping
  `describe` and `similarity` as the seam. Note there is *still* nothing to
  train: reference embeddings are precomputed by the same build script and
  matching stays a linear scan. Costs ~5-15 MB, lazily loaded.
- **The card is not being found in the frame.** Replace `detectCardQuad` with
  OpenCV.js `findContours` + `approxPolyDP`. Nothing else changes.
- **Near-identical printings are confused.** The card's *name* is a strong extra
  signal and needs no OCR: with a closed roster you can template-match the name
  region as an image patch. It does mean building those reference patches, which
  is why it is not here already.

## Constraints already designed around

- **Lazy loading.** `ScanPage` is a `React.lazy` route and the recognizer is
  behind a dynamic `import()`, so neither the matcher nor the ~21 kB of
  descriptors touch the initial bundle. `model/references.ts` deliberately does
  not live in `src/data/`, which `vite.config.ts` places in an eagerly-loaded
  chunk.
- **Shared arithmetic.** `pipeline/` touches neither the DOM nor `sharp`, so the
  browser, the descriptor build script and the eval harness all run the same
  code. This is a correctness requirement, not tidiness: a reference descriptor
  is only comparable to a camera descriptor if identical arithmetic produced
  both, and two copies would drift silently. It is also why imports inside
  `pipeline/` carry explicit `.ts` extensions — Node's native type stripping
  needs them.
- **Secure context.** `getUserMedia` needs https or localhost. For phone testing:
  `npm run dev -- --host` plus a tunnel, or serve `dist/` over https.
- **Frame sampling.** Recognition runs on an interval (`SAMPLE_INTERVAL_MS`), not
  every rAF tick, to keep phones cool.
- **Reticle geometry is duplicated** between `model/frame.ts` and
  `.scan__reticle` in `styles/components.css`, and must be changed in both. The
  capture path has to undo `object-fit: cover` to find the region the user is
  actually aiming at.
- **Characters only.** Weapons are excluded from the reference set: different
  card layout, so the artwork window does not apply, and including them would
  only add wrong answers.
- **Orientation.** A card lying on its side is corrected; one held upside down is
  not. The 180-degree ambiguity cannot be resolved from geometry alone.
