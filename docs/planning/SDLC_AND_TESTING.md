# SDLC, delivery, and verification plan

This plan starts the development process from a documented baseline. Existing code is material to evaluate, not proof that requirements, design, testing, or deployment gates have already been completed.

## 1. Development approach

Use a short upfront requirements/design stage followed by incremental vertical slices. Each slice includes the database change, service, permission rules, API, UI, and tests. Do not complete three independent role interfaces and postpone integration until the end.

Track a shared backlog. Every task names a requirement, owner, reviewer, dependency, acceptance test, and evidence link. A task is complete when the behavior works through the real stack, not when AI generated files or the screen looks finished.

## 2. SDLC stages and evidence gates

| Stage | Work | Required evidence / exit condition |
| --- | --- | --- |
| Problem and feasibility | Validate customer/shop needs, team capacity, providers, and pickup-only/no-payment scope | Problem statement, stakeholder list, feasibility/risk notes, agreed scope |
| Requirements | Interview users/shops; define roles, policies, exceptions, and measurable quality goals | SRS, prioritised backlog, use cases, acceptance criteria, recorded assumptions |
| Analysis and design | ERD, data dictionary, state machine, availability algorithm, route map, API contract, security boundaries, wireframes | Reviewed architecture decisions and one consistent vocabulary |
| Implementation | Build small full-stack slices with migrations and review | Working slice, meaningful tests, migration notes, peer-reviewed code |
| Verification | Test permissions, database races, end-to-end use, accessibility, failures, and usability | Traceability matrix, passing test report, issue log and resolutions |
| Deployment | Staging, real scheduler/mail/media configuration, backups, smoke tests, recovery procedure | Reproducible deployment and rollback/runbook; readiness evidence |
| Maintenance | Monitor incidents, missed jobs, confusing UX, and actual shop feedback | Prioritized fixes, release notes, support ownership, periodic restore exercise |

Record actual dates and results. Do not backdate interviews, manufacture usability results, or describe a document drafted after implementation as the original requirement baseline.

### Initial research checklist

Suggested small discovery sample: five target customers and three rental-shop owners, expanded if their answers conflict. These are proposed interviews, not completed research.

Ask customers how they choose sizes, acceptable travel distance, usual rental period, what confirms trust, how they interpret a pending request, and what happens when plans change.

Ask owners how they identify individual pieces, manage walk-ins/WhatsApp commitments, clean garments, handle missing set pieces, approve requests, close unexpectedly, and recover from late returns.

Observe an actual shop workflow when possible. Convert conflicting answers into explicit policy decisions, rather than coding both interpretations accidentally.

## 3. Requirements and traceability baseline

| ID | Requirement | Main data | Service/API | Acceptance test |
| --- | --- | --- | --- | --- |
| FR-01 | Public discovery shows only approved visible inventory | Boutique, Product, Variant | Catalogue query | T01 |
| FR-02 | Identity and role/ownership checks protect resources | User, UserRole | Authorization policies | T02-T04 |
| FR-03 | An administrator reviews versioned shop applications | Application, ReviewEvent | Application decision | T05 |
| FR-04 | Stock represents real pieces and multiple sizes | Variant, Unit, UnitEvent | Inventory commands | T06 |
| FR-05 | Date availability includes cleaning and commitments | UnitBlock | Availability/quote | T07-T09 |
| FR-06 | A same-shop multi-item request is atomic | Booking, Item, Allocation | Create request | T10-T13 |
| FR-07 | Confirmation, rejection, cancellation, and expiry are consistent | Booking, Event | Booking commands | T14-T16 |
| FR-08 | Walk-ins respect online reservations | Booking source, UnitBlock | Create walk-in | T11, T17, T38-T39 |
| FR-09 | Handover requires ready assigned pieces | Allocation, Unit, handover token | Pickup command | T18 |
| FR-10 | Returns and inspection track each physical piece | Allocation, Inspection | Return/inspect | T19-T21 |
| FR-11 | Late returns and downtime expose future risk | UnitEvent, SupportTicket | Incident/reassign | T22-T24, T37 |
| FR-12 | Price information is consistent and never collects money | Quote, BookingItem snapshots | Quote/request | T25-T26 |
| FR-13 | Reviews require actual handover and operational closure | Review, BookingItem | Review submission | T27 |
| FR-14 | AI retrieves real matches within hard constraints | Product attributes, availability | Recommendation service | T28-T30 |
| FR-15 | Media ownership and privacy are enforced | MediaAsset | Upload/read/cleanup | T31 |
| FR-16 | Notifications and jobs are durable and repeatable | Outbox, Notification | Worker | T32-T33 |
| FR-17 | Admin intervention is limited and explainable | Audit, SupportTicket | Admin commands | T34-T35 |
| FR-18 | Operational reporting has reproducible definitions | Events, bookings, unit history | Analytics | T36 |

