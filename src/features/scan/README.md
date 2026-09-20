# Card scanning

Line a character card up in the guide, take a picture of it, get the card page.
Runs entirely on the client, with no model weights, no inference runtime and no
network request.

**The shutter is the default**, and the reasons still hold: a still the user
chose is steady, is easy to reason about — what got analysed is exactly what they
can see — the ranking is computed once instead of reshuffling under them, and a
one-shot analysis affords a ~200 ms budget rather than the ~10 ms a 4 fps loop
could pay for.

**Live Mode is an experiment beside it**, behind a toggle next to Debug Mode, and
its justification is *temporal voting* rather than speed. Sampling the stream is
the only way to get several independent looks at one card, which is strictly more
evidence than one good frame — so it accepts nothing until one card has led 3 of
the last 4 sampled frames with mean confidence over 0.75, ~1.5-2 s of holding
still. It then freezes the frame, stops the camera and shows the same result list
the shutter does; nothing auto-navigates. Accepting on a *single* sampled frame
would be worse than the shutter, not better, and the vote is the whole point —
see `useLiveScan.ts`.

## How it works

The roster is a **closed set** — ~70 character printings, each with one scanned
reference card in `full-card/`. That makes this a retrieval problem rather than a
classification one, so there is nothing to train: recognition is a
nearest-neighbour lookup against precomputed descriptors, and adding a card is a
row in a generated table rather than a retrained model.

