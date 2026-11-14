
import { useCallback, useEffect, useState } from "react";

import {
  BriefcaseBusiness,
  MapPin,
  Clock3,
  Users,
  CalendarDays,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  RefreshCw,
  Building2,
  IndianRupee,
  Globe,
} from "lucide-react";

import { apiRequest } from "../services/api";

import "./MyInternships.css";

// ==========================================
// FORM STATE
// ==========================================

const emptyForm = {
  title: "",
  location: "",
  remote: false,
  type: "",
  stipend: "",
  duration: "",
  roleOverview: "",
  responsibilities: "",
  benefits: "",
  qualifications: "",
  experience: "",
  mustHave: "",
  niceToHave: "",
  department: "",
  industry: "",
  applicationUrl: "",
  deadline: "",
};

// ==========================================
// DESCRIPTION SECTION MAPPING
// ==========================================

const DESCRIPTION_SECTIONS = {
  "ABOUT THE ROLE": "roleOverview",
  "ROLE": "roleOverview",
  "KEY RESPONSIBILITIES": "responsibilities",
  "RESPONSIBILITIES": "responsibilities",
  "COMPENSATION & BENEFITS": "benefits",
  "COMPENSATION AND BENEFITS": "benefits",
  "BENEFITS": "benefits",
  "WHAT WE OFFER": "benefits",
};

const REQUIREMENT_SECTIONS = {
  "EDUCATIONAL QUALIFICATIONS": "qualifications",
  "QUALIFICATIONS": "qualifications",
  "EXPERIENCE": "experience",
  "MUST HAVE": "mustHave",
  "NICE TO HAVE": "niceToHave",
  "SKILLS": "mustHave",
  "REQUIRED SKILLS": "mustHave",
  "PREFERRED SKILLS": "niceToHave",
  "ELIGIBILITY": "qualifications",
  "REQUIREMENTS": "mustHave",
  "DEPARTMENT": "department",
  "INDUSTRY": "industry",
};

// ==========================================
// DATE FORMATTER
// ==========================================

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ==========================================
// PARSE SAVED OPPORTUNITY TEXT
// ==========================================

function parseOpportunityText(value, sectionMap, fallbackKey) {
  const result = Object.fromEntries(
    Object.values(sectionMap).map((key) => [key, ""])
  );

  if (!value?.trim()) return result;

  const lines = value.split(/\r?\n/);
  const recognizedHeadings = new Set(Object.keys(sectionMap));

  let currentKey = null;
  let foundHeading = false;
  const fallbackLines = [];

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      if (currentKey && result[currentKey]) {
        result[currentKey] += "\n";
      } else {
        fallbackLines.push("");
      }

      return;
    }

    const normalized = line
      .replace(/[:：]$/, "")
      .trim()
      .toUpperCase();

    if (recognizedHeadings.has(normalized)) {
      currentKey = sectionMap[normalized];
      foundHeading = true;
      return;
    }

    if (currentKey) {
      result[currentKey] +=
        (result[currentKey] ? "\n" : "") + line;
    } else {
      fallbackLines.push(line);
    }
  });

  // Preserve old plain-text descriptions and requirements.
  if (!foundHeading && fallbackKey) {
    result[fallbackKey] = value.trim();
  } else if (fallbackLines.some(Boolean) && fallbackKey) {
    result[fallbackKey] = fallbackLines.join("\n").trim();
  }

  return result;
}

// ==========================================
// BUILD STRUCTURED TEXT FOR BACKEND
// ==========================================

