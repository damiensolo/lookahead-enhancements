# Lookahead & production app — product description

This document expands the **product intent**, **user interactions**, and **feasibility considerations** for stakeholders reviewing scope, UX, or engineering estimates. It is **technology-agnostic** (no assumption about web framework or stack).

---

## 1. Product positioning

**What it is**  
A **short-horizon construction lookahead** application: GCs and subcontractors align on **what runs in the next few weeks**, **what blocks execution**, and **how production is tracking** against plan.

**Primary jobs-to-be-done**

| Job | Outcome |
|-----|---------|
| Plan the lookahead | Publish a time-bounded schedule version subs can react to. |
| Surface risk early | See blocked / at-risk work from constraints and locations before it hits the field. |
| Coordinate subs | SCs commit, push back, or propose changes on in-review work. |
| Track execution | Compare planned vs actual quantities and simple schedule performance on the production view. |

**Current implementation shape**  
The reference build is a **browser-based prototype**: rich UI with **in-session** state (no production-grade API, auth service, or persistence). Treat features below as **UX and domain models** that inform a future product—not guaranteed production behavior.

---

## 2. Users and entry points

### Personas

| Persona | Typical goals | How the UI adapts (demo) |
|---------|---------------|---------------------------|
| **GC (General Contractor)** | Edit lookahead, submit for review, publish, see full schedule and risks. | Full task tree, schedule actions, publish/deltas, GC adjustment responses. |
| **SC (Subcontractor)** | See **only own-company** tasks, respond on review, enter commitment details. | Tasks filtered by **demo company**; in-review may show **card-based review** instead of full grid. |

**Demo entry (illustrative)**  
Proof-of-concept builds may expose **demo URLs** (e.g. `?persona=gc` vs `?persona=sc&company=…`) to switch personas. **Replace with real authentication in production.**

**Feasibility note:** Production apps need **authenticated identity**, **company membership**, and **row-level security** on tasks—URL-style personas are **not** a security model.

---

## 3. Major surfaces and how you use them

### 3.1 App shell

**Interactions**

- **Header** shows the active **lookahead schedule** (picker), **period/date context**, and actions that depend on **schedule status** and **persona** (e.g. submit for review, publish, pull back to draft).
- **View switcher** (where shown): **Lookahead** | **Production** | **Kanban**.
- **Search / filter** (Lookahead and Kanban): narrows tasks; filter rules attach to the active **saved view** configuration.

**Feasibility:** Header complexity scales with **role permissions** (who can publish, who sees financials). Expect a **policy engine** or server-side checks, not UI-only flags.

---

### 3.2 Lookahead (main grid / timeline)

**Purpose**  
Hierarchical **WBS-style tasks** with dates, progress, contractor, location, **constraint columns** (Predecessor, RFI, Submittal, Material), and optional **commitment** / **actions** when the schedule is in review.

**Typical interactions**

1. **Expand/collapse** rows to navigate parent/child tasks.
2. **Select tasks** (checkboxes) for bulk or contextual actions where enabled.
3. **Edit cells** (where schedule is not closed): dates, progress, constraints, etc.—exact columns depend on column visibility and schedule state.
4. **Open task details** (panel): deeper edits, **daily metrics**, **crew**, **constraints**, **commitment** modals for SC when applicable.
5. **Add tasks** (GC flows) via modals when the app exposes them.
6. **Constraint health**: rolled-up labels such as **Complete / Blocked / At Risk / Ready**, derived from the aggregate status across constraint types (aligned with the **constraint badge** pattern in the UI).
7. **Location clash**: when two different contractors share a location with overlapping dates, the UI can flag **clashes** and open a **resolution** dialog (category, status: unresolved / resolved / accepted risk).

**Schedule status gates (conceptual)**

| Status | GC-oriented behavior | SC-oriented behavior |
|--------|----------------------|----------------------|
| **Draft** | Edit freely; may see **deltas** vs last published. | May have read-only or limited edit depending on product rules. |
| **In Review** | May pull back to draft; sees review progress. | **Commit / reject / propose** on tasks; optional **card review** layout instead of full grid. |
| **Active** | Published execution window; production-style inputs may apply. | Filtered tasks; labeling may vary by persona (confirm in UX spec). |
| **Closed** | Historical; editing often disabled. | Read-oriented. |

**Feasibility**

- **Concurrent editing:** Prototype assumes single user; real product needs **optimistic locking**, **audit log**, **merge rules**.
- **Clash detection:** Early versions may run **in the browser** over loaded tasks. At scale, **spatial + calendar rules** may live on a **service** with indexed locations and date ranges.
- **Master vs lookahead:** Product may reference **master schedule** comparisons; full **baseline sync** is a larger integration (e.g. P6, MSP).

---

### 3.3 GC–SC commitment & in-review workflow

