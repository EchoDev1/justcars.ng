/**
 * Terms & Conditions Page
 * Comprehensive legal terms for JustCars.ng platform
 */

'use client'

import { useState } from 'react'
import { FileText, Shield, AlertCircle, CheckCircle2, Mail, Phone, Globe } from 'lucide-react'

export default function TermsAndConditions() {
  const [activeSection, setActiveSection] = useState(null)

  const sections = [
    { id: 1, title: "Definitions", icon: FileText },
    { id: 2, title: "Acceptance of Terms", icon: CheckCircle2 },
    { id: 3, title: "Platform Role & Limitation", icon: Shield },
    { id: 4, title: "User Eligibility", icon: AlertCircle },
    { id: 5, title: "Dealer Responsibilities", icon: FileText },
    { id: 6, title: "Buyer Responsibilities", icon: FileText },
    { id: 7, title: "Escrow Payment Terms", icon: Shield },
    { id: 8, title: "Inspection Service Terms", icon: CheckCircle2 },
    { id: 9, title: "Violations & Fraud", icon: AlertCircle },
    { id: 10, title: "Dispute Resolution", icon: Shield },
    { id: 11, title: "Fees & Commissions", icon: FileText },
    { id: 12, title: "Liability Limitation", icon: AlertCircle },
    { id: 13, title: "Privacy & Data Protection", icon: Shield },
    { id: 14, title: "Modification of Terms", icon: FileText },
    { id: 15, title: "Contact Information", icon: Phone }
  ]

  return (
    <div className="terms-container">
      {/* Hero Section */}
      <div className="terms-hero">
        <div className="terms-hero-content">
          <div className="terms-icon-wrapper">
            <FileText size={60} />
          </div>
          <h1 className="terms-title">Terms & Conditions</h1>
          <p className="terms-subtitle">Last Updated: 29/11/2025</p>
          <p className="terms-intro">
            Welcome to JustCars.ng, an online marketplace connecting verified car dealers with buyers.
            By using our website, escrow service, inspection service, or dealer portal, you agree to the following Terms & Conditions.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="terms-nav">
        <div className="terms-nav-content">
          <h3>Quick Navigation</h3>
          <div className="terms-nav-grid">
            {sections.map(section => {
              const IconComponent = section.icon
              return (
                <a
                  key={section.id}
                  href={`#section-${section.id}`}
                  className="terms-nav-item"
                  onClick={() => setActiveSection(section.id)}
                >
                  <IconComponent size={18} />
                  <span>{section.title}</span>
                </a>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="terms-content">
        {/* Section 1: Definitions */}
        <section id="section-1" className="terms-section">
          <h2>1. DEFINITIONS</h2>
          <div className="terms-definitions">
            <div className="definition-item">
              <strong>"Platform"</strong> refers to JustCars.ng and all related services.
            </div>
            <div className="definition-item">
              <strong>"User"</strong> means any individual using the platform, including buyers and dealers.
            </div>
            <div className="definition-item">
              <strong>"Dealer"</strong> means any registered seller listing vehicles on the platform.
            </div>
            <div className="definition-item">
              <strong>"Buyer"</strong> means any registered user intending to purchase a vehicle.
            </div>
            <div className="definition-item">
              <strong>"Escrow"</strong> refers to the temporary holding of funds during a vehicle transaction.
            </div>
            <div className="definition-item">
              <strong>"Inspection"</strong> refers to the evaluation of a vehicle by our authorized inspectors.
            </div>
          </div>
        </section>

        {/* Section 2: Acceptance */}
        <section id="section-2" className="terms-section">
          <h2>2. ACCEPTANCE OF TERMS</h2>
          <p>
            By registering, accessing, or using this platform, you agree to be bound by these Terms & Conditions.
          </p>
          <p className="terms-highlight">
            <AlertCircle size={20} />
            If you do not agree, please stop using the service.
          </p>
        </section>

        {/* Section 3: Platform Role */}
        <section id="section-3" className="terms-section">
          <h2>3. PLATFORM ROLE & LIMITATION</h2>

          <h3>The platform:</h3>
          <ul>
            <li>Does not own or directly sell vehicles</li>
            <li>Provides a safe marketplace for listing cars</li>
            <li>Facilitates secure transactions through escrow</li>
            <li>Offers optional vehicle inspection services</li>
            <li>Performs due diligence on dealers</li>
          </ul>

          <h3>We are not responsible for:</h3>
          <ul className="liability-list">
            <li>Negotiations between buyer and dealer</li>
            <li>Any false information provided by a dealer</li>
            <li>Any vehicle condition issues discovered after purchase (unless inspection was used)</li>
          </ul>
        </section>

        {/* Section 4: User Eligibility */}
        <section id="section-4" className="terms-section">
          <h2>4. USER ELIGIBILITY</h2>

          <p>Users must:</p>
          <ul>
            <li>Be at least 18 years old</li>
            <li>Register with accurate information</li>
            <li>Not impersonate another person</li>
            <li>Not upload fraudulent or misleading content</li>
          </ul>

          <div className="terms-warning">
            <AlertCircle size={24} />
            <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </div>
        </section>

        {/* Section 5: Dealer Responsibilities */}
        <section id="section-5" className="terms-section">
          <h2>5. DEALER RESPONSIBILITIES</h2>

          <p>All dealers must:</p>
          <ol>
            <li>Provide accurate details about vehicles</li>
            <li>Upload real, unedited photos</li>
            <li>Declare accident history truthfully</li>
            <li>Disclose mileage and mechanical issues</li>
            <li>Respond to buyers promptly</li>
            <li>Allow inspection before payment release</li>
            <li>Comply with Nigerian laws and anti-fraud policies</li>
          </ol>

          <div className="terms-warning">
            <AlertCircle size={24} />
            <div>
              <p><strong>Dealers who provide false information may be:</strong></p>
              <ul>
                <li>Permanently banned</li>
                <li>Reported to authorities</li>
                <li>Liable for refunds or penalties</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 6: Buyer Responsibilities */}
        <section id="section-6" className="terms-section">
          <h2>6. BUYER RESPONSIBILITIES</h2>

          <p>Buyers must:</p>
          <ul>
            <li>Review all vehicle details carefully</li>
            <li>Use escrow when making payments</li>
            <li>Inspect or request inspection before approving release</li>
            <li>Provide accurate delivery and contact details</li>
            <li>Avoid chargebacks or fraudulent disputes</li>
          </ul>
        </section>

        {/* Section 7: Escrow Terms */}
        <section id="section-7" className="terms-section">
          <h2>7. ESCROW PAYMENT TERMS</h2>

          <p>By using the escrow service, you agree that:</p>
          <ol>
            <li>Payments go into a secure holding account.</li>
            <li>Funds are not released to the dealer until buyer approval.</li>
            <li>Buyer must approve or dispute within 24–48 hours after inspection/delivery.</li>
            <li>If no response after the time limit, the platform may release funds.</li>
            <li><strong>Escrow fees (1.5%) are non-refundable.</strong></li>
            <li>Refunds are only issued if:
              <ul>
                <li>Vehicle does not match description</li>
                <li>Vehicle fails inspection</li>
                <li>Car is unavailable</li>
              </ul>
            </li>
            <li>Refund will be processed within 24-48 hours after approval but might arrive earlier.</li>
          </ol>
        </section>

        {/* Section 8: Inspection Terms */}
        <section id="section-8" className="terms-section">
          <h2>8. INSPECTION SERVICE TERMS</h2>

          <p>By requesting inspection, the buyer agrees that:</p>
          <ul>
            <li>Inspection is unbiased and independent</li>
            <li>Inspectors check visible, accessible components only</li>
            <li>No inspector dismantles parts of the vehicle</li>
            <li>Inspection reports represent the car's condition at that moment</li>
          </ul>

          <h3>The platform is not responsible for:</h3>
          <ul className="liability-list">
            <li>Future breakdowns</li>
            <li>Issues not visible at time of inspection</li>
            <li>Problems arising after purchase</li>
          </ul>

          <p className="terms-note">
            We only report the vehicle's condition during the inspection window.
          </p>
        </section>

        {/* Section 9: Violations & Fraud */}
        <section id="section-9" className="terms-section">
          <h2>9. VIOLATIONS & FRAUD</h2>

          <div className="terms-warning">
            <AlertCircle size={32} />
            <div>
              <p><strong>The platform has zero tolerance for:</strong></p>
              <ul>
                <li>Fake listings</li>
                <li>Fake payments</li>
                <li>Stolen vehicles</li>
                <li>Mileage tampering</li>
                <li>False claims during disputes</li>
                <li>Chargeback fraud</li>
              </ul>

              <p><strong>Violations may result in:</strong></p>
              <ul>
                <li>Account termination</li>
                <li>Legal action</li>
                <li>Report to EFCC or relevant authorities</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 10: Dispute Resolution */}
        <section id="section-10" className="terms-section">
          <h2>10. DISPUTE RESOLUTION</h2>

          <p>All disputes must go through our Escrow Dispute Center.</p>

          <h3>Evidence may include:</h3>
          <ul>
            <li>Inspection report</li>
            <li>Photos and videos</li>
            <li>Chat logs</li>
            <li>Call recordings</li>
            <li>Dealer disclosures</li>
          </ul>

          <div className="terms-info">
            <Shield size={24} />
            <p>The platform's decision is final after reviewing all evidence.</p>
          </div>
        </section>

        {/* Section 11: Fees */}
        <section id="section-11" className="terms-section">
          <h2>11. FEES & COMMISSIONS</h2>

          <p>Users agree to all applicable fees, including:</p>
          <ul>
            <li>Escrow fee 1.5%</li>
            <li>Featured listing fees</li>
            <li>Dealer subscription fees</li>
            <li>Late cancellation fees</li>
          </ul>

          <p className="terms-note">
            Fees are subject to change with notice.
          </p>
        </section>

        {/* Section 12: Liability Limitation */}
        <section id="section-12" className="terms-section">
          <h2>12. LIABILITY LIMITATION</h2>

          <p>The platform is not liable for:</p>
          <ul className="liability-list">
            <li>Dealer misrepresentation</li>
            <li>Future mechanical faults</li>
            <li>Delivery failures by third-party companies</li>
            <li>Financial losses due to user negligence</li>
            <li>Loss of personal items left in vehicles</li>
          </ul>

          <div className="terms-warning">
            <AlertCircle size={24} />
            <p>Our maximum liability is limited to the fees paid for the service.</p>
          </div>
        </section>

        {/* Section 13: Privacy */}
        <section id="section-13" className="terms-section">
          <h2>13. PRIVACY & DATA PROTECTION</h2>

          <h3>We collect and store:</h3>
          <ul>
            <li>Contact details</li>
            <li>Payment history</li>
            <li>Listing data</li>
            <li>Device information</li>
          </ul>

          <div className="terms-info">
            <Shield size={24} />
            <div>
              <p>We do not sell user data.</p>
              <p>Data may be shared with authorities in cases of fraud.</p>
            </div>
          </div>
        </section>

        {/* Section 14: Modifications */}
        <section id="section-14" className="terms-section">
          <h2>14. MODIFICATION OF TERMS</h2>

          <p>We may modify these Terms & Conditions at any time.</p>
          <p>Users will be notified via the website or email.</p>

          <p className="terms-highlight">
            <CheckCircle2 size={20} />
            Continued use of the platform means acceptance of updated terms.
          </p>
        </section>

        {/* Section 15: Contact */}
        <section id="section-15" className="terms-section">
          <h2>15. CONTACT INFORMATION</h2>

          <div className="contact-grid">
            <div className="contact-item">
              <Mail size={24} />
              <div>
                <strong>Email</strong>
                <p>Admin@JustCars.ng</p>
              </div>
            </div>

            <div className="contact-item">
              <Phone size={24} />
              <div>
                <strong>Phone</strong>
                <p>08148527697</p>
              </div>
            </div>

            <div className="contact-item">
              <Globe size={24} />
              <div>
                <strong>Website</strong>
                <p>JustCars.ng</p>
              </div>
            </div>
          </div>
        </section>

        {/* Acceptance Footer */}
        <div className="terms-footer">
          <div className="terms-footer-content">
            <CheckCircle2 size={48} className="terms-footer-icon" />
            <h3>By using JustCars.ng, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.</h3>
            <p className="terms-footer-date">Last Updated: 29/11/2025</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .terms-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }

        .terms-hero {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          padding: 80px 20px;
          text-align: center;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .terms-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .terms-hero-content {
          max-width: 900px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .terms-icon-wrapper {
          display: inline-flex;
          padding: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          backdrop-filter: blur(10px);
          margin-bottom: 24px;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .terms-title {
          font-size: 56px;
          font-weight: 800;
          margin-bottom: 16px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .terms-subtitle {
          font-size: 18px;
          opacity: 0.9;
          margin-bottom: 24px;
        }

        .terms-intro {
          font-size: 18px;
          line-height: 1.7;
          opacity: 0.95;
          max-width: 800px;
          margin: 0 auto;
        }

        .terms-nav {
          background: #1e293b;
          padding: 40px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .terms-nav-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .terms-nav-content h3 {
          color: white;
          font-size: 24px;
          margin-bottom: 24px;
        }

        .terms-nav-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
        }

        .terms-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #93c5fd;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .terms-nav-item:hover {
          background: rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
          transform: translateX(4px);
        }

        .terms-content {
          max-width: 900px;
          margin: 0 auto;
          padding: 60px 20px;
        }

        .terms-section {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 40px;
          margin-bottom: 32px;
          color: white;
        }

        .terms-section h2 {
          font-size: 32px;
          font-weight: 700;
          color: #60a5fa;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid rgba(96, 165, 250, 0.3);
        }

        .terms-section h3 {
          font-size: 22px;
          font-weight: 600;
          color: #93c5fd;
          margin-top: 24px;
          margin-bottom: 16px;
        }

        .terms-section p {
          font-size: 16px;
          line-height: 1.8;
          margin-bottom: 16px;
          color: rgba(255, 255, 255, 0.9);
        }

        .terms-section ul,
        .terms-section ol {
          margin: 16px 0;
          padding-left: 24px;
        }

        .terms-section li {
          font-size: 16px;
          line-height: 1.8;
          margin-bottom: 12px;
          color: rgba(255, 255, 255, 0.85);
        }

        .terms-definitions {
          display: grid;
          gap: 16px;
        }

        .definition-item {
          background: rgba(59, 130, 246, 0.1);
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
          font-size: 15px;
          line-height: 1.6;
        }

        .definition-item strong {
          color: #60a5fa;
          display: block;
          margin-bottom: 4px;
        }

        .terms-highlight {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(59, 130, 246, 0.15);
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
          font-weight: 500;
        }

        .terms-warning {
          display: flex;
          gap: 16px;
          background: rgba(239, 68, 68, 0.1);
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #ef4444;
          margin: 24px 0;
        }

        .terms-warning svg {
          flex-shrink: 0;
          color: #ef4444;
        }

        .terms-info {
          display: flex;
          gap: 16px;
          background: rgba(34, 197, 94, 0.1);
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #22c55e;
          margin: 24px 0;
        }

        .terms-info svg {
          flex-shrink: 0;
          color: #22c55e;
        }

        .liability-list {
          background: rgba(239, 68, 68, 0.05);
          padding: 16px 16px 16px 40px;
          border-radius: 8px;
          border-left: 4px solid #ef4444;
        }

        .terms-note {
          background: rgba(168, 85, 247, 0.1);
          padding: 12px 16px;
          border-radius: 8px;
          border-left: 4px solid #a855f7;
          font-style: italic;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .contact-item {
          display: flex;
          gap: 16px;
          background: rgba(59, 130, 246, 0.1);
          padding: 24px;
          border-radius: 12px;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .contact-item svg {
          flex-shrink: 0;
          color: #60a5fa;
        }

        .contact-item strong {
          display: block;
          color: #93c5fd;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .contact-item p {
          margin: 0;
          font-size: 16px;
        }

        .terms-footer {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          padding: 60px 20px;
          margin-top: 60px;
          border-radius: 24px;
        }

        .terms-footer-content {
          text-align: center;
          color: white;
        }

        .terms-footer-icon {
          color: #22c55e;
          margin-bottom: 24px;
          filter: drop-shadow(0 4px 12px rgba(34, 197, 94, 0.4));
        }

        .terms-footer-content h3 {
          font-size: 24px;
          line-height: 1.6;
          max-width: 700px;
          margin: 0 auto 16px;
        }

        .terms-footer-date {
          font-size: 14px;
          opacity: 0.8;
          margin: 0;
        }

        @media (max-width: 768px) {
          .terms-title {
            font-size: 36px;
          }

          .terms-section {
            padding: 24px;
          }

          .terms-section h2 {
            font-size: 24px;
          }

          .terms-nav-grid {
            grid-template-columns: 1fr;
          }

          .contact-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
