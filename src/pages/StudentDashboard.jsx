
import { useCallback, useEffect, useState } from "react";

import {
  Orbit,
  LayoutDashboard,
  User,
  FileText,
  GraduationCap,
  Save,
  Upload,
  Download,
  Trash2,
  LogOut,
  ArrowLeft,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  BriefcaseBusiness,
  ExternalLink,
  ShieldCheck,
  Plus,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { apiRequest, API_URL } from "../services/api";

import StudentInternships from "./StudentInternships";
import StudentApplications from "./StudentApplications";
import NotificationBell from "../components/NotificationBell";

import "./StudentDashboard.css";

const navigationItems = [
  {
    label: "Overview",
    path: "/student/dashboard",
    page: "overview",
    icon: LayoutDashboard,
  },
  {
    label: "My Profile",
    path: "/student/profile",
    page: "profile",
    icon: User,
  },
  {
    label: "My Resume",
    path: "/student/resume",
    page: "resume",
    icon: FileText,
  },
  {
    label: "Explore Opportunities",
    path: "/student/internships",
    page: "internships",
    icon: BriefcaseBusiness,
  },
  {
    label: "My Applications",
    path: "/student/applications",
    page: "applications",
    icon: BriefcaseBusiness,
  },
];

const pageInformation = {
  overview: {
    eyebrow: "STUDENT WORKSPACE",
    title: "Your Dashboard",
    description:
      "Manage your academic journey and discover opportunities in aerospace and engineering.",
  },
  profile: {
    eyebrow: "PERSONAL INFORMATION",
    title: "My Profile",
    description:
      "Keep your academic and professional information updated.",
  },
  resume: {
    eyebrow: "CAREER DOCUMENTS",
    title: "My Resume",
    description:
      "Manage your resume and make your qualifications visible to employers.",
  },
  internships: {
    eyebrow: "CAREER OPPORTUNITIES",
    title: "Find Your Next Move",
    description:
      "Discover opportunities from aerospace and engineering companies.",
  },
  applications: {
    eyebrow: "YOUR CAREER JOURNEY",
    title: "My Applications",
    description:
      "Track your submitted applications and follow your progress.",
  },
};

const employmentTypes = [
  { value: "INTERNSHIP", label: "Internship" },
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "OTHER", label: "Other" },
];

const createEmptyExperience = () => ({
  company: "",
  jobTitle: "",
  employmentType: "",
  location: "",
  startDate: "",
  endDate: "",
  currentlyWorking: false,
  responsibilities: "",
  skills: "",
});

const createEmptyProject = () => ({
  title: "",
  description: "",
  technologies: "",
  projectUrl: "",
  githubUrl: "",
  startDate: "",
  endDate: "",
});

const createEmptyCertification = () => ({
  name: "",
  issuer: "",
  issueDate: "",
  expiryDate: "",
  credentialId: "",
  credentialUrl: "",
});

const normalizeMonth = (value) => {
  if (!value) return "";

  return String(value).slice(0, 7);
};

