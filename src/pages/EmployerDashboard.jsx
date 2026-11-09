import { useCallback, useEffect, useState } from "react";

import {
  Orbit,
  LayoutDashboard,
  Building2,
  BriefcaseBusiness,
  Users,
  LogOut,
  ExternalLink,
  Save,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  Globe,
  MapPin,
  Factory,
  FileText,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

import PostInternship from "./PostInternship";
import MyInternships from "./MyInternships";
import EmployerApplications from "./EmployerApplications";

import "./EmployerDashboard.css";

const emptyCompany = {
  name: "",
  description: "",
  website: "",
  industry: "",
  location: "",
  logoUrl: "",
};

const navigationItems = [
  {
    label: "Overview",
    path: "/employer/dashboard",
    page: "overview",
    icon: LayoutDashboard,
  },
  {
    label: "Opportunities",
    path: "/employer/internships",
    page: "internships",
    icon: BriefcaseBusiness,
  },
  {
    label: "Applications",
    path: "/employer/applications",
    page: "applications",
    icon: Users,
  },
  {
    label: "Company Profile",
    path: "/employer/profile",
    page: "profile",
    icon: Building2,
  },
];

const pageInformation = {
  overview: {
    eyebrow: "RECRUITER WORKSPACE",
    title: "Your Overview",
    description:
      "Manage your organization, discover engineering talent, and build your future workforce.",
  },

  internships: {
    eyebrow: "OPPORTUNITY MANAGEMENT",
    title: "Opportunities",
    description:
      "Create, publish, and manage career opportunities for engineering candidates.",
  },

  applications: {
    eyebrow: "CANDIDATE MANAGEMENT",
    title: "Applications",
    description:
      "Review candidate applications and manage your recruitment pipeline.",
  },

  profile: {
    eyebrow: "RECRUITER WORKSPACE",
    title: "Company Profile",
    description:
      "Build your organization's identity and help candidates understand who you are.",
  },
};

function EmployerDashboard({ page = "overview" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [company, setCompany] = useState(emptyCompany);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [statsLoading, setStatsLoading] = useState(true);

  const [overviewStats, setOverviewStats] = useState({
    opportunities: null,
    applications: null,
  });

  const [statsError, setStatsError] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentPage = pageInformation[page] ? page : "overview";
  const pageInfo = pageInformation[currentPage];

  // ==========================================
  // LOAD COMPANY PROFILE
  // ==========================================

  const loadCompany = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/employer/company");
      const profile = data.company || {};

      setCompany({
        name: profile.name || "",
        description: profile.description || "",
        website: profile.website || "",
        industry: profile.industry || "",
        location: profile.location || "",
        logoUrl: profile.logoUrl || "",
      });
    } catch (err) {
      if (err.status === 404) {
        setCompany({ ...emptyCompany });
      } else {
        setError(err.message || "Unable to load company profile.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  // ==========================================
  // LOAD OVERVIEW STATISTICS
  // ==========================================

  const loadOverviewStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");

    try {
      const [
        opportunitiesResult,
        applicationsResult,
      ] = await Promise.all([
        apiRequest("/employer/opportunities"),
        apiRequest("/employer/applications"),
      ]);

      const opportunities = Array.isArray(
        opportunitiesResult.opportunities
      )
        ? opportunitiesResult.opportunities
        : Array.isArray(opportunitiesResult.internships)
          ? opportunitiesResult.internships
          : [];

      const applications = Array.isArray(
        applicationsResult.applications
      )
        ? applicationsResult.applications
        : [];

      const applicationCount = Number.isFinite(
        applicationsResult.total
      )
        ? applicationsResult.total
        : applications.length;

      setOverviewStats({
        opportunities: opportunities.length,
        applications: applicationCount,
      });
    } catch (err) {
      console.error(
        "Unable to load employer overview statistics:",
        err
      );

      setStatsError(
        err.message || "Unable to load overview statistics."
      );

      setOverviewStats({
        opportunities: null,
        applications: null,
      });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverviewStats();
  }, [loadOverviewStats]);

  // ==========================================
  // COMPANY FORM INPUTS
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setCompany((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // ==========================================
  // SAVE COMPANY PROFILE
  // ==========================================

  const handleSave = async (event) => {
    event.preventDefault();

    if (!company.name.trim()) {
      setError("Please enter your company name.");
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest("/employer/company", {
        method: "PUT",
        body: JSON.stringify({
          name: company.name.trim(),
          description: company.description.trim(),
          website: company.website.trim(),
          industry: company.industry.trim(),
          location: company.location.trim(),
          logoUrl: company.logoUrl.trim(),
        }),
      });

      const profile = data.company || company;

      setCompany({
        name: profile.name || "",
        description: profile.description || "",
        website: profile.website || "",
        industry: profile.industry || "",
        location: profile.location || "",
        logoUrl: profile.logoUrl || "",
      });

      setSuccess("Company profile saved successfully.");
    } catch (err) {
      setError(
        err.message || "Unable to save company profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // ==========================================
  // COMPANY INITIALS
  // ==========================================

  const initials = (company.name || user?.name || "IS")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="employer-dashboard">

      {/* SIDEBAR */}

      <aside className="employer-sidebar">

        <NavLink
          to="/employer/dashboard"
          className="employer-brand"
        >
          <div className="employer-brand-icon">
            <Orbit size={23} />
          </div>

          <div>
            <span className="employer-brand-name">
              iSYNTARA
            </span>

            <span className="employer-brand-caption">
              RECRUITER PORTAL
            </span>
          </div>
        </NavLink>

        <div className="employer-sidebar-label">
          WORKSPACE
        </div>

        <nav className="employer-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.page}
                to={item.path}
                end
                className={({ isActive }) =>
                  `employer-nav-item ${
                    isActive ? "active" : ""
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="employer-sidebar-bottom">

          <div className="employer-sidebar-label">
            ACCOUNT
          </div>

          <button
            className="employer-nav-item"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>

          <div className="employer-sidebar-user">

            <div className="employer-user-avatar">
              {(user?.name || "R")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="employer-user-details">
              <strong>
                {user?.name || "Recruiter"}
              </strong>

              <span>Recruiter account</span>
            </div>

          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="employer-main">

        <header className="employer-topbar">

          <div className="employer-breadcrumb">
            Workspace <span>/</span> {pageInfo.title}
          </div>

          <div className="employer-topbar-right">
            <span className="employer-status-dot" />
            <span>Recruiter account</span>
          </div>

        </header>

        <div className="employer-content">

          {/* PAGE HEADING */}

          <section className="employer-welcome">

            <div>

              <div className="employer-eyebrow">
                <span />
                {pageInfo.eyebrow}
              </div>

              <h1>
                {currentPage === "overview" ? (
                  <>
                    Build your
                    <br />
                    <span>future workforce.</span>
                  </>
                ) : (
                  pageInfo.title
                )}
              </h1>

              <p>{pageInfo.description}</p>

            </div>

            <div className="employer-welcome-visual">

              <div className="employer-visual-orbit orbit-one" />
              <div className="employer-visual-orbit orbit-two" />

              <div className="employer-visual-core">
                <Orbit size={42} />
              </div>

              <span className="employer-visual-label">
                CONNECT / CREATE / GROW
              </span>

            </div>

          </section>

          {/* OVERVIEW PAGE */}

          {currentPage === "overview" && (
            <>

              <section className="employer-stat-grid">

                {/* COMPANY PROFILE */}

                <div className="employer-stat-card">

                  <div className="employer-stat-icon">
                    <Building2 size={19} />
                  </div>

                  <span className="employer-stat-label">
                    COMPANY PROFILE
                  </span>

                  <strong>
                    {company.name ? "Created" : "Pending"}
                  </strong>

                  <small>
                    {company.name
                      ? "Your company is registered"
                      : "Complete your company details"}
                  </small>

                </div>

                {/* OPPORTUNITIES */}

                <div className="employer-stat-card">

                  <div className="employer-stat-icon">
                    <BriefcaseBusiness size={19} />
                  </div>

                  <span className="employer-stat-label">
                    OPPORTUNITIES
                  </span>

                  <strong>
                    {statsLoading
                      ? "…"
                      : overviewStats.opportunities ?? "—"}
                  </strong>

                  <small>
                    {statsError
                      ? "Unable to load opportunities"
                      : "Manage your opportunity listings"}
                  </small>

                </div>

                {/* APPLICATIONS */}

                <div className="employer-stat-card">

                  <div className="employer-stat-icon">
                    <Users size={19} />
                  </div>

                  <span className="employer-stat-label">
                    APPLICATIONS
                  </span>

                  <strong>
                    {statsLoading
                      ? "…"
                      : overviewStats.applications ?? "—"}
                  </strong>

                  <small>
                    {statsError
                      ? "Unable to load applications"
                      : "Review candidate applications"}
                  </small>

                </div>

              </section>

              {/* QUICK ACCESS */}

              <section className="dashboard-panel">

                <div className="panel-heading">

                  <div>
                    <span className="panel-eyebrow">
                      QUICK ACCESS
                    </span>

                    <h2>
                      Your Recruitment Workspace
                    </h2>

                    <p>
                      Continue managing your organization
                      and opportunities.
                    </p>
                  </div>

                </div>

                <div className="student-quick-links">

                  <NavLink to="/employer/internships">

                    <BriefcaseBusiness size={20} />

                    <span>
                      <strong>
                        Manage Opportunities
                      </strong>

                      <small>
                        Publish and manage opportunities
                      </small>
                    </span>

                    <ExternalLink size={16} />

                  </NavLink>

                  <NavLink to="/employer/applications">

                    <Users size={20} />

                    <span>
                      <strong>
                        Review Applications
                      </strong>

                      <small>
                        View candidates who applied
                      </small>
                    </span>

                    <ExternalLink size={16} />

                  </NavLink>

                  <NavLink to="/employer/profile">

                    <Building2 size={20} />

                    <span>
                      <strong>Company Profile</strong>

                      <small>
                        Update your organization details
                      </small>
                    </span>

                    <ExternalLink size={16} />

                  </NavLink>

                </div>

              </section>

            </>
          )}

          {/* OPPORTUNITIES PAGE */}

          {currentPage === "internships" && (
            <>
              <MyInternships />
              <PostInternship />
            </>
          )}

          {/* APPLICATIONS PAGE */}

          {currentPage === "applications" && (
            <EmployerApplications />
          )}

          {/* COMPANY PROFILE PAGE */}

          {currentPage === "profile" && (

            <section
              className="employer-profile-section"
              id="company-profile"
            >

              <div className="employer-section-heading">

                <div>

                  <div className="employer-eyebrow">
                    <span />
                    PROFILE INFORMATION
                  </div>

                  <h2>Organization details</h2>

                  <p>
                    Keep your company information accurate
                    and up to date. This is how candidates
                    discover your organization.
                  </p>

                </div>

                <div className="employer-profile-badge">
                  <Building2 size={16} />
                  COMPANY
                </div>

              </div>

              {error && (
                <div className="employer-alert error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="employer-alert success">
                  <CheckCircle2 size={18} />
                  <span>{success}</span>
                </div>
              )}

              {loading ? (

                <div className="employer-loading">
                  <LoaderCircle
                    className="spin"
                    size={25}
                  />

                  <span>
                    Loading company profile...
                  </span>
                </div>

              ) : (

                <form
                  className="employer-profile-card"
                  onSubmit={handleSave}
                >

                  {/* COMPANY PREVIEW */}

                  <div className="employer-profile-preview">

                    <div className="employer-company-avatar">

                      {company.logoUrl ? (

                        <img
                          src={company.logoUrl}
                          alt="Company logo"
                          onError={(event) => {
                            event.currentTarget.style.display =
                              "none";
                          }}
                        />

                      ) : (
                        initials
                      )}

                    </div>

                    <div>

                      <h3>
                        {company.name || "Your company name"}
                      </h3>

                      <p>
                        {company.industry ||
                          "Industry not specified"}

                        {company.location
                          ? ` · ${company.location}`
                          : ""}
                      </p>

                    </div>

                    {company.website && (
                      <a
                        className="employer-website-link"
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visit website
                        <ExternalLink size={14} />
                      </a>
                    )}

                  </div>

                  <div className="employer-form-divider" />

                  {/* COMPANY FORM */}

                  <div className="employer-form-grid">

                    <label className="employer-field">

                      <span>
                        Company name <b>*</b>
                      </span>

                      <div className="employer-input-wrap">

                        <Building2 size={17} />

                        <input
                          name="name"
                          value={company.name}
                          onChange={handleChange}
                          placeholder="e.g. Syntara Aerospace"
                          required
                        />

                      </div>

                    </label>

                    <label className="employer-field">

                      <span>Industry</span>

                      <div className="employer-input-wrap">

                        <Factory size={17} />

                        <input
                          name="industry"
                          value={company.industry}
                          onChange={handleChange}
                          placeholder="e.g. Aerospace & Defence"
                        />

                      </div>

                    </label>

                    <label className="employer-field">

                      <span>Company website</span>

                      <div className="employer-input-wrap">

                        <Globe size={17} />

                        <input
                          name="website"
                          type="url"
                          value={company.website}
                          onChange={handleChange}
                          placeholder="https://example.com"
                        />

                      </div>

                    </label>

                    <label className="employer-field">

                      <span>Location</span>

                      <div className="employer-input-wrap">

                        <MapPin size={17} />

                        <input
                          name="location"
                          value={company.location}
                          onChange={handleChange}
                          placeholder="e.g. Bengaluru, India"
                        />

                      </div>

                    </label>

                    <label className="employer-field employer-field-full">

                      <span>Company logo URL</span>

                      <div className="employer-input-wrap">

                        <Globe size={17} />

                        <input
                          name="logoUrl"
                          type="url"
                          value={company.logoUrl}
                          onChange={handleChange}
                          placeholder="https://example.com/logo.png"
                        />

                      </div>

                      <small>
                        Paste a publicly accessible image URL.
                      </small>

                    </label>

                    <label className="employer-field employer-field-full">

                      <span>About the company</span>

                      <div className="employer-textarea-wrap">

                        <FileText size={17} />

                        <textarea
                          name="description"
                          value={company.description}
                          onChange={handleChange}
                          placeholder="Tell candidates about your organization, its mission, and the work your teams do..."
                          rows={5}
                        />

                      </div>

                    </label>

                  </div>

                  {/* SAVE BUTTON */}

                  <div className="employer-form-footer">

                    <p>
                      <span>*</span> Required field
                    </p>

                    <button
                      className="employer-save-button"
                      type="submit"
                      disabled={saving}
                    >

                      {saving ? (

                        <>
                          <LoaderCircle
                            className="spin"
                            size={17}
                          />

                          Saving...
                        </>

                      ) : (

                        <>
                          <Save size={17} />
                          Save company profile
                        </>

                      )}

                    </button>

                  </div>

                </form>

              )}

            </section>

          )}

          {/* FOOTER */}

          <footer className="employer-footer">

            <span>iSYNTARA</span>

            <span>
              Connecting engineering talent with the future.
            </span>

          </footer>

        </div>

      </main>

    </div>
  );
}

export default EmployerDashboard;