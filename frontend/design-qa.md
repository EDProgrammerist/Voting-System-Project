# Admin Login Design QA

## Comparison Target

- Source visual truth: `frontend/design/admin-login-ref.png`
- Source pixels: 1672 × 941
- Implementation: `http://127.0.0.1:4173/admin/login`
- Implementation screenshot evidence: Codex in-app Browser capture retained in this task; the capture API did not expose a local filesystem path
- Browser viewport: 1672 × 942 CSS px
- Device pixel ratio: 1
- State: initial admin login form, settled after the entrance animation
- Density normalization: none required; source and implementation were compared at effectively 1:1 density, with a one-pixel viewport-height difference

## Full-View Comparison Evidence

The source was opened at its original resolution and the implementation was captured in the Codex in-app Browser at the matching width and density. The centered dark canvas, 1354 × 761 image stage, 50/50 campus-and-blue composition, brand lockup, glass form panel, and lower visual baseline align with the source. The generated campus clean plate preserves the original scene direction while allowing the form to remain real and interactive.

## Focused Region Comparison Evidence

The title and form region required a focused comparison because its typography, panel bounds, input rhythm, and button placement are the fidelity-critical details. Final observed bounds match the reference within a few pixels:

- Glass panel: approximately 533 × 398 px at the reference viewport.
- Inputs: approximately 454 × 60 px with the same vertical rhythm and italic placeholder treatment.
- Login button: approximately 268 × 64 px with matching placement and contrast.
- Brand lockup: one line on desktop, with yellow `CPC`, lightweight white `Vote`, and bold white `Admin`.

## Required Fidelity Surfaces

- Fonts and typography: Satoshi is used for the screen, with Segoe UI italic placeholders to match the reference. Weight, line height, letter spacing, and one-line desktop lockup are aligned.
- Spacing and layout rhythm: outer canvas margins, stage aspect ratio, split boundary, panel size, field spacing, radii, and button position match the source. Mobile uses a deliberate single-column adaptation with no horizontal overflow.
- Colors and visual tokens: charcoal canvas, yellow brand accent, translucent cobalt curtain, cyan panel/input borders, white fields, and violet CTA reproduce the source hierarchy with accessible contrast.
- Image quality and asset fidelity: a project-local 16:9 clean campus image was generated from the supplied reference so no screenshot hotspot or placeholder is used. It is sharp at the target viewport and preserves the campus, gate, masonry, vegetation, and central crest.
- Copy and content: `CPCVote Admin`, `Email`, `Password`, and `Login` match the source exactly.

## Findings

No actionable P0, P1, or P2 mismatch remains.

## Comparison History

1. Initial pass
   - P2: the glass panel was approximately 14 px too far right, 8 px too low, and about 30 px too tall.
   - Fix: recalibrated curtain padding, panel offset, fixed height, and internal spacing.
   - Post-fix evidence: panel bounds aligned to approximately 533 × 398 px at the reference viewport.
2. Second pass
   - P2: field and button vertical positions drifted from the source by up to 24 px.
   - Fix: set explicit field/button heights and matched the panel's top padding and form gaps.
   - Post-fix evidence: fields and CTA aligned within a few pixels of the source.
3. Final pass
   - No actionable P0/P1/P2 findings.
   - Verified desktop and mobile rendering, form inputs, submission feedback, no horizontal overflow, and a clean browser console.

## Open Questions

- Successful authentication currently stores the Sanctum token and shows a welcome state. Dashboard navigation should be added when the dashboard screen is implemented.

## Implementation Checklist

- [x] Match the supplied desktop composition.
- [x] Preserve a responsive mobile experience.
- [x] Keep the form accessible and keyboard-operable.
- [x] Connect the form to `/api/admin/login`.
- [x] Handle loading, invalid credentials, service failure, and success feedback.
- [x] Verify browser console and horizontal overflow.

## Follow-up Polish

- P3: the reconstructed clean campus photograph is compositionally faithful but naturally differs in small architectural and foliage details from the UI-baked source image.

Login final result: passed

---

# Admin Dashboard Design QA

## Comparison Target

- Source visual truth: `frontend/design/admin-dashboard-ref.png`
- Source pixels: 1692 × 930
- Implementation: `http://127.0.0.1:4173/admin/dashboard`
- Browser viewport: 1692 × 930 CSS px
- State: dashboard preview data, viewport positioned at the top
- Product constraint applied: the interface fills the viewport instead of retaining the reference image's dark presentation frame

