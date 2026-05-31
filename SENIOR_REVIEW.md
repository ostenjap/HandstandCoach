# Senior Engineering Review — Handstand Coach
> Perspective: Senior Android Developer + Software Architect. Specific to this repo, not generic. Read before planning next milestones.

---

## Scorecard

| Aspect | Score | Verdict |
|---|---|---|
| Architecture / separation of concerns | **7.5 / 10** | Good instinct — engine isolated from UI |
| Tech stack selection | **7 / 10** | Right strategy, risky bleeding-edge versions |
| Build & DevOps (EAS) | **6.5 / 10** | Smart cloud-build call; no CI/OTA yet |
| Dependency hygiene | **4 / 10** | Worklet-runtime conflict; version drift |
| Domain modeling (handstand logic) | **3.5 / 10** | Naive heuristics + a fatal blind spot |
| Real-time CV pipeline | **5 / 10** | Good model choice, fragile plumbing |
| State / data layer | **2 / 10** | Effectively nonexistent |
| Testing | **1 / 10** | `analyzePose.ts` is pure and untested |
| Code quality / TS rigor | **6 / 10** | Strict mode on, but `globalThis` hack is a smell |
| Production readiness | **3 / 10** | No nav, auth, crash reporting, analytics |
| **Overall (early prototype)** | **~5 / 10** | Strong bones, core feature unproven |

---

## Three Risks That Matter Most

### 1. MoveNet is trained on UPRIGHT humans — your users are inverted (EXISTENTIAL)
Pose models (MoveNet, BlazePose) are trained overwhelmingly on standing/sitting people. An inverted body can confuse keypoint assignment (swap ankle/wrist, collapse confidence).
- **Action:** Validate the model on real inverted handstand footage BEFORE building anything else. This is a go/no-go test for the whole product.
- **If accuracy tanks:** rotate the frame 180° before inference, fine-tune the model, or switch to BlazePose (more orientation-robust).
- **Cost:** ~1 day. Do it first.

### 2. No temporal smoothing → flickering feedback
Per-frame inference jitters. UI will oscillate "Great line!" → "You're piking" → "Great line!" within a single hold.
- **Action:** Add an EMA / rolling buffer over keypoints, plus hysteresis on coaching messages (don't change advice unless the new state persists ~500ms).
- This is what makes it *feel* like a coach instead of a noisy debugger.

### 3. Coordinate-space assumptions are fragile
`src/coaching/analyzePose.ts` assumes "image y grows downward = upright frame." Device orientation, sensor rotation, and the resize plugin all mutate that. A phone filming a handstand is likely propped/rotated.
- **Action:** Make orientation handling explicit; don't assume the test-time camera pose.

---

## Architecture Advice

- **Finish the layering you started.** You have `coaching/` (engine) and `screens/` (UI). Add `domain/` (session, rep, attempt models) and `data/` (persistence + future Supabase). Extend the existing rule "model/camera concerns out of UI" to "persistence concerns out of the engine."
- **Kill the `globalThis.__lastPoseAt` throttle hack** in `usePoseCoach.ts`. It's invisible global state inside a worklet and not multi-camera safe. Throttle via a proper shared value. Treat the `@ts-expect-error` next to `globalThis` as fix-before-merge.
- **Test the pure logic now.** `analyzePose.ts` takes a `Pose`, returns `CoachFeedback`, zero mocking needed. Table-driven cases (inverted/not, piking, arching, perfect line) lock domain behavior and let you tune thresholds without a phone. Highest-ROI gap in the project.
- **Make the on-device ↔ server boundary deliberate.** Keep the `PoseCoach` interface as the seam so a server-inference path can be swapped in later without touching `CoachScreen`.

---

## Next Steps (in order)

1. Validate MoveNet on inverted bodies (1 day, go/no-go).
2. Write unit tests for `analyzePose.ts` (half a day, locks the domain).
3. Add temporal smoothing + message hysteresis (makes it feel like a coach).
4. Resolve the package conflict per `PACKAGE_ISSUES.md` (drop reanimated).
5. Add crash reporting (Sentry) before any external tester touches it — native frame-processor crashes are otherwise debugged blind.
6. Only then invest in nav, auth, and the data layer.

---

## Bottom Line
The skeleton is architected like someone who knows what they're doing — clean seams, isolated engine, sensible stack. But the project is currently polishing the scaffolding while the load-bearing wall (can the model even see an inverted human?) is untested. **Prove the core, test the pure logic, stabilize the feedback — then scale the app around it.**
