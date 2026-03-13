# VehicleReel — Chatbot Knowledge Base

> This document is the single source of truth for the VehicleReel AI chatbot. It powers the RAG pipeline behind the floating help widget available on every page. Written for Gemini 2.5 Flash.

---

## About VehicleReel

VehicleReel is a South African platform that connects vehicle owners with production companies (film, TV, advertising, music videos) who need vehicles for shoots. Owners list their vehicles, production companies search and place options (holds), and once confirmed, bookings are managed through the platform — including logistics, insurance, daily check-ins, and payments.

The platform is available at **vehiclereel.co.za**.

---

## User Roles

There are five roles on VehicleReel. Each person has exactly one role — you cannot switch roles on the same account.

### Owner
Vehicle owners who want to earn money by making their vehicles available for shoots. They list vehicles, respond to option requests, and coordinate on shoot days.

### Production
Production companies (or freelance producers) who need vehicles for shoots. They search vehicles, place options, confirm bookings, upload insurance, and manage shoot logistics.

### Coordinator
Logistics coordinators assigned to specific projects by production companies. They manage daily shoot details, perform vehicle check-ins, and communicate with owners.

### Art Department
Art directors or department members assigned to projects. They can browse vehicles and view project details but cannot place options or manage bookings directly — unless they are allocated to a project, in which case they can place options on behalf of the production company.

### Admin
Platform administrators who manage users, vehicles, documents, and bookings across the entire system.

---

## Getting Started

### How do I register?

1. Go to **vehiclereel.co.za** and click "List my vehicle" (if you're an owner) or "Find vehicles" (if you're a production company).
2. Choose your role — **Vehicle Owner** or **Production Company**.
3. Fill in your name, email, phone number, and password.
4. Accept the Terms & Conditions and POPIA Privacy Policy (both checkboxes are required).
5. Check your email for a verification link and click it to verify your account.

### What documents do I need to upload?

**Vehicle Owners** need:
- SA ID or Passport (one document)
- Driver's License

**Production Companies** need:
- SA ID or Passport (one document)
- Company Registration certificate (CIPC document)

**Per Vehicle** (owners only):
- Vehicle License Disk (registration document)

**Per Booking** (production only):
- Vehicle Insurance certificate (due 24 hours before the shoot)

### How does document verification work?

Documents are reviewed by AI (usually within a few minutes). The system checks:
- Whether the document is the correct type (e.g., you uploaded an ID, not a utility bill)
- Whether the document is readable and not blurry
- Whether the document appears valid and not expired

If a document is **flagged**, you'll receive an email explaining why and what to do. You can re-upload from the same page.

If a document is **approved**, you'll be notified and your account or vehicle will be activated automatically once all required documents are approved.

### What happens after my documents are approved?

- **Owners**: Your account status changes to "Verified" and your vehicle becomes "Active" — visible to production companies in search results.
- **Production**: Your account status changes to "Verified" and you can search and place options on vehicles.

### I'm a foreign national — can I still use VehicleReel?

Yes. When uploading your "SA ID / Passport" document, you can upload a foreign passport instead. The AI verification system accepts passports from any country. It will extract your name, passport number, nationality, and expiry date.

---

## For Vehicle Owners

### How do I list a vehicle?

1. Go to **My Vehicles** in the sidebar.
2. Click **Add Vehicle**.
3. Fill in the vehicle details: type, make, model, year, colour, mileage, condition, location, drive side, and any special features.
4. Upload at least 5 photos: front, back, left side, right side, and interior.
5. Upload the Vehicle License Disk (registration document).
6. Submit — your vehicle will appear once your documents and the vehicle registration are approved.

### What vehicle types can I list?

Car, Racing Car, Bike, Motorbike, Scooter, Boat, Plane, and Jet Ski.

### Can I block dates when my vehicle is unavailable?

Yes. On your vehicle's detail page, scroll to the **Availability** section and add date ranges when the vehicle should not be available. You can optionally add a reason. Production companies won't be able to place options on blocked dates.

### How do I respond to an option request?

When a production company places an option on your vehicle, you'll receive an email and in-app notification. Go to **Options** in the sidebar to see all incoming requests.

For each option, you can:
- **Accept** — The production company then has a window to confirm the booking.
- **Decline** — The next person in the queue (if any) gets promoted.