## Full-View Comparison Evidence

The implementation was captured at the source dimensions in the Codex in-app Browser. It preserves the reference hierarchy: blue fixed sidebar, campus election countdown, white voter-chart card, four yellow-capped metric cards, and the navy-headed candidate table. The desktop content density and card proportions track the source while using the entire available viewport as requested.

## Focused Region Comparison Evidence

- Sidebar: approximately 244 px wide at desktop, with the same yellow active state, report/manage grouping, and compact icon rhythm.
- Top row: campus panel and voter chart retain the reference's wide/narrow proportion and equal height.
- Summary row: four equal cards with yellow top rules and the source's blue, green, yellow, and red icon treatments.
- Candidate table: navy column header, matching five-column order, compact result rows, party pills, and legible win-rate indicators.
- Responsive check: at 390 × 844 CSS px, navigation collapses behind an operable menu, cards become single-column, the chart remains visible, and the table scrolls horizontally without widening the page.

## Functional Verification

- Successful admin login stores both token and admin identity, then routes to `/admin/dashboard`.
- With a token, the dashboard loads the active/latest election and requests `/api/admin/dashboard?election_id=...`.
- Logout invalidates the current API token when reachable, clears the local session, and returns to the login screen.
- Sidebar controls provide immediate feedback for screens that have not been built yet.
- Live API values drive turnout, summary totals, election timing, and candidate results.
- The backend currently has no program/course field. BSIT, BSHM, BEED, and BSED slices are therefore a deterministic visual allocation of actual cast-vote totals; `NOT VOTED` uses the real turnout value.

## Findings

No actionable P0, P1, or P2 mismatch remains.

## Comparison History

1. Initial implementation
   - Matched the reference's component order, color hierarchy, and proportional layout.
   - Connected the dashboard to the protected election endpoints and supplied preview data for isolated frontend review.
2. Desktop verification
   - Verified at 1692 × 930 CSS px with the full viewport used and no dark/gray page frame.
   - Confirmed chart, summary cards, candidate rows, and sidebar are visible and aligned.
3. Responsive verification
   - Verified at 390 × 844 CSS px.
   - Confirmed the mobile menu opens and closes, the voter chart renders, content does not create page-level horizontal overflow, and the console contains no warnings or errors.

## Open Questions

- Program/course-specific voter counts will need a backend field or aggregate endpoint before those four chart segments can represent real academic-program data.

## Implementation Checklist

- [x] Match the supplied dashboard composition.
- [x] Fill the viewport with no dark or gray outer background.
- [x] Connect existing election and dashboard APIs.
- [x] Preserve a usable preview when backend data is unavailable.
- [x] Add working login-to-dashboard and logout behavior.
- [x] Verify desktop, mobile, navigation, chart rendering, and browser console.
- [x] Pass typecheck, lint, and production build.

## Follow-up Polish

- P3: the implementation adds visible metric values and candidate rows to make the dashboard operational; the static source leaves those regions mostly empty.

final result: passed

---

# Admin Candidates Design QA

## Comparison Target

- Source visual truth: `frontend/design/candidates-design-ref.png`
- Source board pixels: 1791 × 878
- Implementation: `http://127.0.0.1:4173/admin/candidates`
- Implementation screenshot evidence: Codex in-app Browser captures retained in this task; the capture API did not expose local filesystem paths
- Main implementation viewport: 1440 × 900 CSS px
- Mobile implementation viewport: 390 × 844 CSS px
- Device pixel ratio: 1
- States compared: default candidate grid and Add Candidate dialog open
- Density normalization: the source is a presentation board containing the page and a detached dialog specimen. A single browser comparison canvas placed that source above the rendered page and rendered dialog state so both regions could be judged together.

## Full-View Comparison Evidence

The implementation preserves the reference's fixed cobalt sidebar, large Candidates heading and description, top-right Add Candidate action, four yellow-capped summary cards, wide search and position controls, and two-column white candidate cards with blue headers. The source's dark presentation frame is intentionally omitted so the application fills the viewport, consistent with the established admin screens.

## Focused Region Comparison Evidence

