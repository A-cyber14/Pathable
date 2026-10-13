import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, Store, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { setAccountIntent, setPlanIntent } from "../../utils/signupIntent";

// ---------------------------------------------------------------------------
// Shared chrome for the marketing pages: sticky header with an accessible
// mobile menu, the Get Started (individual / business) dialog, and footer.
// ---------------------------------------------------------------------------

function Brand() {
  return (
    <Link to="/" className="pl-brand" aria-label="Pathable home">
      <img src="/logo.png" alt="" width="30" height="30" />
      <span>Pathable</span>
    </Link>
  );
}

// "How It Works" lives on "/": a plain hash link there, a route link elsewhere
// (LandingPage scrolls to the hash on arrival).
function HowItWorksLink({ onClick }) {
  const { pathname } = useLocation();
  return pathname === "/"
    ? <a href="#how-it-works" onClick={onClick}>How It Works</a>
    : <Link to="/#how-it-works" onClick={onClick}>How It Works</Link>;
}

export function MarketingHeader() {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile menu: move focus in on open, close on Escape (focus back to the
  // toggle), and close if the viewport grows past the mobile breakpoint.
  useEffect(() => {
    if (!menuOpen) return undefined;
    menuRef.current?.querySelector("a, button")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { setMenuOpen(false); menuBtnRef.current?.focus(); }
    };
    const mq = window.matchMedia("(min-width: 861px)");
    const onMq = () => { if (mq.matches) setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    mq.addEventListener?.("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener?.("change", onMq);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const openGetStarted = () => { setMenuOpen(false); setDialogOpen(true); };

  return (
    <>
      <a href="#main" className="pl-skip">Skip to content</a>
      <header className={`pl-header${scrolled || menuOpen ? " is-scrolled" : ""}`}>
        <div className="pl-container pl-header__bar">
          <Brand />
          <nav className="pl-nav" aria-label="Main">
            <Link to="/explore">Explore</Link>
            <Link to="/for-businesses" aria-current={pathname === "/for-businesses" ? "page" : undefined}>For Businesses</Link>
            <HowItWorksLink />
          </nav>
          <div className="pl-header__end">
            {currentUser ? (
              <Link to="/" className="pl-btn pl-btn--dark pl-btn--sm">Open Pathable</Link>
            ) : (
              <>
                <Link to="/login" className="pl-header__login">Log In</Link>
                <button type="button" className="pl-btn pl-btn--dark pl-btn--sm" onClick={openGetStarted}>
                  Get Started
                </button>
              </>
            )}
            <button
              ref={menuBtnRef}
              type="button"
              className="pl-menu-btn"
              aria-expanded={menuOpen}
              aria-controls="pl-mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="pl-mobile-menu" className="pl-mobile-menu" ref={menuRef}>
            <nav className="pl-container" aria-label="Mobile">
              <ul>
                <li><Link to="/explore" onClick={closeMenu}>Explore</Link></li>
                <li><Link to="/for-businesses" onClick={closeMenu}>For Businesses</Link></li>
                <li><HowItWorksLink onClick={closeMenu} /></li>
                {currentUser ? (
                  <li className="pl-mobile-menu__cta">
                    <Link to="/" className="pl-btn pl-btn--dark pl-btn--block" onClick={closeMenu}>Open Pathable</Link>
                  </li>
                ) : (
                  <>
                    <li><Link to="/login" onClick={closeMenu}>Log In</Link></li>
                    <li className="pl-mobile-menu__cta">
                      <button type="button" className="pl-btn pl-btn--dark pl-btn--block" onClick={openGetStarted}>
                        Get Started
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </nav>
          </div>
        )}
      </header>

      <GetStartedDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// GetStartedDialog — native <dialog> (focus containment, Escape, inert page
// behind it). Either choice goes to sign-up; the choice is remembered so
// /account-type can highlight it after the account is created.
// ---------------------------------------------------------------------------

export function GetStartedDialog({ open, onClose }) {
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === "function") d.showModal();
      else d.setAttribute("open", "");
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  const choose = (type) => {
    setAccountIntent(type);
    setPlanIntent(null);
    onClose();
    navigate("/login?mode=signup");
  };

  return (
    <dialog
      ref={ref}
      className="pl-dialog"
      aria-labelledby="pl-gs-title"
      aria-describedby="pl-gs-sub"
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="pl-dialog__inner">
        <button type="button" className="pl-dialog__close" aria-label="Close" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
        <h2 id="pl-gs-title">How will you use Pathable?</h2>
        <p id="pl-gs-sub" className="pl-dialog__sub">Choose one to create your account. You'll confirm it after signing up.</p>
        <div className="pl-choices">
          <button type="button" className="pl-choice" onClick={() => choose("user")}>
            <span className="pl-choice__icon"><User size={22} aria-hidden="true" /></span>
            <span>
              <span className="pl-choice__title">I'm looking for accessible places</span>
              <span className="pl-choice__desc">Search, save places, and share what you find.</span>
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <button type="button" className="pl-choice" onClick={() => choose("business")}>
            <span className="pl-choice__icon"><Store size={22} aria-hidden="true" /></span>
            <span>
              <span className="pl-choice__title">I manage a business</span>
              <span className="pl-choice__desc">Claim or add your listing and keep its accessibility details current.</span>
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
        <p className="pl-dialog__foot">
          Just browsing? <Link to="/explore" onClick={onClose}>Explore without an account</Link>
        </p>
      </div>
    </dialog>
  );
}

export function MarketingFooter() {
  const { pathname } = useLocation();
  return (
    <footer className="pl-footer">
      <div className="pl-container">
        <div className="pl-footer__top">
          <div>
            <Brand />
            <p className="pl-footer__tag">Accessibility information for the places you want to go.</p>
          </div>
          <nav aria-label="Footer">
            <ul>
              <li><Link to="/explore">Explore</Link></li>
              <li><Link to="/for-businesses">For Businesses</Link></li>
              <li>{pathname === "/" ? <a href="#about">About</a> : <Link to="/#about">About</Link>}</li>
              <li><Link to="/login">Log In</Link></li>
            </ul>
          </nav>
        </div>
        <div className="pl-footer__bottom">© {new Date().getFullYear()} Pathable</div>
      </div>
    </footer>
  );
}
