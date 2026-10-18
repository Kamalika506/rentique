# Product scope and role features

## 1. Purpose and product boundary

Rentique helps a customer answer: **Which outfit and matching accessories fit my occasion, size, preferences, location, dates, and rental budget, and can I reserve them at a trustworthy shop?**

It helps a boutique answer: **What do I own, what is committed to customers, what is physically with customers, what needs attention, and what can I safely promise next?**

It helps an administrator answer: **Which shops should participate, are marketplace rules being followed, and which customer or boutique problems require intervention?**

The primary audience is women planning weddings, receptions, festivals, and other traditional celebrations. Discovery prioritizes sarees, lehengas, salwar/anarkali sets, occasion gowns, jewellery, and selected accessories. Broader everyday fashion is later scope.

The service supports discovery, reservation, physical handover, return, inspection, cleaning readiness, and experience reviews. Customers visit the shop themselves. Shops set their informational prices and explain their own counter arrangements. Rentique has no financial transaction records or financial decisions.

### Included in the first usable release

- A public catalogue and approved boutique storefronts.
- Customer registration, verified email, sign-in, profile, saved favourites, and booking history.
- Boutique application and administrator review.
- Product listings, multiple sizes, physical stock records, photos, and published rental prices.
- Date-specific availability and price estimates.
- Requests, approval/rejection, cancellation, expiry, pickup, partial returns, inspection, and completion.
- Walk-in recording and maintenance/cleaning blocks using the same inventory.
- Customer and owner notifications and basic support escalation.
- Rule-based occasion recommendations and optional AI interpretation.
- Business reporting using defined operational metrics.

### Subsequent increments

- Image-assisted discovery and more complete styling recommendations, after inventory and booking correctness.
- Review moderation and support tools can begin with a small workable interface and grow.
- Multiple branches, staff permissions, sophisticated visual similarity, and automated operational prioritization follow the pilot.

### Excluded

Payment gateways, card/UPI collection, financial checkout, deposits, refunds, settlements, commissions, shipping, delivery tracking, virtual fitting, automated body measurements, social-media scraping, and a custom trained fashion model.

## 2. Product decisions that prevent conflicting implementations

| Area | Decision and reason |
| --- | --- |
| Request versus confirmation | A customer request provisionally blocks stock until expiry. The boutique must confirm it. The interface uses these exact words. |
| One shop per booking | Multiple items from the same boutique can be reserved together. Different boutiques require separate bookings and visits. |
| Complete looks | Prefer outfit and jewellery from the same boutique. Clearly identify multiple shops when presenting discovery results spanning boutiques. |
| Stock | A listing is a style, a variant is a size/configuration, and an inventory unit is a real physical piece. |
| Date changes | Before pickup, request an extension/change and recheck all affected units; do not silently edit a confirmed interval. The MVP may require cancellation and a new booking instead. |
| Reuse after rental | Returned does not mean ready. Inspection and cleaning determine reuse. |
| Owner as customer | An approved owner keeps customer capabilities at other boutiques, but cannot book or review their own shop. |
| Shop closure | Closing to new business does not erase or silently cancel existing confirmed bookings. |
| Admin power | Administrators moderate and resolve cases with reasons and audit history. They do not fabricate pickup/return events or delete transaction history. |
| Pricing | Estimates are calculated on the server from published prices. No financial settlement status exists. |

## 3. Role model and access policy

Use one User identity and a set of roles. Public signup grants CUSTOMER only. Boutique ownership is a separate relationship. Approval grants BOUTIQUE_OWNER; a suspended owner keeps limited access needed for existing rentals. ADMIN is provisioned through a trusted administrative process.

An owner may have CUSTOMER and BOUTIQUE_OWNER. Administrative accounts are separate and do not own shops or make customer reservations. This avoids ambiguous role conversion and conflicts of interest.

Authorization requires all applicable checks:

1. Is the account authenticated and active?
2. Does it have the required role or applicant capability?
3. Does it own this resource?
4. Does the boutique's current status allow this action?
5. Does the booking/item state allow this action?

Hiding a button and redirecting a page are navigation behavior. Every server operation still performs these checks.

