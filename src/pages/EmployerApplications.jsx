import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users, Search, RefreshCw, FileText, Download, MapPin, Clock3,
  CheckCircle2, AlertCircle, LoaderCircle, GraduationCap,
  BriefcaseBusiness, Eye, X, Building2, CalendarDays, Filter,
  Laptop, Mail, Globe, UserRound, History, GitCompareArrows
} from "lucide-react";
import { apiRequest, API_URL } from "../services/api";
import "./EmployerApplications.css";

const STATUS = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn"
};

const CATEGORIES = {
  INTERNSHIP: "Internship",
  FULL_TIME_JOB: "Full-time Job",
  PART_TIME_JOB: "Part-time Job",
  FREELANCE: "Freelance",
  CONTRACT: "Contract",
  RESEARCH: "Research",
  TRAINING: "Training"
};

const NEXT_STATUSES = [
  "REVIEWED", "SHORTLISTED", "INTERVIEW", "ACCEPTED", "REJECTED"
];

const date = value => {
  if (!value) return "Not provided";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "Not provided"
    : d.toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
      });
};

const dateTime = value => {
  if (!value) return "Date unavailable";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "Date unavailable"
    : d.toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "numeric", minute: "2-digit"
      });
};

const profileDate = value => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

const opportunityOf = app => app?.opportunity || app?.internship || {};
const profileOf = app => app?.user?.studentProfile || {};
const statusClass = status => (status || "pending").toLowerCase();

const skillsOf = profile => {
  const skills = profile?.skills;
  if (Array.isArray(skills)) return skills.filter(Boolean);
  if (typeof skills === "string")
    return skills.split(",").map(s => s.trim()).filter(Boolean);
  return [];
};

const experienceOf = profile => {
  const value = profile?.workExperience;
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed :
        parsed && typeof parsed === "object" ? [parsed] :
        value.trim() ? [{ description: value }] : [];
    } catch {
      return value.trim() ? [{ description: value }] : [];
    }
  }
  return [];
};

const projectsOf = profile =>
  Array.isArray(profile?.projects) ? profile.projects : [];

const certificationsOf = profile =>
  Array.isArray(profile?.certifications) ? profile.certifications : [];