You have a deadline to respond (set by the production company, typically 24–72 hours). If you don't respond in time, the option expires automatically.

### How much do I get paid?

You receive **70% of the agreed rate**. The rate is set by the production company when they place the option. Rates can be:
- **Per day** — You're paid for each day of the shoot.
- **Package** — A flat fee for the entire booking.

### Can I delete my vehicle?

Yes. Go to your vehicle's detail page, scroll to the bottom, and click **Delete Vehicle**. You'll need to confirm. Note: vehicles with active bookings cannot be deleted.

### What is overtime?

If a shoot runs longer than the agreed standard hours (10 or 12 hours), overtime rates apply:
- **10–14 hours**: 1.5x the daily rate
- **15+ hours**: 2x the daily rate

The production company sets the standard shoot day hours when creating the project.

---

## For Production Companies

### How do I search for vehicles?

1. Go to **Search Vehicles** in the sidebar.
2. Use the filters: vehicle type, make, model, colour, location, year range, date range, drive side, and special features.
3. Browse results — each card shows the vehicle photo, specs, and location.
4. Click a vehicle to see full details and place an option.

### Can I request a vehicle that isn't listed?

Yes. If you can't find what you need, use the **Special Vehicle Request** form at the bottom of the search page. Describe the vehicle, your shoot dates, and any special requirements. The VehicleReel team will try to source it for you.

### What is an option?

An option is a "hold" on a vehicle for specific dates. It's not a confirmed booking — it's a request. The vehicle owner must accept it, and then you must confirm it within the confirmation window.

### How do I place an option?

1. Find a vehicle via search.
2. Click **Place Option**.
3. Set the dates, rate (per day or package), and deadline settings:
   - **Response deadline** — How long the owner has to accept/decline (default: 48 hours).
   - **Confirmation window** — How long you have to confirm after the owner accepts (default: 24 hours).
4. Submit.

### What is the queue system?

Multiple production companies can place options on the same vehicle for overlapping dates. Options are queued in order — first come, first served.

- **Position 1**: You're first in line. If the owner accepts, you get the confirmation window.
- **Position 2+**: You're waiting. If the person ahead declines or their option expires, you move up automatically.

When you're promoted to position 1 with less than 12 hours remaining on your deadline, your deadline is automatically extended by 12 hours.

### How do I confirm a booking?

Once the owner accepts your option and you're in position 1:
1. Go to **My Options** and find the accepted option.
2. Click **Confirm Booking**.
3. Choose your logistics preference:
   - **Vehicle Collection** — You'll collect the vehicle from the owner.
   - **Owner Delivery** — The owner delivers the vehicle to your location.
4. Provide the location address and optional map pin coordinates.
5. Confirm — a booking is created immediately.

### What happens after I confirm?

- The booking appears under your project.
- You need to upload a **vehicle insurance certificate** at least 24 hours before the shoot. You'll receive reminders.
- You can set daily shoot details: call time, location, map pin, and notes for each day.
- On each shoot day, check in the vehicle to confirm it arrived.
- Once all days are checked in, the booking moves to "Payment Ready".

### How do I upload insurance?

Go to the booking detail page and click **Upload Insurance**. The AI will verify it's a valid insurance document. If flagged, re-upload a clearer copy.

### What is the cancellation policy?

Production companies can cancel confirmed bookings. The fee depends on how far in advance you cancel:

| Timing | Fee |
|--------|-----|
| 48+ hours before shoot | Free (0%) |
| 24–48 hours before shoot | 50% of booking value |
| Less than 24 hours before shoot | 100% of booking value |

Cancellation automatically frees the vehicle for other bookings.

---

## Projects

### What is a project?

A project groups related vehicle bookings together. For example, a TV commercial might need 3 different vehicles — they'd all be options/bookings within one project.

### How do I create a project?

1. Go to **Projects** in the sidebar (Production role).
2. Click **New Project**.
3. Enter the project name, description (optional), start date, end date, and standard shoot day hours (default 10).
4. Save.

### How do I add vehicles to a project?

From the project detail page, you can add existing options to the project. When placing new options, you can also select which project they belong to.

### How do I share a project?

Every project has a unique share link. Click the **Share** button on the project detail page to copy the link. Anyone with the link can view the project's vehicle lineup — no login required. This is useful for sharing with clients or stakeholders who aren't on VehicleReel.

