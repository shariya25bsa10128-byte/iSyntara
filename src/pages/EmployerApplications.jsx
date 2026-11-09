import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Users,
  Search,
  RefreshCw,
  FileText,
  Download,
  MapPin,
  Clock3,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  GraduationCap,
  BriefcaseBusiness,
  Eye,
  X,
  Building2,
  CalendarDays,
  Filter,
  Laptop,
  Mail,
  Globe,
  UserRound,
  ShieldCheck,
  History,
} from "lucide-react";

import { apiRequest, API_URL } from "../services/api";
import "./EmployerApplications.css";

const STATUS_OPTIONS = [
  "REVIEWED",
  "SHORTLISTED",
  "INTERVIEW",
  "ACCEPTED",
  "REJECTED",
];

const STATUS_LABELS = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const CATEGORY_LABELS = {
  INTERNSHIP: "Internship",
  FULL_TIME_JOB: "Full-time Job",
  PART_TIME_JOB: "Part-time Job",
  FREELANCE: "Freelance",
  CONTRACT: "Contract",
  RESEARCH: "Research",
  TRAINING: "Training",
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);

function formatDate(date) {
  if (!date) return "Not available";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Not available";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatProfileDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status) {
  return (status || "pending").toLowerCase();
}

function getApplicationOpportunity(application) {
  return application?.opportunity || application?.internship || {};
}

function getOpportunityCategory(application) {
  const opportunity = getApplicationOpportunity(application);

  return (
    opportunity.category ||
    (application?.internship ? "INTERNSHIP" : "")
  );
}

function getOpportunityCategoryLabel(application) {
  return (
    CATEGORY_LABELS[getOpportunityCategory(application)] ||
    "Opportunity"
  );
}

function getCandidateSkills(profile) {
  if (Array.isArray(profile?.skills)) {
    return profile.skills.join(", ");
  }

  return typeof profile?.skills === "string"
    ? profile.skills
    : "";
}

