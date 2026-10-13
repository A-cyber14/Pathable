import { useEffect, useId, useState } from "react";
import {
  Check, ChevronDown, Info, Eye, ShieldCheck, MessageSquareText, Store, ListChecks,
  Clock, Images, LayoutDashboard, BadgeCheck, CircleCheck,
} from "lucide-react";
import { PLANS } from "../../constants/plans";
import { BUSINESS_ACCESSIBILITY_FEATURES } from "../../constants/accessibility";
import { MarketingHeader, MarketingFooter } from "./MarketingChrome";
import { useBusinessEntry } from "./businessEntry";
import { useReveal } from "./useReveal";
import "./landing.css";

// ---------------------------------------------------------------------------
// BusinessLandingPage
// Route: /for-businesses (public)
// Explains business listings before onboarding. Pricing renders straight
// from constants/plans.js — the same source PlanSelectionPage and the
// checkout review step use — so this page can't drift from checkout.
// ---------------------------------------------------------------------------

const FREE_PLAN = PLANS.find((p) => p.priceValue === 0);
const PAID_PLANS = PLANS.filter((p) => p.priceValue > 0);
const priceText = (p) => `${p.price}${p.cadence}`;

// Fixed facts enforced by the backend (services/billing.py), restated for
// visitors. Keep in sync if those limits change.
const FREEMIUM_PHOTO_LIMIT = 3;
const BETA_BUSINESS_CAP = 100;

// Profile completion uses these four equal sections (routers/dashboard.py).
const COMPLETION_SECTIONS = [
  { label: "Business information", done: true },
  { label: "Hours",                done: true },
  { label: "Accessibility details", done: true },
  { label: "Photos",               done: false },
];

