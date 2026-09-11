# Card scanning (planned)

The camera UI is built and working; the recognition model is not wired up yet.
This folder is deliberately the only part of the app that will know about ML.

## Files

| File             | Role                                                            |
| ---------------- | --------------------------------------------------------------- |
| `types.ts`       | `CardRecognizer` interface + `CardMatch` result shape           |
| `recognizer.ts`  | Single load point; returns `null` until a model exists          |
| `useCamera.ts`   | `getUserMedia` lifecycle (rear camera, cleanup, permissions)    |
| `../../routes/ScanPage.tsx` | UI: viewport, reticle, status, match result          |

## Wiring up a model

1. `npm i @tensorflow/tfjs` (or `onnxruntime-web`).
2. Create `model/tfjsRecognizer.ts`:

   ```ts
   import type { CardMatch, CardRecognizer } from '../types'

   export function createRecognizer(): CardRecognizer {
     let model: unknown = null
     return {
       async load() {
         const tf = await import('@tensorflow/tfjs')
         model = await tf.loadGraphModel('/model/model.json')
       },
       async recognize(frame): Promise<CardMatch[]> {
         // preprocess `frame` -> tensor, run model, map class index -> characterId
         return []
       },
       dispose() {
         /* model.dispose() */
       },
     }
   }
   ```

3. Put the exported weights in `public/model/` so they are fetched, not bundled.
4. Uncomment the dynamic import in `recognizer.ts`.

## Constraints already designed around

- **Lazy loading.** `ScanPage` is a `React.lazy` route and the model is behind a
  dynamic `import()`, so the runtime and weights never touch the initial bundle.
- **Label mapping.** `Character.modelLabel` (in `src/types/character.ts`) exists
  so model class names can differ from card ids without a lookup table elsewhere.
- **Secure context.** `getUserMedia` needs https or localhost. For phone testing:
  `npm run dev -- --host` plus a tunnel, or serve `dist/` over https.
- **Frame sampling.** Recognition runs on an interval
  (`SAMPLE_INTERVAL_MS`), not every rAF tick, to keep phones cool.
- **Threshold.** Matches below `MATCH_THRESHOLD` are ignored to avoid flickering
  wrong results.
