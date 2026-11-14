
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
  GraduationCap,
  ClipboardList,
  Building2,
  Award,
  Gift,
  Settings2,
} from "lucide-react";

import { apiRequest } from "../services/api";
import "./PostInternship.css";

const initialForm = {
  title: "",
  category: "FULL_TIME_JOB",
  employmentType: "FULL_TIME",
  department: "",
  industry: "Aerospace",
  location: "",
  remote: false,
  roleOverview: "",
  responsibilities: "",
  qualifications: "",
  experience: "",
  mustHave: "",
  niceToHave: "",
  compensation: "",
  benefits: "",
  duration: "",
  applicationUrl: "",
  deadline: "",
};

const categories = [
  { value: "INTERNSHIP", label: "Internship" },
  { value: "FULL_TIME_JOB", label: "Full-time Job" },
  { value: "PART_TIME_JOB", label: "Part-time Job" },
  { value: "CONTRACT", label: "Contract" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "RESEARCH", label: "Research" },
  { value: "TRAINING", label: "Training" },
];

const employmentTypes = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "CONTRACT", label: "Contract" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "FREELANCE", label: "Freelance" },
];

function SectionHeading({ number, icon: Icon, title, description }) {
  return (
    <div className="opportunity-section-heading">
      <div className="opportunity-section-number">{number}</div>

      <div className="opportunity-section-icon">
        <Icon size={19} />
      </div>

      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

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

  const handleCategoryChange = (event) => {
    const category = event.target.value;

    const defaultEmployment = {
      INTERNSHIP: "INTERNSHIP",
      FULL_TIME_JOB: "FULL_TIME",
      PART_TIME_JOB: "PART_TIME",
      CONTRACT: "CONTRACT",
      FREELANCE: "FREELANCE",
      RESEARCH: "FULL_TIME",
      TRAINING: "TEMPORARY",
    };

    setForm((current) => ({
      ...current,
      category,
      employmentType: defaultEmployment[category] || "FULL_TIME",
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const descriptionSections = [
      "ABOUT THE ROLE",
      form.roleOverview.trim(),
      "KEY RESPONSIBILITIES",
      form.responsibilities.trim(),
      form.benefits.trim()
        ? `COMPENSATION & BENEFITS\n${form.benefits.trim()}`
        : "",
    ].filter(Boolean);

    const requirementSections = [
      form.qualifications.trim()
        ? `EDUCATIONAL QUALIFICATIONS\n${form.qualifications.trim()}`
        : "",
      form.experience.trim()
        ? `EXPERIENCE\n${form.experience.trim()}`
        : "",
      form.mustHave.trim()
        ? `MUST HAVE\n${form.mustHave.trim()}`
        : "",
      form.niceToHave.trim()
        ? `NICE TO HAVE\n${form.niceToHave.trim()}`
        : "",
      form.department.trim()
        ? `DEPARTMENT\n${form.department.trim()}`
        : "",
      form.industry.trim()
        ? `INDUSTRY\n${form.industry.trim()}`
        : "",
    ].filter(Boolean);

    const description = descriptionSections.join("\n\n");

    const requirements = requirementSections.join("\n\n");

    if (!form.roleOverview.trim() && !form.responsibilities.trim()) {
      setError("Please provide the role overview or key responsibilities.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        employmentType: form.employmentType,
        location: form.location.trim(),
        isRemote: form.remote,
        compensation: form.compensation.trim(),
        duration: form.duration.trim(),
        description,
        requirements,
        applicationUrl: form.applicationUrl.trim(),
        deadline: form.deadline || null,
      };

      const data = await apiRequest("/employer/opportunities", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(
        data.message || "Opportunity published successfully."
      );

      setForm({ ...initialForm });

    } catch (err) {
      setError(err.message || "Unable to publish opportunity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="post-internship-section opportunity-editor"
      id="post-internship"
    >
      {/* PAGE HEADING */}

      <div className="post-internship-heading">
        <div>
          <div className="employer-eyebrow">
            <span />
            TALENT ACQUISITION
          </div>

          <h2>Create an opportunity</h2>

          <p>
            Publish professional jobs, internships, research roles
            and engineering opportunities on iSyntara.
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
        className="post-internship-card opportunity-editor-card"
        onSubmit={handleSubmit}
      >

        {/* SECTION 01 — BASIC INFORMATION */}

        <div className="opportunity-form-section">
          <SectionHeading
            number="01"
            icon={BriefcaseBusiness}
            title="Basic information"
            description="Introduce the position and define its employment details."
          />

          <div className="post-internship-grid">

            <label className="post-field post-field-full">
              <span>Opportunity title <b>*</b></span>

              <div className="post-input-wrap">
                <BriefcaseBusiness size={17} />

                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. CAE Simulation Engineer (LS-DYNA)"
                  maxLength={150}
                  required
                />
              </div>
            </label>

            <label className="post-field">
              <span>Opportunity category <b>*</b></span>

              <div className="post-input-wrap">
                <FileText size={17} />

                <select
                  name="category"
                  value={form.category}
                  onChange={handleCategoryChange}
                  required
                >
                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="post-field">
              <span>Employment type</span>

              <div className="post-input-wrap">
                <BriefcaseBusiness size={17} />

                <select
                  name="employmentType"
                  value={form.employmentType}
                  onChange={handleChange}
                >
                  {employmentTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="post-field">
              <span>Department / Team</span>

              <div className="post-input-wrap">
                <Building2 size={17} />

                <input
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="e.g. Structures & Simulation"
                />
              </div>
            </label>

            <label className="post-field">
              <span>Industry</span>

              <div className="post-input-wrap">
                <Settings2 size={17} />

                <input
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  placeholder="e.g. Space Technology"
                />
              </div>
            </label>

            <label className="post-field post-field-full">
              <span>Work location</span>

              <div className="post-input-wrap">
                <MapPin size={17} />

                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Ahmedabad, Gujarat, India"
                />
              </div>
            </label>

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

          </div>
        </div>

        <div className="opportunity-form-divider" />

        {/* SECTION 02 — ROLE DESCRIPTION */}

        <div className="opportunity-form-section">
          <SectionHeading
            number="02"
            icon={FileText}
            title="About the role"
            description="Explain the position, its purpose and the work involved."
          />

          <div className="post-internship-grid">

            <label className="post-field post-field-full">
              <span>Role overview <b>*</b></span>

              <div className="post-textarea-wrap">
                <FileText size={17} />

                <textarea
                  name="roleOverview"
                  value={form.roleOverview}
                  onChange={handleChange}
                  placeholder="Describe the role, the team, the engineering challenges and what the selected candidate will be responsible for..."
                  rows={5}
                />
              </div>
            </label>

            <label className="post-field post-field-full">
              <span>Key responsibilities</span>

              <div className="post-textarea-wrap">
                <ClipboardList size={17} />

                <textarea
                  name="responsibilities"
                  value={form.responsibilities}
                  onChange={handleChange}
                  placeholder={"Develop and execute finite element models using LS-DYNA\nPerform explicit and implicit analyses\nReview simulation results and recommend design improvements"}
                  rows={7}
                />
              </div>

              <small>
                You can enter each responsibility on a separate line.
              </small>
            </label>

          </div>
        </div>

        <div className="opportunity-form-divider" />

        {/* SECTION 03 — QUALIFICATIONS */}

        <div className="opportunity-form-section">
          <SectionHeading
            number="03"
            icon={GraduationCap}
            title="Candidate qualifications"
            description="Specify the educational background and experience required."
          />

          <div className="post-internship-grid">

            <label className="post-field post-field-full">
              <span>Educational qualifications</span>

              <div className="post-textarea-wrap">
                <GraduationCap size={17} />

                <textarea
                  name="qualifications"
                  value={form.qualifications}
                  onChange={handleChange}
                  placeholder="e.g. Bachelor's or Master's degree in Mechanical Engineering, Aerospace Engineering or a related discipline."
                  rows={3}
                />
              </div>
            </label>

            <label className="post-field post-field-full">
              <span>Required work experience</span>

              <div className="post-input-wrap">
                <Clock3 size={17} />

                <input
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  placeholder="e.g. 3–5 years of hands-on LS-DYNA experience"
                />
              </div>
            </label>

            <label className="post-field post-field-full">
              <span>Must-have skills and requirements</span>

              <div className="post-textarea-wrap">
                <Award size={17} />

                <textarea
                  name="mustHave"
                  value={form.mustHave}
                  onChange={handleChange}
                  placeholder={"Hands-on experience with LS-DYNA\nStrong understanding of FEA fundamentals\nKnowledge of contact modelling and meshing"}
                  rows={5}
                />
              </div>
            </label>

            <label className="post-field post-field-full">
              <span>Nice-to-have qualifications</span>

              <div className="post-textarea-wrap">
                <Award size={17} />

                <textarea
                  name="niceToHave"
                  value={form.niceToHave}
                  onChange={handleChange}
                  placeholder={"Experience with nonlinear structural simulations\nExposure to aerospace or spacecraft applications\nExperience correlating simulations with physical tests"}
                  rows={4}
                />
              </div>
            </label>

          </div>
        </div>

        <div className="opportunity-form-divider" />

        {/* SECTION 04 — COMPENSATION */}

        <div className="opportunity-form-section">
          <SectionHeading
            number="04"
            icon={Gift}
            title="Compensation and benefits"
            description="Help candidates understand the employment package."
          />

          <div className="post-internship-grid">

            <label className="post-field">
              <span>Compensation</span>

              <div className="post-input-wrap">
                <IndianRupee size={17} />

                <input
                  name="compensation"
                  value={form.compensation}
                  onChange={handleChange}
                  placeholder="e.g. ₹6–7 LPA or Negotiable"
                />
              </div>
            </label>

            <label className="post-field">
              <span>Contract term / Duration</span>

              <div className="post-input-wrap">
                <Clock3 size={17} />

                <input
                  name="duration"
                  value={form.duration}
                  onChange={handleChange}
                  placeholder="e.g. Permanent or 6 months"
                />
              </div>
            </label>

            <label className="post-field post-field-full">
              <span>Benefits and additional compensation</span>

              <div className="post-textarea-wrap">
                <Gift size={17} />

                <textarea
                  name="benefits"
                  value={form.benefits}
                  onChange={handleChange}
                  placeholder={"Health insurance\nProvident fund\nPerformance incentives\nProfessional development opportunities"}
                  rows={4}
                />
              </div>
            </label>

          </div>
        </div>

        <div className="opportunity-form-divider" />

        {/* SECTION 05 — APPLICATION SETTINGS */}

        <div className="opportunity-form-section">
          <SectionHeading
            number="05"
            icon={Send}
            title="Application settings"
            description="Configure how and when candidates can apply."
          />

          <div className="post-internship-grid">

            <label className="post-field post-field-full">
              <span>External application URL</span>

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
                Optional. Candidates can also apply through iSyntara.
              </small>
            </label>

            <label className="post-field">
              <span>Application deadline</span>

              <div className="post-input-wrap">
                <CalendarDays size={17} />

                <input
                  name="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={handleChange}
                  min={new Date().toLocaleDateString("en-CA")}
                />
              </div>
            </label>

          </div>
        </div>

        {/* FORM FOOTER */}

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
                <LoaderCircle className="spin" size={17} />
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
