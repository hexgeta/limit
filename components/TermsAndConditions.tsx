import React from 'react';

const TermsAndConditions: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <main className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>

        <div className="space-y-6">
          <p>
            These Terms and Conditions ("Terms") govern your use of the AgoráX Site (the "Site") operated by AgoráX ("we," "us," or "our"). By accessing or using the Site, you agree to comply with and be bound by these Terms. If you do not agree with these Terms, please do not use the Site.
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Site, you acknowledge that you have read, understood, and agree to be bound by these Terms. We reserve the right to modify or revise these Terms at any time without notice. It is your responsibility to review these Terms periodically to ensure you are aware of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Use of the Site</h2>
            <p>2.1. You must be at least 18 years old to use the Site.</p>
            <p>2.2. You agree to use the Site for lawful purposes only and in compliance with all applicable laws and regulations.</p>
            <p>2.3. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Content and Services</h2>
            <p>3.1. The Site provides information and analytics related to cryptocurrencies and does not constitute financial advice. You are solely responsible for any investment decisions you make based on information obtained from the Site.</p>
            <p>3.2. We may, at our discretion, change or discontinue any part of the Site or its services without notice.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Conduct</h2>
            <p>4.1. You agree not to engage in any of the following prohibited activities:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>a) Violating any applicable laws or regulations.</li>
              <li>b) Impersonating any person or entity or falsely claiming an affiliation with any entity.</li>
              <li>c) Uploading, posting, or transmitting any content that is harmful, offensive, or violates the rights of others.</li>
              <li>d) Attempting to interfere with the proper functioning of the Site.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Limitation of Liability</h2>
            <p>5.1. <strong>USE AT YOUR OWN RISK:</strong> You acknowledge that cryptocurrency trading involves substantial risk of loss and that you use the Site at your own risk.</p>
            <p>5.2. <strong>NO LIABILITY FOR LOSSES:</strong> To the fullest extent permitted by law, AgoráX, its officers, directors, employees, and affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>a) Loss of funds, profits, or investment opportunities;</li>
              <li>b) Trading losses or failed transactions;</li>
              <li>c) Technical failures, system downtime, or data loss;</li>
              <li>d) Errors in information, analytics, or market data;</li>
              <li>e) Unauthorized access to your account or funds;</li>
              <li>f) Any other losses arising from your use of the Site.</li>
            </ul>
            <p>5.3. <strong>MAXIMUM LIABILITY:</strong> In no event shall our total liability to you exceed the amount of fees (if any) paid by you to us in the twelve (12) months preceding the event giving rise to such liability.</p>
            <p>5.4. <strong>NO WARRANTIES:</strong> The Site is provided "as is" and "as available" without any warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
          </section>

          <p className="mt-8 font-semibold">
            By using the Site, you acknowledge and agree to these Terms and any updates or modifications thereof. These Terms constitute the entire agreement between you and us regarding your use of the Site.
          </p>
        </div>
      </main>
    </div>
  );
};

export default TermsAndConditions;
