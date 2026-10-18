# Business rules and rental lifecycle

This is the proposed source of truth for domain behavior. Business rules live in server services and database constraints, and are exercised through APIs and interfaces. UI components do not invent additional transitions.

## 1. Proposed policy defaults

Validate these with participating shops. Version each policy and snapshot applicable terms onto a booking.

| Policy | Proposed first-release value |
| --- | --- |
| Currency for informational prices | INR; integer paise internally |
| Minimum online lead time | Pickup at least 24 hours after an online request; present-at-counter walk-ins may start now |
| Rental interval | At least 24 hours and at most 14 days |
| Advance booking horizon | Pickup at most 180 days ahead |
| Estimate freshness | 5 minutes; estimates do not reserve stock |
| Owner decision window | 12 hours after request; shown to both parties |
| Request limit | At most 3 pending online requests per customer; configurable and rate limited |
| Turnaround buffer | 24 hours by default; shop/product configuration cannot go below platform minimum |
| No-show review threshold | 2 hours after scheduled pickup; a shop must explicitly record a no-show |
| Reminder schedule | Confirmation, 24 hours before pickup, 24 hours before return, and overdue notification |
| Review window | 30 days after operational closure: COMPLETED or resolved CLOSED_WITH_LOSS |
| Cancellation | Customer can cancel before physical pickup; no financial logic |
| Inspection target | Within 24 hours of each physical return |
| Date changes in MVP | Cancel and make a fresh request; offer a safe preview before cancellation |
| Missing/damaged items | Record condition and support case; no app-based financial assessment |

Intervals are timestamps, not ambiguous date labels. Store instants in UTC and the boutique timezone separately. Use Asia/Kolkata for the initial India-focused release. Validate pickup and return against the shop's published hours and dated closures. A closure between pickup and return does not invalidate an otherwise valid rental.

If the team changes a default, update this document, validation, UI copy, and tests together. Policy changes do not rewrite existing bookings.

## 2. Product, variant, and physical unit

Example:

- Product: Plum embroidered lehenga set.
- Variant: Medium, with garment measurements.
- Units: PLUM-M-001 and PLUM-M-002, two actual sets.
- Included pieces: skirt, blouse, dupatta; each set's inspection checks all three.

A jewellery set follows the same model, commonly with a FREE_SIZE variant. Different colours or materially different configurations are separate variants or products, consistently defined during design.

Do not sell separate pieces of one set as independently available unless they are genuinely tracked as independent rentable units. An outfit with an included dupatta cannot simultaneously expose that same physical dupatta as free accessory stock.

There is no editable product-level available quantity. Total stock is derived from physical units; dated available quantity is derived from eligible units and reservations.

Unit attributes are separate:

| Attribute | Values/purpose |
| --- | --- |
| Lifecycle | ACTIVE, RETIRED, LOST |
| Physical readiness | READY, WITH_CUSTOMER, INSPECTION_REQUIRED, CLEANING, REPAIR |
| Condition history | Observations, missing pieces, damage evidence, actor, and time |
| Planned commitments | Future reservations and explicit downtime intervals |

A unit can be WITH_CUSTOMER today and have a future reservation after its expected return and cleaning buffer. Current readiness alone must not incorrectly hide all future stock. However, a known overdue, lost, or unresolved-repair unit is excluded from new reservations until resolved.

## 3. Booking state machine

~~~mermaid
stateDiagram-v2
    [*] --> REQUESTED: Customer submits; units provisionally reserved
    REQUESTED --> CONFIRMED: Owner approves before deadline
    REQUESTED --> REJECTED: Owner rejects with reason
    REQUESTED --> CANCELLED: Customer withdraws
    REQUESTED --> EXPIRED: Decision deadline passes
    CONFIRMED --> PICKED_UP: All assigned pieces handed over
    CONFIRMED --> CANCELLED: Customer cancels or shop cannot fulfil
    CONFIRMED --> NO_SHOW: Owner records missed pickup after threshold
    PICKED_UP --> PICKED_UP: Some pieces returned
    PICKED_UP --> RETURNED: All pieces physically returned
    RETURNED --> COMPLETED: Required inspections finalized
    PICKED_UP --> CLOSED_WITH_LOSS: Case resolved; missing units declared lost
~~~

Terminal statuses cannot be reopened by directly editing a field. Corrections use a dedicated administrative procedure with a case, reason, original event, and invariant checks. CLOSED_WITH_LOSS is an exceptional operational closure, never a fabricated physical return.

OVERDUE, PARTIALLY_RETURNED, AWAITING_INSPECTION, and AT_RISK are derived operational indicators, not competing top-level booking statuses. A booking may be PICKED_UP and overdue while one unit is already returned.