const safeUrl = value => {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`
    );
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const historyOf = app => {
  if (Array.isArray(app?.statusHistory) && app.statusHistory.length)
    return app.statusHistory;

  return [{
    id: `legacy-${app.id}`,
    fromStatus: null,
    toStatus: app.status || "PENDING",
    changedByRole: "SYSTEM",
    note: "Application originally submitted.",
    createdAt: app.appliedAt
  }];
};

const display = value => value || "Not provided";

function SectionTitle({ icon: Icon, children, count }) {
  return (
    <div className="candidate-profile-section-title">
      <Icon size={19} />
      <h3>{children}</h3>
      {count !== undefined && (
        <span className="candidate-profile-section-count">{count}</span>
      )}
    </div>
  );
}

function EmployerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [opportunityFilter, setOpportunityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [updatingId, setUpdatingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [statusNotes, setStatusNotes] = useState({});

  const [coverApplication, setCoverApplication] = useState(null);
  const [profileApplication, setProfileApplication] = useState(null);

  const [comparisonIds, setComparisonIds] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  // LOAD APPLICATIONS
  const loadApplications = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/employer/applications");
      const records = data.applications || [];
      setApplications(records);

      setCoverApplication(old =>
        old ? records.find(a => a.id === old.id) || old : null
      );

      setProfileApplication(old =>
        old ? records.find(a => a.id === old.id) || old : null
      );
    } catch (err) {
      setError(err.message || "Unable to load applications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // OPPORTUNITY FILTER OPTIONS
  const opportunityOptions = useMemo(() => {
    const map = new Map();
    applications.forEach(app => {
      const opportunity = opportunityOf(app);
      if (opportunity.id)
        map.set(opportunity.id, {
          id: opportunity.id,
          title: opportunity.title || "Untitled opportunity"
        });
    });
    return [...map.values()].sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }, [applications]);

  // FILTER APPLICATIONS
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const student = app.user || {};
      const profile = profileOf(app);
      const opportunity = opportunityOf(app);
      const category = opportunity.category ||
        (app.internship ? "INTERNSHIP" : "");

      const searchText = [
        student.name, student.email, profile.university,
        profile.branch, profile.degree, ...skillsOf(profile),
        opportunity.title, opportunity.location, category,
        opportunity.employmentType
      ].filter(Boolean).join(" ").toLowerCase();

      return (
        searchText.includes(search.trim().toLowerCase()) &&
        (statusFilter === "ALL" || app.status === statusFilter) &&
        (opportunityFilter === "ALL" ||
          opportunity.id === opportunityFilter) &&
        (categoryFilter === "ALL" || category === categoryFilter)
      );
    });
  }, [
    applications, search, statusFilter,
    opportunityFilter, categoryFilter
  ]);

  // STATISTICS
  const counts = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => a.status === "PENDING").length,
    shortlisted: applications.filter(a => a.status === "SHORTLISTED").length,
    accepted: applications.filter(a => a.status === "ACCEPTED").length,
    interview: applications.filter(a => a.status === "INTERVIEW").length
  }), [applications]);

  // UPDATE APPLICATION STATUS
  const updateStatus = async (id, status) => {
    const note = (statusNotes[id] || "").trim();

    if (note.length > 1000) {
      setError("Status note cannot exceed 1000 characters.");
      return;
    }

    setUpdatingId(id);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest(
        `/employer/applications/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status, note: note || undefined })
        }
      );

      if (data.application) {
        const updated = data.application;
        setApplications(old =>
          old.map(a => a.id === id ? updated : a)
        );
        setCoverApplication(old => old?.id === id ? updated : old);
        setProfileApplication(old => old?.id === id ? updated : old);
      } else {
        await loadApplications(true);
      }

      setStatusNotes(old => ({ ...old, [id]: "" }));
      setSuccess("Application status and history updated successfully.");
      window.setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError(err.message || "Unable to update application status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // DOWNLOAD RESUME
  const downloadResume = async app => {
    setDownloadingId(app.id);
    setError("");

    try {
      const token = localStorage.getItem("isyntara_token");
      if (!token) throw new Error("Please log in again to download resumes.");

      const response = await fetch(
        `${API_URL}/employer/applications/${app.id}/resume`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to download this resume.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resume-${app.user?.name || "student"}-${app.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Resume download failed.");
    } finally {
      setDownloadingId(null);
    }
  };

  // FILTER CONTROLS
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setOpportunityFilter("ALL");
    setCategoryFilter("ALL");
  };

  const hasFilters = Boolean(
    search.trim() || statusFilter !== "ALL" ||
    opportunityFilter !== "ALL" || categoryFilter !== "ALL"
  );

  // CANDIDATE COMPARISON
  const comparisonCandidates = comparisonIds
    .map(id => applications.find(a => a.id === id))
    .filter(Boolean);

  const toggleComparison = id => {
    setComparisonIds(old => {
      if (old.includes(id)) return old.filter(item => item !== id);
      if (old.length >= 3) {
        setError("You can compare up to 3 candidates at a time.");
        return old;
      }
      setError("");
      return [...old, id];
    });
  };

  const closeComparison = () => setShowComparison(false);

  return (
    <section className="employer-applications" id="employer-applications">

      {/* PAGE HEADER */}
      <div className="applications-heading">
        <div>
          <span className="applications-eyebrow">TALENT MANAGEMENT</span>
          <h2>Applications</h2>
          <p>
            Review candidates, evaluate applications and manage
            your hiring process across all your opportunities.
          </p>
        </div>
        <button
          className="applications-refresh"
          onClick={() => loadApplications(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="applications-alert error">
          <AlertCircle size={17} /> {error}
          <button onClick={() => setError("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}
      {success && (
        <div className="applications-alert success">
          <CheckCircle2 size={17} /> {success}
        </div>
      )}

      {/* METRICS */}
      <div className="application-stats">
        {[
          [Users, "Total Applications", counts.total, ""],
          [Clock3, "Pending Review", counts.pending, "pending-icon"],
          [CheckCircle2, "Shortlisted", counts.shortlisted, "shortlisted-icon"],
          [GraduationCap, "Accepted", counts.accepted, "accepted-icon"]
        ].map(([Icon, label, value, cls]) => (
          <div className="application-stat-card" key={label}>
            <div className={`application-stat-icon ${cls}`}>
              <Icon size={20} />
            </div>
            <div><span>{label}</span><strong>{value}</strong></div>
          </div>
        ))}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="applications-toolbar">
        <div className="applications-search">
          <Search size={18} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search candidates, skills or opportunities..."
          />
        </div>

        <select
          className="applications-filter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          {Object.entries(STATUS).map(([key, label]) =>
            <option value={key} key={key}>{label}</option>
          )}
        </select>

        <select
          className="applications-filter"
          value={opportunityFilter}
          onChange={e => setOpportunityFilter(e.target.value)}
        >
          <option value="ALL">All opportunities</option>
          {opportunityOptions.map(item =>
            <option value={item.id} key={item.id}>{item.title}</option>
          )}
        </select>

        <select
          className="applications-filter"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="ALL">All categories</option>
          {Object.entries(CATEGORIES).map(([key, label]) =>
            <option value={key} key={key}>{label}</option>
          )}
        </select>

        {hasFilters && (
          <button className="applications-clear-filters" onClick={clearFilters}>
            <Filter size={15} /> Clear filters
          </button>
        )}
      </div>

      {/* COMPARISON TOOLBAR */}
      {comparisonIds.length > 0 && (
        <div className="candidate-compare-bar">
          <div>
            <GitCompareArrows size={18} />
            <span>
              <strong>{comparisonIds.length}</strong> candidate
              {comparisonIds.length === 1 ? "" : "s"} selected
            </span>
            <small>Select up to 3 candidates to compare.</small>
          </div>
          <div className="candidate-compare-actions">
            <button
              className="candidate-compare-clear"
              onClick={() => setComparisonIds([])}
            >Clear</button>
            <button
              className="candidate-compare-open"
              disabled={comparisonIds.length < 2}
              onClick={() => setShowComparison(true)}
            >
              <GitCompareArrows size={15} /> Compare candidates
            </button>
          </div>
        </div>
      )}

      {/* APPLICATION LIST */}
      {loading ? (
        <div className="applications-loading">
          <LoaderCircle size={28} className="spinning" />
          <p>Loading applications...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="applications-empty">
          <div className="applications-empty-icon">
            <BriefcaseBusiness size={30} />
          </div>
          <h3>
            {applications.length === 0
              ? "No applications yet"
              : "No matching applications"}
          </h3>
          <p>
            {applications.length === 0
              ? "Candidate applications will appear here when someone applies to your opportunities."
              : "Try changing your search or filters to find candidates."}
          </p>
          {hasFilters && applications.length > 0 &&
            <button onClick={clearFilters}>Clear Filters</button>}
        </div>
      ) : (
        <div className="application-list">
          <div className="applications-list-heading">
            <div>
              <span>YOUR TALENT PIPELINE</span>
              <h3>Candidate Applications</h3>
            </div>
            <span className="applications-count">
              {filteredApplications.length} found
            </span>
          </div>

          {filteredApplications.map(app => {
            const student = app.user || {};
            const profile = profileOf(app);
            const opportunity = opportunityOf(app);
            const skills = skillsOf(profile);
            const experience = experienceOf(profile);
            const category = CATEGORIES[
              opportunity.category || (app.internship ? "INTERNSHIP" : "")
            ] || "Opportunity";
            const canUpdate = ![
              "WITHDRAWN", "REJECTED", "ACCEPTED"
            ].includes(app.status);

            return (
              <article className="application-card" key={app.id}>

                {/* CANDIDATE HEADER */}
                <div className="application-card-top">
                  <label
                    className="candidate-compare-select"
                    title="Add candidate to comparison"
                  >
                    <input
                      type="checkbox"
                      checked={comparisonIds.includes(app.id)}
                      disabled={
                        !comparisonIds.includes(app.id) &&
                        comparisonIds.length >= 3
                      }
                      onChange={() => toggleComparison(app.id)}
                    />
                    <span />
                  </label>

                  <div className="student-avatar">
                    {(student.name || "S").trim().charAt(0).toUpperCase()}
                  </div>

                  <div className="student-main-info">
                    <h3>{display(student.name)}</h3>
                    <p>{display(student.email)}</p>
                  </div>

                  <span className={`application-status ${statusClass(app.status)}`}>
                    {STATUS[app.status] || app.status}
                  </span>
                </div>

                {/* CANDIDATE INFORMATION */}
                <div className="application-details-grid">
                  <div className="application-detail">
                    <GraduationCap size={17} />
                    <div><span>University</span>
                      <strong>{display(profile.university)}</strong></div>
                  </div>
                  <div className="application-detail">
                    <BriefcaseBusiness size={17} />
                    <div><span>Branch / Degree</span>
                      <strong>
                        {[profile.branch, profile.degree].filter(Boolean).join(" · ") || "Not provided"}
                      </strong></div>
                  </div>
                  <div className="application-detail">
                    <Building2 size={17} />
                    <div><span>Opportunity</span>
                      <strong>{display(opportunity.title)}</strong></div>
                  </div>
                  <div className="application-detail">
                    <Clock3 size={17} />
                    <div><span>Applied on</span>
                      <strong>{date(app.appliedAt)}</strong></div>
                  </div>
                  <div className="application-detail">
                    <BriefcaseBusiness size={17} />
                    <div><span>Experience</span>
                      <strong>
                        {experience.length
                          ? `${experience.length} experience ${experience.length === 1 ? "entry" : "entries"}`
                          : profile.hasWorkExperience
                            ? "Experience reported" : "Not provided"}
                      </strong></div>
                  </div>
                  <div className="application-detail">
                    {opportunity.isRemote
                      ? <Laptop size={17} /> : <MapPin size={17} />}
                    <div><span>Opportunity Type</span>
                      <strong>
                        {category}{opportunity.isRemote ? " · Remote" : ""}
                      </strong></div>
                  </div>
                </div>

                {/* SKILLS */}
                {skills.length > 0 && (
                  <div className="application-skills">
                    <span>SKILLS</span>
                    <p>{skills.join(", ")}</p>
                  </div>
                )}

                {/* DOCUMENT ACTIONS */}
                <div className="application-documents">
                  <div className="application-documents-heading">
                    <FileText size={17} />
                    <span>APPLICATION DOCUMENTS</span>
                  </div>
                  <div className="application-document-actions">
                    <button
                      className="view-candidate-profile-button"
                      onClick={() => setProfileApplication(app)}
                    >
                      <UserRound size={16} /> View Profile
                    </button>
                    <button
                      className="resume-download-button"
                      disabled={
                        !profile.resumeUrl || downloadingId === app.id
                      }
                      onClick={() => downloadResume(app)}
                    >
                      {downloadingId === app.id
                        ? <LoaderCircle size={16} className="spinning" />
                        : <Download size={16} />}
                      {downloadingId === app.id ? "Downloading..." : "Download Resume"}
                    </button>
                    {app.coverLetter?.trim() && (
                      <button
                        className="view-cover-letter-button"
                        onClick={() => setCoverApplication(app)}
                      >
                        <Eye size={16} /> View Cover Letter
                      </button>
                    )}
                  </div>
                </div>

                {/* APPLICATION FOOTER */}
                <div className="application-card-footer">
                  <div className="application-applied-info">
                    <CalendarDays size={15} />
                    Applied {date(app.appliedAt)}
                  </div>
                  <div className="application-decision">
                    {canUpdate ? (
                      <>
                        <label htmlFor={`status-${app.id}`}>
                          Update status
                        </label>
                        <select
                          id={`status-${app.id}`}
                          value=""
                          disabled={updatingId === app.id}
                          onChange={e =>
                            e.target.value && updateStatus(app.id, e.target.value)
                          }
                        >
                          <option value="">Choose status</option>
                          {NEXT_STATUSES.map(status =>
                            <option value={status} key={status}>
                              {STATUS[status]}
                            </option>
                          )}
                        </select>
                        {updatingId === app.id &&
                          <LoaderCircle size={17} className="spinning" />}
                      </>
                    ) : (
                      <span className="final-status">
                        <CheckCircle2 size={15} />
                        {STATUS[app.status] || app.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* EMPLOYER NOTE */}
                {canUpdate && (
                  <div className="application-status-note">
                    <label htmlFor={`note-${app.id}`}>
                      Internal status note (optional)
                    </label>
                    <textarea
                      id={`note-${app.id}`}
                      rows={2}
                      maxLength={1000}
                      placeholder="Add a note about this candidate or decision..."
                      value={statusNotes[app.id] || ""}
                      onChange={e =>
                        setStatusNotes(old => ({
                          ...old, [app.id]: e.target.value
                        }))
                      }
                    />
                    <span>
                      {(statusNotes[app.id] || "").length}/1000 characters
                    </span>
                  </div>
                )}

                {/* STATUS HISTORY */}
                <div className="application-status-history">
                  <div className="application-documents-heading">
                    <History size={17} />
                    <span>APPLICATION STATUS HISTORY</span>
                  </div>
                  <div className="application-history-list">
                    {historyOf(app).map((item, index) => (
                      <div
                        className="application-history-item"
                        key={item.id || index}
                      >
                        <div>
                          <strong>
                            {STATUS[item.toStatus] || item.toStatus || "Updated"}
                          </strong>
                          <span>{dateTime(item.createdAt)}</span>
                          {item.changedByRole &&
                            <small>{item.changedByRole}</small>}
                          {item.note && <p>{item.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </article>
            );
          })}
        </div>
      )}

      <div className="applications-footer-note">
        <FileText size={15} />
        Candidate information is provided by applicants and may be updated
        by them.
      </div>

      {/* CANDIDATE COMPARISON MODAL */}
      {showComparison && comparisonCandidates.length >= 2 && (
        <div
          className="candidate-comparison-overlay"
          onMouseDown={e => {
            if (e.target === e.currentTarget) closeComparison();
          }}
        >
          <section
            className="candidate-comparison-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-comparison-title"
          >
            <header className="candidate-comparison-header">
              <div>
                <span>RECRUITER WORKSPACE</span>
                <h2 id="candidate-comparison-title">Candidate comparison</h2>
                <p>Compare information available in candidate profiles.</p>
              </div>
              <button
                className="candidate-comparison-close"
                onClick={closeComparison}
                aria-label="Close comparison"
              ><X size={20} /></button>
            </header>

            <div className="candidate-comparison-scroll">
              <div
                className="candidate-comparison-grid"
                style={{ "--candidate-count": comparisonCandidates.length }}
              >
                {comparisonCandidates.map(app => {
                  const candidate = app.user || {};
                  const profile = profileOf(app);
                  const opportunity = opportunityOf(app);
                  const skills = skillsOf(profile);
                  const experience = experienceOf(profile);
                  const projects = projectsOf(profile);
                  const certifications = certificationsOf(profile);

                  return (
                    <article
                      className="candidate-comparison-column"
                      key={app.id}
                    >
                      <div className="candidate-comparison-person">
                        <div className="student-avatar">
                          {(candidate.name || "C").trim().charAt(0).toUpperCase()}
                        </div>
                        <h3>{display(candidate.name)}</h3>
                        <p>{display(candidate.email)}</p>
                        <span className={`application-status ${statusClass(app.status)}`}>
                          {STATUS[app.status] || app.status}
                        </span>
                      </div>

                      <dl>
                        <div><dt>Applied for</dt><dd>{display(opportunity.title)}</dd></div>
                        <div><dt>University</dt><dd>{display(profile.university)}</dd></div>
                        <div><dt>Degree / Branch</dt>
                          <dd>{[profile.degree, profile.branch].filter(Boolean).join(" · ") || "Not provided"}</dd>
                        </div>
                        <div><dt>Experience entries</dt>
                          <dd>{experience.length || (profile.hasWorkExperience ? "Reported" : "Not provided")}</dd>
                        </div>
                        <div><dt>Projects</dt><dd>{projects.length}</dd></div>
                        <div><dt>Certifications</dt><dd>{certifications.length}</dd></div>
                        <div><dt>Applied on</dt><dd>{date(app.appliedAt)}</dd></div>
                      </dl>

                      <div className="candidate-comparison-skills">
                        <strong>Skills</strong>
                        {skills.length ? (
                          <div>{skills.map((skill, i) =>
                            <span key={`${skill}-${i}`}>{skill}</span>
                          )}</div>
                        ) : <p>No skills provided</p>}
                      </div>

                      <button
                        className="candidate-comparison-profile"
                        onClick={() => {
                          closeComparison();
                          setProfileApplication(app);
                        }}
                      >View full profile</button>

                      <button
                        className="candidate-comparison-remove"
                        onClick={() => {
                          setComparisonIds(old => old.filter(id => id !== app.id));
                          if (comparisonCandidates.length <= 2)
                            closeComparison();
                        }}
                      >Remove from comparison</button>
                    </article>
                  );
                })}
              </div>
            </div>

            <footer className="candidate-comparison-footer">
              <span>Comparison uses information available in candidate profiles.</span>
              <button onClick={closeComparison}>Done</button>
            </footer>
          </section>
        </div>
      )}

      {/* COVER LETTER MODAL */}
      {coverApplication && (
        <div
          className="recruiter-cover-overlay"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setCoverApplication(null);
          }}
        >
          <section className="recruiter-cover-modal" role="dialog" aria-modal="true">
            <div className="recruiter-cover-header">
              <div className="recruiter-cover-header-icon">
                <FileText size={23} />
              </div>
              <div className="recruiter-cover-header-text">
                <span>CANDIDATE APPLICATION</span>
                <h2>Cover Letter</h2>
                <p>{display(coverApplication.user?.name)}</p>
              </div>
              <button onClick={() => setCoverApplication(null)}>
                <X size={21} />
              </button>
            </div>

            <div className="recruiter-cover-candidate">
              <div className="recruiter-cover-avatar">
                {(coverApplication.user?.name || "C").charAt(0).toUpperCase()}
              </div>
              <div className="recruiter-cover-candidate-info">
                <strong>{display(coverApplication.user?.name)}</strong>
                <span>{display(coverApplication.user?.email)}</span>
              </div>
              <span className={`application-status ${statusClass(coverApplication.status)}`}>
                {STATUS[coverApplication.status] || coverApplication.status}
              </span>
            </div>

            <div className="recruiter-cover-opportunity">
              <Building2 size={18} />
              <div>
                <span>APPLIED FOR</span>
                <strong>{display(opportunityOf(coverApplication).title)}</strong>
              </div>
            </div>

            <div className="recruiter-cover-content">
              <article className="recruiter-cover-paper">
                <div className="recruiter-cover-paper-heading">
                  <span>APPLICATION LETTER</span>
                  <span>iSYNTARA</span>
                </div>
                <div className="recruiter-cover-paper-divider" />
                <div className="recruiter-cover-recipient">
                  <strong>Dear Hiring Team,</strong>
                  <span>Application submitted {date(coverApplication.appliedAt)}</span>
                </div>
                <div className="recruiter-cover-letter-body">
                  {coverApplication.coverLetter.split(/\r?\n/).map((line, i) =>
                    <p key={i}>{line || "\u00A0"}</p>
                  )}
                </div>
                <div className="recruiter-cover-paper-footer">
                  <span>{display(coverApplication.user?.name)}</span>
                  <span>iSYNTARA APPLICATION</span>
                </div>
              </article>
            </div>

            <div className="recruiter-cover-footer">
              <div className="recruiter-cover-word-count">
                {coverApplication.coverLetter.trim().split(/\s+/).length} words
              </div>
              <button onClick={() => setCoverApplication(null)}>Close</button>
            </div>
          </section>
        </div>
      )}

      {/* FULL CANDIDATE PROFILE MODAL */}
      {profileApplication && (() => {
        const app = profileApplication;
        const candidate = app.user || {};
        const profile = profileOf(app);
        const opportunity = opportunityOf(app);
        const experience = experienceOf(profile);
        const projects = projectsOf(profile);
        const certifications = certificationsOf(profile);
        const skills = skillsOf(profile);
        const linkedin = safeUrl(profile.linkedinUrl || profile.linkedin);
        const portfolio = safeUrl(profile.portfolioUrl || profile.website);

        return (
          <div
            className="candidate-profile-overlay"
            onMouseDown={e => {
              if (e.target === e.currentTarget) setProfileApplication(null);
            }}
          >
            <section
              className="candidate-profile-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="candidate-profile-title"
            >
              <header className="candidate-profile-header">
                <div className="candidate-profile-heading">
                  <span>CANDIDATE DETAILS</span>
                  <h2 id="candidate-profile-title">{display(candidate.name)}</h2>
                  <p>{display(candidate.email)}</p>
                </div>
                <button onClick={() => setProfileApplication(null)}>
                  <X size={21} />
                </button>
              </header>

              <div className="candidate-profile-scroll">

                {/* IDENTITY */}
                <div className="candidate-profile-identity">
                  <div className="candidate-profile-avatar">
                    {(candidate.name || "C").charAt(0).toUpperCase()}
                  </div>
                  <div className="candidate-profile-identity-text">
                    <h3>{display(candidate.name)}</h3>
                    {candidate.email
                      ? <a href={`mailto:${candidate.email}`}>{candidate.email}</a>
                      : <span>Email not provided</span>}
                    <span className="candidate-profile-applied-role">
                      Applied for: {display(opportunity.title)}
                    </span>
                  </div>
                  <span className={`application-status ${statusClass(app.status)}`}>
                    {STATUS[app.status] || app.status}
                  </span>
                </div>

                {/* EDUCATION */}
                <section className="candidate-profile-section">
                  <SectionTitle icon={GraduationCap}>Education</SectionTitle>
                  <div className="candidate-profile-info-grid">
                    {[
                      ["University / Institution", profile.university],
                      ["Degree", profile.degree],
                      ["Branch / Specialization", profile.branch],
                      ["Graduation Year", profile.graduationYear]
                    ].map(([label, value]) => (
                      <div className="candidate-profile-info-item" key={label}>
                        <span>{label}</span><strong>{display(value)}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                {/* EXPERIENCE */}
                <section className="candidate-profile-section">
                  <SectionTitle icon={BriefcaseBusiness} count={experience.length}>
                    Work Experience
                  </SectionTitle>
                  {experience.length ? (
                    <div className="candidate-profile-experience-list">
                      {experience.map((item, i) => (
                        <article className="candidate-profile-experience-card" key={i}>
                          <h4>{display(item.jobTitle || item.position || item.title || item.role)}</h4>
                          <strong>{display(item.company || item.organization)}</strong>
                          <div className="candidate-profile-experience-meta">
                            {item.location && <span>{item.location}</span>}
                            {(item.startDate || item.endDate) && (
                              <span>
                                {profileDate(item.startDate)} – {item.currentlyWorking ? "Present" : profileDate(item.endDate) || "Present"}
                              </span>
                            )}
                          </div>
                          {(item.description || item.responsibilities) &&
                            <p>{item.description || item.responsibilities}</p>}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="candidate-profile-empty">No work experience has been added.</p>
                  )}
                </section>

                {/* PROJECTS */}
                <section className="candidate-profile-section">
                  <SectionTitle icon={BriefcaseBusiness} count={projects.length}>
                    Projects
                  </SectionTitle>
                  {projects.length ? (
                    <div className="candidate-profile-experience-list">
                      {projects.map((item, i) => {
                        const url = safeUrl(item.projectUrl || item.url);
                        return (
                          <article className="candidate-profile-experience-card" key={i}>
                            <h4>{display(item.title || item.name)}</h4>
                            {item.role && <strong>{item.role}</strong>}
                            {item.description && <p>{item.description}</p>}
                            {item.technologies && (
                              <p><strong>Technologies:</strong> {
                                Array.isArray(item.technologies)
                                  ? item.technologies.join(", ")
                                  : item.technologies
                              }</p>
                            )}
                            {url && (
                              <div className="candidate-profile-links">
                                <a href={url} target="_blank" rel="noreferrer">
                                  <Globe size={15} /> View Project
                                </a>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="candidate-profile-empty">No projects have been added.</p>
                  )}
                </section>

                {/* CERTIFICATIONS */}
                <section className="candidate-profile-section">
                  <SectionTitle icon={ShieldCheck} count={certifications.length}>
                    Certifications
                  </SectionTitle>
                  {certifications.length ? (
                    <div className="candidate-profile-experience-list">
                      {certifications.map((item, i) => {
                        const url = safeUrl(item.credentialUrl);
                        return (
                          <article className="candidate-profile-experience-card" key={i}>
                            <h4>{item.name || `Certification ${i + 1}`}</h4>
                            {item.issuer && <strong>{item.issuer}</strong>}
                            <div className="candidate-profile-experience-meta">
                              {item.issueDate && <span>Issued: {profileDate(item.issueDate)}</span>}
                              {item.expiryDate && <span>Expires: {profileDate(item.expiryDate)}</span>}
                            </div>
                            {item.credentialId &&
                              <p><strong>Credential ID:</strong> {item.credentialId}</p>}
                            {url && (
                              <div className="candidate-profile-links">
                                <a href={url} target="_blank" rel="noreferrer">
                                  <Globe size={15} /> Verify Certificate
                                </a>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="candidate-profile-empty">No certifications have been added.</p>
                  )}
                </section>

                {/* SKILLS */}
                <section className="candidate-profile-section">
                  <SectionTitle icon={CheckCircle2}>Skills</SectionTitle>
                  {skills.length ? (
                    <div className="candidate-profile-skills">
                      {skills.map((skill, i) =>
                        <span key={`${skill}-${i}`}>{skill}</span>
                      )}
                    </div>
                  ) : (
                    <p className="candidate-profile-empty">No skills have been added.</p>
                  )}
                </section>

                {/* PROFESSIONAL LINKS */}
                <section className="candidate-profile-section">
                  <SectionTitle icon={Globe}>Professional Links</SectionTitle>
                  <div className="candidate-profile-links">
                    {linkedin
                      ? <a href={linkedin} target="_blank" rel="noreferrer"><Globe size={17} /> LinkedIn Profile</a>
                      : <span>LinkedIn: Not provided</span>}
                    {portfolio
                      ? <a href={portfolio} target="_blank" rel="noreferrer"><Globe size={17} /> Portfolio / Website</a>
                      : <span>Portfolio: Not provided</span>}
                  </div>
                </section>

                {/* RESUME */}
                <section className="candidate-profile-section candidate-profile-resume-section">
                  <div>
                    <SectionTitle icon={FileText}>Resume</SectionTitle>
                    <p>
                      {profile.resumeUrl
                        ? "A resume is available for this candidate."
                        : "This candidate has not uploaded a resume."}
                    </p>
                  </div>
                  <button
                    className="resume-download-button"
                    disabled={!profile.resumeUrl || downloadingId === app.id}
                    onClick={() => downloadResume(app)}
                  >
                    {downloadingId === app.id
                      ? <LoaderCircle size={16} className="spinning" />
                      : <Download size={16} />}
                    {downloadingId === app.id ? "Downloading..." : "Download Resume"}
                  </button>
                </section>
              </div>

              <footer className="candidate-profile-footer">
                <span>Profile information supplied by the candidate.</span>
                <button onClick={() => setProfileApplication(null)}>
                  Close Profile
                </button>
              </footer>
            </section>
          </div>
        );
      })()}
    </section>
  );
}

export default EmployerApplications;