**Purpose**  
When work is **in review**, subs **respond** to planned work: commit, reject, or propose **date/crew/material** adjustments; GC **accepts**, **counter-proposes**, or marks **disputed**.

**Typical interactions (SC)**

1. Open task → **Commitment** section or **review card**.
2. **Commit** after acknowledging planned quantity, crew, equipment/material checks—exact gates are product rules.
3. **Reject** with reason; certain reasons (e.g. **Unanswered RFI**) can add **project risks** surfaced in the header.
4. **Propose adjustment** (dates, crew size, notes); track **history** on the proposal.

**Typical interactions (GC)**

1. Review **pending** commitments and **proposals**.
2. **Accept** adjustment, **counter**, or **mark disputed** with notes.
3. **Publish** may be **blocked** until unresolved commitments are addressed (override may exist in demos).

**Feasibility**

- Prototype **commitment and activity** state may live only in memory—**persistence**, **notifications**, and **SLA tracking** belong in a production backlog.
- **Legal defensibility:** Commitments may need **immutable audit trail**, **timestamp**, **user id**, **electronic signature** policy—product/legal should define.

---

### 3.4 Production report

**Purpose**  
Roll up **leaf tasks** into **KPIs and charts**: planned vs actual quantities, **schedule performance–style** indices, plan reliability, cumulative curves, rolling production rate, etc. (driven by a reporting layer over task production data).

**Typical interactions**

1. Switch to **Production** view (global switcher when layout exposes it).
2. Read **KPI cards** and **charts** from **planned vs actual** and **daily** metrics on tasks.
3. Interpret trends for **lookahead tuning** (product decision: reporting frequency, who sees it).

**Feasibility**

- Metrics assume **clean, consistent units** and **dated actuals**; integrations with **ERP**, **timesheets**, or **field systems** are a separate workstream.
- **SPI / CPI**-style naming: confirm **formulas** match your contract reporting standards before external use.

---

### 3.5 Kanban board

**Purpose**  
Alternative view of **leaf tasks** in **swimlanes** (e.g. delayed / on track / yet to start—**categorization is date/progress based**, not the same as constraint “Ready”).
Cards show **contractor**, **progress %**, **constraint list**, **health badge** (Complete / Blocked / At Risk / Ready from aggregate constraint status), **warnings** (blocking constraints, open warnings, **location clash**).

**Typical interactions**

1. Scroll horizontally across lanes; scroll vertically within a lane.
2. Use **search** (shared with Lookahead when wired) to filter cards.
3. Scan **warnings** strip for quick risk triage.

**Feasibility**

- **Drag-and-drop** between lanes is **not** implied unless specified; changing lane would mean **changing dates/progress** with business rules—needs definition.
- Lane rules differ from **constraint health**; training material should explain both.

---

### 3.6 Supporting systems

| Area | Interaction sketch | Prototype limit |
|------|-------------------|-----------------|
| **Project risks** | List in header when risks are added (e.g. from rejection paths). | In-memory list in demo builds. |
| **Activity feed** | Per-schedule entries for review actions. | In-memory in demo builds. |
| **Deltas** | Compare changes vs previous publish when drafting. | May run in the browser; server diff for scale. |
| **Views / filters** | Named views, column sets, filters on table-style data. | Generic table “view” model may not map 1:1 to every lookahead column—validate per release. |

---

## 4. Data model (high level)

Entities worth tracking for feasibility workshops (names are conceptual, not tied to a language):

- **Schedule**: identifier, name, **status**, **version**, **period** (start + duration), task hierarchy, **published** timestamp.
- **Task**: hierarchy, dates, progress, contractor, location, **constraints** (list), **per–constraint-type status**, **production quantities**, **crew assignments by day**, commitment-related fields.
- **Constraint**: type, name, **severity** (Blocking / Warning), **status**.
- **Location clash**: derived or stored overlaps with resolution metadata.

---

## 5. Feasibility summary (for initial sizing)

| Theme | Prototype today | Hardening effort (order-of-magnitude themes) |
|-------|-----------------|-----------------------------------------------|
| **Identity & RBAC** | Demo persona switching | IdP, roles, company scoping, APIs. |
| **Persistence** | In-session / prototype state only | Database, migrations, APIs, offline/conflict strategy. |
| **Scheduling integrations** | Mock / static planners | Connectors, ID mapping, sync jobs. |
| **Notifications** | None | Email/in-app for review deadlines, clashes. |
| **Clash & constraints** | In-browser rules | Services, validation, possibly BIM/location models. |
| **Reporting** | Aggregates in the client | Data warehouse, scheduled ETL, governed metrics. |
| **Compliance** | N/A | Audit logs, retention, export for disputes. |

---

*This document describes product intent and is independent of front-end framework (e.g. Vue, React, or other). Update as implementation choices evolve.*
