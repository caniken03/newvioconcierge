import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">VioConcierge Privacy Policy</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">Version 1.0 – February 2025 | Last updated: February 2025</p>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300">
              This Privacy Policy explains how <strong>Smart AI Solutions</strong> ("we", "us", "our") collects, uses, stores, and protects personal data when you use the <strong>VioConcierge</strong> AI voice scheduling and automation platform.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              We are committed to transparency, privacy, and full compliance with the <strong>UK GDPR</strong>, the <strong>Data Protection Act 2018</strong>, and <strong>PECR</strong>.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">1. Who We Are</h2>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Smart AI Solutions</strong><br />
              Provider of the <strong>VioConcierge</strong> AI voice and automation platform.<br />
              We act primarily as a <strong>Data Processor</strong>, providing services to business clients ("Clients").<br />
              Clients act as <strong>Data Controllers</strong> and determine how personal data is used.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Official contact:</strong><br />
              📧 Email: <a href="mailto:info@smartaisolutions.ai" className="text-indigo-600 dark:text-indigo-400 hover:underline">info@smartaisolutions.ai</a><br />
              📌 Data Protection Lead / Privacy Lead
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">2. Scope of this Policy</h2>
            <p className="text-gray-700 dark:text-gray-300">This policy applies to:</p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
              <li>Use of the VioConcierge platform by business clients and their authorised users</li>
              <li>Personal data processed during AI-powered call handling, scheduling, and tenant access</li>
              <li>Information collected from callers interacting with the AI system</li>
              <li>Our website (if used to access VioConcierge)</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              This policy does <strong>not</strong> override Client responsibilities as Data Controllers.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">3. Data We Collect</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">A. Client (Business) User Data</h3>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number (optional)</li>
              <li>Login credentials</li>
              <li>Organisation / company info</li>
              <li>User roles and permissions</li>
              <li>Usage activity and preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">B. Callers / End Users</h3>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
              <li>First name (if provided)</li>
              <li>Phone number (incoming call or SMS)</li>
              <li>Appointment date/time preferences</li>
              <li>Call content (voice, if recording enabled)</li>
              <li>Call transcript or summary (optional)</li>
              <li>Call metadata (duration, timestamps, outcome)</li>
            </ul>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 my-4">
              <p className="text-gray-800 dark:text-gray-200">
                ✅ VioConcierge is <strong>not designed to store special category (sensitive) data.</strong>
              </p>
              <p className="text-gray-800 dark:text-gray-200 mt-2">
                We do <strong>not</strong> store medical records, diagnoses, treatment details, or any clinical notes.<br />
                We encourage clients to <strong>use generic appointment names</strong> (e.g., "Consultation", "Follow-up").
              </p>
            </div>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">4. How We Collect Data</h2>
            <p className="text-gray-700 dark:text-gray-300">We collect data via:</p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
              <li>Platform usage and account creation</li>
              <li>Inbound/outbound calls via VioConcierge</li>
              <li>Optional call recordings (if enabled by client)</li>
              <li>Client configuration and settings</li>
              <li>Audit logs and security tracking</li>
              <li>Support or billing interactions</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">5. Why We Use Data (Purpose of Processing)</h2>
            <p className="text-gray-700 dark:text-gray-300">We process data to:</p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
              <li>Provide and operate the VioConcierge platform</li>
              <li>Handle calls and schedule appointments</li>
              <li>Generate transcripts or summaries (optional)</li>
              <li>Maintain security, authentication, and access control</li>
              <li>Provide client support</li>
              <li>Maintain audit logs for accountability</li>
              <li>Improve service performance and reliability</li>
              <li>Issue billing invoices</li>
              <li>Comply with legal requirements (e.g. retention, breach notification)</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 font-semibold mt-2">
              We do <strong>not</strong> use personal data for external marketing or data resale.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">6. Legal Basis for Processing (UK GDPR)</h2>
            <p className="text-gray-700 dark:text-gray-300">Depending on the situation, we rely on one or more of the following:</p>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li><strong>✅ Contract</strong> – to deliver the VioConcierge service to clients</li>
              <li><strong>✅ Legitimate Interest</strong> – call handling, quality assurance, security, audit logs, limited recordings</li>
              <li><strong>✅ Legal Obligation</strong> – financial record retention, breach notification</li>
              <li><strong>✅ Consent</strong> – only for optional actions (e.g. marketing emails OR if a client chooses to require caller consent)</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">7. Call Recording & Voice Data</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Recording Setting:</h3>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ Recording is <strong>ON by default</strong> to ensure quality and dispute resolution</li>
              <li>✅ Clients may disable recording at any time</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Storage Model:</h3>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ Recordings are stored in a <strong>separate, secure central recording system</strong>, not in the tenant dashboard</li>
              <li>✅ Only <strong>Smart AI Solutions Super Admins</strong> have <strong>direct access</strong> to audio recordings</li>
              <li>✅ All access is <strong>fully logged and visible to the client in the audit trail</strong></li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Retention:</h3>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ Default retention: <strong>30 days</strong></li>
              <li>✅ After 30 days, recordings are <strong>automatically and permanently deleted</strong></li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Transcripts/Summaries (Optional):</h3>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ Stored in tenant account</li>
              <li>✅ Retained for 12 months by default</li>
            </ul>

            <p className="text-gray-700 dark:text-gray-300 font-semibold mt-4">
              We do NOT use call recordings or transcripts to train external AI models.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">8. Data Storage & Hosting</h2>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ All data is stored <strong>exclusively in the United Kingdom</strong></li>
              <li>✅ Hosted by <strong>Supabase (UK data centres)</strong></li>
              <li>✅ Voice processing handled via <strong>Retell AI (UK/EU routing)</strong></li>
              <li>✅ No international transfers by default</li>
              <li>✅ If transfers are ever required, we will use <strong>Standard Contractual Clauses (SCCs)</strong> and <strong>Transfer Impact Assessments</strong></li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">9. Data Retention</h2>
            <p className="text-gray-700 dark:text-gray-300">We retain data only as long as necessary:</p>
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-300 dark:border-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-gray-900 dark:text-white">Data Type</th>
                    <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-gray-900 dark:text-white">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">Call Recordings</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">30 days</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">Transcripts / Summaries</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">12 months</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">Call Metadata</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">24 months</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">Appointment Logs</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">24 months</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">Contact / Caller Data</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">Account lifetime + 12 months</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">User Accounts</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">Deleted or anonymised immediately on removal</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">Billing / Invoices</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">6 years (legal requirement)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">Audit Logs</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">7 years</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">System Logs</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">90 days</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">Backups</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300">30-day rolling</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              After retention periods, data is <strong>securely deleted or anonymised</strong>.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">10. Data Sharing</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We do <strong>not</strong> sell or share data for marketing.
            </p>
            <p className="text-gray-700 dark:text-gray-300">Data is only shared with:</p>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ Subprocessors (Supabase, Retell AI) under strict DPA agreements</li>
              <li>✅ Legal authorities if required by law</li>
              <li>✅ The client (controller) as part of platform functionality</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">11. Subprocessors</h2>
            <p className="text-gray-700 dark:text-gray-300">We use only trusted providers:</p>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ Supabase – database, auth, storage</li>
              <li>✅ Retell AI – voice processing</li>
              <li>✅ (Optional future providers only if enabled by client)</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              We maintain a full Subprocessor Register and ensure GDPR-compliant agreements.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">12. Security Measures</h2>
            <p className="text-gray-700 dark:text-gray-300">We protect data using:</p>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ Encryption (AES-256 at rest, TLS 1.2+ in transit)</li>
              <li>✅ Role-based access control (RBAC)</li>
              <li>✅ Least privilege access</li>
              <li>✅ Multi-factor authentication (for internal admin)</li>
              <li>✅ Tamper-proof, hash-chained audit logs</li>
              <li>✅ Firewalls and network security</li>
              <li>✅ Regular backups and disaster recovery testing</li>
              <li>✅ Incident response plan with 72h breach notification</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">13. Audit Logging & Accountability</h2>
            <p className="text-gray-700 dark:text-gray-300">We keep a detailed audit trail of all actions:</p>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ Who accessed data</li>
              <li>✅ What action was taken</li>
              <li>✅ Which record or resource</li>
              <li>✅ Time, duration, IP (anonymised)</li>
              <li>✅ Device/browser</li>
              <li>✅ Purpose (if applicable)</li>
              <li>✅ Result: success / failure / blocked</li>
              <li>✅ <strong>Cryptographically signed and hash-chained</strong></li>
              <li>✅ <strong>Retained for 7 years</strong></li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              Clients can view activity for their own tenant.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">14. Your Data Rights (Under GDPR)</h2>
            <p className="text-gray-700 dark:text-gray-300">Individuals have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
              <li>Access data</li>
              <li>Correct data</li>
              <li>Delete data ("Right to be Forgotten")</li>
              <li>Restrict processing</li>
              <li>Object to processing</li>
              <li>Data portability</li>
            </ul>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 my-4">
              <p className="text-gray-800 dark:text-gray-200 font-semibold">Important:</p>
              <p className="text-gray-800 dark:text-gray-200">
                Smart AI Solutions acts as a <strong>Processor</strong>.<br />
                Requests should be made to the <strong>Client (Data Controller)</strong>.<br />
                We will assist clients in fulfilling any request.
              </p>
            </div>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">15. Cookies & Analytics</h2>
            <p className="text-gray-700 dark:text-gray-300">If using the VioConcierge website:</p>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ We may use essential cookies for performance or login</li>
              <li>✅ Optional analytics or cookies will ask for consent</li>
              <li>✅ Users can control cookies via their browser</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">16. AI Ethics & Automated Decisions</h2>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ AI in VioConcierge assists users and callers</li>
              <li>✅ AI does <strong>not</strong> make legally binding or harmful automated decisions</li>
              <li>✅ No profiling with significant effects</li>
              <li>✅ Clients can override any AI actions</li>
              <li>✅ We do not manipulate or deceive callers</li>
              <li>✅ No external AI model training using client data</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">17. Children's Data</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The VioConcierge platform is designed for use by businesses.<br />
              It is <strong>not intended for children under 16</strong>.<br />
              We do not knowingly collect data from minors.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">18. No Sale of Data & Data Ownership</h2>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ We NEVER sell personal data</li>
              <li>✅ Clients fully own their data</li>
              <li>✅ We act only under client instructions</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">19. International Transfers</h2>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ No international transfers by default</li>
              <li>✅ If required, we implement GDPR safeguards (SCCs, TIAs)</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">20. Updates to This Policy</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We may update this policy to reflect changes in law or platform functionality.
            </p>
            <ul className="list-none pl-0 text-gray-700 dark:text-gray-300">
              <li>✅ The latest version will always be published on our website.</li>
              <li>✅ Clients will be notified of any significant changes.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">21. Contact Us</h2>
            <p className="text-gray-700 dark:text-gray-300">For privacy or data protection questions:</p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Smart AI Solutions</strong><br />
              📧 Email: <a href="mailto:info@smartaisolutions.ai" className="text-indigo-600 dark:text-indigo-400 hover:underline">info@smartaisolutions.ai</a><br />
              (Data Protection Lead / Privacy Lead)
            </p>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-6 my-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">✅ Summary</h3>
              <p className="text-gray-800 dark:text-gray-200">
                VioConcierge is designed with privacy, transparency, and security at its core.<br />
                We minimise data collection, avoid sensitive data, provide strict access control, and give clients full ownership and visibility.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