| Command | Actor | Preconditions | Transaction effects |
| --- | --- | --- | --- |
| Request | Customer | Own active account, verified email, bookable shop/items, valid interval/limits, sufficient units | Create booking/items/allocations/blocks, snapshots, event, and notification outbox |
| Confirm | Owner | Own shop; REQUESTED; not expired; shop approved; units still valid | CONFIRMED, convert provisional blocks, clear decision deadline, event/outbox |
| Reject | Owner | Own REQUESTED booking; reason provided | REJECTED; release every block; event/outbox |
| Cancel | Customer | Own REQUESTED or CONFIRMED booking; no unit handed over | CANCELLED; release blocks; reason/event/outbox |
| Shop cancel | Owner | Own pre-pickup booking; reason provided | CANCELLED with shop-caused reason; release blocks; alert customer; incident metrics |
| Expire | System | REQUESTED and server deadline passed | EXPIRED; release blocks; event/outbox |
| Pickup | Owner | Own CONFIRMED booking; all units READY; valid handover code; correct pickup window | All selected allocations issued; units WITH_CUSTOMER; PICKED_UP; timestamps/event/outbox |
| Return selected units | Owner | Own issued allocations; physical pieces received | Mark each returned; INSPECTION_REQUIRED; booking RETURNED only when all pieces returned |
| Finalize inspection | Owner | Own returned allocation; evidence/notes when damaged or incomplete | Final condition and outcome; cleaning/repair task; append event |
| Complete | System/service | All pieces returned and required inspections finalized | COMPLETED; event/outbox; review eligibility |
| No-show | Owner | Own CONFIRMED booking; no pickup; threshold passed; confirmed with shop records | NO_SHOW; release stock; notify; append event |
| Close with loss | Admin with case | Missing issued units investigated; customer notified; all other units returned/inspected or declared lost | CLOSED_WITH_LOSS; missing units LOST; retained custody/loss history; no fake returnedAt |

One command has one authoritative service. The calendar, dashboard, customer screen, and admin screen invoke the same service rather than implementing their own versions.

## 4. Availability and reservation correctness

For a requested rental:

~~~text
customer rental interval = [pickupAt, returnAt)
inventory commitment    = [pickupAt, returnAt + turnaroundBuffer)
overlap(A, B)            = A.start < B.end AND B.start < A.end
~~~

The extra period belongs to inspection and cleaning. It is not charged as additional rental time.

An eligible physical unit must:

1. Belong to the requested product variant and boutique.
2. Be ACTIVE, with no known unresolved repair/loss/overdue incident.
3. Have no active block overlapping the entire requested inventory commitment.
4. Be reasonably forecast ready by pickup; its existing rental has a scheduled return plus turnaround before pickup.
5. Belong to a publicly bookable product, approved active shop, and active owner.

All lines in one booking use the same boutique and interval. The server allocates every requested unit atomically. If any line is unavailable, nothing is reserved.

The database prevents overlapping active blocks for the same physical piece. Request processing also locks candidate units in a consistent order, expires stale holds under those locks, rechecks eligibility, and inserts the final reservations inside one transaction.

An estimate never creates a block. Its response includes checkedAt/expiresAt and a statement that submission rechecks stock and price. Double-clicking request uses the same idempotency key and returns the same booking.

Expired holds must be explicitly released. Do not build a database exclusion predicate depending on the current time. A scheduled job and a lazy cleanup step perform the state change under locks. Delayed cleanup can temporarily understate availability, but must never allow overbooking.

When customer cancellation and owner confirmation race, a versioned update and booking lock allow one winning action. The other receives a conflict with the current state.

## 5. Requests, abuse controls, and walk-ins

Provisional requests consume capacity. Bound their lifetime and limit repeated requests so one account cannot hold a boutique's collection indefinitely. Rate limiting alone is insufficient; enforce domain limits inside the transaction and include concurrent submissions.

Do not record abuse guilt automatically from a single cancellation or no-show. Show evidence and escalation history to authorized administrators.

For a walk-in:

1. Owner selects the same items, interval, and quantities.
2. Server checks availability through the same allocator.
3. Create a confirmed booking with source WALK_IN and minimum contact snapshot.
4. Hand over using the same readiness and event rules.
5. Show the customer the recorded items and dates.

A walk-in may have no registered User. Store a consented contact snapshot, never create an account or password on their behalf. Later claiming the booking requires proof through the recorded contact channel and an audited link.