function buildOpportunityText(form, sections) {
  return sections
    .map(([heading, key]) => {
      const value = form[key]?.trim();

      return value ? `${heading}\n${value}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

// ==========================================
// DISPLAY OPPORTUNITY CONTENT
// ==========================================

const DISPLAY_HEADINGS = new Set([
  "ABOUT THE ROLE",
  "ROLE",
  "KEY RESPONSIBILITIES",
  "RESPONSIBILITIES",
  "COMPENSATION & BENEFITS",
  "COMPENSATION AND BENEFITS",
  "EDUCATIONAL QUALIFICATIONS",
  "QUALIFICATIONS",
  "EXPERIENCE",
  "MUST HAVE",
  "NICE TO HAVE",
  "SKILLS",
  "REQUIRED SKILLS",
  "PREFERRED SKILLS",
  "ELIGIBILITY",
  "REQUIREMENTS",
  "WHAT YOU WILL DO",
  "WHAT WE OFFER",
  "ABOUT THE COMPANY",
  "BENEFITS",
  "DEPARTMENT",
  "INDUSTRY",
]);

function OpportunityContent({ value, fallbackTitle }) {
  if (!value?.trim()) {
    return (
      <p className="opportunity-content-empty">
        No information provided.
      </p>
    );
  }

  const lines = value.split(/\r?\n/);
  const sections = [];

  let current = {
    title: fallbackTitle,
    lines: [],
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) return;

    const normalized = line
      .replace(/[:：]$/, "")
      .trim()
      .toUpperCase();

    if (DISPLAY_HEADINGS.has(normalized)) {
      if (current.lines.length) {
        sections.push(current);
      }

      current = {
        title: normalized,
        lines: [],
      };
    } else {
      current.lines.push(line);
    }
  });

  if (current.lines.length) {
    sections.push(current);
  }

  return (
    <div className="opportunity-content-sections">
      {sections.map((section, index) => {
        const bullets = section.lines.filter((line) =>
          /^[-•*]\s/.test(line)
        );

        const paragraphs = section.lines.filter(
          (line) => !/^[-•*]\s/.test(line)
        );

        return (
          <section
            className="opportunity-content-section"
            key={`${section.title}-${index}`}
          >
            <h4>{section.title}</h4>

            {paragraphs.map((line, lineIndex) => (
              <p key={lineIndex}>{line}</p>
            ))}

            {bullets.length > 0 && (
              <ul>
                {bullets.map((line, bulletIndex) => (
                  <li key={bulletIndex}>
                    {line.replace(/^[-•*]\s/, "")}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ==========================================
// OPPORTUNITY TYPE
// ==========================================

function getOpportunityType(internship) {
  return (
    internship.internshipType ||
    internship.type ||
    "Opportunity"
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

function MyInternships({ onStatsChange }) {
  const [internships, setInternships] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingInternship, setEditingInternship] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState(null);

  // ==========================================
  // LOAD OPPORTUNITIES
  // ==========================================

  const loadInternships = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await apiRequest("/employer/internships");

      const list = Array.isArray(data.internships)
        ? data.internships
        : [];

      setInternships(list);

      const totalApplications = list.reduce(
        (total, internship) =>
          total + (internship._count?.applications || 0),
        0
      );

      onStatsChange?.({
        total: list.length,
        active: list.filter((item) => item.isActive).length,
        applications: totalApplications,
      });
    } catch (err) {
      setError(
        err.message || "Unable to load your opportunities."
      );

      onStatsChange?.({
        total: 0,
        active: 0,
        applications: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onStatsChange]);

  useEffect(() => {
    loadInternships();
  }, [loadInternships]);

  // ==========================================
  // OPEN OPPORTUNITY EDITOR
  // ==========================================

  const openEditor = (internship) => {
    const description = parseOpportunityText(
      internship.description,
      DESCRIPTION_SECTIONS,
      "roleOverview"
    );

    const requirements = parseOpportunityText(
      internship.requirements,
      REQUIREMENT_SECTIONS,
      "mustHave"
    );

    setEditingInternship(internship);

    setForm({
      ...emptyForm,

      title: internship.title || "",
      location: internship.location || "",
      remote: Boolean(internship.isRemote),
      type: internship.internshipType || "",
      stipend: internship.stipend || "",
      duration: internship.duration || "",

      roleOverview: description.roleOverview || "",
      responsibilities: description.responsibilities || "",
      benefits: description.benefits || "",

      qualifications: requirements.qualifications || "",
      experience: requirements.experience || "",
      mustHave: requirements.mustHave || "",
      niceToHave: requirements.niceToHave || "",
      department: requirements.department || "",
      industry: requirements.industry || "",

      applicationUrl: internship.applicationUrl || "",
      deadline: getDateInputValue(internship.deadline),
    });

    setError("");
    setSuccess("");
  };

  // ==========================================
  // CLOSE EDITOR
  // ==========================================

  const closeEditor = () => {
    if (saving) return;

    setEditingInternship(null);
    setForm(emptyForm);
  };

  // ==========================================
  // FORM INPUT HANDLING
  // ==========================================

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ==========================================
  // UPDATE OPPORTUNITY
  // ==========================================

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingInternship) return;

    if (
      !form.title.trim() ||
      !form.roleOverview.trim()
    ) {
      setError(
        "Opportunity title and role overview are required."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const description = buildOpportunityText(form, [
      ["ABOUT THE ROLE", "roleOverview"],
      ["KEY RESPONSIBILITIES", "responsibilities"],
      ["COMPENSATION & BENEFITS", "benefits"],
    ]);

    const requirements = buildOpportunityText(form, [
      ["EDUCATIONAL QUALIFICATIONS", "qualifications"],
      ["EXPERIENCE", "experience"],
      ["MUST HAVE", "mustHave"],
      ["NICE TO HAVE", "niceToHave"],
      ["DEPARTMENT", "department"],
      ["INDUSTRY", "industry"],
    ]);

    try {
      await apiRequest(
        `/employer/internships/${editingInternship.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: form.title.trim(),
            description,
            location: form.location.trim(),
            remote: form.remote,
            type: form.type.trim(),
            stipend: form.stipend.trim(),
            duration: form.duration.trim(),
            requirements,
            applicationUrl: form.applicationUrl.trim(),
            deadline: form.deadline || null,
          }),
        }
      );

      setEditingInternship(null);
      setForm(emptyForm);

      setSuccess("Opportunity updated successfully.");

      await loadInternships(true);
    } catch (err) {
      setError(
        err.message || "Unable to update opportunity."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // CLOSE OPPORTUNITY
  // ==========================================

  const handleCloseInternship = async (internship) => {
    const confirmed = window.confirm(
      `Are you sure you want to close "${internship.title}"? Students will no longer be able to apply to this opportunity.`
    );

    if (!confirmed) return;

    setClosingId(internship.id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(
        `/employer/internships/${internship.id}/close`,
        {
          method: "PATCH",
        }
      );

      setSuccess(
        `"${internship.title}" has been closed.`
      );

      await loadInternships(true);
    } catch (err) {
      setError(
        err.message || "Unable to close this opportunity."
      );
    } finally {
      setClosingId(null);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section
      className="my-internships-section"
      id="my-internships"
    >

      {/* ======================================
          PAGE HEADING
      ====================================== */}

      <div className="my-internships-heading">
        <div>
          <div className="employer-eyebrow">
            <span />
            OPPORTUNITY MANAGEMENT
          </div>

          <h2>My Opportunities</h2>

          <p>
            Manage your published jobs, internships, research
            roles, and engineering opportunities.
          </p>
        </div>

        <button
          type="button"
          className="my-internships-refresh"
          onClick={() => loadInternships(true)}
          disabled={refreshing || loading}
        >
          <RefreshCw
            size={16}
            className={
              refreshing ? "my-internships-spinning" : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* ======================================
          ALERTS
      ====================================== */}

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

      {/* ======================================
          LOADING / EMPTY / LIST
      ====================================== */}

      {loading ? (
        <div className="my-internships-loading">
          <LoaderCircle
            className="my-internships-spinning"
            size={26}
          />

          <span>Loading your opportunities...</span>
        </div>

      ) : internships.length === 0 ? (

        <div className="my-internships-empty">
          <div className="my-internships-empty-icon">
            <BriefcaseBusiness size={30} />
          </div>

          <h3>No opportunities published yet</h3>

          <p>
            Your published opportunities will appear here.
            Create your first listing to start connecting
            with engineering candidates.
          </p>

          <button
            type="button"
            onClick={() =>
              document.getElementById("post-internship")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            Post your first opportunity
          </button>
        </div>

      ) : (

        /* ======================================
            DETAILED OPPORTUNITY LIST
        ====================================== */

        <div className="my-internships-list opportunity-list-detailed">

          {internships.map((internship) => (

            <article
              className="my-internship-card opportunity-detail-card"
              key={internship.id}
            >

              {/* OPPORTUNITY HEADER */}

              <div className="opportunity-detail-header">
                <div className="my-internship-title-area">

                  <div className="my-internship-icon">
                    <BriefcaseBusiness size={23} />
                  </div>

                  <div>
                    <span className="opportunity-category-label">
                      {getOpportunityType(internship)}
                    </span>

                    <h3>{internship.title}</h3>

                    <div className="my-internship-company">
                      <Building2 size={14} />
                      {internship.company?.name || "Your company"}
                    </div>
                  </div>

                </div>

                <span
                  className={`my-internship-status ${
                    internship.isActive ? "active" : "closed"
                  }`}
                >
                  <span />
                  {internship.isActive ? "Active" : "Closed"}
                </span>
              </div>

              {/* JOB INFORMATION */}

              <section className="opportunity-information-panel">

                <div className="opportunity-information-heading">
                  <BriefcaseBusiness size={17} />
                  <h4>Job Information</h4>
                </div>

                <div className="opportunity-information-grid">

                  <div>
                    <span>LOCATION</span>

                    <strong>
                      <MapPin size={15} />
                      {internship.isRemote
                        ? "Remote"
                        : internship.location || "Not specified"}
                    </strong>
                  </div>

                  <div>
                    <span>OPPORTUNITY TYPE</span>

                    <strong>
                      <BriefcaseBusiness size={15} />
                      {getOpportunityType(internship)}
                    </strong>
                  </div>

                  <div>
                    <span>COMPENSATION</span>

                    <strong>
                      <IndianRupee size={15} />
                      {internship.stipend || "Not disclosed"}
                    </strong>
                  </div>

                  <div>
                    <span>DURATION</span>

                    <strong>
                      <Clock3 size={15} />
                      {internship.duration || "Not specified"}
                    </strong>
                  </div>

                  <div>
                    <span>APPLICATION DEADLINE</span>

                    <strong>
                      <CalendarDays size={15} />
                      {formatDate(internship.deadline)}
                    </strong>
                  </div>

                  <div>
                    <span>APPLICATIONS RECEIVED</span>

                    <strong>
                      <Users size={15} />
                      {internship._count?.applications || 0}
                    </strong>
                  </div>

                </div>
              </section>

              {/* ROLE DESCRIPTION */}

              <section className="opportunity-detail-body">

                <div className="opportunity-detail-section-heading">
                  <span>01</span>
                  <h4>About this opportunity</h4>
                </div>

                <OpportunityContent
                  value={internship.description}
                  fallbackTitle="Role description"
                />

              </section>

              {/* CANDIDATE REQUIREMENTS */}

              {internship.requirements && (
                <section className="opportunity-detail-body">

                  <div className="opportunity-detail-section-heading">
                    <span>02</span>
                    <h4>Candidate qualifications</h4>
                  </div>

                  <OpportunityContent
                    value={internship.requirements}
                    fallbackTitle="Requirements"
                  />

                </section>
              )}

              {/* EXTERNAL APPLICATION LINK */}

              {internship.applicationUrl && (
                <div className="opportunity-application-link">

                  <Globe size={16} />

                  <div>
                    <span>EXTERNAL APPLICATION LINK</span>

                    <a
                      href={internship.applicationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {internship.applicationUrl}
                    </a>
                  </div>

                </div>
              )}

              {/* OPPORTUNITY FOOTER */}

              <div className="my-internship-card-footer opportunity-detail-footer">

                <div className="opportunity-published-info">
                  <span>LISTING PUBLISHED</span>

                  <strong>
                    {formatDate(internship.createdAt)}
                  </strong>
                </div>

                <div className="my-internship-actions">

                  <button
                    type="button"
                    className="my-internship-edit-button"
                    onClick={() => openEditor(internship)}
                  >
                    <Pencil size={15} />
                    Edit opportunity
                  </button>

                  {internship.isActive && (
                    <button
                      type="button"
                      className="my-internship-close-button"
                      onClick={() => handleCloseInternship(internship)}
                      disabled={closingId === internship.id}
                    >
                      {closingId === internship.id ? (
                        <LoaderCircle
                          size={15}
                          className="my-internships-spinning"
                        />
                      ) : (
                        <X size={15} />
                      )}

                      Close opportunity
                    </button>
                  )}

                </div>
              </div>

            </article>
          ))}

        </div>
      )}

      {/* ========================================
          STRUCTURED EDIT OPPORTUNITY MODAL
      ======================================== */}

      {editingInternship && (

        <div
          className="my-internship-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeEditor();
            }
          }}
        >

          <div
            className="my-internship-modal opportunity-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="my-internship-edit-title"
          >

            {/* MODAL HEADER */}

            <div className="my-internship-modal-header">

              <div>
                <span>OPPORTUNITY MANAGEMENT</span>

                <h3 id="my-internship-edit-title">
                  Edit Opportunity
                </h3>

                <p>
                  Update the details of your published opportunity.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                aria-label="Close edit form"
              >
                <X size={20} />
              </button>

            </div>

            {/* EDIT FORM */}

            <form
              className="my-internship-edit-form opportunity-edit-form"
              onSubmit={handleUpdate}
            >

              {/* BASIC INFORMATION */}

              <div className="opportunity-edit-section">

                <h4>01. Basic information</h4>

                <label>
                  Opportunity title *

                  <input
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    placeholder="e.g. CAE Simulation Engineer"
                    required
                  />
                </label>

                <div className="my-internship-edit-grid">

                  <label>
                    Location

                    <input
                      name="location"
                      value={form.location}
                      onChange={handleFormChange}
                      placeholder="e.g. Ahmedabad, India"
                    />
                  </label>

                  <label>
                    Opportunity type

                    <input
                      name="type"
                      value={form.type}
                      onChange={handleFormChange}
                      placeholder="e.g. Full-time, Internship"
                    />
                  </label>

                  <label>
                    Compensation

                    <input
                      name="stipend"
                      value={form.stipend}
                      onChange={handleFormChange}
                      placeholder="e.g. ₹6 LPA"
                    />
                  </label>

                  <label>
                    Duration / Contract term

                    <input
                      name="duration"
                      value={form.duration}
                      onChange={handleFormChange}
                      placeholder="e.g. Permanent or 6 months"
                    />
                  </label>

                </div>

                <label className="my-internship-remote-toggle">

                  <input
                    type="checkbox"
                    name="remote"
                    checked={form.remote}
                    onChange={handleFormChange}
                  />

                  <span>Remote opportunity</span>

                </label>

              </div>

              {/* ROLE DESCRIPTION */}

              <div className="opportunity-edit-section">

                <h4>02. About the role</h4>

                <label>
                  Role overview *

                  <textarea
                    name="roleOverview"
                    value={form.roleOverview}
                    onChange={handleFormChange}
                    rows={6}
                    placeholder="Describe the position, purpose and what the candidate will work on..."
                    required
                  />
                </label>

                <label>
                  Key responsibilities

                  <textarea
                    name="responsibilities"
                    value={form.responsibilities}
                    onChange={handleFormChange}
                    rows={7}
                    placeholder={"Develop and execute simulation models\nPerform structural analysis\nInterpret results and recommend improvements"}
                  />
                </label>

              </div>

              {/* QUALIFICATIONS */}

              <div className="opportunity-edit-section">

                <h4>03. Candidate qualifications</h4>

                <label>
                  Educational qualifications

                  <textarea
                    name="qualifications"
                    value={form.qualifications}
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="Degree and educational requirements..."
                  />
                </label>

                <label>
                  Required experience

                  <input
                    name="experience"
                    value={form.experience}
                    onChange={handleFormChange}
                    placeholder="e.g. 3–5 years of LS-DYNA experience"
                  />
                </label>

                <label>
                  Must-have skills

                  <textarea
                    name="mustHave"
                    value={form.mustHave}
                    onChange={handleFormChange}
                    rows={4}
                    placeholder="Essential skills and requirements..."
                  />
                </label>

                <label>
                  Nice-to-have qualifications

                  <textarea
                    name="niceToHave"
                    value={form.niceToHave}
                    onChange={handleFormChange}
                    rows={4}
                    placeholder="Additional desirable experience..."
                  />
                </label>

              </div>

              {/* ADDITIONAL INFORMATION */}

              <div className="opportunity-edit-section">

                <h4>04. Additional information</h4>

                <div className="my-internship-edit-grid">

                  <label>
                    Department / Team

                    <input
                      name="department"
                      value={form.department}
                      onChange={handleFormChange}
                      placeholder="e.g. Structures & Simulation"
                    />
                  </label>

                  <label>
                    Industry

                    <input
                      name="industry"
                      value={form.industry}
                      onChange={handleFormChange}
                      placeholder="e.g. Space Technology"
                    />
                  </label>

                </div>

                <label>
                  Compensation and benefits

                  <textarea
                    name="benefits"
                    value={form.benefits}
                    onChange={handleFormChange}
                    rows={4}
                    placeholder={"Health insurance\nProvident fund\nProfessional development"}
                  />
                </label>

              </div>

              {/* APPLICATION SETTINGS */}

              <div className="opportunity-edit-section">

                <h4>05. Application settings</h4>

                <div className="my-internship-edit-grid">

                  <label>
                    Application deadline

                    <input
                      type="date"
                      name="deadline"
                      value={form.deadline}
                      onChange={handleFormChange}
                    />
                  </label>

                  <label>
                    External application URL

                    <input
                      type="url"
                      name="applicationUrl"
                      value={form.applicationUrl}
                      onChange={handleFormChange}
                      placeholder="https://..."
                    />
                  </label>

                </div>

              </div>

              {/* MODAL FOOTER */}

              <div className="my-internship-modal-footer">

                <button
                  type="button"
                  className="my-internship-cancel-button"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="my-internship-save-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="my-internships-spinning"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Save changes
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </section>
  );
}

export default MyInternships;