function DashboardPreview() {
  const done = COMPLETION_SECTIONS.filter((s) => s.done).length;
  const pct = Math.round((done / COMPLETION_SECTIONS.length) * 100);
  return (
    <figure className="pl-demo" aria-label="Illustrative preview of the business dashboard">
      <div className="pl-demo__frame">
        <div className="pl-demo__chrome" aria-hidden="true">
          <div className="pl-demo__dots"><span /><span /><span /></div>
          <span className="pl-demo__label">Illustrative preview</span>
        </div>
        <div style={{ padding: "26px 24px" }}>
          <div className="pl-score__label">Your listing</div>
          <div className="pl-details__name" style={{ marginTop: 6 }}>Sample Café</div>
          <div className="pl-meter__head" style={{ marginTop: 22 }}>
            <span className="pl-meter__name">Profile completion</span>
            <span className="pl-meter__pts">{pct}%</span>
          </div>
          <div className="pl-meter__bar" aria-hidden="true">
            <div className="pl-meter__fill" style={{ "--v": pct / 100, backgroundColor: "#2563eb" }} />
          </div>
          <ul className="pl-rows" style={{ marginTop: 18 }}>
            {COMPLETION_SECTIONS.map((s) => (
              <li className="pl-row" key={s.label}>
                <span className="pl-row__label">{s.label}</span>
                {s.done
                  ? <span className="pl-status pl-status--yes"><CircleCheck size={15} aria-hidden="true" />Complete</span>
                  : <span className="pl-status pl-status--unk">To do</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="pl-demo__note">Example listing — not a real business.</p>
    </figure>
  );
}

const STEPS = [
  { title: "Create an account",        body: "Sign up with email or Google, then choose Business Account." },
  { title: "Find or add your business", body: "Search Pathable and claim your listing, or add your business with its name, address, and category if it isn't listed yet." },
  { title: "Choose a plan",            body: "Start on Freemium for free, or choose Beta or Premium. You can change plans later." },
  { title: "Complete your profile",    body: "Add business information, hours, accessibility details, and photos." },
  { title: "Review and go live",       body: "Freemium listings go live right away. Paid plans continue to Stripe checkout and activate once payment is confirmed." },
  { title: "Take a quick tour",        body: "A short guided tour shows you around your dashboard." },
];

const CAPABILITIES = [
  { icon: Store,           title: "Business profile",   body: "Name, category, description, phone, website, social links, and a contact email you choose whether to show publicly." },
  { icon: ListChecks,      title: "Accessibility information", body: `${BUSINESS_ACCESSIBILITY_FEATURES.length} features, each answered Yes, No, or Unsure — or marked not applicable — with optional notes.` },
  { icon: Clock,           title: "Hours",              body: "Weekly hours, including closed days and split hours." },
  { icon: Images,          title: "Photos and videos",  body: `Show the entrance, restroom, parking, and more. Freemium includes up to ${FREEMIUM_PHOTO_LIMIT} photos; Beta and Premium are unlimited.` },
  { icon: LayoutDashboard, title: "Business dashboard", body: "Track profile completion, read and respond to reviews, and see which accessibility features Pathable users say matter most." },
  { icon: BadgeCheck,      title: "Verification",       body: "Listings Pathable has reviewed show a Pathable Verified label. Others show Community Submitted." },
];

function Faq({ items }) {
  const [open, setOpen] = useState(null);
  const base = useId();
  return (
    <div className="pl-faq">
      {items.map(({ q, a }, i) => {
        const isOpen = open === i;
        const btnId = `${base}-q${i}`;
        const panelId = `${base}-a${i}`;
        return (
          <div className="pl-faq__item" key={q}>
            <h3 className="pl-faq__q">
              <button
                type="button"
                id={btnId}
                className="pl-faq__btn"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                {q}
                <ChevronDown size={20} aria-hidden="true" />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={btnId} className="pl-faq__a" hidden={!isOpen}>
              {a}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const FAQ = [
  {
    q: "How do I list my business?",
    a: <p>Create a Pathable account and choose Business Account. Search for your business — if it's already on Pathable and no one manages it yet, claim it. If it isn't listed, add it with its name, address, and category. Then choose a plan and complete your profile.</p>,
  },
  {
    q: "Is listing my business free?",
    a: <p>Yes. The {FREE_PLAN.name} plan is free and includes: {FREE_PLAN.features.join(", ").toLowerCase()}. {PAID_PLANS.map((p) => `${p.name} (${priceText(p)})`).join(" and ")} are optional paid plans.</p>,
  },
  {
    q: "How is accessibility information updated?",
    a: (
      <>
        <p>You can edit your accessibility details from your dashboard at any time.</p>
        <p>Community members can also report what they noticed. A report fills in a feature only if it hasn't been reported yet. Reports that disagree with existing information are recorded as conflicts instead of replacing it.</p>
      </>
    ),
  },
  {
    q: "How does verification work?",
    a: <p>A listing shows "Pathable Verified" when Pathable has reviewed its accessibility information; otherwise it shows "Community Submitted." Claiming or managing a listing doesn't mark it as verified, and there isn't currently a way to request verification from the app.</p>,
  },
  {
    q: "Can I manage my business information myself?",
    a: <p>Yes. From your business dashboard you can update your business details, hours, accessibility information, and photos, respond to reviews, and change your plan.</p>,
  },
  {
    q: "How do paid plans work?",
    a: (
      <>
        <p>{PAID_PLANS.map((p) => `${p.name} is ${p.price} per month`).join(" and ")}, billed monthly through Stripe. A paid plan becomes active once Stripe confirms your payment.</p>
        <p>Beta is limited to the first {BETA_BUSINESS_CAP} businesses that choose it. You can change your plan or manage billing from your dashboard.</p>
      </>
    ),
  },
];

function IndividualAccountNote() {
  return (
    <p className="pl-note" role="note">
      <Info size={18} aria-hidden="true" />
      <span>You're signed in with an individual account. Business listings are managed from a separate business account — sign out and create one to list your business.</span>
    </p>
  );
}

export default function BusinessLandingPage() {
  const { start, blocked, isBusiness } = useBusinessEntry();
  useReveal();

  useEffect(() => {
    const prev = document.title;
    document.title = "Pathable for Businesses";
    return () => { document.title = prev; };
  }, []);

  const primaryLabel = isBusiness ? "Go to Your Dashboard" : "List Your Business";

  return (
    <div className="pl-root">
      <MarketingHeader />

      <main id="main" tabIndex={-1}>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="pl-hero" aria-labelledby="biz-hero-title">
          <div className="pl-container pl-hero__grid">
            <div>
              <p className="pl-eyebrow">Pathable for Businesses</p>
              <h1 id="biz-hero-title" className="pl-display">Make your business more accessible to everyone.</h1>
              <p className="pl-lead">
                Showcase your accessibility features, manage your business information, and help customers
                know what to expect before visiting.
              </p>
              {blocked ? <IndividualAccountNote /> : (
                <div className="pl-actions">
                  <button type="button" className="pl-btn pl-btn--primary" onClick={() => start()}>{primaryLabel}</button>
                  <a href="#pricing" className="pl-btn pl-btn--ghost">See Pricing</a>
                </div>
              )}
              <ul className="pl-hero__meta">
                <li><Check size={16} aria-hidden="true" />Free plan available</li>
                <li><Check size={16} aria-hidden="true" />Update your details anytime</li>
              </ul>
            </div>
            <DashboardPreview />
          </div>
        </section>

        {/* ── Why list ─────────────────────────────────────────────────── */}
        <section className="pl-section pl-section--alt" aria-labelledby="why-title">
          <div className="pl-container">
            <div className="pl-section-head pl-reveal">
              <p className="pl-eyebrow">Why list on Pathable</p>
              <h2 id="why-title" className="pl-h2">Answer accessibility questions before anyone has to ask.</h2>
            </div>
            <div className="pl-benefits">
              <div className="pl-benefit pl-reveal">
                <Eye size={28} strokeWidth={1.75} aria-hidden="true" />
                <h3 className="pl-h3">Show what to expect</h3>
                <p>Describe your entrance, parking, restrooms, and more, so visitors can plan ahead.</p>
              </div>
              <div className="pl-benefit pl-reveal">
                <ShieldCheck size={28} strokeWidth={1.75} aria-hidden="true" />
                <h3 className="pl-h3">Keep it accurate</h3>
                <p>Add details directly as the owner, and update them whenever something changes.</p>
              </div>
              <div className="pl-benefit pl-reveal">
                <MessageSquareText size={28} strokeWidth={1.75} aria-hidden="true" />
                <h3 className="pl-h3">Hear from visitors</h3>
                <p>Read community reviews of your business and respond directly from your dashboard.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="pl-section" aria-labelledby="biz-hiw-title">
          <div className="pl-container">
            <div className="pl-section-head pl-reveal">
              <p className="pl-eyebrow">How it works</p>
              <h2 id="biz-hiw-title" className="pl-h2">From sign-up to a live listing.</h2>
            </div>
            <ol className="pl-timeline pl-reveal">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="pl-timeline__num" aria-hidden="true">{i + 1}</span>
                  <div>
                    <h3><span className="pl-sr-only">Step {i + 1}: </span>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section className="pl-section pl-section--alt" aria-labelledby="biz-features-title">
          <div className="pl-container">
            <div className="pl-section-head pl-reveal">
              <p className="pl-eyebrow">Business features</p>
              <h2 id="biz-features-title" className="pl-h2">Everything your listing needs, in one place.</h2>
            </div>
            <ul className="pl-capabilities pl-reveal">
              {CAPABILITIES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="pl-capability">
                  <Icon size={26} strokeWidth={1.75} aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────── */}
        <section id="pricing" className="pl-section" aria-labelledby="pricing-title">
          <div className="pl-container">
            <div className="pl-section-head pl-section-head--center pl-reveal">
              <p className="pl-eyebrow">Pricing</p>
              <h2 id="pricing-title" className="pl-h2">Start free. Upgrade when you're ready.</h2>
            </div>
            {blocked && <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}><IndividualAccountNote /></div>}
            <ul className="pl-pricing pl-reveal">
              {PLANS.map((plan) => {
                const free = plan.priceValue === 0;
                const badge = plan.recommended ? "Recommended" : plan.badge;
                return (
                  <li key={plan.id} className={`pl-plan${plan.recommended ? " pl-plan--featured" : ""}`}>
                    {badge && <span className={`pl-plan__badge${plan.recommended ? "" : " pl-plan__badge--muted"}`}>{badge}</span>}
                    <h3 id={`plan-${plan.id}`} className="pl-plan__name">{plan.name}</h3>
                    <p className="pl-plan__kind">{free ? "Free plan" : "Paid plan"}</p>
                    <p className="pl-plan__price">
                      <span className="pl-plan__amount">{plan.price}</span>
                      {plan.cadence && <span className="pl-plan__cadence">{plan.cadence}</span>}
                    </p>
                    <p className="pl-plan__fine">
                      {free ? "No payment required" : plan.id === "beta" ? `Billed monthly · first ${BETA_BUSINESS_CAP} businesses` : "Billed monthly through Stripe"}
                    </p>
                    <ul aria-label={`${plan.name} includes`}>
                      {plan.features.map((f) => (
                        <li key={f}><Check size={16} aria-hidden="true" />{f}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className={`pl-btn pl-btn--block ${plan.recommended ? "pl-btn--dark" : "pl-btn--ghost"}`}
                      onClick={() => start(plan.id)}
                      disabled={blocked}
                      aria-describedby={`plan-${plan.id}`}
                    >
                      {isBusiness ? "Manage Plan" : plan.cta}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="pl-pricing-notes pl-reveal" style={{ marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
              <p className="pl-small">
                Choosing a plan doesn't charge you on this page. You'll confirm it during setup after you find or add
                your business, and paid plans activate only after Stripe confirms payment.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="pl-section pl-section--alt" aria-labelledby="faq-title">
          <div className="pl-container">
            <div className="pl-section-head pl-reveal">
              <p className="pl-eyebrow">FAQ</p>
              <h2 id="faq-title" className="pl-h2">Questions, answered.</h2>
            </div>
            <Faq items={FAQ} />
          </div>
        </section>

        {/* ── Final call to action ─────────────────────────────────────── */}
        <section className="pl-section pl-on-dark pl-final" aria-labelledby="biz-final-title">
          <div className="pl-container pl-reveal">
            <h2 id="biz-final-title" className="pl-h2" style={{ maxWidth: 820, margin: "0 auto" }}>
              Help customers discover your business with confidence.
            </h2>
            {!blocked && (
              <div className="pl-actions">
                <button type="button" className="pl-btn pl-btn--light" onClick={() => start()}>
                  {isBusiness ? "Go to Your Dashboard" : "Get Started"}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