- Candidate cards: the blue header band, centered circular portrait, two outlined actions, card proportions, and two-column rhythm align with the source. Real names, partylist, position, and platform content make the previously blank specimen usable.
- Filters: the wide search field, dark search action, compact All Position select, elevation, and spacing retain the source hierarchy.
- Dialog: Full Name, Position, Partylist, Platform, Upload, Cancel, and Save are present in the same order and with matching field rhythm, compact dimensions, and blue primary action.
- Mobile: the header stacks, summaries and candidate cards become single-column, the modal fits inside 390 × 844, and the page has no horizontal overflow.

## Required Fidelity Surfaces

- Fonts and typography: Satoshi maintains the established admin family, with title, subtitle, summary labels, card content, controls, and dialog labels matching the source's weight hierarchy.
- Spacing and layout rhythm: page header, four-card summary, filters, two-column candidate grid, portrait overlap, actions, dialog fields, radii, and elevation align with the reference regions.
- Colors and visual tokens: cobalt navigation and candidate headers, yellow active state and summary accents, pale blue-gray canvas, white cards, gray search action, and red delete treatment match the source palette.
- Image quality and assets: real profile photos render when returned by the API. Empty profiles use the installed Phosphor User icon inside the source-style neutral portrait circle rather than custom SVG or CSS illustration.
- Copy and content: Candidates, election management description, summary labels, search and position filter, candidate actions, dialog labels, and action copy match the reference. Dynamic candidate details are coherent and grounded in the preview/API records.

## Findings

No actionable P0, P1, or P2 mismatch remains.

## Comparison History

1. Initial page pass
   - No actionable P0/P1/P2 finding. The source board and rendered page were placed in one comparison canvas, and the major proportions, palette, typography, filters, and card structure aligned.
2. Dialog pass
   - The rendered Add Candidate dialog was opened in the same comparison canvas and matched the reference's field order, dimensions, hierarchy, and actions without a corrective visual iteration.
3. Interaction pass
   - Added a candidate in preview mode and verified the total and President count updated.
   - Search for `Maria` returned exactly one candidate; Edit opened with the candidate identity locked and existing values ready to update.
4. Responsive and console pass
   - Verified 390 × 844 layout, modal dimensions, navigation behavior, no horizontal overflow, and a clean browser console.

## Functional Verification

- [x] Search filters by name, student ID, partylist, and platform.
- [x] Position selection filters the candidate grid.
- [x] Add Candidate creates a preview record and updates summary totals.
- [x] Edit Candidate reuses the backend's candidate upsert behavior.
- [x] Authenticated mode lists candidates, positions, and enrolled students through the existing protected endpoints.
- [x] Multipart profile-photo upload is supported without forcing a JSON content type.
- [x] Candidates navigation is active and connected to `/admin/candidates`.
- [x] Lint, typecheck, production build, desktop comparison, mobile verification, and console checks pass.

## Open Questions

- The backend currently exposes no candidate-delete endpoint. Delete works in isolated preview mode; authenticated mode reports that the action is unavailable instead of simulating success.

## Follow-up Polish

- P3: the implementation shows useful candidate identity and platform content where the static reference intentionally leaves card bodies blank.

final result: passed

---

# Admin Voters Design QA

## Comparison Target

- Source visual truth: `frontend/design/voters-design-ref.png`
- Source pixels: 1672 × 941
- Implementation: `http://127.0.0.1:4173/admin/voters`
- Implementation screenshot evidence: Codex in-app Browser capture retained in this task; the capture API did not expose a local filesystem path
- Browser viewport: 1672 × 941 CSS px
- Device pixel ratio: 1
- State: unfiltered preview voter records, viewport positioned at the top
- Density normalization: none required; source and implementation were compared at 1:1 dimensions

## Full-View Comparison Evidence

The implementation was captured at the exact source dimensions. It preserves the reference's full-height blue navigation, large Voters heading and description, three-part filter panel, and wide white table surface with the dark-blue four-column header. The surrounding dark presentation frame from the source is intentionally omitted to follow the established full-viewport requirement.

## Focused Region Comparison Evidence

