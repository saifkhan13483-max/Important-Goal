import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Privacy Policy | Strivo</title>
        <link rel="canonical" href="https://strivo.life/privacy" />
        <meta name="description" content="Read Strivo's privacy policy to understand how we collect, use, and protect your personal data." />
      </Helmet>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <img
                src="https://res.cloudinary.com/de2wrwg6e/image/upload/v1773912025/header_logo-removebg-preview_1_dym01r.png"
                alt="Strivo"
                className="h-9 w-auto object-contain"
              />
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

        <h1 className="text-3xl md:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: March 16, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              Strivo ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our habit-building application ("Service"). We built Strivo with a privacy-first mindset — your habits, journal entries, and personal data belong to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-2">Account Information</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">When you create an account, we collect your name, email address, and a hashed password. If you sign in with Google, we receive your name, email, and profile photo from Google.</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">App Data</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">We store the goals, systems, check-ins, journal entries, and settings you create in the app. This data is associated with your account and stored securely in our database.</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">Usage Data</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">We may collect anonymised usage data (such as which features are used most) to help us improve the product. This data is aggregated and never linked back to individual users.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>To provide, operate, and maintain the Strivo Service</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>To personalise your experience and deliver AI-powered insights based on your habit data</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>To send important account notifications (e.g. password reset emails)</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>To improve our product through anonymised, aggregated analytics</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed text-sm mb-3">
              We do not sell, trade, or rent your personal information to third parties. We may share data with trusted service providers who assist us in operating our platform (such as Firebase for authentication and database storage), but they are contractually obligated to keep it confidential.
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Your journal entries, goals, and habit data are private to your account. No other user can view them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. AI Features</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Some features use AI (powered by third-party APIs) to generate suggestions, insights, or coaching responses. When you use these features, relevant portions of your habit data may be sent to the AI provider to generate a response. We do not use your data to train AI models. AI providers are bound by their own privacy policies and data processing agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              We retain your data for as long as your account is active. If you delete your account, your personal data will be permanently deleted within 30 days. Anonymised, aggregated data may be retained indefinitely.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed text-sm mb-3">Depending on your location, you may have the right to:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>Access the personal data we hold about you</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>Request correction of inaccurate data</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>Request deletion of your account and associated data</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>Object to or restrict certain types of processing</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">•</span>Data portability (export your data in a machine-readable format)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed text-sm mt-3">
              To exercise any of these rights, contact us at <a href="mailto:privacy@strivo.life" className="text-primary hover:underline">privacy@strivo.life</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              We use essential cookies to keep you logged in and maintain your session. We do not use advertising or tracking cookies. You can configure cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Security</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              We take reasonable technical and organisational measures to protect your data. All data is transmitted over HTTPS and stored with encryption at rest. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by email or via a notice in the app. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              If you have questions about this Privacy Policy, please contact us at:<br />
              <a href="mailto:privacy@strivo.life" className="text-primary hover:underline">privacy@strivo.life</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row gap-3">
          <Link href="/terms">
            <Button variant="outline" size="sm">Terms of Service</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
