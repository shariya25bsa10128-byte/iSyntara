
import { useState } from "react";

import {
  Rocket,
  MapPin,
  BriefcaseBusiness,
  CalendarDays,
  IndianRupee,
  Clock3,
  FileText,
  Globe,
  Send,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Monitor,
} from "lucide-react";

import { apiRequest } from "../services/api";

import "./PostInternship.css";

const initialForm = {
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

function PostInternship() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
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
      };

      const data = await apiRequest("/employer/internships", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(
        data.message || "Opportunity published successfully."
      );

      setForm({ ...initialForm });
    } catch (err) {
      setError(
        err.message || "Unable to publish opportunity."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="post-internship-section" id="post-internship">
      <div className="post-internship-heading">
        <div>
          <div className="employer-eyebrow">
            <span />
            TALENT ACQUISITION
          </div>

          <h2>Post an opportunity</h2>

          <p>
            Create an opportunity and connect with aspiring
            aerospace and engineering professionals.
          </p>
        </div>

        <div className="post-internship-heading-icon">
          <Rocket size={25} />
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

      <form
        className="post-internship-card"
        onSubmit={handleSubmit}
      >
        <div className="post-internship-form-heading">
          <div>
            <h3>Opportunity details</h3>
            <p>Fields marked with * are required.</p>
          </div>

          <span className="post-internship-draft-label">
            NEW LISTING
          </span>
        </div>

        <div className="post-internship-grid">

          {/* OPPORTUNITY TITLE */}

          <label className="post-field post-field-full">
            <span>Opportunity title <b>*</b></span>

            <div className="post-input-wrap">
              <BriefcaseBusiness size={17} />

              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Aerospace Design Engineering Intern"
                required
                maxLength={150}
              />
            </div>
          </label>

          {/* OPPORTUNITY TYPE */}

          <label className="post-field">
            <span>Opportunity type</span>

            <div className="post-input-wrap">
              <FileText size={17} />

              <input
                name="type"
                value={form.type}
                onChange={handleChange}
                placeholder="e.g. Summer opportunity"
              />
            </div>
          </label>

          {/* LOCATION */}

          <label className="post-field">
            <span>Location</span>

            <div className="post-input-wrap">
              <MapPin size={17} />

              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Bengaluru, India"
              />
            </div>
          </label>

          {/* WORK ARRANGEMENT */}

          <div className="post-field post-field-full">
            <span>Work arrangement</span>

            <label className="post-remote-option">
              <input
                type="checkbox"
                name="remote"
                checked={form.remote}
                onChange={handleChange}
              />

              <span className="post-remote-icon">
                <Monitor size={18} />
              </span>

              <span className="post-remote-text">
                <strong>Remote opportunity</strong>
                <small>
                  Enable this if candidates can work remotely.
                </small>
              </span>
            </label>
          </div>

          {/* COMPENSATION */}

          <label className="post-field">
            <span>Compensation</span>

            <div className="post-input-wrap">
              <IndianRupee size={17} />

              <input
                name="stipend"
                value={form.stipend}
                onChange={handleChange}
                placeholder="e.g. ₹15,000/month, ₹5 LPA or Unpaid"
              />
            </div>
          </label>

          {/* DURATION */}

          <label className="post-field">
            <span>Duration</span>

            <div className="post-input-wrap">
              <Clock3 size={17} />

              <input
                name="duration"
                value={form.duration}
                onChange={handleChange}
                placeholder="e.g. 3 months"
              />
            </div>
          </label>

          {/* DESCRIPTION */}

          <label className="post-field post-field-full">
            <span>Opportunity description <b>*</b></span>

            <div className="post-textarea-wrap">
              <FileText size={17} />

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the opportunity, responsibilities, projects, learning opportunities, and what the selected candidate will work on..."
                rows={6}
                required
              />
            </div>
          </label>

          {/* REQUIREMENTS */}

          <label className="post-field post-field-full">
            <span>Eligibility and requirements</span>

            <div className="post-textarea-wrap">
              <FileText size={17} />

              <textarea
                name="requirements"
                value={form.requirements}
                onChange={handleChange}
                placeholder="e.g. B.Tech students in Aerospace or Mechanical Engineering, knowledge of CAD, basic programming..."
                rows={4}
              />
            </div>
          </label>

          {/* APPLICATION URL */}

          <label className="post-field post-field-full">
            <span>Application URL</span>

            <div className="post-input-wrap">
              <Globe size={17} />

              <input
                name="applicationUrl"
                type="url"
                value={form.applicationUrl}
                onChange={handleChange}
                placeholder="https://example.com/apply"
              />
            </div>

            <small>
              Optional external application link.
            </small>
          </label>

          {/* APPLICATION DEADLINE */}

          <label className="post-field">
            <span>Application deadline</span>

            <div className="post-input-wrap">
              <CalendarDays size={17} />

              <input
                name="deadline"
                type="date"
                value={form.deadline}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </label>

        </div>

        <div className="post-internship-footer">
          <p>
            <span>*</span> Required information
          </p>

          <button
            type="submit"
            className="post-publish-button"
            disabled={saving}
          >
            {saving ? (
              <>
                <LoaderCircle
                  className="spin"
                  size={17}
                />
                Publishing...
              </>
            ) : (
              <>
                <Send size={17} />
                Publish opportunity
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

export default PostInternship;