Immediate walk-ins are exempt from the online lead time and owner decision window, but not stock, duration, shop-hours, turnaround, or physical-readiness rules. Record a present-at-counter acknowledgement; do not require a signed-in customer's handover token from a guest who has no account.

Do not match guest bookings solely by a phone number typed into a profile. An owner cannot silently replace a registered customer on a booking.

Real-world onboarding requires an initial stock count and entry of existing offline commitments before online inventory is published. If the owner continues promising unrecorded stock over WhatsApp, the software cannot provide accurate availability.

The first release does not confirm new stock commitments while disconnected from the server. Provide a connection-failure message and an operational fallback: use another connection or ask support to pause new online availability, reconcile counter records before resuming, and notify affected customers if a conflict occurred. Later backfilled records retain actual-event and recorded-at times and cannot overwrite conflicting reservations silently.

## 6. Informational pricing

- Store integer paise with currency INR, pricing unit PER_DAY or PER_RENTAL, and explicit variant overrides if needed.
- Daily rental duration is ceiling((returnAt - pickupAt) / 24 hours). Per-rental pricing applies once per item for the allowed interval.
- Full-period estimate = applicable unit rental price multiplied by chargeable periods and quantity.
- Show each line and the combined estimated rental amount. Display no Pay button.
- A 24-hour cleaning buffer does not add a charged day.
- Persist a price/policy snapshot when creating a request; later listing changes do not silently alter it.
- If a fresh submission estimate differs from the customer's unexpired reviewed quote, return PRICE_CHANGED and require another review. Do not silently accept a higher estimate.
- Explain that listed prices are informational and counter arrangements are handled directly by the shop.
- No payment-completed field, deposit balance, financial receipt, refund status, late-fee calculation, tax engine, or account ledger exists.

Demand reports may show estimated listed rental value, explicitly labelled. It must never be presented as money received, revenue collected, profit, or settlement.

## 7. Pickup and counter verification

Allow the customer to generate a short-lived one-time handover code from their booking. Store a hash, expiry, and usedAt, not a reusable plaintext code. Limit verification attempts. The authenticated owner verifies it and performs pickup in the same transaction.

The MVP hands over the full booking together. Partial returns are supported; partial pickups can be added later with per-allocation status rules.

Before pickup, verify that every assigned physical code matches, the set is complete, and condition is recorded. Photograph only the item where evidence is needed. Do not require storing a government ID image in the platform.

Do not automatically issue an item because the planned pickup time passed. A booking code does not permit an owner to hand over a different size or unavailable piece.

If a customer has no phone access, an owner may use a documented exception procedure with the customer's agreement, reason, and contact notification. Flag repeated overrides for admin review. Never expose a general public endpoint that bypasses handover checks.

Early pickup requires a rechecked reservation interval. In the MVP, do not offer it; keep pickup within the agreed window. A late pickup does not automatically extend the agreed return time.

## 8. Return, inspection, cleaning, and damage

Only a shop acknowledgement records physical return. A customer can report that they attempted to return an item and open a support case, but cannot make stock READY.

Record return per allocated unit. Check included pieces; a missing dupatta means the set is not complete. The rest of a booking can be returned and inspected while one unit remains with the customer.

Inspection records include condition GOOD, DAMAGED, or INCOMPLETE; notes; included-piece checklist; optional item photographs; actor; and time. Damage/incomplete outcomes require notes. Finalized inspections are not overwritten; corrections append a revision/event.

After inspection:

- A sound unit enters CLEANING.
- A damaged/incomplete unit enters REPAIR or remains unavailable.
- Mark READY only after cleaning is recorded and any minimum turnaround policy is satisfied.
- An early return does not instantly free stock. Explicit readiness may release the remaining reservation conservatively after required turnaround.
- Do not mark a unit READY solely because the scheduled return or cleaning end timestamp passed.

Normal booking completion means all allocated units have physically returned and inspections are finalized. An incomplete set can be acknowledged as returned with missing components in its inspection; that set remains unavailable. Completion does not imply every unit is already cleaned or that any financial issue has been settled.

Damage notes support operational tracking and disputes. The platform does not calculate penalties or decide payment deductions.

If an entire allocated unit is never returned, do not keep pretending its due date frees capacity or falsely mark it returned. Open a loss case, notify the customer, and let an administrator authorize CLOSED_WITH_LOSS after investigation. Record each missing allocation as LOST, remove it from rentable stock, and resolve its future commitments. If later recovered, append a recovery event and require inspection before reactivation; preserve the original closure.

For an item lost inside the shop with no active customer custody, the owner can report the loss and disable the unit immediately. Declaring a customer-held unit lost and closing that rental requires the case procedure above.