The complete behavior is defined in [business rules](BUSINESS_RULES.md). Keep the requirement IDs stable as code evolves.

### Nonfunctional requirements

| ID | Requirement | Proposed verification |
| --- | --- | --- |
| NFR-01 | No duplicate unit allocation under concurrency | Real PostgreSQL races including 50 simultaneous attempts on a final piece |
| NFR-02 | No cross-user/shop private-data access | Two-customer/two-shop authorization matrix including guessed IDs |
| NFR-03 | Responsive browsing and quotes | Measure representative seeded catalogue; initial target p95 catalogue under 1 second and quote under 1.5 seconds at an agreed load |
| NFR-04 | Accessible primary flows | Keyboard completion, visible focus, labels, error associations, contrast, mobile viewport checks |
| NFR-05 | Recoverable operation | Backup restore into isolated environment; outbox/expiry recovery after worker interruption |
| NFR-06 | Understandable user feedback | UAT users correctly distinguish request, confirmation, handover, return, and completion |
| NFR-07 | Maintainable domain logic | Single allocator/state machine, typed contracts, reviewed migrations, no hidden production mocks |
| NFR-08 | Bounded AI dependency | Timeouts, input limits, labelled fallback, cleanup, zero hard-constraint bypass |

Performance values are proposed targets, not benchmarks. Document environment, catalogue size, concurrency, provider latency, and results. Do not claim a particular uptime or scalability level without measurement and operational support.

## 4. Three-person ownership

| Team member | Primary ownership | Required collaboration |
| --- | --- | --- |
| A: customer and discovery | Identity/account flows, public catalogue/customer UI, wishlist, recommendation/text/image flows | Agrees booking DTOs with B; C reviews identity/role security |
| B: boutique and rental engine | Physical inventory, availability, booking services, owner operations, calendar, migration coordination | A builds customer experience on the same services; C reviews state/incident controls |
| C: governance and operations | Shop review/admin, moderation, support, notifications/jobs, operational analytics, release checklist | Uses B's booking commands for interventions; A reviews user-facing communication |

All three jointly own the ERD, vocabulary, state machine, requirements, test matrix, and architecture explanation. One person coordinates migrations; that person does not privately invent the whole schema.

Shared-code review:

- Auth/role changes: A implements, C reviews.
- Stock allocation and SQL constraints: B implements, A or C reviews with concurrency tests.
- Admin corrections/suspension: C implements, B reviews lifecycle effects.
- Recommendations: A implements, B reviews availability/budget enforcement.
- Schema changes: the feature owner proposes; B coordinates; another member reviews.

Each member must demonstrate their feature end to end: browser action -> API -> permission check -> service rule -> database -> response -> test. Every member also explains the shared reservation flow.

## 5. Reference schedule

This is a 12-week planning estimate for three people. Re-estimate after week 1 using actual available hours. Do not promise a public launch on this schedule without meeting release gates.

