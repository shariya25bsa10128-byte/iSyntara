
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Menu,
  X,
  Orbit,
  Rocket,
  Satellite,
  Telescope,
  LogOut,
  LayoutDashboard,
  UserPlus,
  LogIn,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import "./App.css";

const services = [
  {
    number: "01",
    icon: Rocket,
    title: "Internships",
    description:
      "Get hands-on experience, work on real aerospace challenges, and turn your curiosity into capability.",
    tag: "LEARN BY DOING",
  },
  {
    number: "02",
    icon: Orbit,
    title: "Career Opportunities",
    description:
      "Discover opportunities across aerospace, engineering, research, and the technologies shaping tomorrow.",
    tag: "BUILD YOUR FUTURE",
  },
  {
    number: "03",
    icon: Satellite,
    title: "Industry Connections",
    description:
      "Connect with ambitious teams, innovative organizations, and people pushing the boundaries of flight.",
    tag: "EXPAND YOUR HORIZON",
  },
];

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroProgress, setHeroProgress] = useState(0);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isStudent = user?.role === "STUDENT";
  const isEmployer = user?.role === "EMPLOYER";

  const dashboardPath = isStudent
    ? "/student/dashboard"
    : "/employer/dashboard";

  useEffect(() => {
    const updateProgress = () => {
      const hero = document.querySelector(".cinematic-hero");

      if (!hero) return;

      const distance = hero.offsetHeight - window.innerHeight;
      const progress =
        distance > 0
          ? Math.min(
              Math.max(-hero.getBoundingClientRect().top / distance, 0),
              1
            )
          : 0;

      setHeroProgress(progress);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/");
  };

  const spacecraftOpacity = Math.max(
    0,
    Math.min((heroProgress - 0.35) / 0.45, 1)
  );

  const launchOpacity = 1 - spacecraftOpacity;

  return (
    <main>
      {/* NAVIGATION */}
      <nav className="navbar">
        <a href="#home" className="brand" onClick={closeMenu}>
          <span className="brand-symbol">
            <Orbit size={25} strokeWidth={1.7} />
          </span>
          <span>
            iSyntara<span className="brand-dot">.</span>
          </span>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>

        <div className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
          <a href="#about" onClick={closeMenu}>ABOUT</a>
          <a href="#services" onClick={closeMenu}>OPPORTUNITIES</a>
          <a href="#contact" onClick={closeMenu}>CONTACT</a>

          {user ? (
            <>
              <Link
                to={dashboardPath}
                className="nav-cta"
                onClick={closeMenu}
              >
                <LayoutDashboard size={15} />
                {isStudent ? "STUDENT DASHBOARD" : "EMPLOYER DASHBOARD"}
              </Link>

              <button
                type="button"
                className="nav-logout"
                onClick={handleLogout}
              >
                LOGOUT <LogOut size={15} />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="nav-login"
                onClick={closeMenu}
              >
                <LogIn size={15} /> LOGIN
              </Link>

              <Link
                to="/register"
                className="nav-cta"
                onClick={closeMenu}
              >
                GET STARTED <UserPlus size={15} />
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* CINEMATIC HERO */}
      <section className="cinematic-hero" id="home">
        <div className="cinematic-sticky">
          <div className="cinematic-background">
            {/* Rocket launch scene */}
            <div
              className="launch-scene"
              style={{ opacity: launchOpacity }}
            >
              <div className="launch-haze" />

              <div className="launch-stars">
                {Array.from({ length: 35 }, (_, index) => (
                  <span
                    key={index}
                    style={{
                      "--star-x": `${(index * 37) % 100}%`,
                      "--star-y": `${(index * 61) % 100}%`,
                      "--star-delay": `${(index % 7) * 0.4}s`,
                    }}
                  />
                ))}
              </div>

              <div className="launch-cloud launch-cloud-one" />
              <div className="launch-cloud launch-cloud-two" />

              <div className="rocket-stage">
                <div className="rocket-aura" />

                <svg
                  className="rocket-vehicle"
                  viewBox="0 0 120 460"
                  xmlns="http://www.w3.org/2000/svg"
                  role="img"
                  aria-label="Illustrated launch vehicle"
                >
                  <defs>
                    <linearGradient id="rocketBody" x1="0" x2="1">
                      <stop offset="0%" stopColor="#9ba8b8" />
                      <stop offset="35%" stopColor="#f4f7fb" />
                      <stop offset="75%" stopColor="#dce5ef" />
                      <stop offset="100%" stopColor="#73869d" />
                    </linearGradient>

                    <linearGradient
                      id="rocketFlame"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="35%" stopColor="#55e6f2" />
                      <stop offset="75%" stopColor="#4c7dff" />
                      <stop offset="100%" stopColor="#ff8c42" />
                    </linearGradient>
                  </defs>

                  <path
                    d="M60 4 C43 25 34 62 31 112 L31 338 L89 338 L89 112 C86 62 77 25 60 4Z"
                    fill="url(#rocketBody)"
                  />

                  <path
                    d="M60 4 C43 25 34 62 31 112 L89 112 C86 62 77 25 60 4Z"
                    fill="#f4f7fb"
                  />

                  <path d="M31 275 L8 330 L31 319Z" fill="#61758b" />
                  <path d="M89 275 L112 330 L89 319Z" fill="#61758b" />

                  <rect
                    x="31"
                    y="322"
                    width="58"
                    height="20"
                    fill="#8292a5"
                  />

                  <circle
                    cx="60"
                    cy="155"
                    r="17"
                    fill="#0a1729"
                    stroke="#55e6f2"
                    strokeWidth="4"
                  />

                  <circle cx="60" cy="155" r="8" fill="#4c7dff" />

                  <path
                    d="M44 340 L76 340 L70 380 L50 380Z"
                    fill="#52657a"
                  />

                  <path
                    className="rocket-flame"
                    d="M48 370 L72 370 L88 460 L60 430 L32 460Z"
                    fill="url(#rocketFlame)"
                  />

                  <path
                    className="rocket-flame-core"
                    d="M55 370 L65 370 L72 425 L60 405 L48 425Z"
                    fill="#ffffff"
                  />
                </svg>

                <div className="launch-light" />
              </div>

              <div className="launch-ground">
                <div className="launch-ground-line" />
              </div>

              <div className="launch-caption">
                <span>01 — IGNITION</span>
                <span>THE JOURNEY BEGINS</span>
              </div>
            </div>

            {/* Spacecraft / Earth scene */}
            <div
              className="orbit-scene"
              style={{ opacity: spacecraftOpacity }}
            >
              <div className="orbit-stars">
                {Array.from({ length: 45 }, (_, index) => (
                  <span
                    key={index}
                    style={{
                      "--star-x": `${(index * 43) % 100}%`,
                      "--star-y": `${(index * 29) % 100}%`,
                      "--star-delay": `${(index % 8) * 0.35}s`,
                    }}
                  />
                ))}
              </div>

              <div className="earth">
                <div className="earth-clouds" />
                <div className="earth-atmosphere" />
              </div>

              <div className="space-orbit space-orbit-one" />
              <div className="space-orbit space-orbit-two" />

              <div className="spacecraft">
                <div className="spacecraft-body" />
                <div className="spacecraft-wing spacecraft-wing-left" />
                <div className="spacecraft-wing spacecraft-wing-right" />
                <div className="spacecraft-engine" />
                <div className="spacecraft-glow" />
              </div>

              <div className="orbit-caption">
                <span>02 — ORBIT</span>
                <span>THE NEXT FRONTIER</span>
              </div>
            </div>
          </div>

          <div className="hero-overlay" />

          <div className="hero-content cinematic-content">
            <div className="eyebrow">
              <span className="status-dot" />
              SYNTARA AEROSPACE · CAREERS & OPPORTUNITIES
            </div>

            <h1 className="cinematic-title">
              <span className="title-line">YOUR FUTURE</span>
              <span className="title-line">
                IS <span className="gradient-text">NOT</span>
              </span>
              <span className="title-line outline-text">GROUNDED.</span>
            </h1>

            <p className="hero-description">
              The next frontier needs bold minds.
              <br />
              Find your place in the future of aerospace.
            </p>

            <div className="hero-actions">
              <a href="#services" className="button button-primary">
                EXPLORE OPPORTUNITIES
                <ArrowRight size={18} />
              </a>

              <a href="#about" className="button button-secondary">
                DISCOVER OUR MISSION
              </a>
            </div>
          </div>

          <div className="cinematic-bottom">
            <span>ENGINEERING THE POSSIBLE</span>

            <div className="scene-progress">
              <span className={heroProgress < 0.5 ? "active" : ""}>01</span>

              <div className="scene-progress-track">
                <div style={{ width: `${heroProgress * 100}%` }} />
              </div>

              <span className={heroProgress >= 0.5 ? "active" : ""}>02</span>
            </div>

            <a href="#about" className="scroll-indicator">
              SCROLL TO EXPLORE <ArrowDown size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about section" id="about">
        <div className="section-label">
          <span>01</span> / OUR MISSION
        </div>

        <div className="about-layout">
          <div className="about-heading">
            <h2>
              THE FUTURE
              <br />
              DOESN'T <span className="gradient-text">WAIT.</span>
            </h2>
          </div>

          <div className="about-copy">
            <p className="about-lead">
              We believe the future belongs to those who dare to build it.
            </p>

            <p>
              iSyntara is built to connect ambitious minds with meaningful
              opportunities in aerospace and beyond. We bring together
              curiosity, talent, and the drive to make extraordinary things
              happen.
            </p>

            <a href="#services" className="text-link">
              FIND YOUR NEXT CHALLENGE <ArrowRight size={17} />
            </a>
          </div>
        </div>

        <div className="about-bottom">
          <span>THINK BEYOND LIMITS.</span>
          <span>BUILD BEYOND EXPECTATIONS.</span>
        </div>
      </section>

      {/* SERVICES */}
      <section className="services section" id="services">
        <div className="section-label">
          <span>02</span> / WHAT'S POSSIBLE
        </div>

        <div className="services-heading">
          <div>
            <h2>
              YOUR NEXT
              <br />
              <span className="gradient-text">MISSION.</span>
            </h2>
          </div>

          <p>
            Every great journey starts with an opportunity.
            <br />
            Find yours.
          </p>
        </div>

        <div className="service-grid">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <article className="service-card" key={service.number}>
                <div className="service-card-top">
                  <span className="service-number">{service.number}</span>
                  <Icon size={30} strokeWidth={1.4} />
                </div>

                <div className="service-card-content">
                  <span className="service-tag">{service.tag}</span>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>

                <a href="#contact" className="service-link">
                  EXPLORE <ArrowUpRight size={17} />
                </a>
              </article>
            );
          })}
        </div>
      </section>

      {/* GET STARTED */}
      <section className="contact section" id="contact">
        <div className="contact-glow" />

        <div className="section-label">
          <span>03</span> / THE NEXT STEP
        </div>

        <div className="contact-content">
          <div className="contact-icon">
            <Telescope size={32} strokeWidth={1.4} />
          </div>

          <h2>
            READY TO
            <br />
            <span className="gradient-text">TAKE OFF?</span>
          </h2>

          <p>
            Your ambition deserves an extraordinary destination.
            <br />
            Start exploring what's possible.
          </p>

          {user ? (
            <Link to={dashboardPath} className="button button-primary">
              OPEN MY DASHBOARD <ArrowRight size={18} />
            </Link>
          ) : (
            <Link to="/register" className="button button-primary">
              GET STARTED <ArrowRight size={18} />
            </Link>
          )}
        </div>

        <footer className="footer">
          <a href="#home" className="brand footer-brand">
            <span className="brand-symbol">
              <Orbit size={22} strokeWidth={1.7} />
            </span>
            <span>
              iSyntara<span className="brand-dot">.</span>
            </span>
          </a>

          <span>© 2026 SYNTARA AEROSPACE</span>

          <a href="#home" className="back-to-top">
            BACK TO TOP ↑
          </a>
        </footer>
      </section>
    </main>
  );
}

export default HomePage;
