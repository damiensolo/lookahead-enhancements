# Demo Pages

Isolated demo routes that run alongside the main app. They do not affect production data or state.

---

## `/demo/in-review` — Real app in In-Review mode

The full real application interface, auto-booted into an **In Review** schedule with all 7 commitment statuses seeded across the task list.

### How it works

On load, a hidden boot component:
1. Creates a fresh draft from the active schedule (covering the Feb 2026 task window)
2. Immediately submits it for review, which seeds all 7 commitment statuses positionally across the leaf tasks

The rest of the UI is the real app — timeline, grid, detail panels, modals, role switcher.

### URLs

| URL | Persona |
|---|---|
| `http://localhost:5173/demo/in-review` | GC (default) |
| `http://localhost:5173/demo/in-review?persona=sc&company=Elliott+Subcontractors` | SC — Elliott Subcontractors |
| `http://localhost:5173/demo/in-review?persona=sc&company=Mora+Specialty+Contractors` | SC — Mora Specialty Contractors |

Any `company=` value that matches a contractor name in the task list will filter to that SC's tasks.

### Commitment statuses seeded

| Position | Status | Description |
|---|---|---|
| 1st leaf task | `committed` | SC confirmed as planned |
| 2nd leaf task | `adjustment_proposed` | SC wants to shift dates/crew |
| 3rd leaf task | `rejected` | SC cannot proceed (Unanswered RFI) |
| 4th leaf task | `gc_accepted` | GC accepted the SC's proposal |
| 5th leaf task | `gc_revised` | GC counter-proposed after rejection |
| 6th leaf task | `disputed` | Unresolved — needs PM conversation |
| 7th+ leaf tasks | `pending` | Awaiting SC response |

---

## `/demo/commitment-status` — Commitment status reference page

A fully isolated, static reference page showing all 7 commitment statuses with no dependency on `ProjectContext` or live data.

**URL:** `http://localhost:5173/demo/commitment-status`

### Sections

1. **Badge strip** — all 7 badges rendered with their exact styles, with amber dot indicator on elevated statuses
2. **GC grid view** — a table mimicking the real lookahead grid; `adjustment_proposed`, `rejected`, `gc_revised`, and `disputed` badges are clickable and open a GC review modal showing available actions per status
3. **SC card view** — the `SubCommitmentCard` layout as the subcontractor sees it; "Review & Respond" is active when the SC still needs to act
4. **Status legend** — who sets each status, what GC can do, what SC can do

---

## `/demo/lookahead-review` — Lookahead review demo (original)

The original GC/SC review demo page.

**URL:** `http://localhost:5173/demo/lookahead-review`

---

## All demo routes at a glance

| Route | Description |
|---|---|
| `/demo/in-review` | Real app UI · In Review · all 7 statuses seeded |
| `/demo/commitment-status` | Static reference page · all 7 status badges + legend |
| `/demo/lookahead-review` | Original lookahead review demo |
