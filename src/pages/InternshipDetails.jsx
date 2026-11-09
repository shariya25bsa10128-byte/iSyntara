import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  ArrowUpRight,
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Factory,
  Globe,
  GraduationCap,
  IndianRupee,
  LoaderCircle,
  MapPin,
  Rocket,
  Send,
  BriefcaseBusiness,
  X,
  FileText,
  Eye,
  Pencil,
  UserRound,
} from "lucide-react";

import { apiRequest } from "../services/api";
import "./InternshipDetails.css";

const MIN_COVER_LETTER_LENGTH = 100;
const MAX_COVER_LETTER_LENGTH = 10000;

function formatDate(date) {
  if (!date) return "Not specified";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not specified";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getCompensation(compensation) {
  if (
    compensation === null ||
    compensation === undefined ||
    compensation === ""
  ) {
    return "Not disclosed";
  }

  if (typeof compensation === "number") {
    return `₹${compensation.toLocaleString("en-IN")}/month`;
  }

  return compensation;
}

function getRequirements(requirements) {
  if (!requirements) return [];

  if (Array.isArray(requirements)) {
    return requirements.filter(Boolean);
  }

  if (typeof requirements === "string") {
    return requirements
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function InternshipDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [internship, setInternship] = useState(null);
  const [applied, setApplied] = useState(false);

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // COVER LETTER STATE
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  // ==========================================
  // LOAD OPPORTUNITY DETAILS
  // ==========================================

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [detailsData, applicationsData] = await Promise.all([
        apiRequest(`/internships/${id}`),
        apiRequest("/applications/my"),
      ]);

      setInternship(
        detailsData.internship || detailsData.opportunity
      );

      const existingApplications =
        applicationsData.applications || [];

      setApplied(
        existingApplications.some(
          (application) =>
            application.internshipId === id ||
            application.opportunityId === id ||
            application.internship?.id === id ||
            application.opportunity?.id === id
        )
      );
    } catch (err) {
      setError(
        err.message || "Unable to load opportunity details."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // ==========================================
  // OPEN COVER LETTER EDITOR
  // ==========================================

  const openCoverLetterEditor = () => {
    if (!internship || applied || applying) return;

    setCoverLetter("");
    setPreviewMode(false);
    setError("");
    setSuccess("");
    setShowCoverLetter(true);
  };

  // ==========================================
  // CLOSE COVER LETTER EDITOR
  // ==========================================

  const closeCoverLetterEditor = () => {
    if (applying) return;

    setShowCoverLetter(false);
    setPreviewMode(false);
  };

  // ==========================================
  // COVER LETTER WORD COUNT
  // ==========================================

  const wordCount = coverLetter
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const characterCount = coverLetter.trim().length;

  const isCoverLetterValid =
    characterCount >= MIN_COVER_LETTER_LENGTH &&
    characterCount <= MAX_COVER_LETTER_LENGTH;

  // ==========================================
  // SUBMIT APPLICATION
  // ==========================================

  const handleApply = async () => {
    if (!internship || applied || applying) return;

    if (!isCoverLetterValid) {
      setError(
        `Your cover letter must contain between ${MIN_COVER_LETTER_LENGTH} and ${MAX_COVER_LETTER_LENGTH.toLocaleString("en-IN")} characters.`
      );
      setPreviewMode(false);
      return;
    }

    try {
      setApplying(true);
      setError("");
      setSuccess("");

      await apiRequest(`/applications/${internship.id}`, {
        method: "POST",
        body: JSON.stringify({
          coverLetter: coverLetter.trim(),
        }),
      });

      setApplied(true);
      setShowCoverLetter(false);
      setPreviewMode(false);

      setSuccess(
        "Your application and cover letter have been submitted successfully."
      );
    } catch (err) {
      setError(
        err.message || "Unable to submit your application."
      );
    } finally {
      setApplying(false);
    }
  };

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (loading) {
    return (
      <main className="internship-details-page">
        <div className="details-loading">
          <LoaderCircle size={34} className="details-spin" />
          <p>LOADING OPPORTUNITY DETAILS...</p>
        </div>
      </main>
    );
  }

  // ==========================================
  // ERROR STATE
  // ==========================================

  if (error && !internship) {
    return (
      <main className="internship-details-page">
        <div className="details-error-state">
          <AlertCircle size={35} />
          <h2>Opportunity unavailable</h2>
          <p>{error}</p>

          <button
            type="button"
            onClick={() => navigate("/student/dashboard")}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!internship) return null;

  const company = internship.company || {};
  const requirements = getRequirements(internship.requirements);

  const companyName = company.name || "Company";

  const compensation = getCompensation(
    internship.compensation ?? internship.stipend
  );

  return (
    <main className="internship-details-page">
      <div className="internship-details-container">

        {/* BACK BUTTON */}

        <button
          type="button"
          className="details-back-button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={17} />
          Back
        </button>

        {/* ALERTS */}

        {error && !showCoverLetter && (
          <div className="details-alert details-alert-error">
            <AlertCircle size={17} />
            {error}
          </div>
        )}

        {success && (
          <div className="details-alert details-alert-success">
            <CheckCircle2 size={17} />
            {success}
          </div>
        )}

        {/* OPPORTUNITY HERO */}

        <section className="details-hero">

          <div className="details-hero-main">

            <div className="details-company-brand">

              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={`${companyName} logo`}
                  className="details-company-logo"
                />
              ) : (
                <div className="details-company-placeholder">
                  <Building2 size={28} />
                </div>
              )}

              <div>
                <span className="details-eyebrow">
                  OPPORTUNITY BY
                </span>

                <h2>{companyName}</h2>
              </div>

            </div>

            <span className="details-category">
              <Rocket size={14} />
              CAREER OPPORTUNITY
            </span>

            <h1>{internship.title}</h1>

            <p className="details-hero-description">
              {internship.description ||
                "Explore this opportunity and gain valuable industry experience."}
            </p>

            <div className="details-tags">

              <span>
                <MapPin size={15} />
                {internship.isRemote
                  ? "Remote"
                  : internship.location || "Location not specified"}
              </span>

              <span>
                <BriefcaseBusiness size={15} />
                {internship.employmentType ||
                  internship.internshipType ||
                  "Opportunity"}
              </span>

              <span>
                <Clock3 size={15} />
                {internship.duration || "Duration not specified"}
              </span>

            </div>

          </div>

          {/* COMPENSATION AND APPLICATION CARD */}

          <aside className="details-apply-card">

            <span className="details-eyebrow">
              COMPENSATION
            </span>

            <div className="details-stipend">
              <IndianRupee size={25} />
              <strong>{compensation}</strong>
            </div>

            <div className="details-apply-divider" />

            <div className="details-deadline">
              <CalendarDays size={18} />

              <div>
                <span>APPLICATION DEADLINE</span>
                <strong>
                  {formatDate(internship.deadline)}
                </strong>
              </div>
            </div>

            <div className="details-deadline">
              <Clock3 size={18} />

              <div>
                <span>POSTED ON</span>
                <strong>
                  {formatDate(internship.createdAt)}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className={`details-apply-button ${
                applied ? "is-applied" : ""
              }`}
              disabled={
                applied ||
                applying ||
                internship.isActive === false
              }
              onClick={openCoverLetterEditor}
            >

              {applied ? (
                <>
                  <CheckCircle2 size={17} />
                  Application Submitted
                </>
              ) : internship.isActive === false ? (
                "Applications Closed"
              ) : (
                <>
                  <Send size={17} />
                  Apply Now
                </>
              )}

            </button>

            <p className="details-apply-note">
              {applied
                ? "You have already applied for this opportunity."
                : "You'll be able to write and review your cover letter before submitting."}
            </p>

          </aside>

        </section>

        {/* OPPORTUNITY INFORMATION */}

        <div className="details-content-grid">

          <div className="details-main-column">

            {/* OVERVIEW */}

            <section className="details-content-card">

              <div className="details-section-heading">
                <span>01</span>

                <div>
                  <span className="details-eyebrow">
                    OPPORTUNITY OVERVIEW
                  </span>

                  <h2>About this Opportunity</h2>
                </div>
              </div>

              <p className="details-long-description">
                {internship.description ||
                  "No additional description has been provided by the employer."}
              </p>

            </section>

            {/* REQUIREMENTS */}

            <section className="details-content-card">

              <div className="details-section-heading">
                <span>02</span>

                <div>
                  <span className="details-eyebrow">
                    WHAT YOU NEED
                  </span>

                  <h2>Requirements & Skills</h2>
                </div>
              </div>

              {requirements.length > 0 ? (
                <ul className="details-requirements-list">

                  {requirements.map((requirement, index) => (
                    <li key={`${index}-${requirement}`}>
                      <CheckCircle2 size={17} />
                      <span>{requirement}</span>
                    </li>
                  ))}

                </ul>
              ) : (
                <p className="details-muted-text">
                  The employer has not specified any requirements.
                  Contact the company for further information.
                </p>
              )}

            </section>

            {/* COMPANY INFORMATION */}

            <section className="details-content-card">

              <div className="details-section-heading">
                <span>03</span>

                <div>
                  <span className="details-eyebrow">
                    COMPANY PROFILE
                  </span>

                  <h2>About {companyName}</h2>
                </div>
              </div>

              <div className="details-company-information">

                <div className="details-company-information-icon">
                  <Factory size={23} />
                </div>

                <div>
                  <h3>{companyName}</h3>

                  <p>
                    {company.description ||
                      "Company information has not been provided yet."}
                  </p>
                </div>

              </div>

              <div className="details-company-meta">

                {company.industry && (
                  <span>
                    <Factory size={16} />
                    {company.industry}
                  </span>
                )}

                {company.location && (
                  <span>
                    <MapPin size={16} />
                    {company.location}
                  </span>
                )}

                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe size={16} />
                    Company Website
                    <ExternalLink size={13} />
                  </a>
                )}

              </div>

            </section>

          </div>

          {/* SIDEBAR */}

          <aside className="details-sidebar">

            <section className="details-sidebar-card">

              <span className="details-eyebrow">
                QUICK INFORMATION
              </span>

              <h3>Opportunity Snapshot</h3>

              <div className="details-snapshot-item">
                <IndianRupee size={18} />

                <div>
                  <span>Compensation</span>
                  <strong>{compensation}</strong>
                </div>
              </div>

              <div className="details-snapshot-item">
                <Clock3 size={18} />

                <div>
                  <span>Duration</span>

                  <strong>
                    {internship.duration || "Not specified"}
                  </strong>
                </div>
              </div>

              <div className="details-snapshot-item">
                <MapPin size={18} />

                <div>
                  <span>Work Location</span>

                  <strong>
                    {internship.isRemote
                      ? "Remote"
                      : internship.location || "Not specified"}
                  </strong>
                </div>
              </div>

              <div className="details-snapshot-item">
                <GraduationCap size={18} />

                <div>
                  <span>Opportunity Type</span>

                  <strong>
                    {internship.employmentType ||
                      internship.internshipType ||
                      internship.category ||
                      "Opportunity"}
                  </strong>
                </div>
              </div>

            </section>

            {/* CAREER HELP */}

            <section className="details-sidebar-card details-help-card">

              <div className="details-help-icon">
                <Rocket size={23} />
              </div>

              <h3>Ready to launch your career?</h3>

              <p>
                Take the next step toward gaining real-world
                engineering experience.
              </p>

              <Link to="/student/dashboard#my-applications">
                Track your applications
                <ArrowUpRight size={16} />
              </Link>

            </section>

          </aside>

        </div>

        {/* BOTTOM NAVIGATION */}

        <div className="details-bottom-action">

          <button
            type="button"
            onClick={() => navigate("/student/dashboard")}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          <span>
            ISYNTARA <span>•</span> ENGINEERING CAREER NETWORK
          </span>

        </div>

      </div>

      {/* ======================================
          COVER LETTER BUILDER MODAL
      ====================================== */}

      {showCoverLetter && (

        <div
          className="cover-letter-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCoverLetterEditor();
            }
          }}
        >

          <section
            className="cover-letter-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cover-letter-title"
          >

            {/* MODAL HEADER */}

            <div className="cover-letter-header">

              <div className="cover-letter-header-icon">
                <FileText size={23} />
              </div>

              <div className="cover-letter-header-text">
                <span>APPLICATION WORKSPACE</span>

                <h2 id="cover-letter-title">
                  Your Cover Letter
                </h2>

                <p>
                  Make your first impression count.
                </p>
              </div>

              <button
                type="button"
                className="cover-letter-close"
                onClick={closeCoverLetterEditor}
                disabled={applying}
                aria-label="Close cover letter editor"
              >
                <X size={21} />
              </button>

            </div>

            {/* OPPORTUNITY INFORMATION */}

            <div className="cover-letter-opportunity">

              <div className="cover-letter-company-icon">
                <Building2 size={20} />
              </div>

              <div>
                <strong>{internship.title}</strong>
                <span>{companyName}</span>
              </div>

            </div>

            {/* EDITOR / PREVIEW TABS */}

            <div className="cover-letter-tabs">

              <button
                type="button"
                className={!previewMode ? "active" : ""}
                onClick={() => {
                  setPreviewMode(false);
                  setError("");
                }}
              >
                <Pencil size={15} />
                Write Letter
              </button>

              <button
                type="button"
                className={previewMode ? "active" : ""}
                onClick={() => {
                  if (!isCoverLetterValid) {
                    setError(
                      "Please write at least 100 characters before previewing your letter."
                    );
                    return;
                  }

                  setError("");
                  setPreviewMode(true);
                }}
              >
                <Eye size={15} />
                Preview
              </button>

            </div>

            {/* MODAL CONTENT */}

            <div className="cover-letter-content">

              {!previewMode ? (

                <>

                  <div className="cover-letter-writing-heading">

                    <h3>Introduce yourself</h3>

                    <p>
                      Tell the employer why you're interested
                      and what makes you a strong candidate.
                    </p>

                  </div>

                  <label
                    htmlFor="cover-letter-input"
                    className="cover-letter-label"
                  >
                    COVER LETTER
                  </label>

                  <textarea
                    id="cover-letter-input"
                    className="cover-letter-textarea"
                    value={coverLetter}
                    onChange={(event) => {
                      setCoverLetter(
                        event.target.value.slice(
                          0,
                          MAX_COVER_LETTER_LENGTH
                        )
                      );

                      setError("");
                    }}
                    placeholder={`Dear Hiring Team,

I am writing to express my interest in the ${internship.title} opportunity at ${companyName}.

Explain why this opportunity interests you, describe your relevant skills and projects, and show how you could contribute to the organization.

I would welcome the opportunity to discuss how my background and enthusiasm align with your team's needs.

Sincerely,
Your Name`}
                    maxLength={MAX_COVER_LETTER_LENGTH}
                  />

                  <div className="cover-letter-counter">

                    <span
                      className={
                        characterCount < MIN_COVER_LETTER_LENGTH
                          ? "counter-warning"
                          : "counter-valid"
                      }
                    >
                      {wordCount} words
                    </span>

                    <span>
                      {characterCount.toLocaleString("en-IN")} /{" "}
                      {MAX_COVER_LETTER_LENGTH.toLocaleString("en-IN")} characters
                    </span>

                  </div>

                  <div className="cover-letter-writing-tip">

                    <AlertCircle size={16} />

                    <p>
                      Keep your letter relevant to this opportunity.
                      Mention your motivation, relevant skills,
                      experience and what you can contribute.
                    </p>

                  </div>

                  <div className="cover-letter-validation">

                    {characterCount < MIN_COVER_LETTER_LENGTH ? (
                      <span>
                        Write at least{" "}
                        {MIN_COVER_LETTER_LENGTH - characterCount} more
                        characters to continue.
                      </span>
                    ) : (
                      <span>
                        <CheckCircle2 size={15} />
                        Your cover letter meets the minimum length.
                      </span>
                    )}

                  </div>

                </>

              ) : (

                /* PREVIEW */

                <div className="cover-letter-preview-section">

                  <div className="cover-letter-preview-toolbar">

                    <div>
                      <span>DOCUMENT PREVIEW</span>
                      <h3>Review your letter</h3>
                    </div>

                    <span className="cover-letter-preview-status">
                      <CheckCircle2 size={14} />
                      Ready to review
                    </span>

                  </div>

                  <article className="cover-letter-paper">

                    <div className="cover-letter-paper-brand">
                      <span>APPLICATION LETTER</span>
                      <span>iSYNTARA</span>
                    </div>

                    <div className="cover-letter-paper-divider" />

                    <div className="cover-letter-paper-recipient">
                      <strong>To: Hiring Team</strong>
                      <span>{companyName}</span>
                      <span>{internship.title}</span>
                    </div>

                    <div className="cover-letter-paper-body">
                      {coverLetter.split("\n").map((line, index) => (
                        <p key={index}>
                          {line || "\u00A0"}
                        </p>
                      ))}
                    </div>

                    <div className="cover-letter-paper-footer">
                      <span>Submitted through iSyntara</span>
                    </div>

                  </article>

                  <button
                    type="button"
                    className="cover-letter-edit-button"
                    onClick={() => setPreviewMode(false)}
                  >
                    <Pencil size={15} />
                    Continue Editing
                  </button>

                </div>

              )}

              {/* ERROR */}

              {error && (
                <div className="cover-letter-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

            </div>

            {/* MODAL FOOTER */}

            <div className="cover-letter-footer">

              <button
                type="button"
                className="cover-letter-cancel-button"
                onClick={closeCoverLetterEditor}
                disabled={applying}
              >
                Cancel
              </button>

              {!previewMode ? (

                <button
                  type="button"
                  className="cover-letter-primary-button"
                  disabled={!isCoverLetterValid}
                  onClick={() => {
                    setError("");
                    setPreviewMode(true);
                  }}
                >
                  <Eye size={16} />
                  Preview Letter
                </button>

              ) : (

                <button
                  type="button"
                  className="cover-letter-primary-button"
                  disabled={applying}
                  onClick={handleApply}
                >

                  {applying ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="details-spin"
                      />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Application
                    </>
                  )}

                </button>

              )}

            </div>

          </section>

        </div>

      )}

    </main>
  );
}

export default InternshipDetails;