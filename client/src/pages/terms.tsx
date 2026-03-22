import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/site-logo";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Terms of Service | Strivo</title>
        <link rel="canonical" href="https://strivo.life/terms" />
        <meta name="description" content="Read Strivo's terms of service governing your use of the platform." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://strivo.life/terms" />
        <meta property="og:site_name" content="Strivo" />
        <meta property="og:title" content="Terms of Service | Strivo" />
        <meta property="og:description" content="Read Strivo's terms of service governing your use of the platform." />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@strivoapp" />
        <meta name="twitter:title" content="Terms of Service | Strivo" />
        <meta name="twitter:description" content="Read Strivo's terms of service governing your use of the platform." />

        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "url": "https://strivo.life/terms",
          "name": "Terms of Service | Strivo",
          "isPartOf": { "@id": "https://strivo.life/#website" },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://strivo.life/" },
              { "@type": "ListItem", "position": 2, "name": "Terms of Service", "item": "https://strivo.life/terms" }
            ]
          }
        })}</script>
      </Helmet>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <SiteLogo className="h-9" />
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-28 pb-24">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-8 gap-1.5 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Button>
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: March 16, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              By accessing or using Strivo ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these Terms, you may not use the Service. These Terms apply to all users, including visitors, registered users, and anyone who accesses the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Strivo is a habit-building application that helps users turn goals into daily systems. The Service includes goal tracking, system building, daily check-ins, analytics, journaling, and AI-powered coaching features. We reserve the right to modify, suspend, or discontinue any part of the Service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>You must be at least 13 years old to use Strivo. If you are under 18, you must have parental consent.</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>You must provide accurate and complete information during registration.</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>You are responsible for all activity that occurs under your account.</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>You must notify us immediately of any unauthorised use of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed text-sm mb-3">You agree not to:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-destructive mt-0.5">•</span>Use the Service for any illegal or unauthorised purpose</li>
              <li className="flex gap-2"><span className="text-destructive mt-0.5">•</span>Attempt to gain unauthorised access to any part of the Service</li>
              <li className="flex gap-2"><span className="text-destructive mt-0.5">•</span>Interfere with or disrupt the integrity or performance of the Service</li>
              <li className="flex gap-2"><span className="text-destructive mt-0.5">•</span>Reverse engineer, decompile, or attempt to extract the source code</li>
              <li className="flex gap-2"><span className="text-destructive mt-0.5">•</span>Use the Service to transmit spam, malware, or harmful content</li>
              <li className="flex gap-2"><span className="text-destructive mt-0.5">•</span>Scrape or systematically extract data from the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Subscription and Payments</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="leading-relaxed">Strivo offers a free plan and paid subscription plans. Paid plans are billed on a monthly or annual basis as selected at checkout.</p>
              <p className="leading-relaxed"><strong className="text-foreground">Free plan:</strong> Available at no cost with limitations on active goals, systems, and features as described on our Pricing page.</p>
              <p className="leading-relaxed"><strong className="text-foreground">Paid plans:</strong> Subscription fees are charged in advance. Prices are subject to change with 30 days' notice. All fees are non-refundable except as stated in our refund policy.</p>
              <p className="leading-relaxed"><strong className="text-foreground">14-day money-back guarantee:</strong> If you are unsatisfied with a paid plan within 14 days of your first payment, contact us for a full refund. This applies to first-time purchases only.</p>
              <p className="leading-relaxed"><strong className="text-foreground">Cancellation:</strong> You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing period. You will retain access to paid features until that date.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Content</h2>
            <p className="text-muted-foreground leading-relaxed text-sm mb-3">
              You retain ownership of all content you create within Strivo (goals, journal entries, habit data, etc.). By using the Service, you grant Strivo a limited, non-exclusive licence to store, process, and display your content solely as necessary to provide the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm">
              You are responsible for ensuring that any content you submit does not violate any third-party rights or applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Strivo uses AI to provide suggestions, coaching responses, and insights. AI-generated content is provided for informational purposes only and does not constitute professional medical, psychological, or therapeutic advice. Always consult a qualified professional for health-related decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              The Strivo application, including its design, branding, features, and underlying code, is owned by Strivo and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or free of harmful components. We are not responsible for the accuracy of AI-generated content or any actions you take based on it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              To the fullest extent permitted by law, Strivo shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss of profits, or loss of goodwill, arising out of or relating to your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              We reserve the right to suspend or terminate your account at any time for violations of these Terms. You may delete your account at any time via the Settings page. Upon termination, your right to use the Service ceases immediately and your data will be deleted as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              We reserve the right to modify these Terms at any time. We will provide at least 30 days' notice for material changes via email or in-app notification. Your continued use of the Service after the effective date of changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms shall be resolved through good-faith negotiation before any legal proceedings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Contact</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              If you have questions about these Terms, contact us at:<br />
              <a href="mailto:legal@strivo.life" className="text-primary hover:underline">legal@strivo.life</a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row gap-3">
          <Link href="/privacy">
            <Button variant="outline" size="sm">Privacy Policy</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
