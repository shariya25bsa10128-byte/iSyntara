import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Search,
  MapPin,
  BriefcaseBusiness,
  Clock3,
  GraduationCap,
  IndianRupee,
  Building2,
  Rocket,
  RefreshCw,
  LoaderCircle,
  CalendarDays,
  Send,
  Filter,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  FlaskConical,
  Laptop,
  BookOpen,
} from "lucide-react";

import { apiRequest } from "../services/api";
import "./StudentInternships.css";

const PAGE_LIMIT = 6;

const opportunityCategories = [
  { value: "ALL", label: "All Opportunities" },
  { value: "INTERNSHIP", label: "Internships" },
  { value: "FULL_TIME_JOB", label: "Full-time Jobs" },
  { value: "PART_TIME_JOB", label: "Part-time Jobs" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "CONTRACT", label: "Contract" },
  { value: "RESEARCH", label: "Research" },
  { value: "TRAINING", label: "Training" },
];

const categoryLabels = {
  INTERNSHIP: "Internship",
  FULL_TIME_JOB: "Full-time Job",
  PART_TIME_JOB: "Part-time Job",
  FREELANCE: "Freelance",
  CONTRACT: "Contract",
  RESEARCH: "Research",
  TRAINING: "Training",
};

function formatDate(date) {
  if (!date) return "Not specified";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not specified";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
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
    return `₹${compensation.toLocaleString("en-IN")}`;
  }

  return compensation;
}

function getCategoryLabel(opportunity) {
  const category = opportunity.category;

  if (category && categoryLabels[category]) {
    return categoryLabels[category];
  }

  return opportunity.internshipType || "Opportunity";
}