### How do I download project images?

Click the **Download Images** button on the project page to download all vehicle photos as a ZIP file.

### Can I add team members to a project?

Yes. From the project detail page, you can add:
- **Coordinators** — They can manage logistics and daily check-ins for the project's bookings.
- **Art Directors** — They can view the project and browse vehicles.

Team members must already have accounts on VehicleReel with the Coordinator or Art Department role.

### How is the project page organised?

The project detail page shows vehicles in three sections:
1. **Confirmed Bookings** — Vehicles with confirmed bookings (green border, "Booked" badge).
2. **Shortlisted Options** — Options that are pending, accepted, or awaiting confirmation (with status badges and queue positions).
3. **Declined / Expired** — Options that were declined or expired (dimmed, at the bottom).

You can click any vehicle card to see its full details in a popup.

---

## For Coordinators

### What can I do as a coordinator?

Coordinators are assigned to projects by production companies. You can:
- View all bookings you're assigned to.
- Update daily shoot details (call time, location, map coordinates, notes).
- Check in vehicles on shoot days.
- Communicate with vehicle owners via booking messages.

### How do I update shoot details?

Go to **My Bookings**, select a booking, and update the daily details for each shoot day:
- **Call Time** — When the vehicle needs to arrive.
- **Location Address** — The shoot location.
- **Location Pin** — GPS coordinates for navigation.
- **Notes** — Any special instructions for that day.

### How do I check in a vehicle?

On the booking detail page, each day has a **Check In** button. Click it on the day of the shoot to confirm the vehicle has arrived. You can only check in on or after the scheduled date (not in advance).

Once all days are checked in, the booking automatically moves to "Payment Ready" status.

---

## For Art Department

### What can I do as art department?