```
captured still           ScanPage.tsx          one frame, at camera resolution
  -> reticle crop          model/frame.ts        the part the user aimed at
  -> corner detection      pipeline/rectify.ts   find the card's four corners
  -> perspective warp      pipeline/homography.ts flatten to a canonical card
  -> 280-byte descriptor   pipeline/descriptor.ts 16x16 luma grid + hue histogram
  -> nearest neighbour     pipeline/match.ts     ~70 whole-card references
  -> ranked shortlist      ScanPage.tsx          lead match, then runners-up
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
| `useLiveScan.ts` | Live Mode: sampling loop + `tallyVotes` accept rule |
| `model/frame.ts` | DOM in: video -> pixels, and reticle geometry |
| `model/debugImage.ts` | DOM out: intermediates -> canvas -> downloadable PNG |
| `model/localRecognizer.ts` | Wires the pipeline to `CardRecognizer` |
| `model/references.ts` | GENERATED descriptors + `BUILT_FROM` mode |
| `pipeline/*.ts` | Platform-free image maths, shared with the build scripts |
| `../../routes/ScanPage.tsx` | UI: viewport, reticle, capture/retake, results |
| `../../components/ScanDebugPanel.tsx` | Debug Mode: the intermediates, as images |

`model/` is the only half that touches the DOM, split by direction: `frame.ts`
carries the page into the pipeline, `debugImage.ts` carries the pipeline back out
to the page. `pipeline/` imports neither, which is what keeps it runnable under
Node in the eval harness.

## Debug Mode

The toggle at the top of the scan page shows what the pipeline saw — the reticle
region, the corner search's three intermediates, the detected quad drawn over it,
and the flattened card — and saves any of them as a PNG.

The three middle images are the corner search at its own `DETECT_WIDTH` of 128px:
the grayscale the Sobel ran on, the edge magnitudes, and the thresholded point
cloud *before* the corners are taken from it. That last one is the one to look at
first when a quad comes out wrong. `detectCardQuad` has no opinion about which
points it is handed — it takes the extremes of whatever cleared the percentile —
so a quad tracing a table seam and a quad tracing a card are the same four lines
on a photo, and differ only in which pixels were lit here.

This is how `test-images/` should be fed. `scripts/eval-scan.mjs` treats a
portrait photo as *already being the search region*, so a loose handheld shot is
measured against clutter the app would have cropped away — which is exactly what
cost `yu-ji.png` its match. A region downloaded from Debug Mode came out of the
app's own `reticleRegion()` at `CAPTURE_WIDTH`, so the harness reproduces the
in-app result rather than approximating it.

Only the region is named to be picked up (`<character-id>.png`). Everything else
is prefixed `debug-`, because `resolveLabel` splits a filename
on the first dot — `<id>.quad.png` would resolve to `<id>` and be scanned as
though it were a photo of a card.

## What the references are

**Whole cards, not artwork.** `full-card/<card-id>.jpg` holds a scan of each
printed card — frame, kingdom symbol, health pips, name banner, artwork, rules
box and all. `npm run descriptors -- --full-card` turns each into one descriptor.

This is the single most important decision in the feature, and it was originally
made the other way. The app used to match against the art-only crops in
`public/cards/`, which forced it to cut the artwork back out of a photographed
card — and the artwork sits at a different offset and scale on every card, so
that crop was a per-card guess. A 12-window search existed purely to grope for
it. Matching whole card against whole card removes the problem rather than
managing it:

- **The correspondence is exact.** No crop to calibrate, nothing to keep in sync.
- **The furniture becomes signal.** Name banner, pips and rules box differ
  between cards, so including them helps rather than contaminates.
- **It is ~12x cheaper.** One descriptor per capture instead of twelve.
- **It measured better**: top-1 81.3% -> 87.5% on the test photos.

`ReferenceMode` in `pipeline/rectify.ts` still supports the old `artwork` mode,
and the generated table records which one built it via `BUILT_FROM`. The
recognizer and the eval both read that rather than assuming, because the two need
opposite treatment — a whole-card query scores well against whole-card references
and badly against artwork ones — so a half-converted table would fail silently,
ranking by which kind happened to match the framing. **The modes cannot be
mixed.**

### Adding cards

Drop a scan into `full-card/` named `<card-id>.jpg` and re-run
`npm run descriptors -- --full-card`. It prints coverage and names anything
missing; a card with no scan simply cannot be recognised.

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

On 16 real card photos (`npm run scan:eval -- --in test-images`):

```
top-1 recall     87.5%
top-5 recall     87.5%
card detected   100.0%
```

Treat single figures here with suspicion: at n=16 one photo is 6.25%, so top-5
moves a whole band when one card shifts by one rank. Growing the photo set is the
cheapest way to make this number mean something.

Both remaining misses are capture problems, not matching problems: `cao-cao` was
shot inside a box of other cards and `sima-yi` held in fingers at a steep angle,
both holographic. Corner detection reported success and locked onto the
surrounding clutter in each.

One caveat on reading these: **the eval is harsher than the app** for pre-cropped
photos, since it searches the whole image where the app searches only the
reticle. Whole camera frames (landscape, 1280x720) are cropped exactly as the app
crops them, so those are a fair test.

A full `recognize()` costs ~5.8 ms on a laptop — rectify 5.7 ms, describe 0.4 ms,
match 0.3 ms. Nearly all of it is now the corner search and warp; matching itself
is negligible.

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
  behind a dynamic `import()`, so neither the matcher nor the ~22 kB of
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
- **One capture, one analysis — except under Live Mode.** The shutter calls
  `recognize` once per press, on a frame the user chose. Live Mode is the one
  sampling loop, and it exists *for* the temporal vote rather than in spite of
  it: `tallyVotes` in `useLiveScan.ts` is the whole accept rule, kept pure and
  exported so it can be checked without a camera. `confidenceOf` measures
  separation from the runner-up, not probability of correctness, so no number off
  one frame is allowed to accept — a live mode that trusted a single tick should
  be deleted rather than tuned. Live mode hands the `<video>` element to the
  recognizer directly, so a tick skips the full-frame `drawImage` the shutter
  does; the frozen still is the frame at accept time, not one of the four that
  voted.
- **All five results are shown, with their art.** `recognize` returns a ranked
  shortlist and the page lists every entry, because the quickest way to confirm
  a scan is to look at the picture — a name and a percentage ask the user to
  trust a number instead. The rows reuse `.card-row` and `CardThumb`, so a scan
  result looks like the same card it does everywhere else in the app. This is
  only legible because the ranking is settled before it is shown — once per
  shutter press, or once per accepted vote in Live Mode. A list that reshuffled
  on every sampled frame would be unreadable, which is why Live Mode shows
  nothing but a running best-guess name until it accepts.
- **`CardMatch.artId` is separate from `characterId`.** The route goes to the
  character, but the thumbnail shows the *printing* that matched — someone
  holding an alternate art should see that art in the results, not the base
  printing they are not looking at.
- **Reticle geometry is duplicated** between `model/frame.ts` and
  `.scan__reticle` in `styles/components.css`, and must be changed in both. The
  capture path has to undo `object-fit: cover` to find the region the user is
  actually aiming at.
- **Characters only.** Weapons are excluded from the reference set: different
  card layout, so the artwork window does not apply, and including them would
  only add wrong answers.
- **Orientation.** A card lying on its side is corrected; one held upside down is
  not. The 180-degree ambiguity cannot be resolved from geometry alone.