| Week | Increment | Demonstrable outcome |
| --- | --- | --- |
| 1 | Discovery and scope | Real interview notes; policies and exclusions agreed; backlog prioritized |
| 2 | Design | ERD/data dictionary, state machine, permissions, route/API contracts, wireframes, test plan |
| 3 | Identity and onboarding | Register/verify/login; submit application; admin approves; correct owner capability |
| 4 | Inventory and public catalogue | Shop creates two sizes and real unit records; customers see approved listings; staging online |
| 5 | Availability and requests | Real database constraints, estimates, atomic reservations, expiry scheduler, race tests |
| 6 | Fulfilment | Confirm/reject/cancel, walk-in, handover, partial returns, inspection, cleaning readiness |
| 7 | Operational exceptions | Late returns, unit reassignment, closures, suspension, no-show, basic support/audit |
| 8 | Discovery improvements | Text styling, deterministic fallback, wishlist/reviews, notification reliability |
| 9 | Image and reporting | Private inspiration upload/attribute matches; operational analytics with history |
| 10 | System hardening | Cross-role browser tests, failure/retry tests, concurrency/load measurement, accessibility |
| 11 | Real-user UAT and fixes | Customers/shop owners attempt actual tasks; fixes and evidence recorded; docs aligned |
| 12 | Controlled pilot and presentation | Clean demo, recovery rehearsal, release checklist, team presentation and contingency buffer |

Tests run with each increment. Week 10 broadens system verification; it is not the first testing week.

If time becomes constrained, defer sophisticated AI ranking, embedding search, custom analytics charts, and advanced rescheduling. Keep stock correctness, role security, walk-ins, return/cleaning, and basic operational support in scope.

## 6. Acceptance test catalogue

| Test | Scenario and expected result |
| --- | --- |
| T01 | Pending/suspended shops and hidden/archived products do not accept new public reservations |
| T02 | Customer A cannot read/cancel customer B's booking by changing an ID |
| T03 | Owner A cannot edit owner B's products/units/bookings or read their customer contacts |
| T04 | Public signup cannot grant owner/admin; stale revoked sessions cannot mutate data |
| T05 | Approval is versioned/audited; a rejected application resubmits as a new revision; self-approval is impossible |
| T06 | One listing offers multiple sizes and individual pieces; booked sizes cannot be repurposed silently |
| T07 | Return+buffer boundary is exclusive; overlapping cleaning periods prevent reservation |
| T08 | Past, reversed, excessive, outside-hours, closure-conflicting, and malformed intervals fail |
| T09 | An overdue/repair/lost unit is excluded from new reservations despite nominal past schedule |
| T10 | Concurrent final-unit requests produce at most one successful active allocation |
| T11 | A walk-in racing an online request cannot reserve the same piece |
| T12 | A multi-item request with one unavailable line reserves nothing |
| T13 | Duplicate request key returns the same booking; same key with different content conflicts |
| T14 | Confirm versus cancel produces one consistent winner with an event and correct released/retained blocks |
| T15 | An expired request cannot be confirmed even when its cleanup job is delayed |
| T16 | Rejection/cancellation/expiry release all relevant units exactly once |
| T17 | A guest walk-in does not create an account and cannot be claimed by an unverified matching phone |
| T18 | Pickup rejects stale/reused/wrong codes, wrong unit IDs, dirty pieces, and wrong shop |
| T19 | Partial return leaves remaining units issued and the booking PICKED_UP |
| T20 | Return does not make stock READY; only inspection/cleaning/readiness rules permit reuse |
| T21 | Damage/missing pieces require evidence notes; inspection correction preserves the original |
| T22 | An overdue return identifies future commitments and prevents an impossible handover |
| T23 | Equivalent-unit reassignment is atomic and audited; a different size/style needs customer agreement |
| T24 | Closure, retirement, repair, or suspension cannot silently erase confirmed commitments |
| T25 | Daily/per-rental estimates use full period and integer arithmetic; cleaning adds no chargeable period |
| T26 | Quote price/terms change requires re-review; there is no payment/refund operation |
| T27 | Only an eligible customer can review their actually fulfilled booking line once; hidden reviews leave aggregates |
| T28 | Recommendations contain only real approved available variants meeting size/date/location/combined-budget constraints |
| T29 | AI failure uses labelled rules; inventory failure produces no fictional matches |
| T30 | Image attributes are confirmable; uncertain extraction cannot override hard user constraints |
| T31 | Unsupported/oversized/cross-shop media fails; private uploads are inaccessible publicly and expire |
| T32 | Notification failure leaves the booking committed and visible; retries deduplicate delivery |
| T33 | Re-running or interrupting expiry/reminder jobs does not duplicate state changes or overbook |
| T34 | Suspension blocks new business while preserving limited return/support operations |
| T35 | Admin cannot deactivate self/last admin casually or rewrite a pickup without an audited case |
| T36 | Analytics match known event history; unknown historical capacity shows unavailable rather than invented utilization |
| T37 | A never-returned unit closes only through a loss case; capacity is removed and no return is fabricated |
| T38 | A present-at-counter walk-in can start now while an online request still obeys advance notice |
| T39 | Connection loss cannot produce a false confirmed reservation; historical reconciliation exposes conflicts |