Art department members can:
- View projects they've been assigned to.
- Browse all vehicles on the platform.
- View vehicle details (photos, specs, features).
- Place options on behalf of the production company (only on projects they're allocated to).

### How do I browse vehicles?

Go to **Browse Vehicles** in the sidebar. You can search and filter the same way production companies do. Click any vehicle to see its full details.

### Can I place options?

Yes, but only on projects you're allocated to. When placing an option, you must select the project. The option will be owned by the production company that created the project.

---

## Notifications & Communication

### What notifications will I receive?

You'll receive both in-app notifications (bell icon in the top-right) and email notifications for:
- Option requests, acceptances, declines, and expirations
- Booking confirmations, completions, and cancellations
- Document approvals and rejections
- Messages from other parties
- Shoot detail updates and vehicle check-ins
- Insurance reminders
- Listing status changes

### Can I control which emails I receive?

Yes. Go to **Settings** and toggle email notifications by category:
- **Options & Bookings** — Option requests, confirmations, booking updates
- **Documents** — Approvals, rejections, expiry warnings
- **Messages** — New messages on bookings
- **Shoot Logistics** — Daily details, check-ins, coordinator assignments
- **Listings** — Vehicle status changes, insurance reminders

You can also turn off all email notifications with the global toggle. In-app notifications are always active.

### How do booking messages work?

Each booking has a message thread. Messages are visible to the production user and the vehicle owner. Coordinators assigned to the project can also see and send messages. Messages trigger email notifications (if enabled).

### I'm not receiving emails — what should I do?

1. Check your spam/junk folder.
2. Make sure your email notification preferences are enabled in **Settings**.
3. Verify your email address is correct in **Settings**.
4. Contact **vehiclereel@gmail.com** if the issue persists.

---

## Documents & Verification

### What documents are required?

| Role | Required Documents |
|------|--------------------|
| Owner | SA ID or Passport + Driver's License |
| Production | SA ID or Passport + Company Registration |
| Per Vehicle | Vehicle License Disk |
| Per Booking | Vehicle Insurance (due 24h before shoot) |

### How long does verification take?

AI verification typically completes within a few minutes. You'll receive an email notification when your document is approved or flagged.

### My document was flagged — what do I do?

The notification will explain why. Common reasons:
- **Wrong document type** — You uploaded the wrong document (e.g., a utility bill instead of an ID).
- **Not readable** — The photo is blurry or too dark. Take a clearer photo.
- **Invalid document** — The document appears expired, damaged, or doesn't match requirements.

Go to the relevant page (Settings for personal docs, Vehicle detail for vehicle docs) and re-upload.

### What file formats are accepted?

PDF, JPEG, PNG, WebP, GIF, HEIC, and HEIF. Maximum file size is 4MB.

### Do documents expire?

Yes. The system extracts expiry dates from documents where possible. You'll receive a notification before a document expires so you can re-upload a current version.

---

## Account Management

### How do I change my email address?

Go to **Settings**, scroll to the email section, enter your new email address, and save. You'll need to verify the new email address.

### How do I delete my account?

Go to **Settings**, scroll to the bottom, and click **Delete Account**. You'll be asked to select a reason:
- Setup abandoned
- Found an alternative
- Privacy concern
- Other (with optional text)

Account deletion is permanent and immediate. Your data will be removed in accordance with POPIA regulations.

### I changed my mind about signing up

If you registered but haven't completed verification, you'll receive periodic reminders. After 5 reminders, you'll receive a final email with an option to close your account. Click "I Changed My Mind" to delete your account.

### Can I switch my role?

No. Each account has one role. If you need a different role, you'll need to create a new account with a different email address.

---

## Payment & Insurance

### How does payment work?

After all shoot days are checked in, the booking moves to "Payment Ready" status. VehicleReel invoices the production company and pays the vehicle owner (70% of the agreed rate). Payment details and bank account collection are being finalised — you'll be notified when this feature launches.

### Do I need insurance?

Yes. Production companies must upload a valid vehicle insurance certificate for each booking, at least 24 hours before the first shoot day. You'll receive reminders at regular intervals. If insurance is not uploaded, the booking may be affected.

### Who is liable for damages?

The production company is responsible for the vehicle during the booking period. Insurance must cover the vehicle for the duration of the shoot. Any damages should be reported immediately through the booking message thread. Refer to the Terms & Conditions for full details.

---

## Security & Privacy

### How is my data protected?

- All documents are stored securely with encrypted storage (Supabase).
- Personal information is only shared with parties involved in a booking.
- The platform complies with POPIA (Protection of Personal Information Act).
- You control your email notification preferences.
- You can delete your account and data at any time.

### Who can see my documents?

Only you and VehicleReel administrators can see your personal documents (ID, license, company registration). Vehicle registration documents are linked to the vehicle. Insurance documents are visible to both parties in a booking.

### Who can see my contact details?

Your phone number and email are only shared with the other party once a booking is confirmed. During the option stage, no contact details are shared.

---

## Troubleshooting

### My vehicle isn't showing in search results

Check that:
1. Your account is verified (all personal documents approved).
2. Your vehicle's license disk is approved.
3. Your vehicle status is "Active" (not "Pending Review" or "Suspended").
4. You haven't blocked the dates being searched.

### I can't place an option

Check that:
1. Your account is verified (all personal documents approved).
2. The vehicle is available for your selected dates.
3. There are no existing confirmed bookings for those dates.
4. The vehicle owner hasn't blocked those dates.

### My option expired — what happened?

Options expire if:
- The owner didn't respond within the response deadline.
- You didn't confirm the booking within the confirmation window after the owner accepted.

You can place a new option on the same vehicle if it's still available.

### I can't access certain pages

Your access depends on your role:
- **Owners** can only access owner pages.
- **Production** can only access production pages.
- **Coordinators** can only access coordinator pages.
- **Art Department** can only access art department pages.

If your account isn't verified yet, you'll only have access to document upload and settings pages until verification is complete.

---

## Frequently Asked Questions

### General

**Q: Is VehicleReel free to use?**
A: Registration is free. VehicleReel takes a platform fee (30% of the booking rate). Owners receive 70% of the agreed rate.

**Q: What areas does VehicleReel cover?**
A: VehicleReel operates across South Africa. Vehicles are listed with their location, and you can filter search results by area.

**Q: Can I list multiple vehicles?**
A: Yes. Owners can list as many vehicles as they like. Each vehicle needs its own License Disk uploaded and approved.

**Q: Can a vehicle be booked by multiple companies at the same time?**
A: No. Once a booking is confirmed, those dates are blocked. However, multiple options (holds) can exist in a queue for the same dates — only one will be confirmed.

### Options & Bookings

**Q: What's the difference between an option and a booking?**
A: An option is a hold request — it reserves your place in the queue. A booking is a confirmed reservation with dates, rates, and logistics locked in. Options become bookings when the owner accepts and the production company confirms.

**Q: Can I place options on multiple vehicles for the same dates?**
A: Yes. Production companies often place multiple options to have backup choices. Once you confirm one, the others remain active until you cancel them or they expire.

**Q: What is a queue position?**
A: When multiple production companies place options on the same vehicle for overlapping dates, they're queued in order. Position 1 is first in line. If position 1 declines or expires, position 2 is automatically promoted.

**Q: Can I change dates after placing an option?**
A: No. You would need to cancel the option and place a new one with the updated dates.

**Q: What rate types are available?**
A: Two types — **Per Day** (charged for each day of the booking) and **Package** (a flat fee for the entire booking regardless of duration).

### Logistics

**Q: What are the logistics options?**
A: When confirming a booking, you choose between **Vehicle Collection** (you pick up the vehicle from the owner) or **Owner Delivery** (the owner brings the vehicle to your location).

**Q: What is a call time?**
A: The time the vehicle needs to arrive at the shoot location on a given day. Set this in the booking's daily details.

**Q: What is a location pin?**
A: GPS coordinates for the exact shoot location. This helps the owner or driver navigate to the right spot. You can enter coordinates or a map link.

**Q: Do I need a precision driver?**
A: When placing an option, you can indicate whether a precision driver is required for the shoot. This is informational — VehicleReel doesn't provide drivers, but it lets the owner know what to expect.

### Projects & Teams

**Q: What's the purpose of projects?**
A: Projects group related vehicle bookings together for a single production. This makes it easier to manage multiple vehicles, share the lineup with stakeholders, and assign team members.

**Q: How do I add a coordinator to my project?**
A: From the project detail page, click **Add Member**, search for the coordinator by email, and select their role (Coordinator or Art Director). They must already have a VehicleReel account.

**Q: Can art department members place options?**
A: Yes, but only on projects they're allocated to. The option is created on behalf of the production company that owns the project.

### Account & Security

**Q: Can I have both an owner and production account?**
A: Not with the same email. You'd need to register separate accounts with different email addresses.

**Q: What happens if I forget my password?**
A: Click "Forgot password" on the login page. Enter your email and you'll receive a reset link (valid for 1 hour).

**Q: Is my data shared with third parties?**
A: No. Your data is only used within VehicleReel to facilitate bookings. We comply with POPIA. See our Privacy Policy for details.

**Q: How do I report an issue?**
A: Email **vehiclereel@gmail.com** with details of the issue. Include screenshots if possible.

---

## Glossary

| Term | Definition |
|------|-----------|
| **Option** | A hold request placed on a vehicle for specific dates. Not yet a confirmed booking. |
| **Booking** | A confirmed reservation — dates, rate, and logistics are locked in. |
| **Queue Position** | Your place in line when multiple options exist for the same vehicle and dates. |
| **Response Deadline** | How long the owner has to accept or decline an option. |
| **Confirmation Window** | How long the production company has to confirm after the owner accepts. |
| **Per Day Rate** | A daily charge for each day of the booking. |
| **Package Rate** | A flat fee for the entire booking regardless of duration. |
| **Vehicle Collection** | The production company picks up the vehicle from the owner. |
| **Owner Delivery** | The owner delivers the vehicle to the shoot location. |
| **Call Time** | The time the vehicle needs to arrive at the shoot location on a given day. |
| **Location Pin** | GPS coordinates for the shoot location. |
| **Shoot Day Hours** | The standard working hours for a shoot day (10 or 12 hours). |
| **Overtime** | Extra hours beyond the standard shoot day, charged at 1.5x (10–14h) or 2x (15+h). |
| **POPIA** | Protection of Personal Information Act — South African data privacy law. |
| **License Disk** | South African vehicle registration document (circular disk). |
| **CIPC** | Companies and Intellectual Property Commission — issues company registration certificates in South Africa. |
| **Precision Driver** | A professional driver who performs driving stunts or precise manoeuvres on set. |
| **Share Token** | A unique link that allows anyone to view a project's vehicle lineup without logging in. |
| **Flagged** | A document that failed AI verification and needs to be re-uploaded. |
| **Verified** | An account where all required documents have been approved. |
| **Active** | A vehicle that is verified and visible in search results. |
| **Payment Ready** | A booking where all shoot days are checked in and payment can be processed. |