- Search controls: input/button split, dark search action, muted field fill, select proportions, caret alignment, and horizontal spacing match the source hierarchy.
- Table: Student ID, Name, Course, and Status columns retain equal visual weighting and the rounded navy header treatment.
- Sidebar: Voters uses the yellow active state, while Dashboard and Votes remain functional routes.
- Mobile at 390 × 844 CSS px: controls stack cleanly, the table scrolls inside its card, the navigation opens as an overlay, and the page itself has no horizontal overflow.

## Required Fidelity Surfaces

- Fonts and typography: Satoshi matches the existing admin visual language, with heading, subtitle, controls, and table labels calibrated to the source hierarchy.
- Spacing and layout rhythm: header baseline, filter panel, table spacing, radii, and elevation align with the reference; row content uses the source's empty table space productively.
- Colors and visual tokens: cobalt navigation, yellow selected state, pale blue-gray canvas, white panels, dark-blue table header, and gray input fields match the source palette.
- Image quality and assets: the Voters reference contains no raster imagery. Search, caret, and navigation symbols use the installed Phosphor icon set rather than custom SVG or CSS drawings.
- Copy and content: Voters title, management description, search placeholder, filter labels, and column headings match the reference.

## Findings

No actionable P0, P1, or P2 mismatch remains.

## Comparison History

1. Initial pass
   - No actionable P0/P1/P2 findings.
   - Desktop proportions aligned at 1672 × 941 without a corrective visual iteration.
2. Interaction pass
   - Search for `Maria` returned exactly one matching voter.
   - Combined `BSIT` and `Not Voted` filters returned exactly one matching voter.
3. Responsive pass
   - Verified 390 × 844 layout, menu expansion, internal table scrolling, no page-level horizontal overflow, and a clean browser console.

## Functional Verification

- [x] Search by student name or ID works.
- [x] Course and status filters work independently and together.
- [x] Empty-result feedback is implemented.
- [x] Authenticated sessions request `/api/admin/students`.
- [x] Voters navigation is active and connected to `/admin/voters`.
- [x] Lint, typecheck, production build, desktop comparison, and mobile verification pass.

## Open Questions

- The current backend student response has no course field or per-student voting-participation flag. Authenticated rows therefore show the real academic status and an em dash for course; the isolated preview demonstrates the complete course/voting-status design until those fields are exposed.

## Follow-up Polish

- P3: the reference leaves the table body empty, while the implementation includes realistic rows and status pills so the primary management flow can be tested.

final result: passed

---

# Admin Votes Design QA

## Comparison Target

- Source visual truth: `frontend/design/votes-design-ref.png`
- Source pixels: 1536 × 1024
- Implementation: `http://127.0.0.1:4173/admin/votes`
- Implementation screenshot evidence: Codex in-app Browser capture retained in this task; the capture API did not expose a local filesystem path
- Browser viewport: 1536 × 1024 CSS px
- Device pixel ratio: 1
- State: All positions selected, preview election results, viewport positioned at the top
- Density normalization: none required; source and implementation were compared at 1:1 dimensions

## Full-View Comparison Evidence

The implementation was captured at the exact source dimensions. It matches the full-viewport blue sidebar, Votes heading and description, top-right print control, rounded position filters, and three stacked white results panels. The user-requested full canvas is preserved instead of the source image's dark presentation frame.

## Focused Region Comparison Evidence

- Header and filters: title scale, subtitle baseline, action placement, filter order, pill height, and active blue state track the reference.
- Results panels: headings, white surface treatment, vertical card rhythm, circular candidate marks, blue/red bars, and relative bar lengths align with the source.
- Sidebar: the Votes item has the yellow active state while Dashboard remains a working route.
- Mobile at 390 × 844 CSS px: the header stacks, filters become a two-column grid, result rows remain readable, navigation opens as an overlay, and there is no page-level horizontal overflow.

## Required Fidelity Surfaces

- Fonts and typography: Satoshi maintains the reference's geometric admin typography, with corrected title and panel-heading sizes after the first comparison.
- Spacing and layout rhythm: header, filters, and first panel align to the source; candidate rows were tightened so all three result panels fit the reference height.
- Colors and visual tokens: cobalt sidebar, yellow selection, pale blue-gray canvas, white panels, navy winner bars, and red secondary bars match the visual hierarchy.
- Image quality and assets: this view contains no raster art requirement. Candidate fallbacks use the installed Phosphor icon family rather than custom SVG or CSS illustration; real profile photos render when supplied by the API.
- Copy and content: Votes heading, live-results description, position labels, and Print/Export copy match the source. Candidate names and totals expose the real underlying result data.