Use real PostgreSQL for allocation/exclusion/locking and integration tests. A mock service cannot verify database concurrency. Test data belongs in a disposable migrated database, never a live shop database.

Browser journeys must include visitor -> login -> restored selection; customer request -> owner action -> customer update; admin approval -> owner publishing; walk-in conflict; partial return; and a failed-dependency/error recovery.

## 6a. Initial risk register

| Risk | Prevention/detection | Response and owner |
| --- | --- | --- |
| Inaccurate existing shop stock | Physical stock count and import of offline commitments | Pause affected listings; reconcile units; B + shop owner |
| Unrecorded walk-ins | Training and a quick counter flow | Investigate conflicts and retrain; B + shop owner |
| Late/missing return affects next customer | Overdue detection and future-commitment alerts | Equivalent reassignment or timely shop cancellation; owner, escalated to C |
| Owner ignores requests | Bounded expiry, reminders, queue, confirmation-rate visibility | Review participation/limits; C |
| Cleaning is recorded inaccurately | Per-unit readiness history and handover checks | Suspend affected pieces and investigate; owner + C |
| Cross-account data leak | Server policy tests and minimal DTOs | Revoke access, investigate scope, correct and verify; A + C |
| Job or notification outage | Durable jobs, leases, retry metrics, in-app truth | Recover/retry without duplicating domain changes; C |
| AI output is misleading | Real-inventory retrieval, hard filters, labelled fallback, human evaluation | Disable provider path and use rules; A |
| Images expose personal information | Private storage, access checks, short retention | Remove access, investigate and clean up; A + C |
| Scope exceeds team capacity | Prioritised slices and weekly evidence review | Defer advanced discovery/polish; entire team |
| Database migration loses history | Reviewed additive migrations, backups, staging rehearsal | Restore/recover with documented procedure; B |
| Demo/presentation hides missing behavior | Traceability and reproducible full-stack scenarios | Present known limitations and fix the core slice; entire team |

## 7. Definition of ready and done

### A feature is ready to implement when

- Its requirement and acceptance criteria are written.
- Actor, ownership, relevant states, and exceptions are known.
- API input/output/errors and data changes are agreed.
- Dependencies and affected tests are identified.

### A feature is done when

- Real UI/API/service/database behavior works, including failure paths.
- Relevant rules, authorization, and integration tests pass.
- No hidden mock data substitutes for production failure.
- Schema migration and rollback/recovery implications are reviewed.
- A teammate can explain and demonstrate it.
- Documentation and evidence match the actual implementation.

Use code review and continuous integration for type checks, lint, relevant tests, migration validation, and build. Keep the shared branch runnable. Seed fixtures for reproducible demonstrations; label them as sample data.

## 8. Responsible use of generated code

