import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-white/50 hover:text-white mb-6 inline-block">&larr; Back to VehicleReel</Link>

        <h1 className="text-3xl font-bold text-white mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-white/40 mb-8">Version 1.0 &mdash; Effective 13 March 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Introduction</h2>
            <p>These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your use of the VehicleReel platform (&ldquo;Platform&rdquo;), operated by VehicleReel (Pty) Ltd (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). By registering, you agree to these Terms in full.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Definitions</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Owner</strong> &mdash; a registered user who lists vehicles for hire.</li>
              <li><strong>Production Company</strong> &mdash; a registered user who searches for and books vehicles.</li>
              <li><strong>Coordinator</strong> &mdash; a user assigned to manage logistics for a booking.</li>
              <li><strong>Option</strong> &mdash; a hold request placed on a vehicle for specific dates.</li>
              <li><strong>Booking</strong> &mdash; a confirmed arrangement between an Owner and a Production Company.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Eligibility &amp; Registration</h2>
            <p>You must be at least 18 years old and legally permitted to enter contracts in South Africa. You must provide accurate information during registration and keep it up to date. We reserve the right to suspend or terminate accounts that provide false information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Document Verification</h2>
            <p>All users must upload identity documents for verification. Owners must provide a valid SA ID or Passport and Driver&rsquo;s License. Production Companies must provide a valid SA ID or Passport and Company Registration. Documents are reviewed by automated systems and, where necessary, by administrators. We may reject or flag documents that do not meet our requirements.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Vehicle Listings</h2>
            <p>Owners are responsible for the accuracy of their vehicle listings, including photos, specifications, and availability. Vehicles must be roadworthy, legally registered, and properly insured. We reserve the right to remove listings that violate these Terms or applicable laws.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Options &amp; Bookings</h2>
            <p>Options are non-binding holds that allow Production Companies to reserve vehicles. Once an Owner accepts and the Production Company confirms, a binding Booking is created. Response and confirmation deadlines are enforced automatically. Expired options are void and cannot be reinstated.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Cancellation Policy</h2>
            <p>Only the Production Company may cancel a confirmed booking. The following fees apply:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>48+ hours before the shoot: No cancellation fee</li>
              <li>24&ndash;48 hours before the shoot: 50% cancellation fee</li>
              <li>Less than 24 hours before the shoot: 100% fee (no refund)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Payment</h2>
            <p>VehicleReel invoices the Production Company and pays out the Owner after the shoot is completed. Payment terms and methods will be communicated through the Platform. For 12-hour shoot days, 7-day post-invoice payment terms apply.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Insurance &amp; Liability</h2>
            <p>The Production Company is responsible for providing proof of vehicle insurance at least 24 hours before the shoot. The Production Company is liable for any loss, damage, or injury arising during the shoot. VehicleReel is a marketplace and is not party to the arrangement between Owner and Production Company. We are not liable for any loss, damage, or dispute between parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. Overtime</h2>
            <p>Production Companies select a 10-hour or 12-hour shoot day when creating a project. Hours beyond the selected day length are subject to overtime rates:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Up to 14 hours: 1.5x hourly rate</li>
              <li>15+ hours: 2x hourly rate</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">11. Intellectual Property</h2>
            <p>All content on the Platform, including logos, design, and software, is owned by VehicleReel. Vehicle photos uploaded by Owners remain their property but are licensed to VehicleReel for display on the Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">12. Account Termination</h2>
            <p>You may delete your account at any time through the Settings page. We may suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or fail to complete verification. Upon deletion, all personal data will be removed in accordance with our POPIA obligations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">13. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, VehicleReel shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform. Our total liability shall not exceed the fees paid by you in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">14. Dispute Resolution</h2>
            <p>Disputes between parties should first be addressed through the Platform&rsquo;s messaging system. If unresolved, disputes shall be governed by the laws of the Republic of South Africa and submitted to the jurisdiction of the courts of the Western Cape.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">15. Changes to These Terms</h2>
            <p>We may update these Terms from time to time. When we do, we will update the version number and effective date. If material changes are made, you will be asked to re-accept the Terms upon your next login.</p>
          </section>

          <section id="popia" className="scroll-mt-8">
            <h2 className="text-lg font-semibold text-white">16. POPIA &mdash; Protection of Personal Information</h2>
            <p>VehicleReel is committed to compliance with the Protection of Personal Information Act, 2013 (POPIA). By using the Platform, you consent to the collection, processing, and storage of your personal information as described below.</p>

            <h3 className="text-sm font-semibold text-white mt-4">16.1 Information We Collect</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Identity information: name, email, phone number, SA ID / passport number (from uploaded documents)</li>
              <li>Company information: company name, registration details (for Production Companies)</li>
              <li>Vehicle information: make, model, year, photos, license disk details</li>
              <li>Usage data: booking history, messages, notification preferences</li>
            </ul>

            <h3 className="text-sm font-semibold text-white mt-4">16.2 How We Use Your Information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>To verify your identity and activate your account</li>
              <li>To facilitate bookings between Owners and Production Companies</li>
              <li>To send notifications about options, bookings, and account activity</li>
              <li>To improve the Platform and resolve disputes</li>
            </ul>

            <h3 className="text-sm font-semibold text-white mt-4">16.3 Data Sharing</h3>
            <p>We do not sell your personal information. Limited information (name, email, phone) is shared between booking parties to facilitate communication. Document contents are never shared with other users.</p>

            <h3 className="text-sm font-semibold text-white mt-4">16.4 Data Retention</h3>
            <p>Your data is retained for as long as your account is active. Upon account deletion, personal data is removed, subject to any legal retention requirements. Anonymised booking data may be retained for analytics purposes.</p>

            <h3 className="text-sm font-semibold text-white mt-4">16.5 Your Rights</h3>
            <p>Under POPIA, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access your personal information held by us</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to the processing of your personal information</li>
              <li>Lodge a complaint with the Information Regulator</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at <a href="mailto:vehiclereel@gmail.com" className="text-white/80 underline">vehiclereel@gmail.com</a>.</p>

            <h3 className="text-sm font-semibold text-white mt-4">16.6 Security</h3>
            <p>All documents are stored in encrypted, access-controlled cloud storage. Access is strictly role-based and all access is logged. We maintain security monitoring to detect and respond to incidents. In the event of a data breach, we will notify affected users and the Information Regulator within the timeframes required by POPIA.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">VehicleReel (Pty) Ltd &mdash; Cape Town, South Africa</p>
        </div>
      </div>
    </div>
  );
}