function getSkillArray(profile) {
  if (Array.isArray(profile?.skills)) return profile.skills;

  if (typeof profile?.skills === "string") {
    return profile.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
}

function getWorkExperience(profile) {
  const experience = profile?.workExperience;

  if (Array.isArray(experience)) return experience;

  if (typeof experience === "string") {
    try {
      const parsed = JSON.parse(experience);

      if (Array.isArray(parsed)) return parsed;

      if (parsed && typeof parsed === "object") {
        return [parsed];
      }

      return [];
    } catch {
      return experience.trim()
        ? [{ description: experience.trim() }]
        : [];
    }
  }

  if (experience && typeof experience === "object") {
    return [experience];
  }

  return [];
}

function getCandidateProjects(profile) {
  return Array.isArray(profile?.projects) ? profile.projects : [];
}

function getCandidateCertifications(profile) {
  return Array.isArray(profile?.certifications)
    ? profile.certifications
    : [];
}

function getExperienceField(experience, keys) {
  for (const key of keys) {
    const value = experience?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function safeExternalUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const url = new URL(
      /^https?:\/\//i.test(value)
        ? value
        : `https://${value}`
    );

    return ["http:", "https:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function getHistory(application) {
  if (
    Array.isArray(application?.statusHistory) &&
    application.statusHistory.length > 0
  ) {
    return application.statusHistory;
  }

  // Older applications may not have history records.
  return [
    {
      id: `legacy-${application.id}`,
      fromStatus: null,
      toStatus: application.status || "PENDING",
      changedByRole: "SYSTEM",
      note: "Application originally submitted.",
      createdAt: application.appliedAt,
    },
  ];
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

  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedProfileApplication, setSelectedProfileApplication] =
    useState(null);

  const [statusNotes, setStatusNotes] = useState({});

  // LOAD APPLICATIONS

  const loadApplications = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await apiRequest("/employer/applications");

      const loadedApplications = data.applications || [];

      setApplications(loadedApplications);

      // Keep open modals synchronized with refreshed data.
      setSelectedApplication((previous) =>
        previous
          ? loadedApplications.find((item) => item.id === previous.id) ||
            previous
          : null
      );

      setSelectedProfileApplication((previous) =>
        previous
          ? loadedApplications.find((item) => item.id === previous.id) ||
            previous
          : null
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

  // UNIQUE OPPORTUNITIES

  const opportunityOptions = useMemo(() => {
    const unique = new Map();

    applications.forEach((application) => {
      const opportunity = getApplicationOpportunity(application);

      if (opportunity.id) {
        unique.set(opportunity.id, {
          id: opportunity.id,
          title: opportunity.title || "Untitled opportunity",
        });
      }
    });

    return Array.from(unique.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }, [applications]);

  // FILTER APPLICATIONS

  const filteredApplications = useMemo(() => {
    return applications.filter((application) => {
      const student = application.user || {};
      const profile = student.studentProfile || {};
      const opportunity = getApplicationOpportunity(application);

      const category = getOpportunityCategory(application);

      const searchText = [
        student.name,
        student.email,
        profile.university,
        profile.branch,
        profile.degree,
        getCandidateSkills(profile),
        opportunity.title,
        opportunity.location,
        category,
        opportunity.employmentType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(
        search.trim().toLowerCase()
      );

      const matchesStatus =
        statusFilter === "ALL" ||
        application.status === statusFilter;

      const matchesOpportunity =
        opportunityFilter === "ALL" ||
        opportunity.id === opportunityFilter;

      const matchesCategory =
        categoryFilter === "ALL" ||
        category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesOpportunity &&
        matchesCategory
      );
    });
  }, [
    applications,
    search,
    statusFilter,
    opportunityFilter,
    categoryFilter,
  ]);

  // STATISTICS

  const counts = useMemo(
    () => ({
      total: applications.length,

      pending: applications.filter(
        (item) => item.status === "PENDING"
      ).length,

      shortlisted: applications.filter(
        (item) => item.status === "SHORTLISTED"
      ).length,

      accepted: applications.filter(
        (item) => item.status === "ACCEPTED"
      ).length,

      interview: applications.filter(
        (item) => item.status === "INTERVIEW"
      ).length,
    }),
    [applications]
  );

  // UPDATE APPLICATION STATUS AND SAVE EMPLOYER NOTE

  const updateStatus = async (applicationId, status) => {
    const note = (statusNotes[applicationId] || "").trim();

    if (note.length > 1000) {
      setError("Status note cannot exceed 1000 characters.");
      return;
    }

    setUpdatingId(applicationId);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest(
        `/employer/applications/${applicationId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            note: note || undefined,
          }),
        }
      );

      // Prefer the complete application returned by the backend.
      const updatedApplication = data.application;

      if (updatedApplication) {
        setApplications((previous) =>
          previous.map((application) =>
            application.id === applicationId
              ? updatedApplication
              : application
          )
        );

        setSelectedApplication((previous) =>
          previous?.id === applicationId
            ? updatedApplication
            : previous
        );

        setSelectedProfileApplication((previous) =>
          previous?.id === applicationId
            ? updatedApplication
            : previous
        );
      } else {
        // Fallback if the endpoint returns only a success message.
        await loadApplications(true);
      }

      setStatusNotes((previous) => ({
        ...previous,
        [applicationId]: "",
      }));

      setSuccess("Application status and history updated successfully.");

      window.setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError(
        err.message || "Unable to update application status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // DOWNLOAD RESUME

  const downloadResume = async (application) => {
    const applicationId = application.id;

    setDownloadingId(applicationId);
    setError("");

    try {
      const token = localStorage.getItem("isyntara_token");

      if (!token) {
        throw new Error("Please log in again to download resumes.");
      }

      const response = await fetch(
        `${API_URL}/employer/applications/${applicationId}/resume`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.message || "Unable to download this resume."
        );
      }

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = fileUrl;
      link.download = `resume-${
        application.user?.name || "student"
      }-${applicationId}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(fileUrl);
    } catch (err) {
      setError(err.message || "Resume download failed.");
    } finally {
      setDownloadingId(null);
    }
  };

  // MODAL CONTROLS

  const openCoverLetter = (application) => {
    setSelectedApplication(application);
  };

  const closeCoverLetter = () => {
    setSelectedApplication(null);
  };

  const openCandidateProfile = (application) => {
    setSelectedProfileApplication(application);
  };

  const closeCandidateProfile = () => {
    setSelectedProfileApplication(null);
  };

  // CLEAR FILTERS

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setOpportunityFilter("ALL");
    setCategoryFilter("ALL");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    opportunityFilter !== "ALL" ||
    categoryFilter !== "ALL";

  // RENDER

  return (
    <section
      className="employer-applications"
      id="employer-applications"
    >
      {/* PAGE HEADING */}

      <div className="applications-heading">
        <div>
          <span className="applications-eyebrow">
            TALENT MANAGEMENT
          </span>

          <h2>Applications</h2>

          <p>
            Review candidates, evaluate applications and manage
            your hiring process across all your opportunities.
          </p>
        </div>

        <button
          className="applications-refresh"
          type="button"
          onClick={() => loadApplications(true)}
          disabled={refreshing || loading}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "spinning" : ""}
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ALERTS */}

      {error && (
        <div className="applications-alert error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {success && (
        <div className="applications-alert success">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {/* STATISTICS */}

      <div className="application-stats">
        <div className="application-stat-card">
          <div className="application-stat-icon">
            <Users size={20} />
          </div>

          <div>
            <span>Total Applications</span>
            <strong>{counts.total}</strong>
          </div>
        </div>

        <div className="application-stat-card">
          <div className="application-stat-icon pending-icon">
            <Clock3 size={20} />
          </div>

          <div>
            <span>Pending Review</span>
            <strong>{counts.pending}</strong>
          </div>
        </div>

        <div className="application-stat-card">
          <div className="application-stat-icon shortlisted-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Shortlisted</span>
            <strong>{counts.shortlisted}</strong>
          </div>
        </div>

        <div className="application-stat-card">
          <div className="application-stat-icon accepted-icon">
            <GraduationCap size={20} />
          </div>

          <div>
            <span>Accepted</span>
            <strong>{counts.accepted}</strong>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}

      <div className="applications-toolbar">
        <div className="applications-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search candidates, skills or opportunities..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="applications-filter"
          aria-label="Filter by application status"
        >
          <option value="ALL">All statuses</option>

          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={opportunityFilter}
          onChange={(event) =>
            setOpportunityFilter(event.target.value)
          }
          className="applications-filter"
          aria-label="Filter by opportunity"
        >
          <option value="ALL">All opportunities</option>

          {opportunityOptions.map((opportunity) => (
            <option key={opportunity.id} value={opportunity.id}>
              {opportunity.title}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="applications-filter"
          aria-label="Filter by opportunity category"
        >
          <option value="ALL">All categories</option>

          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            className="applications-clear-filters"
            onClick={clearFilters}
          >
            <Filter size={15} />
            Clear filters
          </button>
        )}
      </div>

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

          {applications.length > 0 && hasActiveFilters && (
            <button type="button" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
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

          {filteredApplications.map((application) => {
            const student = application.user || {};
            const profile = student.studentProfile || {};
            const opportunity = getApplicationOpportunity(application);

            const hasCoverLetter = Boolean(
              application.coverLetter?.trim()
            );

            const canUpdate = ![
              "WITHDRAWN",
              "REJECTED",
              "ACCEPTED",
            ].includes(application.status);

            const skills = getCandidateSkills(profile);
            const experienceCount = getWorkExperience(profile).length;
            const category = getOpportunityCategoryLabel(application);

            const history = getHistory(application);

            return (
              <article
                className="application-card"
                key={application.id}
              >
                {/* CANDIDATE HEADER */}

                <div className="application-card-top">
                  <div className="student-avatar">
                    {(student.name || "S")
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="student-main-info">
                    <h3>{student.name || "Candidate"}</h3>
                    <p>{student.email || "No email provided"}</p>
                  </div>

                  <span
                    className={`application-status ${getStatusClass(
                      application.status
                    )}`}
                  >
                    {STATUS_LABELS[application.status] ||
                      application.status}
                  </span>
                </div>

                {/* CANDIDATE DETAILS */}

                <div className="application-details-grid">
                  <div className="application-detail">
                    <GraduationCap size={17} />

                    <div>
                      <span>University</span>
                      <strong>
                        {profile.university || "Not provided"}
                      </strong>
                    </div>
                  </div>

                  <div className="application-detail">
                    <BriefcaseBusiness size={17} />

                    <div>
                      <span>Branch / Degree</span>
                      <strong>
                        {[profile.branch, profile.degree]
                          .filter(Boolean)
                          .join(" · ") || "Not provided"}
                      </strong>
                    </div>
                  </div>

                  <div className="application-detail">
                    <Building2 size={17} />

                    <div>
                      <span>Opportunity</span>
                      <strong>
                        {opportunity.title || "Opportunity"}
                      </strong>
                    </div>
                  </div>

                  <div className="application-detail">
                    <Clock3 size={17} />

                    <div>
                      <span>Applied on</span>
                      <strong>{formatDate(application.appliedAt)}</strong>
                    </div>
                  </div>

                  <div className="application-detail">
                    <BriefcaseBusiness size={17} />

                    <div>
                      <span>Experience</span>
                      <strong>
                        {experienceCount > 0
                          ? `${experienceCount} experience ${
                              experienceCount === 1 ? "entry" : "entries"
                            }`
                          : profile.hasWorkExperience
                            ? "Experience reported"
                            : "Not provided"}
                      </strong>
                    </div>
                  </div>

                  <div className="application-detail">
                    {opportunity.isRemote ? (
                      <Laptop size={17} />
                    ) : (
                      <MapPin size={17} />
                    )}

                    <div>
                      <span>Opportunity Type</span>
                      <strong>
                        {category}
                        {opportunity.isRemote ? " · Remote" : ""}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* SKILLS */}

                {skills && (
                  <div className="application-skills">
                    <span>SKILLS</span>
                    <p>{skills}</p>
                  </div>
                )}

                {/* APPLICATION DOCUMENTS */}

                <div className="application-documents">
                  <div className="application-documents-heading">
                    <FileText size={17} />
                    <span>APPLICATION DOCUMENTS</span>
                  </div>

                  <div className="application-document-actions">
                    <button
                      type="button"
                      className="view-candidate-profile-button"
                      onClick={() => openCandidateProfile(application)}
                    >
                      <UserRound size={16} />
                      View Profile
                    </button>

                    <button
                      type="button"
                      className="resume-download-button"
                      onClick={() => downloadResume(application)}
                      disabled={
                        downloadingId === application.id ||
                        !profile.resumeUrl
                      }
                      title={
                        profile.resumeUrl
                          ? "Download candidate resume"
                          : "No resume uploaded"
                      }
                    >
                      {downloadingId === application.id ? (
                        <LoaderCircle
                          size={16}
                          className="spinning"
                        />
                      ) : (
                        <Download size={16} />
                      )}

                      {downloadingId === application.id
                        ? "Downloading..."
                        : profile.resumeUrl
                          ? "Download Resume"
                          : "No Resume"}
                    </button>

                    <button
                      type="button"
                      className="view-cover-letter-button"
                      onClick={() => openCoverLetter(application)}
                      disabled={!hasCoverLetter}
                      title={
                        hasCoverLetter
                          ? "Read candidate cover letter"
                          : "No cover letter submitted"
                      }
                    >
                      <Eye size={16} />
                      {hasCoverLetter
                        ? "View Cover Letter"
                        : "No Cover Letter"}
                    </button>
                  </div>
                </div>

                {/* APPLICATION DECISION */}

                <div className="application-card-footer">
                  <div className="application-applied-info">
                    <CalendarDays size={15} />
                    Application ID: {application.id.slice(0, 8)}
                  </div>

                  <div className="application-decision">
                    {canUpdate ? (
                      <>
                        <label htmlFor={`status-${application.id}`}>
                          Update status
                        </label>

                        <select
                          id={`status-${application.id}`}
                          value={application.status}
                          disabled={updatingId === application.id}
                          onChange={(event) =>
                            updateStatus(
                              application.id,
                              event.target.value
                            )
                          }
                        >
                          <option value={application.status}>
                            {STATUS_LABELS[application.status] ||
                              application.status}
                          </option>

                          {STATUS_OPTIONS.filter(
                            (status) => status !== application.status
                          ).map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>

                        {updatingId === application.id && (
                          <LoaderCircle
                            size={16}
                            className="spinning"
                          />
                        )}
                      </>
                    ) : (
                      <span className="final-status">
                        <CheckCircle2 size={15} />
                        {STATUS_LABELS[application.status] ||
                          application.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* EMPLOYER STATUS NOTE */}

                {canUpdate && (
                  <div className="application-status-note">
                    <label htmlFor={`note-${application.id}`}>
                      Add a note to this status update (optional)
                    </label>

                    <textarea
                      id={`note-${application.id}`}
                      value={statusNotes[application.id] || ""}
                      onChange={(event) =>
                        setStatusNotes((previous) => ({
                          ...previous,
                          [application.id]: event.target.value,
                        }))
                      }
                      placeholder="Example: Strong technical profile. Moving to the interview stage."
                      maxLength={1000}
                      rows={2}
                      disabled={updatingId === application.id}
                    />

                    <span>
                      {(statusNotes[application.id] || "").length}/1000
                      characters
                    </span>
                  </div>
                )}

                {/* APPLICATION STATUS HISTORY */}

                <div className="application-status-history">
                  <div className="application-documents-heading">
                    <History size={17} />
                    <span>APPLICATION STATUS HISTORY</span>
                  </div>

                  {history.length > 0 ? (
                    <div className="application-history-list">
                      {history.map((entry, index) => (
                        <div
                          className="application-history-item"
                          key={entry.id || `${application.id}-${index}`}
                        >
                          <div className="application-history-dot" />

                          <div className="application-history-content">
                            <strong>
                              {STATUS_LABELS[entry.toStatus] ||
                                entry.toStatus ||
                                "Status updated"}
                            </strong>

                            <span>
                              {entry.fromStatus
                                ? `${STATUS_LABELS[entry.fromStatus] || entry.fromStatus} → ${STATUS_LABELS[entry.toStatus] || entry.toStatus}`
                                : "Application submitted"}
                            </span>

                            {entry.note && <p>{entry.note}</p>}

                            <small>
                              {formatDateTime(entry.createdAt)}
                              {entry.changedByRole &&
                                ` · ${entry.changedByRole === "EMPLOYER"
                                  ? "Employer"
                                  : entry.changedByRole === "STUDENT"
                                    ? "Candidate"
                                    : entry.changedByRole}`}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="application-history-empty">
                      No status history available.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* FOOTER NOTE */}

      <div className="applications-footer-note">
        <FileText size={15} />
        Candidate information, resumes and cover letters are
        accessible only to the employer that owns the opportunity.
      </div>

      {/* COVER LETTER PREVIEW MODAL */}

      {selectedApplication && (
        <div
          className="recruiter-cover-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCoverLetter();
            }
          }}
        >
          <section
            className="recruiter-cover-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recruiter-cover-title"
          >
            <div className="recruiter-cover-header">
              <div className="recruiter-cover-header-icon">
                <FileText size={23} />
              </div>

              <div className="recruiter-cover-header-text">
                <span>CANDIDATE APPLICATION</span>
                <h2 id="recruiter-cover-title">Cover Letter</h2>
                <p>
                  Review the candidate's introduction and motivation.
                </p>
              </div>

              <button
                type="button"
                className="recruiter-cover-close"
                onClick={closeCoverLetter}
                aria-label="Close cover letter"
              >
                <X size={21} />
              </button>
            </div>

            <div className="recruiter-cover-candidate">
              <div className="recruiter-cover-avatar">
                {(selectedApplication.user?.name || "S")
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="recruiter-cover-candidate-info">
                <strong>
                  {selectedApplication.user?.name || "Candidate"}
                </strong>

                <span>
                  {selectedApplication.user?.email ||
                    "Email not available"}
                </span>
              </div>

              <span
                className={`application-status ${getStatusClass(
                  selectedApplication.status
                )}`}
              >
                {STATUS_LABELS[selectedApplication.status] ||
                  selectedApplication.status}
              </span>
            </div>

            <div className="recruiter-cover-opportunity">
              <Building2 size={18} />

              <div>
                <span>APPLIED FOR</span>
                <strong>
                  {getApplicationOpportunity(selectedApplication).title ||
                    "Opportunity"}
                </strong>
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
                  <span>
                    {selectedApplication.user?.name || "Candidate"}
                  </span>
                </div>

                <div className="recruiter-cover-letter-body">
                  {selectedApplication.coverLetter
                    ?.split("\n")
                    .map((line, index) => (
                      <p key={index}>{line || "\u00A0"}</p>
                    ))}
                </div>

                <div className="recruiter-cover-paper-footer">
                  <span>
                    Submitted on{" "}
                    {formatDate(selectedApplication.appliedAt)}
                  </span>
                  <span>iSYNTARA APPLICATION</span>
                </div>
              </article>
            </div>

            <div className="recruiter-cover-footer">
              <div className="recruiter-cover-word-count">
                {selectedApplication.coverLetter
                  ?.trim()
                  .split(/\s+/)
                  .filter(Boolean).length || 0}{" "}
                words
              </div>

              <button
                type="button"
                className="recruiter-cover-done"
                onClick={closeCoverLetter}
              >
                Close Preview
              </button>
            </div>
          </section>
        </div>
      )}

      {/* CANDIDATE PROFILE MODAL */}

      {selectedProfileApplication &&
        (() => {
          const candidate = selectedProfileApplication.user || {};
          const profile = candidate.studentProfile || {};

          const experienceEntries = getWorkExperience(profile);
          const projectEntries = getCandidateProjects(profile);
          const certificationEntries =
            getCandidateCertifications(profile);

          const skills = getSkillArray(profile);

          const linkedinUrl = safeExternalUrl(profile.linkedinUrl);
          const portfolioUrl = safeExternalUrl(profile.portfolioUrl);

          const opportunity = getApplicationOpportunity(
            selectedProfileApplication
          );

          return (
            <div
              className="candidate-profile-overlay"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeCandidateProfile();
                }
              }}
            >
              <section
                className="candidate-profile-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="candidate-profile-title"
              >
                {/* HEADER */}

                <header className="candidate-profile-header">
                  <div className="candidate-profile-heading">
                    <span>CANDIDATE DETAILS</span>

                    <h2 id="candidate-profile-title">
                      Candidate Profile
                    </h2>

                    <p>
                      Review the candidate's education, experience
                      and professional links.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="candidate-profile-close"
                    onClick={closeCandidateProfile}
                    aria-label="Close candidate profile"
                  >
                    <X size={21} />
                  </button>
                </header>

                <div className="candidate-profile-scroll">
                  {/* IDENTITY */}

                  <div className="candidate-profile-identity">
                    <div className="candidate-profile-avatar">
                      {(candidate.name || "C")
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="candidate-profile-identity-text">
                      <h3>{candidate.name || "Candidate"}</h3>

                      {candidate.email ? (
                        <a href={`mailto:${candidate.email}`}>
                          <Mail size={15} />
                          {candidate.email}
                        </a>
                      ) : (
                        <span>Email not provided</span>
                      )}

                      <span className="candidate-profile-applied-role">
                        Applied for: {opportunity.title || "Opportunity"}
                      </span>
                    </div>

                    <span
                      className={`application-status ${getStatusClass(
                        selectedProfileApplication.status
                      )}`}
                    >
                      {STATUS_LABELS[selectedProfileApplication.status] ||
                        selectedProfileApplication.status}
                    </span>
                  </div>

                  {/* EDUCATION */}

                  <section className="candidate-profile-section">
                    <div className="candidate-profile-section-title">
                      <GraduationCap size={19} />
                      <h3>Education</h3>
                    </div>

                    <div className="candidate-profile-info-grid">
                      <div className="candidate-profile-info-item">
                        <span>University / Institution</span>
                        <strong>
                          {profile.university || "Not provided"}
                        </strong>
                      </div>

                      <div className="candidate-profile-info-item">
                        <span>Degree</span>
                        <strong>
                          {profile.degree || "Not provided"}
                        </strong>
                      </div>

                      <div className="candidate-profile-info-item">
                        <span>Branch / Specialization</span>
                        <strong>
                          {profile.branch || "Not provided"}
                        </strong>
                      </div>

                      <div className="candidate-profile-info-item">
                        <span>Graduation Year</span>
                        <strong>
                          {profile.graduationYear || "Not provided"}
                        </strong>
                      </div>
                    </div>
                  </section>

                  {/* WORK EXPERIENCE */}

                  <section className="candidate-profile-section">
                    <div className="candidate-profile-section-title">
                      <BriefcaseBusiness size={19} />
                      <h3>Work Experience</h3>

                      <span className="candidate-profile-section-count">
                        {experienceEntries.length}
                      </span>
                    </div>

                    {experienceEntries.length > 0 ? (
                      <div className="candidate-profile-experience-list">
                        {experienceEntries.map((experience, index) => {
                          const role = getExperienceField(experience, [
                            "jobTitle",
                            "title",
                            "position",
                            "role",
                            "designation",
                          ]);

                          const company = getExperienceField(experience, [
                            "company",
                            "companyName",
                            "organization",
                            "employer",
                          ]);

                          const location = getExperienceField(experience, [
                            "location",
                            "city",
                          ]);

                          const startDate = getExperienceField(experience, [
                            "startDate",
                            "from",
                            "start",
                          ]);

                          const endDate = getExperienceField(experience, [
                            "endDate",
                            "to",
                            "end",
                          ]);

                          const description = getExperienceField(
                            experience,
                            [
                              "description",
                              "responsibilities",
                              "details",
                              "summary",
                            ]
                          );

                          const employmentType = getExperienceField(
                            experience,
                            ["employmentType", "type"]
                          );

                          return (
                            <article
                              className="candidate-profile-experience-card"
                              key={`${selectedProfileApplication.id}-experience-${index}`}
                            >
                              <h4>
                                {role || company || `Experience ${index + 1}`}
                              </h4>

                              {role && company && <strong>{company}</strong>}

                              <div className="candidate-profile-experience-meta">
                                {location && <span>{location}</span>}

                                {employmentType && (
                                  <span>{employmentType}</span>
                                )}

                                {(startDate || endDate) && (
                                  <span>
                                    {startDate || "Start date not provided"}
                                    {" – "}
                                    {endDate || "Present"}
                                  </span>
                                )}
                              </div>

                              {description && <p>{description}</p>}

                              {!role && !company && !description && (
                                <p>
                                  {typeof experience === "string"
                                    ? experience
                                    : JSON.stringify(experience, null, 2)}
                                </p>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="candidate-profile-empty">
                        {profile.hasWorkExperience
                          ? "The candidate has indicated work experience, but no experience entries are available."
                          : "No work experience has been added to this profile."}
                      </p>
                    )}
                  </section>

                  {/* PROJECTS */}

                  <section className="candidate-profile-section">
                    <div className="candidate-profile-section-title">
                      <BriefcaseBusiness size={19} />
                      <h3>Projects</h3>

                      <span className="candidate-profile-section-count">
                        {projectEntries.length}
                      </span>
                    </div>

                    {projectEntries.length > 0 ? (
                      <div className="candidate-profile-experience-list">
                        {projectEntries.map((project, index) => {
                          const technologies = Array.isArray(
                            project.technologies
                          )
                            ? project.technologies
                            : typeof project.technologies === "string"
                              ? project.technologies
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean)
                              : [];

                          const projectUrl = safeExternalUrl(
                            project.projectUrl
                          );

                          const githubUrl = safeExternalUrl(
                            project.githubUrl
                          );

                          return (
                            <article
                              className="candidate-profile-experience-card"
                              key={`project-${index}`}
                            >
                              <h4>
                                {project.title || `Project ${index + 1}`}
                              </h4>

                              {(project.startDate || project.endDate) && (
                                <div className="candidate-profile-experience-meta">
                                  <span>
                                    {formatProfileDate(project.startDate) ||
                                      "Start date not provided"}
                                    {" – "}
                                    {formatProfileDate(project.endDate) ||
                                      "Present"}
                                  </span>
                                </div>
                              )}

                              {project.description && (
                                <p>{project.description}</p>
                              )}

                              {technologies.length > 0 && (
                                <div className="candidate-profile-skills">
                                  {technologies.map(
                                    (technology, technologyIndex) => (
                                      <span
                                        key={`${technology}-${technologyIndex}`}
                                      >
                                        {technology}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}

                              {(projectUrl || githubUrl) && (
                                <div className="candidate-profile-links">
                                  {projectUrl && (
                                    <a
                                      href={projectUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <Globe size={15} />
                                      Live Project
                                    </a>
                                  )}

                                  {githubUrl && (
                                    <a
                                      href={githubUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <Globe size={15} />
                                      GitHub Repository
                                    </a>
                                  )}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="candidate-profile-empty">
                        No projects have been added to this profile.
                      </p>
                    )}
                  </section>

                  {/* CERTIFICATIONS */}

                  <section className="candidate-profile-section">
                    <div className="candidate-profile-section-title">
                      <ShieldCheck size={19} />
                      <h3>Certifications</h3>

                      <span className="candidate-profile-section-count">
                        {certificationEntries.length}
                      </span>
                    </div>

                    {certificationEntries.length > 0 ? (
                      <div className="candidate-profile-experience-list">
                        {certificationEntries.map(
                          (certification, index) => {
                            const credentialUrl = safeExternalUrl(
                              certification.credentialUrl
                            );

                            return (
                              <article
                                className="candidate-profile-experience-card"
                                key={`certification-${index}`}
                              >
                                <h4>
                                  {certification.name ||
                                    `Certification ${index + 1}`}
                                </h4>

                                {certification.issuer && (
                                  <strong>{certification.issuer}</strong>
                                )}

                                <div className="candidate-profile-experience-meta">
                                  {certification.issueDate && (
                                    <span>
                                      Issued:{" "}
                                      {formatProfileDate(
                                        certification.issueDate
                                      )}
                                    </span>
                                  )}

                                  {certification.expiryDate && (
                                    <span>
                                      Expires:{" "}
                                      {formatProfileDate(
                                        certification.expiryDate
                                      )}
                                    </span>
                                  )}
                                </div>

                                {certification.credentialId && (
                                  <p>
                                    <strong>Credential ID:</strong>{" "}
                                    {certification.credentialId}
                                  </p>
                                )}

                                {credentialUrl && (
                                  <div className="candidate-profile-links">
                                    <a
                                      href={credentialUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <Globe size={15} />
                                      Verify Certificate
                                    </a>
                                  </div>
                                )}
                              </article>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <p className="candidate-profile-empty">
                        No certifications have been added to this profile.
                      </p>
                    )}
                  </section>

                  {/* SKILLS */}

                  <section className="candidate-profile-section">
                    <div className="candidate-profile-section-title">
                      <CheckCircle2 size={19} />
                      <h3>Skills</h3>
                    </div>

                    {skills.length > 0 ? (
                      <div className="candidate-profile-skills">
                        {skills.map((skill, index) => (
                          <span key={`${skill}-${index}`}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="candidate-profile-empty">
                        No skills have been added to this profile.
                      </p>
                    )}
                  </section>

                  {/* PROFESSIONAL LINKS */}

                  <section className="candidate-profile-section">
                    <div className="candidate-profile-section-title">
                      <Globe size={19} />
                      <h3>Professional Links</h3>
                    </div>

                    <div className="candidate-profile-links">
                      {linkedinUrl ? (
                        <a
                          href={linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Globe size={17} />
                          LinkedIn Profile
                        </a>
                      ) : (
                        <span>LinkedIn: Not provided</span>
                      )}

                      {portfolioUrl ? (
                        <a
                          href={portfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Globe size={17} />
                          Portfolio / Website
                        </a>
                      ) : (
                        <span>Portfolio: Not provided</span>
                      )}
                    </div>
                  </section>

                  {/* RESUME */}

                  <section className="candidate-profile-section candidate-profile-resume-section">
                    <div>
                      <div className="candidate-profile-section-title">
                        <FileText size={19} />
                        <h3>Resume</h3>
                      </div>

                      <p>
                        {profile.resumeUrl
                          ? "A resume is available for this candidate."
                          : "This candidate has not uploaded a resume."}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="resume-download-button"
                      onClick={() =>
                        downloadResume(selectedProfileApplication)
                      }
                      disabled={
                        !profile.resumeUrl ||
                        downloadingId === selectedProfileApplication.id
                      }
                    >
                      {downloadingId === selectedProfileApplication.id ? (
                        <LoaderCircle
                          size={16}
                          className="spinning"
                        />
                      ) : (
                        <Download size={16} />
                      )}

                      {downloadingId === selectedProfileApplication.id
                        ? "Downloading..."
                        : "Download Resume"}
                    </button>
                  </section>
                </div>

                {/* FOOTER */}

                <footer className="candidate-profile-footer">
                  <span>
                    Profile information supplied by the candidate.
                  </span>

                  <button
                    type="button"
                    onClick={closeCandidateProfile}
                  >
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