AI can assist with small components, migrations, tests, and explanation after a design exists. The responsible team member must inspect the diff, explain the rules, verify dependencies/API conventions, and run meaningful tests.

Do not accept a large generated feature because it compiles. Ask:

1. Which requirement does this change implement?
2. Which role/ownership checks run on the server?
3. Which state transitions and invariants does it affect?
4. What happens on concurrency, failure, retry, and stale data?
5. What evidence demonstrates the behavior?

Maintain an architecture decision record when a meaningful trade-off changes. Keep tests that would catch a real failure; do not generate tests that merely duplicate the implementation.

## 9. Bringing the existing repository toward this plan

1. Preserve the current checkout/database and record its current behavior.
2. Map existing features to requirements: reuse, repair, replace, or defer.
3. Reconcile identity/role rules and canonical routes before adding more pages.
4. Design an additive migration from pooled quantity to physical units. Require a real stock count and import existing reservations; unknown unit assignments are unresolved, not fabricated certainty.
5. Remove payment/deposit/refund features from the target UI/contracts. Review existing stored history before any destructive schema removal.
6. Build the booking slice against the reviewed schema and guard it with integration tests.
7. Migrate one workspace at a time using shared services; redirect old URLs.
8. Add AI and reporting after stock/booking correctness.
9. Reconcile legacy data, run UAT, and choose a controlled cutover only when the team can recover safely.

Planning does not authorize erasing databases or rewriting history. Do not restart by deleting the current project.

## 10. Production roadmap and release gates

### Gate A: internally demonstrable MVP

All three roles work against real test data, the no-payment boundary is visible, stock races pass, basic failure handling works, and the team can explain the system. A demo is not a production launch.

### Gate B: limited real-shop pilot

- Interview-informed policies and agreed shop operating procedures.
- Verified shop stock and imported offline commitments.
- Mandatory contact verification suitable for the pilot; clear confirmation and counter instructions.
- Working mail, scheduler, media privacy, monitoring, backup restore, and incident/support owner.
- Staff training to record every walk-in and acknowledge physical returns.
- Clear privacy/retention terms and business-policy review for the deployment jurisdiction.
- A small invited customer group, a few shops in one area, and a documented manual fallback.
- No unresolved critical authorization, data-loss, or allocation issues.

### Gate C: open production release

Add admin MFA, real phone verification if not already present, security review, operational alerts, abuse handling, measured capacity, a tested recovery procedure, support coverage, and reliable shop performance monitoring. Broaden shops only after pilot incidents are understood.

### Later growth

Staff memberships/permissions, multiple branches with branch-specific stock, customer-agreed booking changes, advanced visual similarity, better fit information, language support, and recommendation quality experiments. Stock transfers must become explicit movements before cross-branch availability is introduced.

Payments remain outside scope in every phase unless the product requirements are explicitly changed later.

## 11. Presentation and review plan

Prepare these artifacts from actual work:

- Problem statement and verified discovery findings.
- SRS with exclusions and priorities.
- Use-case diagram for the three roles.
- Context diagram/data flow and architecture diagram.
- ERD and data dictionary.
- Booking state machine and sequence diagram for request/confirmation.
- Canonical page map and permission matrix.
- Test traceability and actual verification report.
- Deployment/runbook and risk register.
- Known limitations and justified future improvements.

A practical demonstration:

1. Explain the problem and no-payment/pickup-only scope.
2. Admin approves a submitted boutique.
3. Owner lists a style with two sizes and physical stock codes.
4. Customer requests an outfit and jewellery for dates.
5. Show a second conflicting request being rejected safely.
6. Owner confirms and records handover.
7. Return one piece, show partial return, then complete inspection for all pieces.
8. Show cleaning readiness and subsequent availability.
9. Explain an overdue-return incident and reassignment.
10. Show AI retrieving real inventory and reporting from real events.

Each person presents a complete slice and answers questions about the common rental engine. Do not claim sandbox/demo actions prove real-world performance, security certification, or completed research.
