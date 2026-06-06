import React, { useState, useEffect } from 'react';
import Style from './Navbar.module.css';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const location = useLocation();

  const isDashboard =
    location.pathname !== '/login' &&
    location.pathname !== '/register' &&
    location.pathname !== '/';

  const isDoctor = user?.role === 'Doctor';
  const displayName = user?.fullName || user?.email || 'User';

  return (
    <nav className={`${Style.navbar} ${scrolled ? Style.scrolled : ''}`}>
      <div className={Style.glowLine}></div>

      <div className={Style.inner}>
        {/* ── Logo ── */}
        <div className={Style.logo}>
          <div className={Style.logoIcon}>
            <i className="fa-solid fa-lungs"></i>
          </div>
          <div className={Style.logoText}>
            <span className={Style.logoMain}>
              Lung<span className={Style.logoAccent}>Care</span>
            </span>
            <span className={Style.logoSub}>AI Detection Platform</span>
          </div>
        </div>

        {/* ── Center Links ── */}
        {isDashboard && isDoctor && (
          <ul className={Style.navLinks}>
            <li>
              <NavLink
                to="/main"
                className={({ isActive }) =>
                  `${Style.link} ${isActive ? Style.active : ''}`
                }
              >
                <i className="fa-solid fa-house"></i>
                <span>Home</span>
                <div className={Style.linkGlow}></div>
              </NavLink>
            </li>
          </ul>
        )}

        {/* ── Right Side ── */}
        <div className={Style.right}>
          {location.pathname === '/' && (
            <div className={Style.welcomeBadge}>
              <span className={Style.badgePulse}></span>
              <i className="fa-solid fa-circle-check"></i>
              <span>AI Online</span>
            </div>
          )}

          {isDashboard && (
            <>
              {isDoctor ? (
                <NavLink to="/doctorprofile" className={Style.userPill}>
                  <div className={Style.userAvatar}>
                    <i className="fa-solid fa-user-doctor"></i>
                  </div>
                  <span className={Style.userName}>{displayName}</span>
                  <i
                    className="fa-solid fa-chevron-down"
                    style={{ fontSize: '0.6rem', opacity: 0.5 }}
                  ></i>
                </NavLink>
              ) : (
                <div className={Style.userPill}>
                  <div className={Style.userAvatar}>
                    <i className="fa-solid fa-user-shield"></i>
                  </div>
                  <span className={Style.userName}>{displayName}</span>
                  <i
                    className="fa-solid fa-chevron-down"
                    style={{ fontSize: '0.6rem', opacity: 0.5 }}
                  ></i>
                </div>
              )}

              <NavLink
                to="/login"
                className={Style.logoutBtn}
                onClick={logout}
              >
                <i className="fa-solid fa-right-from-bracket"></i>
              </NavLink>
            </>
          )}

          {location.pathname === '/login' && (
            <NavLink to="/login" className={Style.authBtn}>
              <i className="fa-solid fa-right-to-bracket"></i>
              <span>Login</span>
            </NavLink>
          )}

          {location.pathname === '/register' && (
            <NavLink to="/login" className={Style.authBtn}>
              <i className="fa-solid fa-user-plus"></i>
              <span>login</span>
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}