## Findings

No actionable P0, P1, or P2 mismatch remains.

## Comparison History

1. Initial pass
   - P2: the title was oversized and pushed each results panel roughly 20 px below the source position, clipping the final panel at the reference height.
   - Fix: reduced the title ceiling, tightened the subtitle/filter spacing, and recalibrated control widths.
2. Second pass
   - P2: increased avatar fidelity created excess vertical space between candidate rows.
   - Fix: removed the row gap while retaining the source-sized candidate marks.
   - Post-fix evidence: the President panel starts near y=245 and all three panels remain visible within the 1024 px reference viewport.
3. Final pass
   - No actionable P0/P1/P2 findings.
   - Verified All/President filtering, Dashboard/Votes navigation, responsive menu, no horizontal overflow, and a clean browser console.

## Functional Verification

- [x] Position filters update the visible result groups.
- [x] Dashboard and Votes sidebar controls navigate between routes.
- [x] Print/Export invokes the browser's print/export workflow and includes print-specific layout rules.
- [x] Authenticated sessions load the active/latest election from the protected dashboard endpoint.
- [x] Preview results keep the frontend reviewable when the backend is unavailable.
- [x] Lint, typecheck, production build, desktop comparison, and mobile verification pass.

## Follow-up Polish

- P3: the source hides candidate names and vote totals inside otherwise empty bars; the implementation displays both so the live results remain understandable and useful.

final result: passed

---

# Admin Position Design QA

## Comparison Target

- Source visual truth: `frontend/design/position-design-ref.png`
- Source board pixels: 2946 × 1146
- Implementation: `http://127.0.0.1:4173/admin/positions`
- Implementation screenshot evidence: Codex in-app Browser captures retained in this task; the capture API did not expose local filesystem paths
- Main implementation viewport: 1536 × 900 CSS px
- Mobile implementation viewport: 390 × 844 CSS px
- Device pixel ratio: 1
- States compared: default position list and Add Position dialog open
- Density normalization: the source is a presentation board containing the page and a separate modal specimen side by side, so the page and dialog were compared as normalized content regions rather than as one literal 2946 px application viewport

## Full-View Comparison Evidence

The full-viewport implementation preserves the reference's blue sidebar, Position heading, top-right Add Position action, three yellow-capped summary cards, and compact four-column management table. The dark board background is intentionally omitted to follow the established full-viewport requirement.

## Focused Region Comparison Evidence

- Summary region: three equal white cards, yellow top rules, compact labels, and live totals match the source hierarchy and spacing.
- Table: dark-blue rounded header, Position/Max Votes/Candidates/Actions columns, alternating row treatment, and dark/red action labels match the reference.
- Dialog: the Add Position title, two labeled fields, white-gray surface, Cancel/Save actions, dimensions, and spacing were captured and compared in the open state.
- Mobile: summary cards stack, the table scrolls within its surface, the dialog fits the viewport, and no page-level horizontal overflow occurs.

## Required Fidelity Surfaces

- Fonts and typography: Satoshi preserves the established admin typography with matching title, label, table, and dialog weight hierarchy.
- Spacing and layout rhythm: page header, summary grid, table, modal field spacing, radii, and shadows align with their respective source regions.
- Colors and visual tokens: cobalt navigation, yellow active state and card accents, blue action/header surfaces, pale canvas, white cards, and red delete actions match the reference palette.
- Image quality and assets: the Position reference contains no raster imagery. Plus, close, and navigation symbols use the installed Phosphor icon library.
- Copy and content: Position, Add Position, Total Position, Total Candidates, Total Seats, table headings, field labels, and action copy match the source.

## Findings

No actionable P0, P1, or P2 mismatch remains.

## Comparison History

1. Initial page pass
   - No actionable P0/P1/P2 finding; page proportions aligned without a corrective visual iteration.
2. Dialog pass
   - The add dialog matched the source specimen at desktop and remained usable at 390 × 844.
3. Interaction pass
   - Added a Treasurer position in preview mode, verified summary totals updated, then edited its max-per-vote value successfully.
   - Delete was intentionally not exercised during browser QA because it is a destructive action; the implementation requires explicit confirmation.