| Operation | Visitor | Customer | Owner | Admin |
| --- | --- | --- | --- | --- |
| Browse public products and boutiques | Yes | Yes | Yes | Yes |
| Read public policies and visible reviews | Yes | Yes | Yes | Yes |
| Wishlist, recommendations, reservation | Sign in | Own account | As customer at other shops | No customer bookings |
| Apply for a boutique | Sign in | Own application | View own status | Review only |
| Publish inventory | No | No | Own approved boutique | Hide/restore for moderation |
| Create walk-in rental | No | No | Own approved boutique | No routine shop operation |
| Process existing rental | No | Own cancellation/requests | Own booking, subject to state | Case-bound intervention only |
| Inspect and clean items | No | No | Own physical units | Investigate/correct with evidence |
| Review experience | Read only | Eligible own booking | Eligible booking at another shop | Moderate only |
| Suspend accounts/boutiques | No | No | No | Yes, reason required |
| Change roles | No | No | No | Trusted admin process with safeguards |
| Read support case | No | Own case | Own participating case | Authorized support oversight |

Owners never receive customers' passwords, authentication tokens, unrelated bookings, wishlists, or styling history. Customers never receive another customer's schedule or shop-private notes. Admin screens exclude secrets and private authentication data.

## 4. Customer features

| Feature | Required behavior | Priority |
| --- | --- | --- |
| Account | Sign up, verify email, sign in/out, reset password, manage name/contact, revoke sessions | Core |
| Browse | Search by garment/category, boutique, city, occasion, size, colour, rental dates, and informational price | Core |
| Product detail | Gallery, description, fabric/style, measurements, size guidance, included pieces, boutique, pricing unit, rules, and reviews | Core |
| Boutique detail | Address/map link, hours, closure notices, contact, approval badge meaning, cancellation rules, and public collection | Core |
| Wishlist | Persist own favourites; unavailable/archived favourites show a clear status | Core |
| Availability | Quote a specific variant, quantity, pickup time, and return time; show freshness and full-period estimated rental cost | Core |
| Same-shop basket | Multiple items sharing one shop and interval; cart does not reserve stock | Core |
| Request | Review policy and quote; submit once with an idempotency key; show REQUESTED and deadline | Core |
| Booking detail | Status, items, dates, shop directions, reference, timeline, and allowed actions | Core |
| Cancellation | Cancel before pickup under the published platform policy; give reason; notify boutique | Core |
| Pickup | Present a short-lived booking handover code at the counter | Core |
| Returns | See per-item return acknowledgement, remaining items, and completion status | Core |
| Notifications | Request result, expiry, cancellation, pickup/return reminders, and service issues | Core |
| Help/report | Report a listing/shop, incorrect status, failed handover, damage disagreement, or privacy concern | Core |
| Reviews | One product review per eligible booking line; after a real handover and operational closure | Increment 2 |
| Styling | Occasion/preferences/size/date/location input; real available results and explanations | Increment 2 |
| Inspiration image | Private upload, extracted garment attributes for user confirmation, then actual catalogue matches | Increment 3 |
| Change/extension | Rechecked proposal that requires boutique approval and preserves original commitments until accepted | After core |

Do not require a login to browse or view public prices. Require an active account and verified email to reserve. Require a contact number for booking, but label it unverified until a genuine phone-verification integration exists. Before an open production launch, implement phone verification or run an explicitly limited, manually verified pilot.

## 5. Boutique owner features

### Application and profile

- Submit business identity, shop name, address/city, contact, hours, categories, description, and verification evidence appropriate to the operating model.
- Save a draft; submit a versioned application; view a decision and reason; correct and resubmit a rejected application.
- Describe the badge honestly: administrator-reviewed shop, not a guarantee of garment quality.
- After approval, edit ordinary profile fields. Material changes to ownership/address/legal identity require another review; edits do not overwrite the last approved public snapshot before approval.
- Set pickup/return hours, dated closures, cleaning buffers, rental limits within platform bounds, and visible shop policies.
- An owner cannot approve their own shop, remove a suspension, transfer ownership through a profile edit, or change historical booking terms.

### Inventory

- Create a style listing with product type, category, occasion/colour/style tags, images, fabric, description, included pieces, and policies.
- Add variants with size label and garment measurements; FREE_SIZE is an explicit variant where appropriate.
- Register each physical piece with a unique shop stock code, condition, and acquisition/retirement dates. Example: LEH-RED-M-001.
- Add stock by registering units, not by overwriting a quantity counter.
- Draft, publish, archive, or request moderation review of a listing.
- Mark a unit for repair, lost, retired, or cleaning. Evaluate effects on future commitments before committing the change.
- Record unit condition history and owned image uploads. Do not rename a booked variant into a different size.

### Booking operations