function StudentDashboard({ page = "overview" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    university: "",
    degree: "",
    branch: "",
    graduationYear: "",
    skills: "",
    linkedinUrl: "",
    portfolioUrl: "",
    hasWorkExperience: false,
    workExperience: [],
    projects: [],
    certifications: [],
  });

  const [resume, setResume] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const currentPage = pageInformation[page] ? page : "overview";
  const pageInfo = pageInformation[currentPage];

  // ==========================================
  // LOAD STUDENT PROFILE
  // ==========================================

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/student/profile");
      const studentProfile = data.profile || {};

      const experiences = Array.isArray(
        studentProfile.workExperience
      )
        ? studentProfile.workExperience
        : [];

      const projects = Array.isArray(studentProfile.projects)
        ? studentProfile.projects
        : [];

      const certifications = Array.isArray(
        studentProfile.certifications
      )
        ? studentProfile.certifications
        : [];

      setProfile({
        university: studentProfile.university ?? "",
        degree: studentProfile.degree ?? "",
        branch: studentProfile.branch ?? "",
        graduationYear: studentProfile.graduationYear ?? "",

        skills: Array.isArray(studentProfile.skills)
          ? studentProfile.skills.join(", ")
          : studentProfile.skills ?? "",

        linkedinUrl: studentProfile.linkedinUrl ?? "",
        portfolioUrl: studentProfile.portfolioUrl ?? "",

        hasWorkExperience: Boolean(
          studentProfile.hasWorkExperience
        ),

        workExperience: experiences.map((experience) => ({
          ...createEmptyExperience(),

          company: experience.company ?? "",
          jobTitle:
            experience.jobTitle ?? experience.role ?? "",

          employmentType: experience.employmentType ?? "",
          location: experience.location ?? "",

          startDate: normalizeMonth(experience.startDate),
          endDate: normalizeMonth(experience.endDate),

          currentlyWorking: Boolean(
            experience.currentlyWorking
          ),

          responsibilities:
            experience.responsibilities ??
            experience.description ??
            "",

          skills: Array.isArray(experience.skills)
            ? experience.skills.join(", ")
            : experience.skills ?? "",
        })),

        projects: projects.map((project) => ({
          ...createEmptyProject(),

          title: project.title ?? "",
          description: project.description ?? "",

          technologies: Array.isArray(project.technologies)
            ? project.technologies.join(", ")
            : project.technologies ?? "",

          projectUrl: project.projectUrl ?? "",
          githubUrl: project.githubUrl ?? "",

          startDate: normalizeMonth(project.startDate),
          endDate: normalizeMonth(project.endDate),
        })),

        certifications: certifications.map((certification) => ({
          ...createEmptyCertification(),

          name: certification.name ?? "",
          issuer: certification.issuer ?? "",

          issueDate: normalizeMonth(certification.issueDate),
          expiryDate: normalizeMonth(certification.expiryDate),

          credentialId: certification.credentialId ?? "",
          credentialUrl: certification.credentialUrl ?? "",
        })),
      });

      setResume(studentProfile.resumeUrl || null);
    } catch (err) {
      setError(
        err.message || "Unable to load your student profile."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ==========================================
  // MESSAGE HANDLERS
  // ==========================================

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  // ==========================================
  // GENERAL PROFILE HANDLERS
  // ==========================================

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // WORK EXPERIENCE HANDLERS
  // ==========================================

  const handleExperienceToggle = (event) => {
    const enabled = event.target.checked;

    setProfile((previous) => ({
      ...previous,

      hasWorkExperience: enabled,

      workExperience: enabled
        ? previous.workExperience.length > 0
          ? previous.workExperience
          : [createEmptyExperience()]
        : [],
    }));

    clearMessages();
  };

  const handleExperienceChange = (index, event) => {
    const { name, value, type, checked } = event.target;

    setProfile((previous) => ({
      ...previous,

      workExperience: previous.workExperience.map(
        (experience, i) =>
          i === index
            ? {
                ...experience,

                [name]: type === "checkbox" ? checked : value,

                ...(name === "currentlyWorking" && checked
                  ? { endDate: "" }
                  : {}),
              }
            : experience
      ),
    }));

    clearMessages();
  };

  const addExperience = () => {
    setProfile((previous) => ({
      ...previous,

      workExperience: [
        ...previous.workExperience,
        createEmptyExperience(),
      ],
    }));

    clearMessages();
  };

  const removeExperience = (index) => {
    setProfile((previous) => ({
      ...previous,

      workExperience: previous.workExperience.filter(
        (_, i) => i !== index
      ),
    }));

    clearMessages();
  };

  // ==========================================
  // PROJECT HANDLERS
  // ==========================================

  const handleProjectChange = (index, event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,

      projects: previous.projects.map((project, i) =>
        i === index
          ? { ...project, [name]: value }
          : project
      ),
    }));

    clearMessages();
  };

  const addProject = () => {
    setProfile((previous) => ({
      ...previous,

      projects: [
        ...previous.projects,
        createEmptyProject(),
      ],
    }));

    clearMessages();
  };

  const removeProject = (index) => {
    setProfile((previous) => ({
      ...previous,

      projects: previous.projects.filter(
        (_, i) => i !== index
      ),
    }));

    clearMessages();
  };

  // ==========================================
  // CERTIFICATION HANDLERS
  // ==========================================

  const handleCertificationChange = (index, event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,

      certifications: previous.certifications.map(
        (certification, i) =>
          i === index
            ? { ...certification, [name]: value }
            : certification
      ),
    }));

    clearMessages();
  };

  const addCertification = () => {
    setProfile((previous) => ({
      ...previous,

      certifications: [
        ...previous.certifications,
        createEmptyCertification(),
      ],
    }));

    clearMessages();
  };

  const removeCertification = (index) => {
    setProfile((previous) => ({
      ...previous,

      certifications: previous.certifications.filter(
        (_, i) => i !== index
      ),
    }));

    clearMessages();
  };

  // ==========================================
  // SAVE PROFILE
  // ==========================================

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      clearMessages();

      // CLEAN WORK EXPERIENCE

      const cleanedExperiences = profile.hasWorkExperience
        ? profile.workExperience.map((experience) => ({
            company: experience.company.trim(),

            jobTitle: experience.jobTitle.trim(),

            employmentType: experience.employmentType,

            location: experience.location.trim(),

            startDate: normalizeMonth(experience.startDate),

            endDate: experience.currentlyWorking
              ? ""
              : normalizeMonth(experience.endDate),

            currentlyWorking: Boolean(
              experience.currentlyWorking
            ),

            responsibilities:
              experience.responsibilities.trim(),

            skills: experience.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean),
          }))
        : [];

      if (
        profile.hasWorkExperience &&
        cleanedExperiences.length === 0
      ) {
        throw new Error(
          "Please add at least one work experience."
        );
      }

      const incompleteExperience = cleanedExperiences.find(
        (experience) =>
          !experience.company ||
          !experience.jobTitle ||
          !experience.employmentType ||
          !experience.location ||
          !experience.startDate ||
          !experience.responsibilities ||
          (!experience.currentlyWorking &&
            !experience.endDate)
      );

      if (incompleteExperience) {
        throw new Error(
          "Please complete all required fields in each work experience."
        );
      }

      for (const experience of cleanedExperiences) {
        if (
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(
            experience.startDate
          ) ||
          (
            !experience.currentlyWorking &&
            !/^\d{4}-(0[1-9]|1[0-2])$/.test(
              experience.endDate
            )
          )
        ) {
          throw new Error(
            "Please enter valid start and end dates."
          );
        }

        if (
          !experience.currentlyWorking &&
          experience.endDate < experience.startDate
        ) {
          throw new Error(
            "End date cannot be earlier than start date."
          );
        }
      }

      // CLEAN PROJECTS

      const cleanedProjects = profile.projects.map((project) => ({
        title: project.title.trim(),

        description: project.description.trim(),

        technologies: project.technologies
          .split(",")
          .map((technology) => technology.trim())
          .filter(Boolean),

        projectUrl: project.projectUrl.trim(),
        githubUrl: project.githubUrl.trim(),

        startDate: normalizeMonth(project.startDate),
        endDate: normalizeMonth(project.endDate),
      }));

      for (const project of cleanedProjects) {
        if (!project.title || !project.description) {
          throw new Error(
            "Please complete the title and description for every project."
          );
        }

        if (
          project.startDate &&
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(project.startDate)
        ) {
          throw new Error(
            "Please enter a valid project start date."
          );
        }

        if (
          project.endDate &&
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(project.endDate)
        ) {
          throw new Error(
            "Please enter a valid project end date."
          );
        }

        if (
          project.startDate &&
          project.endDate &&
          project.endDate < project.startDate
        ) {
          throw new Error(
            "Project end date cannot be earlier than its start date."
          );
        }
      }

      // CLEAN CERTIFICATIONS

      const cleanedCertifications = profile.certifications.map(
        (certification) => ({
          name: certification.name.trim(),

          issuer: certification.issuer.trim(),

          issueDate: normalizeMonth(certification.issueDate),
          expiryDate: normalizeMonth(certification.expiryDate),

          credentialId: certification.credentialId.trim(),
          credentialUrl: certification.credentialUrl.trim(),
        })
      );

      for (const certification of cleanedCertifications) {
        if (!certification.name || !certification.issuer) {
          throw new Error(
            "Please complete the name and issuing organization for every certification."
          );
        }

        if (
          certification.issueDate &&
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(
            certification.issueDate
          )
        ) {
          throw new Error(
            "Please enter a valid certification issue date."
          );
        }

        if (
          certification.expiryDate &&
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(
            certification.expiryDate
          )
        ) {
          throw new Error(
            "Please enter a valid certification expiry date."
          );
        }

        if (
          certification.issueDate &&
          certification.expiryDate &&
          certification.expiryDate < certification.issueDate
        ) {
          throw new Error(
            "Certification expiry date cannot be earlier than its issue date."
          );
        }
      }

      // FINAL PROFILE PAYLOAD

      const profileData = {
        university: profile.university.trim(),
        degree: profile.degree.trim(),
        branch: profile.branch.trim(),

        graduationYear: profile.graduationYear
          ? Number(profile.graduationYear)
          : null,

        skills: profile.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),

        linkedinUrl: profile.linkedinUrl.trim(),
        portfolioUrl: profile.portfolioUrl.trim(),

        hasWorkExperience: profile.hasWorkExperience,
        workExperience: cleanedExperiences,

        projects: cleanedProjects,
        certifications: cleanedCertifications,
      };

      await apiRequest("/student/profile", {
        method: "PUT",
        body: JSON.stringify(profileData),
      });

      setMessage(
        "Your profile has been saved successfully."
      );

      await loadProfile();
    } catch (err) {
      setError(
        err.message || "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // RESUME FILE HANDLERS
  // ==========================================

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    clearMessages();
    setSelectedFile(file || null);

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Resume size must not exceed 5 MB.");
      setSelectedFile(null);
      event.target.value = "";
    }
  };

  const handleUploadResume = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select a PDF resume first.");
      return;
    }

    try {
      setUploading(true);
      clearMessages();

      const formData = new FormData();
      formData.append("resume", selectedFile);

      const data = await apiRequest("/student/resume", {
        method: "POST",
        body: formData,
      });

      setResume(
        data.resumeUrl || data.resume?.url || "uploaded"
      );

      setSelectedFile(null);

      const fileInput = document.getElementById(
        "resume-upload"
      );

      if (fileInput) {
        fileInput.value = "";
      }

      setMessage(
        "Your resume has been uploaded successfully."
      );

      await loadProfile();
    } catch (err) {
      setError(
        err.message || "Unable to upload your resume."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadResume = async () => {
    try {
      clearMessages();

      const token = localStorage.getItem("isyntara_token");

      const response = await fetch(
        `${API_URL}/student/resume`,
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
          data.message || "Unable to download your resume."
        );
      }

      const blob = await response.blob();

      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = "iSyntara-Resume.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

      setMessage("Resume downloaded successfully.");
    } catch (err) {
      setError(
        err.message || "Unable to download your resume."
      );
    }
  };

  const handleDeleteResume = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your uploaded resume?"
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      clearMessages();

      await apiRequest("/student/resume", {
        method: "DELETE",
      });

      setResume(null);
      setSelectedFile(null);

      setMessage(
        "Your resume has been deleted successfully."
      );

      await loadProfile();
    } catch (err) {
      setError(
        err.message || "Unable to delete your resume."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  // ==========================================
  // PROFILE COMPLETION
  // ==========================================

  const profileFields = [
    profile.university,
    profile.degree,
    profile.branch,
    profile.graduationYear,
    profile.skills,
    profile.linkedinUrl,
    profile.portfolioUrl,
  ];

  const completedFields = profileFields.filter(
    (field) => String(field ?? "").trim() !== ""
  ).length;

  const profileCompletion = Math.round(
    (completedFields / profileFields.length) * 100
  );

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <div className="student-loading-screen">
        <LoaderCircle size={32} className="spin" />
        <p>INITIALIZING STUDENT WORKSPACE...</p>
      </div>
    );
  }

  // ==========================================
  // DASHBOARD UI
  // ==========================================

  return (
    <div className="student-dashboard">
      <aside className="student-sidebar">
        <NavLink
          to="/student/dashboard"
          className="sidebar-brand"
        >
          <Orbit size={27} />
          <span>iSyntara</span>
        </NavLink>

        <div className="sidebar-section-label">
          STUDENT WORKSPACE
        </div>

        <nav className="sidebar-navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.page}
                to={item.path}
                end
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="student-avatar">
              {(user?.name || "S")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="sidebar-user-info">
              <strong>{user?.name || "Student"}</strong>
              <span>Student Account</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="student-main">
        <header className="student-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="back-home-button"
              onClick={() => navigate("/")}
            >
              <ArrowLeft size={16} />
              Back to Home
            </button>
          </div>

          <div className="topbar-right">
  <NotificationBell />

  <span className="student-role-badge">
    <GraduationCap size={15} />
    STUDENT PORTAL
  </span>
</div>
        </header>

        <div className="student-content">
          <section className="student-welcome">
            <div>
              <span className="welcome-eyebrow">
                {pageInfo.eyebrow}
              </span>

              <h1>
                {currentPage === "overview" ? (
                  <>
                    Welcome,{" "}
                    <span>{user?.name || "Student"}</span>
                  </>
                ) : (
                  pageInfo.title
                )}
              </h1>

              <p>{pageInfo.description}</p>
            </div>

            <div className="welcome-decoration">
              <Orbit size={65} />
            </div>
          </section>

          {message && (
            <div className="dashboard-alert success-alert">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="dashboard-alert error-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* ================================== */}
          {/* OVERVIEW */}
          {/* ================================== */}

          {currentPage === "overview" && (
            <>
              <section className="student-stats-grid">
                <div className="student-stat-card">
                  <div className="stat-icon cyan">
                    <User size={21} />
                  </div>

                  <div>
                    <span>Profile Completion</span>
                    <strong>{profileCompletion}%</strong>
                  </div>
                </div>

                <div className="student-stat-card">
                  <div className="stat-icon blue">
                    <FileText size={21} />
                  </div>

                  <div>
                    <span>Resume Status</span>
                    <strong>
                      {resume ? "Uploaded" : "Pending"}
                    </strong>
                  </div>
                </div>

                <div className="student-stat-card">
                  <div className="stat-icon purple">
                    <GraduationCap size={21} />
                  </div>

                  <div>
                    <span>Graduation Year</span>
                    <strong>
                      {profile.graduationYear || "Not set"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="dashboard-panel completion-panel">
                <div className="panel-heading">
                  <div>
                    <span className="panel-eyebrow">
                      YOUR PROGRESS
                    </span>

                    <h2>Profile Strength</h2>
                  </div>

                  <strong className="completion-percentage">
                    {profileCompletion}%
                  </strong>
                </div>

                <div className="completion-progress-track">
                  <div
                    className="completion-progress-fill"
                    style={{
                      width: `${profileCompletion}%`,
                    }}
                  />
                </div>

                <p>
                  Complete your academic and professional details
                  to help employers understand your background.
                </p>
              </section>

              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <span className="panel-eyebrow">
                      QUICK ACCESS
                    </span>

                    <h2>Your Career Workspace</h2>
                    <p>Continue where you left off.</p>
                  </div>
                </div>

                <div className="student-quick-links">
                  <NavLink to="/student/profile">
                    <User size={20} />

                    <span>
                      <strong>Complete Profile</strong>
                      <small>
                        Update your academic information
                      </small>
                    </span>

                    <ExternalLink size={16} />
                  </NavLink>

                  <NavLink to="/student/resume">
                    <FileText size={20} />

                    <span>
                      <strong>Manage Resume</strong>
                      <small>
                        Upload or update your resume
                      </small>
                    </span>

                    <ExternalLink size={16} />
                  </NavLink>

                  <NavLink to="/student/internships">
                    <BriefcaseBusiness size={20} />

                    <span>
                      <strong>Explore Opportunities</strong>
                      <small>
                        Find your next career opportunity
                      </small>
                    </span>

                    <ExternalLink size={16} />
                  </NavLink>

                  <NavLink to="/student/applications">
                    <ShieldCheck size={20} />

                    <span>
                      <strong>Track Applications</strong>
                      <small>
                        Check your application progress
                      </small>
                    </span>

                    <ExternalLink size={16} />
                  </NavLink>
                </div>
              </section>
            </>
          )}

          {/* ================================== */}
          {/* PROFILE */}
          {/* ================================== */}

          {currentPage === "profile" && (
            <section className="dashboard-panel profile-panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-eyebrow">
                    PERSONAL INFORMATION
                  </span>

                  <h2>My Academic Profile</h2>

                  <p>
                    Keep your academic and professional
                    information updated.
                  </p>
                </div>

                <div className="panel-heading-icon">
                  <GraduationCap size={25} />
                </div>
              </div>

              <form onSubmit={handleSaveProfile}>
                <div className="profile-fields">
                  <div className="profile-field">
                    <label htmlFor="university">
                      University / College
                    </label>

                    <input
                      id="university"
                      name="university"
                      type="text"
                      placeholder="Enter your university"
                      value={profile.university}
                      onChange={handleProfileChange}
                    />
                  </div>

                  <div className="profile-field">
                    <label htmlFor="degree">Degree</label>

                    <input
                      id="degree"
                      name="degree"
                      type="text"
                      placeholder="e.g. B.Tech"
                      value={profile.degree}
                      onChange={handleProfileChange}
                    />
                  </div>

                  <div className="profile-field">
                    <label htmlFor="branch">
                      Branch / Specialization
                    </label>

                    <input
                      id="branch"
                      name="branch"
                      type="text"
                      placeholder="e.g. Aerospace Engineering"
                      value={profile.branch}
                      onChange={handleProfileChange}
                    />
                  </div>

                  <div className="profile-field">
                    <label htmlFor="graduationYear">
                      Graduation Year
                    </label>

                    <input
                      id="graduationYear"
                      name="graduationYear"
                      type="number"
                      min="2000"
                      max="2100"
                      placeholder="e.g. 2028"
                      value={profile.graduationYear}
                      onChange={handleProfileChange}
                    />
                  </div>

                  <div className="profile-field full-width">
                    <label htmlFor="skills">Skills</label>

                    <textarea
                      id="skills"
                      name="skills"
                      rows="3"
                      placeholder="CAD, SolidWorks, Python, MATLAB"
                      value={profile.skills}
                      onChange={handleProfileChange}
                    />

                    <small>
                      Separate multiple skills using commas.
                    </small>
                  </div>

                  <div className="profile-field">
                    <label htmlFor="linkedinUrl">
                      LinkedIn Profile
                    </label>

                    <input
                      id="linkedinUrl"
                      name="linkedinUrl"
                      type="url"
                      placeholder="https://linkedin.com/in/yourprofile"
                      value={profile.linkedinUrl}
                      onChange={handleProfileChange}
                    />
                  </div>

                  <div className="profile-field">
                    <label htmlFor="portfolioUrl">
                      Portfolio / Website
                    </label>

                    <input
                      id="portfolioUrl"
                      name="portfolioUrl"
                      type="url"
                      placeholder="https://yourportfolio.com"
                      value={profile.portfolioUrl}
                      onChange={handleProfileChange}
                    />
                  </div>
                </div>

                {/* ================================== */}
                {/* WORK EXPERIENCE */}
                {/* ================================== */}

                <section className="work-experience-section">
                  <div className="work-experience-heading">
                    <div>
                      <span className="panel-eyebrow">
                        PROFESSIONAL BACKGROUND
                      </span>

                      <h2>My Work Experience</h2>

                      <p>
                        Tell employers about your previous
                        internships, jobs or professional experience.
                      </p>
                    </div>

                    <div className="panel-heading-icon">
                      <BriefcaseBusiness size={24} />
                    </div>
                  </div>

                  <div className="experience-toggle-row">
                    <div>
                      <strong>
                        Do you have prior work experience?
                      </strong>

                      <span>
                        Turn this on if you have completed an
                        internship or worked in a professional role.
                      </span>
                    </div>

                    <label className="experience-switch">
                      <input
                        type="checkbox"
                        checked={profile.hasWorkExperience}
                        onChange={handleExperienceToggle}
                        aria-label="Toggle prior work experience"
                      />

                      <span className="experience-switch-slider" />
                    </label>
                  </div>

                  <div className="experience-toggle-labels">
                    <span
                      className={
                        !profile.hasWorkExperience
                          ? "selected"
                          : ""
                      }
                    >
                      No work experience
                    </span>

                    <span
                      className={
                        profile.hasWorkExperience
                          ? "selected"
                          : ""
                      }
                    >
                      Prior work experience
                    </span>
                  </div>

                  {!profile.hasWorkExperience ? (
                    <div className="no-experience-state">
                      <div className="no-experience-icon">
                        <GraduationCap size={23} />
                      </div>

                      <div>
                        <strong>
                          No work experience added
                        </strong>

                        <p>
                          That's completely fine! You can still
                          showcase your academic projects,
                          technical skills and potential to
                          employers.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="experience-list">
                      {profile.workExperience.map(
                        (experience, index) => (
                          <article
                            className="experience-card"
                            key={index}
                          >
                            <div className="experience-card-heading">
                              <div className="experience-card-title">
                                <div className="experience-number">
                                  {String(index + 1).padStart(2, "0")}
                                </div>

                                <div>
                                  <h3>
                                    {experience.jobTitle ||
                                      "New Experience"}
                                  </h3>

                                  <span>
                                    {experience.company ||
                                      "Company name"}
                                  </span>
                                </div>
                              </div>

                              <div className="experience-card-actions">
                                <button
                                  type="button"
                                  className="experience-remove-button"
                                  onClick={() =>
                                    removeExperience(index)
                                  }
                                  aria-label={`Remove experience ${index + 1}`}
                                  title="Remove experience"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            <div className="experience-fields">
                              <div className="profile-field">
                                <label htmlFor={`company-${index}`}>
                                  Company / Organization *
                                </label>

                                <input
                                  id={`company-${index}`}
                                  name="company"
                                  type="text"
                                  placeholder="e.g. Syntara Aerospace"
                                  value={experience.company}
                                  onChange={(event) =>
                                    handleExperienceChange(index, event)
                                  }
                                  required
                                />
                              </div>

                              <div className="profile-field">
                                <label htmlFor={`jobTitle-${index}`}>
                                  Job Title / Role *
                                </label>

                                <input
                                  id={`jobTitle-${index}`}
                                  name="jobTitle"
                                  type="text"
                                  placeholder="e.g. Aerospace Engineering Intern"
                                  value={experience.jobTitle}
                                  onChange={(event) =>
                                    handleExperienceChange(index, event)
                                  }
                                  required
                                />
                              </div>

                              <div className="profile-field">
                                <label htmlFor={`employmentType-${index}`}>
                                  Employment Type *
                                </label>

                                <select
                                  id={`employmentType-${index}`}
                                  name="employmentType"
                                  value={experience.employmentType}
                                  onChange={(event) =>
                                    handleExperienceChange(index, event)
                                  }
                                  required
                                >
                                  <option value="">
                                    Select employment type
                                  </option>

                                  {employmentTypes.map((type) => (
                                    <option
                                      key={type.value}
                                      value={type.value}
                                    >
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="profile-field">
                                <label htmlFor={`location-${index}`}>
                                  Location *
                                </label>

                                <input
                                  id={`location-${index}`}
                                  name="location"
                                  type="text"
                                  placeholder="e.g. Bengaluru, India"
                                  value={experience.location}
                                  onChange={(event) =>
                                    handleExperienceChange(index, event)
                                  }
                                  required
                                />
                              </div>

                              <div className="profile-field">
                                <label htmlFor={`startDate-${index}`}>
                                  Start Date *
                                </label>

                                <input
                                  id={`startDate-${index}`}
                                  name="startDate"
                                  type="month"
                                  value={experience.startDate}
                                  onChange={(event) =>
                                    handleExperienceChange(index, event)
                                  }
                                  required
                                />
                              </div>

                              <div className="profile-field">
                                <label htmlFor={`endDate-${index}`}>
                                  End Date{" "}
                                  {!experience.currentlyWorking && "*"}
                                </label>

                                <input
                                  id={`endDate-${index}`}
                                  name="endDate"
                                  type="month"
                                  value={experience.endDate}
                                  disabled={experience.currentlyWorking}
                                  onChange={(event) =>
                                    handleExperienceChange(index, event)
                                  }
                                  required={!experience.currentlyWorking}
                                />
                              </div>

                              <label className="experience-current-checkbox full-width">
                                <input
                                  type="checkbox"
                                  name="currentlyWorking"
                                  checked={experience.currentlyWorking}
                                  onChange={(event) =>
                                    handleExperienceChange(index, event)
                                  }
                                />

                                <span>
                                  I currently work in this role
                                </span>
                              </label>

                              <div className="profile-field full-width">
                                <label htmlFor={`responsibilities-${index}`}>
                                  Description / Responsibilities *
                                </label>

                                <textarea
                                  id={`responsibilities-${index}`}
                                  name="responsibilities"
                                  rows="4"
                                  placeholder="Describe your responsibilities, projects, achievements and technologies used..."
                                  value={experience.responsibilities}
                                  onChange={(event) =>
                                    handleExperienceChange(index, event)
                                  }
                                  required
                                />
                              </div>

                              <div className="profile-field full-width">
                                <label htmlFor={`experienceSkills-${index}`}>
                                  Skills Used
                                </label>

                                <input
                                  id={`experienceSkills-${index}`}
                                  name="skills"
                                  type="text"
                                  placeholder="e.g. SolidWorks, CAD, Python, MATLAB"
                                  value={experience.skills}
                                  onChange={(event) =>
                                    handleExperienceChange(index, event)
                                  }
                                />

                                <small>
                                  Separate multiple skills using commas.
                                </small>
                              </div>
                            </div>
                          </article>
                        )
                      )}

                      <button
                        type="button"
                        className="add-experience-button"
                        onClick={addExperience}
                      >
                        <Plus size={17} />
                        Add Another Experience
                      </button>
                    </div>
                  )}
                </section>

                {/* ================================== */}
                {/* PROJECTS */}
                {/* ================================== */}

                <section className="work-experience-section profile-extra-section">
                  <div className="work-experience-heading">
                    <div>
                      <span className="panel-eyebrow">
                        PRACTICAL EXPERIENCE
                      </span>

                      <h2>My Projects</h2>

                      <p>
                        Showcase academic, personal and professional
                        projects you've built.
                      </p>
                    </div>

                    <div className="panel-heading-icon">
                      <FileText size={24} />
                    </div>
                  </div>

                  {profile.projects.length === 0 ? (
                    <div className="no-experience-state">
                      <div className="no-experience-icon">
                        <FileText size={23} />
                      </div>

                      <div>
                        <strong>No projects added yet</strong>

                        <p>
                          Add projects to help recruiters understand
                          your practical skills and technical work.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="experience-list">
                      {profile.projects.map((project, index) => (
                        <article
                          className="experience-card"
                          key={`project-${index}`}
                        >
                          <div className="experience-card-heading">
                            <div className="experience-card-title">
                              <div className="experience-number">
                                {String(index + 1).padStart(2, "0")}
                              </div>

                              <div>
                                <h3>
                                  {project.title || "New Project"}
                                </h3>

                                <span>Project details</span>
                              </div>
                            </div>

                            <div className="experience-card-actions">
                              <button
                                type="button"
                                className="experience-remove-button"
                                onClick={() => removeProject(index)}
                                aria-label={`Remove project ${index + 1}`}
                                title="Remove project"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="experience-fields">
                            <div className="profile-field full-width">
                              <label htmlFor={`project-title-${index}`}>
                                Project Title *
                              </label>

                              <input
                                id={`project-title-${index}`}
                                name="title"
                                value={project.title}
                                onChange={(event) =>
                                  handleProjectChange(index, event)
                                }
                                placeholder="e.g. Autonomous Drone Design"
                                required
                              />
                            </div>

                            <div className="profile-field full-width">
                              <label htmlFor={`project-description-${index}`}>
                                Description *
                              </label>

                              <textarea
                                id={`project-description-${index}`}
                                name="description"
                                rows="4"
                                value={project.description}
                                onChange={(event) =>
                                  handleProjectChange(index, event)
                                }
                                placeholder="Describe the project, your contribution and its outcome..."
                                required
                              />
                            </div>

                            <div className="profile-field full-width">
                              <label htmlFor={`project-technologies-${index}`}>
                                Technologies Used
                              </label>

                              <input
                                id={`project-technologies-${index}`}
                                name="technologies"
                                value={project.technologies}
                                onChange={(event) =>
                                  handleProjectChange(index, event)
                                }
                                placeholder="e.g. Python, MATLAB, SolidWorks"
                              />

                              <small>
                                Separate technologies using commas.
                              </small>
                            </div>

                            <div className="profile-field">
                              <label htmlFor={`project-start-${index}`}>
                                Start Date
                              </label>

                              <input
                                id={`project-start-${index}`}
                                name="startDate"
                                type="month"
                                value={project.startDate}
                                onChange={(event) =>
                                  handleProjectChange(index, event)
                                }
                              />
                            </div>

                            <div className="profile-field">
                              <label htmlFor={`project-end-${index}`}>
                                End Date
                              </label>

                              <input
                                id={`project-end-${index}`}
                                name="endDate"
                                type="month"
                                value={project.endDate}
                                onChange={(event) =>
                                  handleProjectChange(index, event)
                                }
                              />
                            </div>

                            <div className="profile-field">
                              <label htmlFor={`project-url-${index}`}>
                                Live Project URL
                              </label>

                              <input
                                id={`project-url-${index}`}
                                name="projectUrl"
                                type="url"
                                value={project.projectUrl}
                                onChange={(event) =>
                                  handleProjectChange(index, event)
                                }
                                placeholder="https://your-project.com"
                              />
                            </div>

                            <div className="profile-field">
                              <label htmlFor={`project-github-${index}`}>
                                GitHub URL
                              </label>

                              <input
                                id={`project-github-${index}`}
                                name="githubUrl"
                                type="url"
                                value={project.githubUrl}
                                onChange={(event) =>
                                  handleProjectChange(index, event)
                                }
                                placeholder="https://github.com/username/project"
                              />
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="add-experience-button"
                    onClick={addProject}
                  >
                    <Plus size={17} />
                    Add Another Project
                  </button>
                </section>

                {/* ================================== */}
                {/* CERTIFICATIONS */}
                {/* ================================== */}

                <section className="work-experience-section profile-extra-section">
                  <div className="work-experience-heading">
                    <div>
                      <span className="panel-eyebrow">
                        CREDENTIALS & ACHIEVEMENTS
                      </span>

                      <h2>My Certifications</h2>

                      <p>
                        Add professional certificates, courses and
                        verified credentials.
                      </p>
                    </div>

                    <div className="panel-heading-icon">
                      <ShieldCheck size={24} />
                    </div>
                  </div>

                  {profile.certifications.length === 0 ? (
                    <div className="no-experience-state">
                      <div className="no-experience-icon">
                        <ShieldCheck size={23} />
                      </div>

                      <div>
                        <strong>No certifications added yet</strong>

                        <p>
                          Showcase relevant courses, training and
                          professional certifications.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="experience-list">
                      {profile.certifications.map(
                        (certification, index) => (
                          <article
                            className="experience-card"
                            key={`certification-${index}`}
                          >
                            <div className="experience-card-heading">
                              <div className="experience-card-title">
                                <div className="experience-number">
                                  {String(index + 1).padStart(2, "0")}
                                </div>

                                <div>
                                  <h3>
                                    {certification.name ||
                                      "New Certification"}
                                  </h3>

                                  <span>
                                    {certification.issuer ||
                                      "Issuing organization"}
                                  </span>
                                </div>
                              </div>

                              <div className="experience-card-actions">
                                <button
                                  type="button"
                                  className="experience-remove-button"
                                  onClick={() =>
                                    removeCertification(index)
                                  }
                                  aria-label={`Remove certification ${index + 1}`}
                                  title="Remove certification"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            <div className="experience-fields">
                              <div className="profile-field">
                                <label htmlFor={`cert-name-${index}`}>
                                  Certification Name *
                                </label>

                                <input
                                  id={`cert-name-${index}`}
                                  name="name"
                                  value={certification.name}
                                  onChange={(event) =>
                                    handleCertificationChange(index, event)
                                  }
                                  placeholder="e.g. MATLAB Onramp"
                                  required
                                />
                              </div>

                              <div className="profile-field">
                                <label htmlFor={`cert-issuer-${index}`}>
                                  Issuing Organization *
                                </label>

                                <input
                                  id={`cert-issuer-${index}`}
                                  name="issuer"
                                  value={certification.issuer}
                                  onChange={(event) =>
                                    handleCertificationChange(index, event)
                                  }
                                  placeholder="e.g. MathWorks"
                                  required
                                />
                              </div>

                              <div className="profile-field">
                                <label htmlFor={`cert-issue-${index}`}>
                                  Issue Date
                                </label>

                                <input
                                  id={`cert-issue-${index}`}
                                  name="issueDate"
                                  type="month"
                                  value={certification.issueDate}
                                  onChange={(event) =>
                                    handleCertificationChange(index, event)
                                  }
                                />
                              </div>

                              <div className="profile-field">
                                <label htmlFor={`cert-expiry-${index}`}>
                                  Expiry Date
                                </label>

                                <input
                                  id={`cert-expiry-${index}`}
                                  name="expiryDate"
                                  type="month"
                                  value={certification.expiryDate}
                                  onChange={(event) =>
                                    handleCertificationChange(index, event)
                                  }
                                />
                              </div>

                              <div className="profile-field">
                                <label htmlFor={`cert-id-${index}`}>
                                  Credential ID
                                </label>

                                <input
                                  id={`cert-id-${index}`}
                                  name="credentialId"
                                  value={certification.credentialId}
                                  onChange={(event) =>
                                    handleCertificationChange(index, event)
                                  }
                                  placeholder="Optional credential ID"
                                />
                              </div>

                              <div className="profile-field">
                                <label htmlFor={`cert-url-${index}`}>
                                  Verification URL
                                </label>

                                <input
                                  id={`cert-url-${index}`}
                                  name="credentialUrl"
                                  type="url"
                                  value={certification.credentialUrl}
                                  onChange={(event) =>
                                    handleCertificationChange(index, event)
                                  }
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                          </article>
                        )
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="add-experience-button"
                    onClick={addCertification}
                  >
                    <Plus size={17} />
                    Add Another Certification
                  </button>
                </section>

                {/* SAVE PROFILE */}

                <div className="profile-form-footer">
                  <button
                    type="submit"
                    className="save-profile-button"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <LoaderCircle
                          size={17}
                          className="spin"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={17} />
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* ================================== */}
          {/* RESUME */}
          {/* ================================== */}

          {currentPage === "resume" && (
            <section className="dashboard-panel resume-panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-eyebrow">
                    CAREER DOCUMENTS
                  </span>

                  <h2>My Resume</h2>

                  <p>
                    Upload your latest resume so employers can
                    review your qualifications.
                  </p>
                </div>

                <div className="panel-heading-icon">
                  <FileText size={25} />
                </div>
              </div>

              <div className="resume-upload-container">
                <div className="resume-upload-icon">
                  <Upload size={28} />
                </div>

                <h3>
                  {resume
                    ? "Your resume is uploaded"
                    : "Upload your resume"}
                </h3>

                <p>
                  Upload a PDF file. Maximum file size: 5 MB.
                </p>

                {resume && (
                  <div className="resume-current-status">
                    <CheckCircle2 size={17} />

                    <span>
                      Resume available in your account
                    </span>
                  </div>
                )}

                <form
                  className="resume-upload-form"
                  onSubmit={handleUploadResume}
                >
                  <label
                    htmlFor="resume-upload"
                    className="resume-file-label"
                  >
                    <Upload size={16} />
                    Choose PDF
                  </label>

                  <input
                    id="resume-upload"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileChange}
                    hidden
                  />

                  {selectedFile && (
                    <span className="selected-resume-name">
                      {selectedFile.name}
                    </span>
                  )}

                  <button
                    type="submit"
                    className="upload-resume-button"
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? (
                      <>
                        <LoaderCircle
                          size={16}
                          className="spin"
                        />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Upload Resume
                      </>
                    )}
                  </button>
                </form>

                {resume && (
                  <div className="resume-actions">
                    <button
                      type="button"
                      className="download-resume-button"
                      onClick={handleDownloadResume}
                    >
                      <Download size={16} />
                      Download Resume
                    </button>

                    <button
                      type="button"
                      className="delete-resume-button"
                      onClick={handleDeleteResume}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <LoaderCircle
                          size={16}
                          className="spin"
                        />
                      ) : (
                        <Trash2 size={16} />
                      )}

                      {deleting
                        ? "Deleting..."
                        : "Delete Resume"}
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ================================== */}
          {/* OPPORTUNITIES AND APPLICATIONS */}
          {/* ================================== */}

          {currentPage === "internships" && (
            <StudentInternships />
          )}

          {currentPage === "applications" && (
            <StudentApplications />
          )}

          {/* ================================== */}
          {/* FOOTER */}
          {/* ================================== */}

          <footer className="student-dashboard-footer">
            <div>
              <Orbit size={19} />
              <span>iSyntara Aerospace</span>
            </div>

            <p>
              Connecting engineering talent with the future
              of aerospace.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