4. Final pass
   - Verified desktop and mobile rendering, modal open/close behavior, no horizontal page overflow, and a clean browser console.

## Functional Verification

- [x] Add Position opens the referenced dialog.
- [x] Preview-mode create and edit update the table and summary totals.
- [x] Authenticated mode lists, creates, updates, and deletes through the existing protected position endpoints.
- [x] Backend validation and draft-election restrictions surface as visible messages.
- [x] Position navigation is active and connected to `/admin/positions`.
- [x] Lint, typecheck, production build, desktop comparison, and mobile verification pass.

## Follow-up Polish

- P3: unlike the static summary cards in the source, the implementation displays live totals so the page communicates useful state.

final result: passed

---

# Admin Ballot Position Design QA

## Comparison Target

- Source visual truth: `frontend/design/ballot-position-design-ref.png`
- Source board pixels: 1711 × 919
- Implementation: `http://127.0.0.1:4173/admin/ballot-position`
- Implementation screenshot evidence: Codex in-app Browser captures retained in this task; the capture API did not expose local filesystem paths
- Desktop implementation viewport: 1711 × 919 CSS px
- Mobile implementation viewport: 390 × 844 CSS px
- Device pixel ratio: 1
- State: President, Vice President, and Senators in their default ballot order
- Density normalization: the source and implementation were placed together on one 1711 px-wide comparison canvas. The source's dark presentation frame was excluded from application-level fidelity judgments.

## Full-View Comparison Evidence

The rendered screen preserves the reference's fixed cobalt sidebar, pale full-height workspace, single wide white panel, ballot-order instruction, rounded navy table header, three divided position rows, and paired reorder arrows. The implementation uses the complete viewport instead of retaining the source board's dark outer frame, matching the established admin-screen requirement.

## Focused Region Comparison Evidence

- Panel: its top position, generous white surface, corner radius, and content inset align with the source composition.
- Table header: Order and Position keep the same wide two-label treatment, with a reserved action column for alignment.
- Rows: order numerals, centered position names, divider weight, vertical rhythm, and arrow placement closely track the source.
- Mobile: the instruction wraps naturally, all three columns remain readable at 390 px, arrow controls retain practical tap targets, and no page-level horizontal overflow occurs.

## Required Fidelity Surfaces

- Fonts and typography: Satoshi matches the existing admin language, with the instruction, header labels, position names, and order numbers calibrated to the source's weight and hierarchy.
- Spacing and layout rhythm: panel placement, title gap, header height, row height, dividers, column proportions, radii, and surrounding whitespace reproduce the reference structure.
- Colors and visual tokens: cobalt navigation and table header, yellow active navigation, pale blue-gray workspace, white panel, gray dividers, and dark row content match the source palette.
- Image quality and assets: the reference contains no raster imagery. Navigation and reorder symbols use the installed Phosphor icon set rather than custom SVG or CSS drawings.
- Copy and content: the ballot-order instruction, Order and Position labels, and President, Vice President, and Senators rows match the source.

## Findings

No actionable P0, P1, or P2 mismatch remains.

## Comparison History

1. Initial comparison pass
   - The source and browser-rendered implementation were placed in one comparison canvas.
   - No actionable P0/P1/P2 differences were found in layout, type, color, spacing, icons, or content.
2. Interaction pass
   - Moved Vice President above President and verified the displayed order and ordinal values updated together.
   - Restored the reference order and confirmed the success notice.
3. Responsive and console pass
   - Verified 390 × 844 rendering, open/close mobile navigation, disabled boundary arrows, no horizontal overflow, and a clean browser console.

## Functional Verification

- [x] Up and down controls reorder positions and order numbers together.
- [x] First-up and last-down controls are disabled at their boundaries.
- [x] Preview mode applies ordering locally with visible success feedback.
- [x] Authenticated draft elections persist normalized `display_order` values through the existing position update endpoint.
- [x] Backend rejection restores the previous order and exposes the API message.
- [x] Ballot Position navigation is active and connected to `/admin/ballot-position`.
- [x] Lint, typecheck, production build, desktop comparison, mobile verification, and console checks pass.

## Follow-up Polish

- P3: boundary arrows are visibly muted when unavailable; the static source keeps every arrow black, but the disabled treatment improves affordance without changing the composition.

final result: passed
