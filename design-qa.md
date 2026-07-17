# Login Design QA

- Source visual truth: `/Users/juchen/.codex/generated_images/019f6b8b-3926-70b3-9492-73120a47a79c/exec-f171dbdb-c6d8-4127-943c-ffc892c65bd0.png`
- Desktop implementation: `/tmp/yaochi-login-final-desktop.png`
- Mobile implementation: `/tmp/yaochi-login-mobile.png`
- Local URL: `http://127.0.0.1:5174/`
- Viewports: `1504 x 1046` desktop and `390 x 844` mobile
- State: work-identity login; supplier-activation tab also checked on mobile

**Findings**

- No actionable P0, P1, or P2 differences remain.
- Typography preserves the source hierarchy with Chinese system-font fallbacks, normal letter spacing, and readable compact labels.
- Layout matches the selected three-part composition: narrow brand rail, editorial community introduction, and unframed login surface.
- Brand colors use the product blue tokens with a restrained orange status accent; contrast remains clear on both white and blue surfaces.
- The community scene is a real optimized SVG asset and the rail architecture is a generated image asset; neither is recreated with CSS or placeholder geometry.
- Product copy and existing authentication behavior are preserved, including work identity, supplier activation, help, registration, and development accounts.

**Full-view Comparison Evidence**

- The source and final desktop capture were opened together at the same desktop state and comparable viewport.
- The final composition preserves the source's region proportions, divider, visual hierarchy, form width, control density, and illustration art direction.

**Focused Region Evidence**

- A separate crop was not needed because labels, tabs, inputs, buttons, rail details, and illustration edges were legible in the full-resolution comparison.

**Comparison History**

1. Initial pass found the left introduction about 100 px too high and the community illustration too small relative to the source.
2. The introduction top offset was made viewport-aware, the illustration was widened, and the login form was lowered slightly.
3. The revised desktop capture aligned the title, image, form, and footer rhythm with the selected visual; no P0/P1/P2 mismatch remained.

**Interaction And Responsive Checks**

- Work-identity and supplier-activation tabs switch correctly.
- Mobile login fits `390 x 844` with no horizontal overflow.
- Mobile supplier activation exposes all required fields and keeps the primary and registration actions reachable through the page's internal scroll surface.
- Reduced-motion users receive a static illustration.
- Chrome console contained only a browser-extension autofill error; no application-origin error was observed.

**Follow-up Polish**

- P3: production naturally omits the development-account disclosure shown in the local capture.

## Admin Workspace Design QA

- Baseline dashboard: `/Users/juchen/Documents/workspace/yaochi/.playwright-cli/page-2026-07-17T00-23-01-576Z.png`
- Final dashboard: `/Users/juchen/Documents/workspace/yaochi/.playwright-cli/page-2026-07-17T00-34-56-494Z.png`
- Final dense table: `/Users/juchen/Documents/workspace/yaochi/.playwright-cli/page-2026-07-17T00-33-31-920Z.png`
- Final mobile navigation: `/Users/juchen/Documents/workspace/yaochi/.playwright-cli/page-2026-07-17T00-35-59-053Z.png`
- Reference patterns: Mobbin results for ClickUp and Asana dashboards, plus Airbnb, Slite, and Attio data-list screens
- Viewports: `1200 x 720`, `1024 x 768`, and `390 x 844`

**Findings**

- No actionable P0, P1, or P2 issue remains.
- The dark brand navigation creates a stable workspace anchor without reducing the readability of the light data surface.
- Active module and page states remain distinct in expanded, collapsed, and mobile-drawer navigation.
- Dense tables use a quieter header band and clearer row hover state; controls and content keep their original business meaning.
- Dashboard density remains appropriate at 1200 px with four KPI columns, a two-column task/status row, and charts visible in the next viewport band.
- Cards use an 8 px-or-smaller rendered radius and restrained borders/shadows rather than nested decorative surfaces.

**Full-view Comparison Evidence**

- The baseline and final dashboard captures were opened together at the same `1200 x 720` viewport and authenticated role state.
- The final design preserves the existing information architecture while improving navigation contrast, brand continuity, task affordance, table scanning, and top-bar hierarchy.

**Interaction And Responsive Checks**

- Authorized-page search opens from the top bar, filters by Chinese page name, and navigates to the selected page.
- Dashboard task rows navigate only when the current role has the target page.
- The work-identity menu exposes current identity, community, and logout without crowding the top bar.
- Sidebar collapse and expansion work and the preference persists after reload.
- The `390 x 844` mobile shell keeps titles and controls within the viewport; the navigation drawer opens, closes, and preserves active-page context.
- Browser console verification reported zero application errors and zero warnings.

**Comparison History**

1. The first dashboard pass moved KPI cards and the task/status layout to the `xl` breakpoint, which reduced density at 1200 px.
2. The breakpoint was corrected to `lg`, and a stale two-column span was removed from the task section.
3. The final desktop and mobile captures showed the intended density with no overlap, clipping, or inaccessible primary controls.

## Admin Typography QA

- Source supplier photo: `/tmp/codex-remote-attachments/019f6b8b-3926-70b3-9492-73120a47a79c/29496A74-E091-460F-9344-8AFE404F6031/1-照片-1.jpg`
- Source engineering photo: `/tmp/codex-remote-attachments/019f6b8b-3926-70b3-9492-73120a47a79c/29496A74-E091-460F-9344-8AFE404F6031/2-照片-2.jpg`
- Final supplier page: `/tmp/yaochi-font-supplier-desktop.png`
- Final engineering page: `/tmp/yaochi-font-engineering-desktop.png`
- Final mobile page: `/tmp/yaochi-font-engineering-mobile.png`
- Viewports: `1440 x 900` desktop and `390 x 844` mobile

**Findings**

- The real-screen photos showed that the 13 px layout root reduced `text-sm` body copy to about 11.4 px and `text-xs` metadata to 9.75 px.
- Typography is now independent from the compact rem layout scale: body copy, tables, labels, inputs, and buttons render at 14 px; secondary metadata renders at 12 px.
- Section headings render at 16 px while page headings retain their established 23 px hierarchy.
- The source photos and final desktop captures were reviewed together; the revised text is materially easier to scan without enlarging the sidebar or overall workspace geometry.
- The mobile section header now stacks its filters below the title, preventing the larger type from squeezing the title into a vertical column.

**Interaction And Responsive Checks**

- Supplier directory and engineering ledger were checked at desktop size with no horizontal overflow.
- Engineering ledger was checked at `390 x 844` with no horizontal overflow, overlap, clipping, or inaccessible controls.
- Browser console verification reported zero application errors and zero warnings.

final result: passed