- Separate queues for requests, confirmed pickups, items with customers, expected returns, overdue returns, inspections, and fulfilment issues.
- Confirm/reject before the request deadline; rejection requires a reason.
- See the minimum customer contact information necessary for fulfilment.
- Record an in-shop walk-in before promising or handing over stock.
- Record handover only for assigned ready units, with a booking code check.
- Acknowledge returns per physical unit, inspect them, record evidence of damage, and schedule cleaning/repair.
- Record missing pieces within a set, late return, no-show, and shop-caused cancellation.
- Report an unreturned/lost unit for a case-bound administrative closure; never invent a return.
- Reassign an equivalent unit of the same variant before pickup with an audit event. A different style or size requires customer agreement and a new/changed booking.
- Handle offline reservations and long repair periods through the same availability service.

### Reporting and accountability

- View booking requests, confirmation rate, fulfilled rentals, cancellations, no-shows, overdue units, popular styles, and stock utilization.
- See daily shop tasks and at-risk future pickups.
- Export own operational data with safe CSV output.
- View own support cases and decisions. Customer-visible messages and shop-private notes are explicitly different fields.
- No payment, refund, revenue-received, or settlement screens.

## 6. Administrator features

| Area | Features and boundaries |
| --- | --- |
| Dashboard | Pending applications, active shops, moderation queue, operational incidents, unresolved cases, and system health |
| Boutique review | Review submission/evidence, approve, reject with reasons, request corrected resubmission, suspend, and reopen review |
| User management | Search, activate/suspend, investigate abuse, revoke sessions; protect self and last administrator from destructive changes |
| Catalogue governance | Manage controlled categories/occasions/colours, hide inappropriate or misleading listings, and preserve history |
| Booking oversight | Read booking timelines and evidence; see late-return conflicts and shop-caused cancellations; authorize audited exceptional corrections |
| Review moderation | Hide/restore with recorded reason; no secret editing of a customer's rating/comment |
| Support | Assign, investigate, communicate, resolve operational complaints, record outcome, and reopen when appropriate |
| Abuse prevention | Investigate repeated fake requests, abusive reviews, spam, and suspicious shop activity; use evidence rather than automatic guilt |
| Policy/configuration | Version platform defaults, maximum limits, moderation reasons, and support guidance; changes apply prospectively |
| Audit | Search sensitive actions by actor, entity, reason, time, and request/case reference |
| Operations | Inspect failed jobs, email failures, storage cleanup, health checks, and restore-test evidence |

An admin suspension must specify whether it stops new bookings, restricts an account completely, or starts a managed wind-down. A suspended boutique normally retains access to fulfil and receive existing rentals. If an owner account is disabled for abuse, a designated administrator handles communication and case resolution; disabling the account does not establish that stock has returned.

## 7. Critical journeys

### Customer reservation and return

Browse -> choose size, shop, and interval -> get estimate -> add same-shop items -> review terms -> submit request -> provisional reservation -> owner confirms -> customer receives confirmation -> counter handover -> per-item returns -> inspection -> completed rental -> review.

The customer sees REQUESTED until the owner confirms. Availability can change between browsing and submission. Clear error messages preserve the customer's selection and suggest alternatives.

### Owner onboarding

Customer account -> draft application -> submit -> admin review -> rejection/correction or approval -> owner capability -> publish inventory -> accept requests.

### Walk-in

Owner selects stock and interval -> availability checked -> record minimum contact with notice -> confirm walk-in -> handover -> return and inspection. A walk-in cannot jump ahead of an existing reservation for the same unit.

### Operational incident

Overdue return or damaged unit -> affected future bookings flagged -> equivalent-unit reassignment if possible -> owner contacts affected customer -> documented alternative or shop cancellation -> admin escalation when unresolved.

## 8. Acceptance and success

| Goal | Evidence |
| --- | --- |
| Useful discovery | Target users can find appropriate real products; usability task results are recorded |
| Correct reservation | Concurrent requests cannot allocate the same physical unit over conflicting intervals |
| Shop usefulness | An owner can manage online requests and walk-ins without a second inventory source |
| Lifecycle integrity | Every handover, return, inspection, and correction has an actor and timestamp |
| Trust | Customers can distinguish requested, confirmed, returned, completed, and at-risk bookings |
| AI usefulness | Human-reviewed text/image test cases, explanation quality, and zero hard-constraint violations |
| Explainable project | Each feature links to a requirement, rule, data entity, API, test, and demonstration |

Targets are planning criteria, not measured benefits. Interview actual users and shop owners before claiming reduced search time or increased business.