## 9. Late returns and future commitments

A scheduling algorithm cannot guarantee a real customer returns an outfit on time. The system must expose and manage that risk.

When an issued unit is overdue:

1. Mark the unit overdue as a derived flag; preserve PICKED_UP until actual return.
2. Exclude it from new reservations until returned, inspected, and made ready.
3. Identify future bookings assigned to that unit whose preparation/pickup is at risk.
4. Attempt an equivalent READY/forecast-ready unit of the same variant under locks.
5. Record reassignment history and notify the owner.
6. If no replacement exists, set a fulfilment issue on the future booking and contact its customer.
7. Resolve by an agreed alternative or shop-caused cancellation; escalate unresolved cases.

Do not quietly extend an existing database block over another confirmed reservation, silently drop the later reservation, or show the later customer that their item is ready.

Planned blocks describe commitments; actual physical state can reveal a fulfilment incident. Database non-overlap is necessary but cannot replace readiness checks at handover.

## 10. Closures, suspension, archiving, and stock reduction

| Change | Required behavior |
| --- | --- |
| Price/description update | Applies to future quotes; existing snapshots remain |
| Archive listing | Stops new requests; preserves existing bookings, reviews, and unit records |
| Hide listing for safety | Stops new requests; admin explicitly decides whether pending/confirmed rentals need incident handling |
| Add dated closure | Identify affected pickup/return appointments; require resolution or customer-agreed rescheduling |
| Reduce stock | Retire specific pieces; future commitments require reassignment or incident resolution |
| Mark lost/repair | Block new allocations immediately; create fulfilment issues for affected commitments |
| Suspend boutique | Hide public booking access; do not confirm new requests; keep limited fulfilment/return/support access |
| Close boutique permanently | Managed wind-down, customer notices, returned-stock reconciliation, and retained history |
| Suspend owner account | Revoke sessions; route outstanding commitments to an administrator for resolution |
| Delete account | Revoke access and apply data-retention/anonymization policy; do not cascade-delete rental evidence |

If a closure is an emergency, allow recording the emergency and automatically raise affected-booking cases. Requiring a conflict-free save must not prevent recording a real emergency.

## 11. Reviews and support

A registered customer can review a booking line only when:

- Their account owns the booking.
- The item was actually handed over and the booking is operationally closed: COMPLETED or a resolved CLOSED_WITH_LOSS case.
- The review window remains open.
- No review exists for that booking line.
- They do not own the boutique.

Do not block a review merely because the item was damaged or the customer disputed an inspection. Moderation applies published content rules, not shop dissatisfaction with a negative review.

One booking with an outfit and jewellery can produce one review for each line. A walk-in must be securely linked to a customer account before it can produce a verified review.

Visible aggregates exclude hidden reviews. Moderation preserves the original text, reason, actor, and audit trail. Shop owners can report a review but cannot delete or edit it.

Support cases cover wrong item/size, missing handover, incorrect status, suspected abuse, closure, damage disagreement, and privacy issues. Messages have explicit visibility. Administrative resolutions change operational records only through permitted commands; a support status must not silently mutate inventory.

## 12. Notifications, failures, and jobs

Write a durable outbox event in the same transaction as the domain change. Deliver email/in-app notifications afterward with retries and unique deduplication keys. An email failure does not undo a confirmed booking.

Scheduled jobs handle request expiry, upcoming tasks, overdue detection, support escalation, and transient upload cleanup. They are authenticated, idempotent, monitored, and safe to run twice.

Never depend on a browser being open, an in-memory timer, or an unawaited serverless promise to expire stock holds. An owner sees in-app status even if email is unavailable.

## 13. Invariants for implementation and tests

1. A booking belongs to one boutique, one interval, and one customer identity/contact snapshot.
2. Every non-cancelled booking line has the required current physical allocations, except a recorded fulfilment incident awaiting resolution.
3. No physical unit has overlapping active planned blocks.
4. No code path can hand over a piece that is still WITH_CUSTOMER, in repair, or awaiting cleaning.
5. Every allocation's variant and boutique match its booking line and booking.
6. All stock-affecting online, walk-in, maintenance, and admin operations use the same allocator and locks.
7. Expired requests cannot be confirmed even if a cleanup worker is late.
8. No requested booking is presented as confirmed.
9. No return is inferred from a calendar date.
10. Historical item names, sizes, estimates, terms, and actors remain explainable after catalogue changes.
11. Clients cannot choose customer identity, owner identity, approval status, calculated totals, or allowed transitions.
12. Booking status, physical condition, and support status are different concepts.
13. The platform records no payment or refund state.