function getEmploymentLabel(opportunity) {
  if (opportunity.employmentType) {
    return opportunity.employmentType
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return getCategoryLabel(opportunity);
}

function getCompanyName(opportunity) {
  return (
    opportunity.company?.name ||
    opportunity.company?.companyName ||
    opportunity.company?.nameOfCompany ||
    "Company"
  );
}

function getApplicationCompatibility(opportunity) {
  // The current application API still uses the legacy
  // Internship relationship. Only internship records
  // are supported until the application backend is migrated.

  return (
    opportunity.category === "INTERNSHIP" ||
    (!opportunity.category && Boolean(opportunity.internshipType))
  );
}

function StudentInternships() {
  const navigate = useNavigate();

  const [internships, setInternships] = useState([]);
  const [appliedIds, setAppliedIds] = useState([]);

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [employmentType, setEmploymentType] = useState("ALL");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingId, setApplyingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================
  // LOAD OPPORTUNITIES
  // ==========================================

  const loadInternships = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params = new URLSearchParams();

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (location.trim()) {
          params.set("location", location.trim());
        }

        if (remote === "REMOTE") {
          params.set("remote", "true");
        }

        if (remote === "ONSITE") {
          params.set("remote", "false");
        }

        if (category !== "ALL") {
          params.set("category", category);
        }

        if (employmentType !== "ALL") {
          params.set("employmentType", employmentType);
        }

        params.set("page", String(page));
        params.set("limit", String(PAGE_LIMIT));

        const data = await apiRequest(
          `/internships?${params.toString()}`
        );

        const results =
          data.opportunities ||
          data.internships ||
          [];

        setInternships(results);

        setTotalPages(
          data.pagination?.totalPages ||
            data.totalPages ||
            1
        );

        setTotalResults(
          data.pagination?.total ??
            data.total ??
            results.length
        );
      } catch (err) {
        setError(
          err.message || "Unable to load opportunities."
        );

        setInternships([]);
        setTotalResults(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      search,
      location,
      remote,
      category,
      employmentType,
      page,
    ]
  );

  // ==========================================
  // LOAD MY APPLICATIONS
  // ==========================================

  const loadMyApplications = useCallback(async () => {
    try {
      const data = await apiRequest("/applications/my");

      const ids = (data.applications || [])
        .map((application) => {
          return (
            application.opportunityId ||
            application.internshipId ||
            application.opportunity?.id ||
            application.internship?.id
          );
        })
        .filter(Boolean);

      setAppliedIds(ids);
    } catch (err) {
      console.error(
        "Could not load existing applications:",
        err
      );
    }
  }, []);

  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    loadInternships();
  }, [loadInternships]);

  useEffect(() => {
    loadMyApplications();
  }, [loadMyApplications]);

  // ==========================================
  // SEARCH
  // ==========================================

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
  };

  // ==========================================
  // APPLY FOR OPPORTUNITY
  // ==========================================

  const handleApply = async (opportunity) => {
    if (appliedIds.includes(opportunity.id)) {
      return;
    }

    if (!getApplicationCompatibility(opportunity)) {
      setError(
        "Applications for this opportunity category are being enabled. Please check back soon."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to apply for ${opportunity.title}?`
    );

    if (!confirmed) return;

    try {
      setApplyingId(opportunity.id);
      setError("");
      setSuccess("");

      await apiRequest(
        `/applications/${opportunity.id}`,
        {
          method: "POST",
        }
      );

      setAppliedIds((previous) => [
        ...previous,
        opportunity.id,
      ]);

      setSuccess(
        `Your application for ${opportunity.title} was submitted successfully!`
      );
    } catch (err) {
      setError(
        err.message || "Unable to submit your application."
      );
    } finally {
      setApplyingId(null);
    }
  };

  // ==========================================
  // OPPORTUNITY DETAILS
  // ==========================================

  const openDetails = (opportunityId) => {
    navigate(`/student/internships/${opportunityId}`);
  };

  // ==========================================
  // CLEAR FILTERS
  // ==========================================

  const clearFilters = () => {
    setSearch("");
    setLocation("");
    setRemote("ALL");
    setCategory("ALL");
    setEmploymentType("ALL");
    setPage(1);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section
      className="student-internships-section"
      id="internships"
    >

      {/* HEADER */}

      <div className="internships-header">

        <div>

          <span className="section-eyebrow">
            CAREER OPPORTUNITIES
          </span>

          <h2>Browse Opportunities</h2>

          <p>
  Explore roles across industries, experience levels and career paths.
  Find the right opportunity to take your career forward.
</p>

        </div>

        <button
          type="button"
          className="internship-refresh-button"
          onClick={() => loadInternships(true)}
          disabled={refreshing || loading}
        >

          {refreshing ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <RefreshCw size={16} />
          )}

          Refresh

        </button>

      </div>

      {/* CATEGORY FILTERS */}

      <div className="opportunity-category-section">

        <div className="opportunity-category-heading">

          <BriefcaseBusiness size={17} />

          <span>Browse by category</span>

        </div>

        <div className="opportunity-category-list">

          {opportunityCategories.map((item) => (

            <button
              key={item.value}
              type="button"
              className={`opportunity-category-button ${
                category === item.value ? "active" : ""
              }`}
              onClick={() => {
                setCategory(item.value);
                setPage(1);
                setSuccess("");
              }}
            >
              {item.label}
            </button>

          ))}

        </div>

      </div>

      {/* SEARCH AND FILTERS */}

      <form
        className="internship-search-form"
        onSubmit={handleSearch}
      >

        <div className="internship-search-field">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search jobs, internships or skills..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>

        <div className="internship-search-field">

          <MapPin size={18} />

          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(event) =>
              setLocation(event.target.value)
            }
          />

        </div>

        <div className="internship-search-field internship-filter-field">

          <Filter size={17} />

          <select
            value={remote}
            onChange={(event) => {
              setRemote(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Locations</option>
            <option value="REMOTE">Remote</option>
            <option value="ONSITE">On-site</option>
          </select>

        </div>

        <div className="internship-search-field internship-filter-field">

          <BriefcaseBusiness size={17} />

          <select
            value={employmentType}
            onChange={(event) => {
              setEmploymentType(event.target.value);
              setPage(1);
            }}
          >

            <option value="ALL">
              All Employment Types
            </option>

            <option value="FULL_TIME">
              Full-time
            </option>

            <option value="PART_TIME">
              Part-time
            </option>

            <option value="CONTRACT">
              Contract
            </option>

            <option value="TEMPORARY">
              Temporary
            </option>

            <option value="FREELANCE">
              Freelance
            </option>

            <option value="INTERNSHIP">
              Internship
            </option>

          </select>

        </div>

        <button
          type="submit"
          className="internship-search-button"
        >
          <Search size={17} />
          Search
        </button>

      </form>

      {/* ALERTS */}

      {success && (

        <div className="internship-alert internship-success">
          <CheckCircle2 size={18} />
          {success}
        </div>

      )}

      {error && (

        <div className="internship-alert internship-error">
          <AlertCircle size={18} />
          {error}
        </div>

      )}

      {/* LOADING */}

      {loading ? (

        <div className="internship-loading">

          <LoaderCircle
            size={30}
            className="spin"
          />

          <p>Finding opportunities for you...</p>

        </div>

      ) : internships.length === 0 ? (

        /* EMPTY STATE */

        <div className="internship-empty">

          <div className="internship-empty-icon">
            <Rocket size={30} />
          </div>

          <h3>No opportunities found</h3>

          <p>
            Try changing your search terms, category
            or location. New opportunities may also
            be published soon.
          </p>

          <button
            type="button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>

        </div>

      ) : (

        /* RESULTS */

        <>

          <div className="internship-results-heading">

            <div>

              <span>AVAILABLE OPPORTUNITIES</span>

              <h3>
                {category === "ALL"
                  ? "Latest Opportunities"
                  : categoryLabels[category] + " Opportunities"}
              </h3>

            </div>

            <span className="internship-results-count">
              {totalResults} opportunities
            </span>

          </div>

          {/* OPPORTUNITY GRID */}

          <div className="internship-grid">

            {internships.map((internship) => {

              const alreadyApplied = appliedIds.includes(
                internship.id
              );

              const companyName = getCompanyName(internship);

              const categoryLabel = getCategoryLabel(internship);

              const compensation = getCompensation(
                internship.compensation ??
                internship.stipend
              );

              const canApply = getApplicationCompatibility(
                internship
              );

              return (

                <article
                  className="internship-card"
                  key={internship.id}
                >

                  {/* CARD TOP */}

                  <div className="internship-card-top">

                    <div className="internship-company-icon">
                      <Building2 size={21} />
                    </div>

                    <span
                      className={`internship-status ${
                        internship.isRemote ? "remote" : "onsite"
                      }`}
                    >
                      {internship.isRemote
                        ? "REMOTE"
                        : "ON-SITE"}
                    </span>

                  </div>

                  {/* CARD CONTENT */}

                  <div className="internship-card-content">

                    <span className="internship-company-name">
                      {companyName}
                    </span>

                    <h3>{internship.title}</h3>

                    <div className="opportunity-card-category">
                      {categoryLabel}
                    </div>

                    <p className="internship-description">
                      {internship.description ||
                        "Explore this opportunity and take the next step in your career."}
                    </p>

                  </div>

                  {/* OPPORTUNITY DETAILS */}

                  <div className="internship-meta">

                    <span>
                      <MapPin size={14} />
                      {internship.location ||
                        "Location not specified"}
                    </span>

                    <span>
                      <BriefcaseBusiness size={14} />
                      {getEmploymentLabel(internship)}
                    </span>

                    <span>
                      <IndianRupee size={14} />
                      {compensation}
                    </span>

                    <span>
                      <Clock3 size={14} />
                      {internship.duration ||
                        "Duration not specified"}
                    </span>

                    {internship.category === "RESEARCH" ? (

                      <span>
                        <FlaskConical size={14} />
                        Research opportunity
                      </span>

                    ) : internship.category === "TRAINING" ? (

                      <span>
                        <BookOpen size={14} />
                        Training program
                      </span>

                    ) : internship.category === "FREELANCE" ? (

                      <span>
                        <Laptop size={14} />
                        Project-based work
                      </span>

                    ) : (

                      <span>
                        <GraduationCap size={14} />
                        Career opportunity
                      </span>

                    )}

                  </div>

                  {/* DEADLINE */}

                  {internship.deadline && (

                    <div className="internship-deadline">

                      <CalendarDays size={15} />

                      Apply before{" "}
                      {formatDate(internship.deadline)}

                    </div>

                  )}

                  {/* CARD FOOTER */}

                  <div className="internship-card-footer">

                    <span className="internship-posted-date">

                      <Rocket size={14} />

                      {formatDate(internship.createdAt)}

                    </span>

                    <div className="internship-card-actions">

                      <button
                        type="button"
                        className="internship-details-button"
                        onClick={() =>
                          openDetails(internship.id)
                        }
                      >

                        Details

                        <ArrowUpRight size={15} />

                      </button>

                      <button
                        type="button"
                        className={`internship-apply-button ${
                          alreadyApplied ? "applied" : ""
                        }`}
                        disabled={
                          alreadyApplied ||
                          applyingId === internship.id ||
                          internship.isActive === false ||
                          !canApply
                        }
                        onClick={() =>
                          handleApply(internship)
                        }
                      >

                        {applyingId === internship.id ? (

                          <>
                            <LoaderCircle
                              size={15}
                              className="spin"
                            />

                            Applying...
                          </>

                        ) : alreadyApplied ? (

                          <>
                            <CheckCircle2 size={15} />
                            Applied
                          </>

                        ) : internship.isActive === false ? (

                          "Closed"

                        ) : !canApply ? (

                          "Coming Soon"

                        ) : (

                          <>
                            <Send size={15} />
                            Apply Now
                          </>

                        )}

                      </button>

                    </div>

                  </div>

                </article>

              );

            })}

          </div>

          {/* PAGINATION */}

          {totalPages > 1 && (

            <div className="internship-pagination">

              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) => current - 1)
                }
              >
                Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => current + 1)
                }
              >
                Next
              </button>

            </div>

          )}

        </>

      )}

    </section>
  );
}

export default StudentInternships;