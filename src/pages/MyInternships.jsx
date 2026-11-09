
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
  Radio,
  Building2,
  Laptop,
} from "lucide-react";

import { apiRequest } from "../services/api";

import "./MyInternships.css";

const emptyForm = {
  title: "",
  description: "",
  location: "",
  remote: false,
  type: "",
  stipend: "",
  duration: "",
  requirements: "",
  applicationUrl: "",
  deadline: "",
};

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
      setError(err.message || "Unable to load your opportunities.");

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
    setEditingInternship(internship);

    setForm({
      title: internship.title || "",
      description: internship.description || "",
      location: internship.location || "",
      remote: Boolean(internship.isRemote),
      type: internship.internshipType || "",
      stipend: internship.stipend || "",
      duration: internship.duration || "",
      requirements: internship.requirements || "",
      applicationUrl: internship.applicationUrl || "",
      deadline: internship.deadline
        ? new Date(internship.deadline).toISOString().slice(0, 10)
        : "",
    });

    setError("");
    setSuccess("");
  };

  const closeEditor = () => {
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

    if (!form.title.trim() || !form.description.trim()) {
      setError("Opportunity title and description are required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest(
        `/employer/internships/${editingInternship.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            location: form.location.trim(),
            remote: form.remote,
            type: form.type.trim(),
            stipend: form.stipend.trim(),
            duration: form.duration.trim(),
            requirements: form.requirements.trim(),
            applicationUrl: form.applicationUrl.trim(),
            deadline: form.deadline || null,
          }),
        }
      );

      closeEditor();

      setSuccess("Opportunity updated successfully.");

      await loadInternships(true);
    } catch (err) {
      setError(err.message || "Unable to update opportunity.");
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

      setSuccess(`"${internship.title}" has been closed.`);

      await loadInternships(true);
    } catch (err) {
      setError(err.message || "Unable to close this opportunity.");
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

      {/* HEADING */}

      <div className="my-internships-heading">

        <div>
          <div className="employer-eyebrow">
            <span />
            OPPORTUNITY MANAGEMENT
          </div>

          <h2>My Opportunities</h2>

          <p>
            Track your published opportunities, manage applications,
            and keep your listings up to date.
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
            className={refreshing ? "my-internships-spinning" : ""}
          />

          Refresh
        </button>

      </div>

      {/* ALERTS */}

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

      {/* LOADING / EMPTY / LIST */}

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
            Create your first listing to start connecting with students.
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

        <div className="my-internships-list">

          {internships.map((internship) => (

            <article
              className="my-internship-card"
              key={internship.id}
            >

              {/* CARD HEADER */}

              <div className="my-internship-card-top">

                <div className="my-internship-title-area">

                  <div className="my-internship-icon">
                    <BriefcaseBusiness size={21} />
                  </div>

                  <div>
                    <h3>{internship.title}</h3>

                    <div className="my-internship-company">
                      <Building2 size={13} />
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

              {/* DESCRIPTION */}

              <p className="my-internship-description">
                {internship.description || "No description provided."}
              </p>

              {/* OPPORTUNITY INFORMATION */}

              <div className="my-internship-details">

                <span>
                  <MapPin size={15} />

                  {internship.isRemote
                    ? "Remote"
                    : internship.location || "Location not specified"}
                </span>

                <span>
                  <Clock3 size={15} />
                  {internship.duration || "Duration not specified"}
                </span>

                <span>
                  <Users size={15} />
                  {internship._count?.applications || 0} applications
                </span>

                <span>
                  <CalendarDays size={15} />
                  Deadline: {formatDate(internship.deadline)}
                </span>

                {internship.internshipType && (
                  <span>
                    <Radio size={15} />
                    {internship.internshipType}
                  </span>
                )}

                {internship.stipend && (
                  <span>
                    <Laptop size={15} />
                    {internship.stipend}
                  </span>
                )}

              </div>

              {/* CARD FOOTER */}

              <div className="my-internship-card-footer">

                <span className="my-internship-created">
                  Published {formatDate(internship.createdAt)}
                </span>

                <div className="my-internship-actions">

                  <button
                    type="button"
                    className="my-internship-edit-button"
                    onClick={() => openEditor(internship)}
                  >
                    <Pencil size={15} />
                    Edit
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

      {/* EDIT OPPORTUNITY MODAL */}

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
            className="my-internship-modal"
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
              className="my-internship-edit-form"
              onSubmit={handleUpdate}
            >

              <label>
                Opportunity title *

                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label>
                Description *

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={5}
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
                    placeholder="e.g. Bengaluru, India"
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
                    placeholder="e.g. ₹15,000/month or ₹5 LPA"
                  />
                </label>

                <label>
                  Duration

                  <input
                    name="duration"
                    value={form.duration}
                    onChange={handleFormChange}
                    placeholder="e.g. 3 months"
                  />
                </label>

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
                  Application URL

                  <input
                    type="url"
                    name="applicationUrl"
                    value={form.applicationUrl}
                    onChange={handleFormChange}
                    placeholder="https://..."
                  />
                </label>

              </div>

              <label>
                Requirements

                <textarea
                  name="requirements"
                  value={form.requirements}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Skills, qualifications, or experience required..."
                />
              </label>

              {/* REMOTE OPTION */}

              <label className="my-internship-remote-toggle">

                <input
                  type="checkbox"
                  name="remote"
                  checked={form.remote}
                  onChange={handleFormChange}
                />

                <span>This is a remote opportunity</span>

              </label>

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
