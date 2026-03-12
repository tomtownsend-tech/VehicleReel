'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ADMIN_EMAIL = 'vehiclereel@gmail.com';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'How do I register?',
        a: 'Choose your role — Vehicle Owner or Production Company — and create an account. You\'ll receive a verification email to confirm your address before you can proceed.',
      },
      {
        q: 'What documents do I need?',
        a: 'Owners: SA ID + Driver\'s License (personal verification), plus a Vehicle License Disk for each vehicle listed.\nProduction Companies: SA ID + Company Registration.',
      },
      {
        q: 'How long does document verification take?',
        a: 'Documents are reviewed automatically by AI, usually within minutes. If flagged, an admin will review manually and you\'ll be notified.',
      },
      {
        q: 'Why is my vehicle still "Pending Review"?',
        a: 'Your vehicle only activates once your personal documents AND the vehicle\'s license disk are all approved.',
      },
    ],
  },
  {
    title: 'Searching & Listing Vehicles',
    items: [
      {
        q: 'What vehicle types are supported?',
        a: 'Cars, Racing Cars, Bikes, Motorbikes, Scooters, Boats, Planes, and Jet Skis.',
      },
      {
        q: 'How do I find vehicles for my shoot?',
        a: 'Use the Search page to filter by type, make, model, color, year, location, drive side, special features, and date availability.',
      },
      {
        q: 'How do I block dates my vehicle isn\'t available?',
        a: 'Use the availability calendar on your vehicle\'s detail page to add blocked date ranges.',
      },
    ],
  },
  {
    title: 'Options & Bookings',
    items: [
      {
        q: 'What is an "option"?',
        a: 'An option is a hold request from a production company on your vehicle for specific dates — think of it as "first dibs," not yet a confirmed booking.',
      },
      {
        q: 'How long does an owner have to respond?',
        a: 'Each option has a response deadline set by the production company. If it passes without a response, the option expires and the next in queue is promoted.',
      },
      {
        q: 'What happens after an owner accepts?',
        a: 'The production company has a confirmation window to finalize it into a booking. If they don\'t confirm in time, it expires.',
      },
      {
        q: 'Can multiple companies option the same vehicle for the same dates?',
        a: 'Yes. Options queue up first-come-first-served. If one falls through, the next is promoted automatically with at least a 12-hour response extension.',
      },
      {
        q: 'What\'s the difference between "per day" and "package" rates?',
        a: 'Per-day rates multiply by the number of shoot days. Package rates are a flat fee for the entire period.',
      },
      {
        q: 'What are the logistics options?',
        a: 'Either "Vehicle Collection" (production picks up) or "Owner Delivery" (owner brings it to set), specified when confirming a booking.',
      },
      {
        q: 'Can I add daily shoot details?',
        a: 'Yes — each booking day can have its own call time, location, GPS pin, and notes.',
      },
      {
        q: 'Do I need a precision driver?',
        a: 'When placing an option, you can flag whether one is required. This is communicated to the owner.',
      },
    ],
  },
  {
    title: 'Payment, Insurance & Damages',
    items: [
      {
        q: 'How does payment work?',
        a: 'VehicleReel invoices the production company and pays out the vehicle owner. A full payment facility is being built for future iterations of the platform.',
      },
      {
        q: 'Is my vehicle insured during a shoot?',
        a: 'Yes. The production company is required to provide proof of insurance, which will be visible to the vehicle owner once the booking is confirmed and at least 48 hours before the shoot.',
      },
      {
        q: 'How are losses and damages handled?',
        a: 'The production company is liable for any losses or damages that occur during the shoot. All claims should be submitted directly to the production company.',
      },
    ],
  },
  {
    title: 'Cancellations',
    items: [
      {
        q: 'What if I booked my car but changed my mind?',
        a: 'Only the production company can cancel a confirmed booking. The cancellation policy is as follows:\n\n• 48+ hours before the shoot: Free cancellation\n• 24–48 hours before the shoot: 50% cancellation fee\n• Less than 24 hours before the shoot: 100% fee (no refund)\n\nA cancellation reason is collected and both parties are notified.',
      },
    ],
  },
  {
    title: 'Shoot Day Logistics',
    items: [
      {
        q: 'How are shoot day arrangements handled?',
        a: 'Shoot day details are managed through the platform and coordinated by the assigned coordinator. Each booking day includes call times, locations, addresses, and Google Maps pins — all visible to both the owner and production company.',
      },
    ],
  },
  {
    title: 'Projects',
    items: [
      {
        q: 'What are Projects?',
        a: 'Projects let production companies group multiple vehicle options under one production and share a unique link for client or director review.',
      },
    ],
  },
  {
    title: 'Notifications & Communication',
    items: [
      {
        q: 'Will I get email notifications?',
        a: 'Yes — all option, booking, and document notifications send emails automatically. You can toggle this off in Settings.',
      },
      {
        q: 'Are my messages private?',
        a: 'Messages are only visible to the parties on that booking (owner, production company, coordinator). Admin access for disputes is audited.',
      },
      {
        q: "I'm not receiving emails — what's wrong?",
        a: 'Some providers (especially iCloud) may filter or bounce emails. Check your spam folder first.',
      },
    ],
  },
  {
    title: 'Roles & Coordination',
    items: [
      {
        q: 'Can I have both an Owner and Production account?',
        a: 'Currently each account has a single role. You\'d need separate accounts.',
      },
      {
        q: 'What is a Coordinator?',
        a: 'A coordinator is assigned to bookings to manage logistics and communication between owner and production. They can update shoot details and handle check-ins.',
      },
    ],
  },
  {
    title: 'Security & Data Protection',
    items: [
      {
        q: 'How are my documents protected?',
        a: 'All documents are stored in an encrypted, access-controlled cloud database. Files are never publicly accessible. Only you and authorized administrators can view your documents, and all access is logged.',
      },
      {
        q: 'Who can see my documents?',
        a: 'Access is strictly role-based. Production companies cannot see owner documents and vice versa. No third parties are involved in verification.',
      },
      {
        q: 'Is VehicleReel POPIA compliant?',
        a: 'Yes. We adhere to the Protection of Personal Information Act (POPIA):\n\n- We only collect information necessary to operate the platform\n- Your data is stored with encryption and access controls\n- You can request access to, correction of, or deletion of your personal information at any time\n- We do not share personal information with third parties without consent\n- All data processing is logged for accountability',
      },
      {
        q: 'Can I request my data be deleted?',
        a: 'Yes. Under POPIA you have the right to request deletion. Contact us and we\'ll remove your data, subject to any legal retention requirements.',
      },
      {
        q: 'How do you handle data breaches?',
        a: 'We will notify affected users and the Information Regulator within POPIA-required timeframes. We maintain security monitoring and audit logs to detect and respond to incidents.',
      },
    ],
  },
];

function AccordionItem({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-4 text-left gap-4"
      >
        <span className="text-sm font-medium text-white">{item.q}</span>
        <ChevronDown className={cn('h-4 w-4 text-white/40 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="text-sm text-white/60 pb-4 whitespace-pre-line leading-relaxed">{item.a}</p>
      )}
    </div>
  );
}

export default function FAQPage() {
  const subject = encodeURIComponent('VehicleReel Support Request');
  const body = encodeURIComponent(
    'Hi VehicleReel,\n\nI would like to request:\n- [ ] More information\n- [ ] Deletion of my documents\n- [ ] A copy of my documents\n- [ ] Other: \n\nDetails:\n\n'
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h1>

      {FAQ_SECTIONS.map((section) => (
        <Card key={section.title} className="mb-4">
          <CardHeader>
            <h2 className="text-lg font-semibold">{section.title}</h2>
          </CardHeader>
          <CardContent>
            {section.items.map((item) => (
              <AccordionItem key={item.q} item={item} />
            ))}
          </CardContent>
        </Card>
      ))}

      <Card className="mt-6">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-white/60 mb-4">
            Still have questions? Get in touch and we&apos;ll get back to you.
          </p>
          <a href={`mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`}>
            <Button>Contact Us</Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
