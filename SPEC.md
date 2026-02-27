# SPECIFICATION: VehicleReel

## System Overview

VehicleReel is a web-based two-sided marketplace that connects vehicle owners with film production teams in South Africa. Vehicle owners list their assets (cars, bikes, boats, planes, jet skis, scooters, motorbikes, racing cars) by scanning a generic QR code and completing a guided onboarding flow. Production users (art directors, art crew, production team members) search, filter, and option vehicles for specific shoot dates. The platform manages the full option-to-confirmation lifecycle between both parties. For MVP, payments are handled offline — the platform is a matchmaking and booking tool only.

---

## Behavioral Contract

### Primary Flows (Happy Path)

**Owner Onboarding**

- When a new user scans the QR code, the system opens a web app and presents registration followed by a step-by-step vehicle listing flow.
- When an existing owner scans the QR code, the system recognizes them (via active session or login) and routes them directly to the "add a vehicle" flow.
- When the owner completes the listing flow (vehicle details, photos, documents), the system creates an owner profile and a vehicle listing in "pending review" state.
- When the owner uploads identity documents (South African ID, driver's license) and vehicle registration, the system submits them for automated AI review.
- When the AI review passes all documents as valid and current, the system activates the listing and makes it searchable.
- When an owner returns to the platform, the system allows them to list additional vehicles under the same profile.
- When an owner sets availability on their calendar, the system reflects those dates as available to production users searching for vehicles.
- When an owner manually blocks dates on their calendar, the system marks those dates as unavailable across all searches.

**Production User Onboarding**

- When a production user signs up, the system requires them to create a profile and upload verification credentials (South African ID, company registration, and any formal documentation proving their identity and affiliation).
- When credentials are submitted, the system runs an automated AI review of the uploaded documents.
- When the AI review passes, the system grants the production user access to search and option vehicles.
- When the production user first accesses the platform, the system displays the standardized terms and conditions template.

**Search and Filter**

- When a production user searches for vehicles, the system allows filtering by: vehicle type, make, model, color, year, location (predefined dropdown of South African cities/regions), and rate range.
- When a production user specifies dates in their search, the system only returns vehicles that are available (not blocked by the owner, not confirmed for those dates).
- When vehicles have existing options (pending, not yet confirmed) on the requested dates, the system still shows them but displays the current option position (e.g., "1st option pending").

**Option and Booking Lifecycle**

- When a production user options a vehicle, the system records the option with: rate offered (per day or as a flat package rate for the full date range), requested dates, response deadline selected from preset durations (minimum 12 hours, maximum 72 hours; presets: 12h, 24h, 48h, 72h), and the production user's identity.
- When a production user sets the rate, the system allows them to choose between a per-day rate or a package rate (flat total for the full date range).
- When an option is placed, the system notifies the vehicle owner with the rate, dates, response deadline, and production user details.
- When the owner accepts the option within the production user's specified response deadline, the system starts a confirmation window from the moment of acceptance. The confirmation window duration is set by the production user when placing the option, selected from presets (minimum 12 hours, maximum 48 hours; presets: 12h, 24h, 48h).
- When the owner does not respond within the production user's specified response deadline, the system auto-declines the option and notifies the production user.
- When the owner declines the option, the system notifies the production user and promotes the next queued option to first position.
- When the confirmation window is active, the system allows the production user to confirm the booking by agreeing to the rate and specifying logistics (vehicle collection or owner delivery to set).
- When the production user confirms within the confirmation window, the system marks the booking as confirmed, removes the vehicle from availability for those dates, and sends a confirmation summary email to both parties.
- When a booking is confirmed, the system declines all other queued options for overlapping dates and notifies those production users.

**Option Queue**

- When multiple production users option the same vehicle for overlapping dates, the system queues them in the order received (1st option, 2nd option, 3rd option, etc.).
- When the owner accepts each option independently, the system starts each option's confirmation timer from the moment of that specific acceptance, using the confirmation window duration set by that option's production user.
- When a first option expires or is declined, the system promotes the next accepted option in the queue to first position without resetting its confirmation timer.
- When a promoted option's remaining time is less than 12 hours, the system extends it to 12 hours from the moment of promotion, ensuring the production user has a minimum of 12 hours to confirm after being promoted.
- When a promoted option's remaining time is 12 hours or more, the system keeps the original timer running without modification.

**Notifications**

- When any event occurs that requires user attention (option placed, accepted, declined, expired, confirmed, document review status), the system sends an in-app notification.
- When a user has email notifications toggled on, the system also sends an email notification for the same events.
- When in-app notifications are present, the system displays them within the web app interface.

**Post-Confirmation**

- When a booking is confirmed, the system sends a confirmation summary email to both the owner and the production user containing: vehicle details, dates, agreed rate, logistics arrangement, and both parties' contact information.
- When a booking is confirmed, the system opens a conversation thread between the owner and the production user, scoped to that specific booking.
- When either party sends a message in the conversation thread, the system delivers it as an in-app notification (and email if toggled on) to the other party.
- When a booking's dates have passed, the conversation thread remains accessible as a read-only archive but no new messages can be sent.

### Error Flows

- When the AI document reviewer flags a document as invalid or suspicious, the system notifies the user that their documentation is "under review," flags the case to platform management for human review, and keeps the listing or profile in a pending state until resolved.
- When a vehicle registration document has expired, the system sends a reminder to the owner to update or renew their documents and suspends the listing until valid documents are uploaded.
- When an owner does not respond to an option within the production user's specified response deadline, the system auto-declines the option and notifies the production user.
- When the production user does not confirm within the confirmation window after owner acceptance, the system expires the option (booking is not confirmed) and promotes the next queued option.
- When a document's expiry date is approaching, the system sends a proactive reminder to the owner before the document lapses.

### Boundary Conditions

- When a vehicle has a confirmed booking for certain dates, the system prevents any new options from being placed for overlapping dates.
- When the last option in a queue expires or is declined, the system returns the vehicle to fully available status for those dates.
- When an owner blocks dates that overlap with existing pending options, the system declines those options and notifies the affected production users.
- When a production user searches with filters that return no results, the system displays an empty state with a clear message.
- When a promoted option has less than 12 hours remaining on its confirmation window, the system extends the timer to 12 hours from the moment of promotion.

---

## Explicit Non-Behaviors

- The system must not process payments or handle any financial transactions because MVP is matchmaking only; payments happen offline.
- The system must not allow production users to counter-offer on rates because the rate model is take-it-or-leave-it — the production user sets the rate and the owner accepts or declines.
- The system must not auto-confirm bookings because both parties must actively participate — owner accepts, then production user confirms.
- The system must not fully reset the confirmation timer when an option is promoted in the queue because the timer runs from the moment the owner originally accepted that specific option. However, the system must extend the timer to a minimum of 12 hours if less than 12 hours remain at the time of promotion.
- The system must not allow unverified users to search, option, or list vehicles because both user types require document verification before accessing core platform features.
- The system must not display the exact address of a vehicle because listings show general location only (city/area level, e.g., Cape Town, Stellenbosch, Durban).
- The system must not generate or assign unique QR codes per vehicle because the QR code is generic and leads to a universal onboarding flow.
- The system must not allow messaging between parties before a booking is confirmed because conversation threads are only opened upon confirmation.
- The system must not allow new messages in conversation threads after the booking dates have passed because threads become read-only archives.

---

## Integration Boundaries

### AI/LLM Document Review Service (Google Gemini)

- **Data in:** Uploaded document images (ID, driver's license, vehicle registration, company registration).
- **Data out:** Validation result (pass/flag), extracted fields (name, expiry date, registration number), confidence score.
- **Expected contract:** The system sends document images to the Google Gemini API (vision-capable model) and receives structured validation results. Gemini analyzes the document for authenticity, readability, expiry status, and field extraction.
- **Unavailability behavior:** If the Gemini API is unavailable, the system queues documents for review, notifies the user that review is delayed, and keeps the listing/profile in pending state.
- **Development approach:** Use the Google Gemini API. The document review must actually parse and validate documents, not simulate validation.

### Email Service

- **Data in:** Recipient email address, notification type, template variables (booking details, vehicle info, user info).
- **Data out:** Delivery status (sent/failed).
- **Expected contract:** Standard transactional email API (e.g., SendGrid, Postmark, or similar). Send HTML email from a template with dynamic fields.
- **Unavailability behavior:** Queue emails for retry. Log failures. Do not block the booking flow if email delivery fails.
- **Development approach:** Use a real email service provider for MVP.

### External Authentication (Optional)

- **Data in:** User credentials.
- **Data out:** Authenticated session.
- **Expected contract:** Standard email/password authentication for MVP. Social login is not required.
- **Unavailability behavior:** N/A for email/password auth (handled internally).
- **Development approach:** Implement standard auth within the web app.

---

## Behavioral Scenarios

*Note: These scenarios are for external evaluation only. They should not be provided to the coding agent during development.*

### Happy Path Scenarios

**Scenario 1: Owner lists a vehicle end-to-end**
- Setup: A vehicle owner has a physical QR code sticker on their car. They have never used VehicleReel before.
- Action: Owner scans the QR code with their phone camera. The web app opens. They register with email/password. They complete the step-by-step flow: enter make (Toyota), model (Hilux), color (white), year (2021), mileage (45,000 km), condition (Excellent), special features (roof rack, bull bar), location (Cape Town). Upload 4 photos. Upload SA ID, driver's license, and vehicle registration. Set availability for March 2026 (blocking the 15th–18th for personal use).
- Expected outcome: The listing is created in "pending review" state. The AI reviews documents and passes them. The listing activates. The vehicle appears in searches for available dates in March 2026 except the 15th–18th.

**Scenario 2: Production user searches and confirms a booking**
- Setup: A verified production user needs a white SUV in Cape Town for March 10–12 at R2,500/day.
- Action: The production user searches with filters: vehicle type = car, color = white, location = Cape Town, dates = March 10–12, rate range up to R3,000/day. They find a Toyota Hilux and option it at R2,500/day with a 24-hour response deadline and a 24-hour confirmation window. The owner receives a notification, reviews the option, and accepts. The production user receives notification that the option was accepted. Within the confirmation window, the production user confirms the booking, agrees to the rate, and selects "owner delivers to set."
- Expected outcome: Booking is confirmed. Both parties receive a confirmation summary email with vehicle details, dates (March 10–12), rate (R2,500/day), logistics (owner delivers), and contact information. A conversation thread opens between both parties. The vehicle no longer appears as available for March 10–12.

**Scenario 3: Option queue with multiple production users**
- Setup: A verified red 1967 Ford Mustang is listed and available April 5–10.
- Action: Production User A options the vehicle for April 5–7 at R5,000/day with a 48-hour response deadline and 24-hour confirmation window. The owner accepts (confirmation timer starts for User A). Ten minutes later, Production User B options the same vehicle for April 5–8 at R6,000/day with a 24-hour response deadline and 24-hour confirmation window. The owner accepts User B's option (confirmation timer starts for User B). User A does not confirm within their 24-hour confirmation window.
- Expected outcome: User A's option expires. User B's option is promoted to first position. User B's confirmation timer continues from when the owner originally accepted it (not reset). If User B has 12 or more hours remaining, the timer continues as-is. If less than 12 hours remain, it is extended to 12 hours from the moment of promotion.

**Scenario 4: Returning owner adds a second vehicle via QR scan**
- Setup: An existing owner has one verified vehicle listed (a Toyota Hilux). They have a second vehicle (a 2019 Yamaha jet ski) they want to list.
- Action: The owner scans the QR code with their phone. The system recognizes their active session and routes them directly to the "add a vehicle" flow (skipping registration). They enter the jet ski details: make (Yamaha), model (FX Cruiser), color (blue), year (2019), condition (Good), special features (GPS, tow hook), location (Durban). Upload 3 photos. Upload the jet ski's registration document.
- Expected outcome: The jet ski listing is created in "pending review" state under the same owner profile. The AI reviews the new registration document (ID and license are already verified from the first listing). Upon passing review, the jet ski listing activates. The owner now has two vehicles visible in their profile dashboard.

**Scenario 5: Production user options with a package rate**
- Setup: A verified production user needs a classic car for a 5-day shoot (April 1–5) and has a total budget of R20,000.
- Action: The production user searches for: vehicle type = car, location = Cape Town, dates = April 1–5. They find a 1970 Chevrolet Camaro and option it with a package rate of R20,000 for the full 5-day range (instead of per-day pricing). They set a 72-hour response deadline and a 48-hour confirmation window.
- Expected outcome: The owner receives a notification showing: R20,000 package rate for April 1–5, 72-hour response deadline. The owner can accept or decline the flat package amount.

**Scenario 6: Post-confirmation conversation thread**
- Setup: A booking is confirmed between an owner (Toyota Hilux) and a production user for March 10–12. Logistics are set to "owner delivers to set."
- Action: The production user sends a message in the conversation thread: "Hi, set address is 14 Buitenkant St, Cape Town. Please arrive by 6am on the 10th." The owner replies: "Confirmed, I'll be there at 5:45am."
- Expected outcome: Both messages appear in the booking's conversation thread. Each party receives an in-app notification (and email if toggled on) when the other sends a message. Both parties can continue messaging until the booking dates pass.

### Error Scenarios

**Scenario 7: AI flags suspicious owner documents**
- Setup: A new user scans the QR code and completes the vehicle listing flow.
- Action: The user uploads a blurry, potentially altered driver's license.
- Expected outcome: The AI reviewer flags the document. The user is notified their documentation is "under review." The platform management team is alerted. The listing remains in pending state. The listing does not appear in searches until a human reviewer clears it.

**Scenario 8: Owner does not respond to an option within the deadline**
- Setup: A production user options an available vehicle and sets a 48-hour response deadline.
- Action: The owner receives the notification but takes no action for 48 hours.
- Expected outcome: The option is automatically declined. The production user is notified that the option was not accepted. If there is a second option in the queue, it is promoted to first position.

**Scenario 9: Production user does not confirm within the confirmation window**
- Setup: A production user optioned a vehicle at R3,000/day for June 1–3 with a 24-hour confirmation window. The owner accepted the option.
- Action: The production user receives the acceptance notification but does not confirm within 24 hours.
- Expected outcome: The option expires. The booking is not confirmed. The production user is notified their option has expired. The vehicle returns to available status for June 1–3 (or the next queued option is promoted).

**Scenario 10: Vehicle registration expires while listing is active**
- Setup: An owner has a listed vehicle with a registration document that expires on March 31, 2026.
- Action: The system detects the expiry date is approaching (e.g., 30 days before expiry). Then March 31 passes without the owner uploading a renewed document.
- Expected outcome: The system sends a proactive reminder before expiry. After expiry, the listing is suspended and no longer appears in searches. The owner is notified that they need to upload a renewed registration. Any pending options on the vehicle are declined and affected production users are notified. The listing reactivates only when a valid, current registration is uploaded and passes AI review.

**Scenario 11: Gemini API is unavailable during document upload**
- Setup: A new owner completes the vehicle listing flow and uploads their documents.
- Action: The Gemini API is down or returning errors at the time of upload.
- Expected outcome: The system queues the documents for review. The user is notified that their review is delayed but their submission was received. The listing stays in "pending review" state. When the Gemini API becomes available, the queued documents are processed automatically.

### Edge Case Scenarios

**Scenario 12: Owner blocks dates that overlap with pending options**
- Setup: A vehicle has a pending option (accepted by owner, waiting for production user confirmation) for April 5–7.
- Action: The owner goes to their calendar and manually blocks April 5–10 for personal use.
- Expected outcome: The pending option for April 5–7 is declined. The production user is notified. The dates April 5–10 are blocked and the vehicle does not appear in searches for any overlapping dates.

**Scenario 13: Promoted option gets 12-hour minimum extension**
- Setup: Production User A has first option (accepted 20 hours ago, 24-hour confirmation window). Production User B has second option (accepted 23 hours ago, 24-hour confirmation window). User A's option expires.
- Action: User B's option is promoted to first position.
- Expected outcome: User B originally had 1 hour remaining (24 minus 23). Because this is less than 12 hours, the system extends User B's confirmation window to 12 hours from the moment of promotion. User B now has a full 12 hours to confirm.

**Scenario 14: Promoted option has sufficient time remaining — no extension**
- Setup: Production User A has first option (accepted 20 hours ago, 24-hour confirmation window). Production User B has second option (accepted 5 hours ago, 24-hour confirmation window). User A's option expires.
- Action: User B's option is promoted to first position.
- Expected outcome: User B has 19 hours remaining (24 minus 5). Because this exceeds 12 hours, no extension is applied. The timer continues as-is.

**Scenario 15: Multiple options cascade-expire after first option is confirmed**
- Setup: A vehicle has three options for overlapping dates. Option 1 (April 5–7), Option 2 (April 5–8), Option 3 (April 6–9). All three are accepted by the owner.
- Action: The production user for Option 1 confirms the booking for April 5–7.
- Expected outcome: Option 1 is confirmed. Option 2 (April 5–8) overlaps with the confirmed dates, so it is automatically declined and that production user is notified. Option 3 (April 6–9) also overlaps, so it is automatically declined and that production user is notified. The vehicle is unavailable for April 5–7 and remains available for April 8–10.

**Scenario 16: Search returns vehicles with existing options visible**
- Setup: A red Mercedes-Benz E-Class in Cape Town is available April 1–30. It currently has a first option pending for April 10–12.
- Action: A production user searches for: vehicle type = car, color = red, location = Cape Town, dates = April 10–14.
- Expected outcome: The Mercedes appears in search results but displays "1st option pending" for April 10–12. The production user can still option the vehicle for April 10–14, and they would receive second option status for the overlapping dates.

**Scenario 17: Conversation thread becomes read-only after booking dates pass**
- Setup: A confirmed booking for March 10–12 has an active conversation thread with 5 messages exchanged.
- Action: March 13 arrives (the day after the booking ends).
- Expected outcome: Both parties can still view the conversation thread and all 5 messages. Neither party can send new messages. The thread is clearly marked as archived/read-only.

**Scenario 18: Admin removes a listing and bans a user**
- Setup: The platform admin receives a report that an owner has listed a vehicle they don't own.
- Action: The admin reviews the listing and the owner's profile in the admin dashboard. They remove the listing and ban the user.
- Expected outcome: The listing is immediately removed from all searches. Any pending options on that vehicle are declined and affected production users are notified. The banned user can no longer log in or access the platform. The admin action is logged for audit purposes.

---

## North Star

The three non-negotiable outcomes:

1. **A vehicle owner can go from scanning a QR code to having a live, searchable listing in under 10 minutes** (excluding document review time). The onboarding must be simple enough that someone with no technical background can complete it on their phone.

2. **A production user can find, option, and confirm a vehicle booking in a single session.** Search results are relevant, availability is accurate, and the option-to-confirmation flow is clear and requires no phone calls, emails, or off-platform negotiation.

3. **The option queue system works correctly and fairly.** First come, first served. Timers are accurate. Promotions happen automatically. No booking falls through the cracks, and no vehicle is double-booked.

**"Yes, that's exactly it"** means: a production user in Cape Town can search for a red classic car, see only vehicles available on their shoot dates, option one at their offered rate, and have the whole thing confirmed with logistics arranged — all within the web app, with both parties notified at every step.

---

## Admin Analytics

The platform admin dashboard displays the following metrics:

- **Number of vehicles booked** (total and per period)
- **Days booked** (total booking days across all vehicles)
- **Make preference** (most-booked makes, ranked)
- **Color preference** (most-booked colors, ranked)
- **Model preference** (most-booked models, ranked)
- **Year preference** (most-booked vehicle years, ranked)
- **Monthly trend tracking:** For each of the above dimensions (make, color, model, year), how many days each is booked per month, allowing the platform owner to track trends over time.

---

## Ambiguity Warnings

All previously identified ambiguities have been resolved. No remaining ambiguity warnings.

### Resolved decisions (for reference):
- **Notifications:** In-app (always on) + email (toggleable). Email is sufficient; no SMS or push notifications needed.
- **Vehicle condition:** Predefined dropdown (Excellent/Good/Fair/Poor). Mileage is a numeric field in kilometers.
- **Response deadline:** Preset durations (12h, 24h, 48h, 72h), min 12h, max 72h.
- **Confirmation window:** Preset durations (12h, 24h, 48h), set by the production user, min 12h, max 48h. Promoted options get a minimum 12-hour extension if less than 12h remains.
- **Location list:** Major South African metros (see Implementation Constraints).
- **AI provider:** Google Gemini.
- **QR re-scan:** Routes existing users to "add a vehicle."
- **Package rate:** Flat total for the full date range, or per-day rate.
- **Messaging:** Conversation thread between parties, opened upon booking confirmation, read-only after booking dates pass.

---

## Implementation Constraints

- **Platform:** Web application (not a native mobile app). Must be mobile-responsive since owners will onboard via phone after scanning QR codes.
- **Geographic scope:** South Africa, launching in Cape Town. Currency is ZAR (South African Rand).
- **Location dropdown:** Major South African metros — Cape Town, Johannesburg, Pretoria, Durban, Port Elizabeth (Gqeberha), Bloemfontein, East London, Stellenbosch, Paarl, Knysna, George. Expandable as the platform grows.
- **Language:** English.
- **Authentication:** Email/password for MVP.
- **Payments:** None in MVP. Payment happens offline.
- **Document types:** South African ID document, South African driver's license, vehicle registration document, company registration document.
- **Email:** Transactional email service required for confirmation emails and notifications.
- **AI/LLM:** Google Gemini (vision-capable model) for automated document review, with fallback to human review.
- **QR code:** Generic (single URL), not dynamically generated per vehicle. Printed and distributed by the platform owner.
