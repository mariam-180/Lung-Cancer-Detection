import { Links, useLocation } from "react-router-dom";
import Style from './Footer.module.css';
import { Link } from "react-router-dom";

export default function Footer() {
  const location = useLocation();

  return (
    <footer className={Style.footer}>

      {/* glow line top */}
      <div className={Style.glowLine}></div>

      <div className={Style.inner}>

        {/* ── Brand ── */}
        <div className={Style.brand}>
          <div className={Style.brandLogo}>
            <i className="fa-solid fa-lungs"></i>
          </div>
          <div>
            <p className={`${Style.brandName} pb-4`}>Lung<span className={Style.brandAccent}>Care</span></p>
            <p className={Style.brandTagline}>AI Detection Platform</p>
          </div>
          <p className={Style.brandDesc}>
            Empowering doctors with AI-driven lung cancer detection. Fast, accurate, and clinically validated.
          </p>
          <div className={Style.socials}>
            <a href="#" className={Style.socialBtn} title="Facebook">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="#" className={Style.socialBtn} title="X">
              <i className="fab fa-x-twitter"></i>
            </a>
            <a href="#" className={Style.socialBtn} title="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="#" className={Style.socialBtn} title="WhatsApp">
              <i className="fab fa-whatsapp"></i>
            </a>
          </div>
        </div>
        
        {/* ── Links ── */}
        <div className={Style.linksCol}>
          <p className={Style.colTitle}>Platform</p>
          <Link to="/" className={Style.footerLink}>Home</Link>
          <Link to="/login" className={Style.footerLink}>Login</Link>
        </div>

        <div className={Style.linksCol}>
          <p className={Style.colTitle}>Resources</p>
          <a href="#" className={Style.footerLink}>Documentation</a>
          <a href="#" className={Style.footerLink}>Research Papers</a>
          <a href="#" className={Style.footerLink}>Privacy Policy</a>
          <a href="#" className={Style.footerLink}>Terms of Use</a>
        </div>

        {/* ── Newsletter ── */}
        <div className={Style.newsletter}>
          <p className={Style.colTitle}>Stay Updated</p>
          <p className={Style.newsletterDesc}>
            Get the latest health tips and AI detection updates delivered to your inbox.
          </p>
          <div className={Style.inputWrap}>
            <i className={`fa-solid fa-envelope ${Style.inputIcon}`}></i>
            <input
              type="email"
              placeholder="Enter your email"
              className={Style.emailInput}
            />
          </div>
          <button className={Style.subscribeBtn}>
            <i className="fa-solid fa-paper-plane"></i> Subscribe
          </button>
          <p className={Style.privacyNote}>
            <i className="fa-solid fa-lock"></i> No spam. Unsubscribe anytime.
          </p>
        </div>

      </div>

      {/* ── Bottom Bar ── */}
      <div className={Style.bottomBar}>
        <p className={Style.copyright}>
          © 2026 LungCare AI. All rights reserved.
        </p>
        <div className={Style.bottomLinks}>
          <a href="#" className={Style.bottomLink}>Privacy</a>
          <span className={Style.bottomDot}></span>
          <a href="#" className={Style.bottomLink}>Terms</a>
          <span className={Style.bottomDot}></span>
          <a href="#" className={Style.bottomLink}>Cookies</a>
        </div>
      </div>

    </footer>
  );
}