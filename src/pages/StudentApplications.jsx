
import { useCallback, useEffect, useMemo, useState } from "react";

import {
    Search,
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    MapPin,
    RefreshCw,
    LoaderCircle,
    AlertCircle,
    CheckCircle2,
    Clock3,
    XCircle,
    Eye,
    Send,
    RotateCcw,
    Laptop,
    ChevronDown,
    ChevronUp,
    History,
    CircleDot,
} from "lucide-react";

import { apiRequest } from "../services/api";
import "./StudentApplications.css";

// ==========================================
// CONSTANTS
// ==========================================

const STATUS_OPTIONS = [
    "ALL",
    "PENDING",
    "REVIEWED",
    "SHORTLISTED",
    "INTERVIEW",
    "ACCEPTED",
    "REJECTED",
    "WITHDRAWN",
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

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function formatDate(date) {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Date unavailable";
    }

    return parsedDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatDateTime(date) {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Date unavailable";
    }

    return parsedDate.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

// Prefer Opportunity.
// Fall back to legacy Internship.

function getApplicationOpportunity(application) {
    return application?.opportunity ||
        application?.internship ||
        {};
}

function getCompanyName(application) {
    const opportunity = getApplicationOpportunity(application);

    return (
        opportunity.company?.name ||
        opportunity.company?.companyName ||
        opportunity.company?.nameOfCompany ||
        "Company"
    );
}

function getOpportunityCategory(application) {
    const opportunity = getApplicationOpportunity(application);

    return (
        opportunity.category ||
        (application?.internship ? "INTERNSHIP" : null)
    );
}

function getOpportunityCategoryLabel(application) {
    const category = getOpportunityCategory(application);

    return CATEGORY_LABELS[category] || "Opportunity";
}

function getStatusIcon(status) {
    switch (status) {
        case "ACCEPTED":
            return <CheckCircle2 size={15} />;

        case "REJECTED":
        case "WITHDRAWN":
            return <XCircle size={15} />;

        case "INTERVIEW":
        case "REVIEWED":
            return <Eye size={15} />;

        case "SHORTLISTED":
            return <CheckCircle2 size={15} />;

        default:
            return <Clock3 size={15} />;
    }
}

// ==========================================
// APPLICATION TIMELINE HELPER
// ==========================================

function getApplicationTimeline(application) {
    const history = Array.isArray(application.statusHistory)
        ? application.statusHistory
        : [];

    if (history.length > 0) {
        return history;
    }

    // Existing applications created before history tracking
    // do not have historical status events.
    // We can safely display their original submission date.

    return [
        {
            id: `submitted-${application.id}`,
            fromStatus: null,
            toStatus: "PENDING",
            note: "Application submitted.",
            createdAt: application.appliedAt,
            changedByRole: "STUDENT",
        },
    ];
}

// ==========================================
// MAIN COMPONENT
// ==========================================

function StudentApplications() {
    const [applications, setApplications] = useState([]);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [withdrawingId, setWithdrawingId] = useState(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [expandedTimeline, setExpandedTimeline] = useState({});

    // ==========================================
    // LOAD APPLICATIONS
    // ==========================================

    const loadApplications = useCallback(
        async (showRefresh = false) => {
            try {
                if (showRefresh) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                setError("");
                setSuccess("");

                const data = await apiRequest("/applications/my");

                setApplications(data.applications || []);

            } catch (err) {
                setError(
                    err.message ||
                    "Unable to load your applications."
                );

                setApplications([]);

            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useEffect(() => {
        loadApplications();
    }, [loadApplications]);

    // ==========================================
    // FILTER APPLICATIONS
    // ==========================================

    const filteredApplications = useMemo(() => {
        return applications.filter((application) => {
            const opportunity =
                getApplicationOpportunity(application);

            const title = opportunity.title || "";
            const company = getCompanyName(application);
            const location = opportunity.location || "";

            const category =
                getOpportunityCategoryLabel(application);

            const employmentType =
                opportunity.employmentType ||
                opportunity.internshipType ||
                "";

            const matchesSearch = [
                title,
                company,
                location,
                category,
                employmentType,
            ]
                .join(" ")
                .toLowerCase()
                .includes(search.trim().toLowerCase());

            const matchesStatus =
                statusFilter === "ALL" ||
                application.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [applications, search, statusFilter]);

    // ==========================================
    // APPLICATION STATISTICS
    // ==========================================

    const stats = useMemo(() => {
        return {
            total: applications.length,

            pending: applications.filter(
                (item) => item.status === "PENDING"
            ).length,

            shortlisted: applications.filter(
                (item) =>
                    item.status === "SHORTLISTED" ||
                    item.status === "INTERVIEW"
            ).length,

            accepted: applications.filter(
                (item) => item.status === "ACCEPTED"
            ).length,
        };
    }, [applications]);

    // ==========================================
    // TOGGLE TIMELINE
    // ==========================================

    const toggleTimeline = (applicationId) => {
        setExpandedTimeline((previous) => ({
            ...previous,
            [applicationId]: !previous[applicationId],
        }));
    };

    // ==========================================
    // WITHDRAW APPLICATION
    // ==========================================

    const handleWithdraw = async (application) => {
        const opportunity =
            getApplicationOpportunity(application);

        const opportunityTitle =
            opportunity.title || "this opportunity";

        const confirmed = window.confirm(
            `Are you sure you want to withdraw your application for "${opportunityTitle}"?`
        );

        if (!confirmed) return;

        try {
            setWithdrawingId(application.id);
            setError("");
            setSuccess("");

            const data = await apiRequest(
                `/applications/${application.id}/withdraw`,
                {
                    method: "PATCH",
                }
            );

            // Use the server response so the new history
            // event is immediately reflected in the UI.
            setApplications((previous) =>
                previous.map((item) =>
                    item.id === application.id
                        ? {
                            ...item,
                            ...(data.application || {}),
                            status: "WITHDRAWN",
                        }
                        : item
                )
            );

            setExpandedTimeline((previous) => ({
                ...previous,
                [application.id]: true,
            }));

            setSuccess(
                `Your application for "${opportunityTitle}" has been withdrawn.`
            );

        } catch (err) {
            setError(
                err.message ||
                "Unable to withdraw this application."
            );

        } finally {
            setWithdrawingId(null);
        }
    };

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <section
            className="student-applications-section"
            id="my-applications"
        >
            {/* HEADER */}

            <div className="student-applications-header">
                <div>
                    <span className="applications-eyebrow">
                        YOUR CAREER JOURNEY
                    </span>

                    <h2>My Applications</h2>

                    <p>
                        Track all your job applications, internships
                        and career opportunities in one place.
                    </p>
                </div>

                <button
                    type="button"
                    className="applications-refresh-button"
                    onClick={() => loadApplications(true)}
                    disabled={refreshing || loading}
                >
                    {refreshing ? (
                        <LoaderCircle
                            size={16}
                            className="applications-spin"
                        />
                    ) : (
                        <RefreshCw size={16} />
                    )}

                    Refresh
                </button>
            </div>

            {/* STATISTICS */}

            <div className="application-stats-grid">
                <div className="application-stat-card">
                    <div className="application-stat-icon total">
                        <BriefcaseBusiness size={19} />
                    </div>

                    <div>
                        <span>Total Applications</span>
                        <strong>{stats.total}</strong>
                    </div>
                </div>

                <div className="application-stat-card">
                    <div className="application-stat-icon pending">
                        <Clock3 size={19} />
                    </div>

                    <div>
                        <span>Pending</span>
                        <strong>{stats.pending}</strong>
                    </div>
                </div>

                <div className="application-stat-card">
                    <div className="application-stat-icon shortlisted">
                        <Eye size={19} />
                    </div>

                    <div>
                        <span>Shortlisted / Interview</span>
                        <strong>{stats.shortlisted}</strong>
                    </div>
                </div>

                <div className="application-stat-card">
                    <div className="application-stat-icon accepted">
                        <CheckCircle2 size={19} />
                    </div>

                    <div>
                        <span>Accepted</span>
                        <strong>{stats.accepted}</strong>
                    </div>
                </div>
            </div>

            {/* ALERTS */}

            {success && (
                <div className="applications-alert applications-success">
                    <CheckCircle2 size={18} />
                    {success}
                </div>
            )}

            {error && (
                <div className="applications-alert applications-error">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* SEARCH AND FILTER */}

            <div className="applications-toolbar">
                <div className="applications-search">
                    <Search size={17} />

                    <input
                        type="text"
                        placeholder="Search by opportunity, company or location..."
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                    />
                </div>

                <div className="applications-filter">
                    <label htmlFor="application-status-filter">
                        Status
                    </label>

                    <select
                        id="application-status-filter"
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(event.target.value)
                        }
                    >
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {status === "ALL"
                                    ? "All Statuses"
                                    : STATUS_LABELS[status]}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* APPLICATION CONTENT */}

            {loading ? (
                <div className="applications-loading">
                    <LoaderCircle
                        size={30}
                        className="applications-spin"
                    />

                    <p>Loading your applications...</p>
                </div>

            ) : filteredApplications.length === 0 ? (
                <div className="applications-empty">
                    <div className="applications-empty-icon">
                        <Send size={28} />
                    </div>

                    <h3>
                        {applications.length === 0
                            ? "No applications yet"
                            : "No matching applications"}
                    </h3>

                    <p>
                        {applications.length === 0
                            ? "When you apply for an opportunity, it will appear here so you can track its progress."
                            : "Try changing your search or status filter to find your applications."}
                    </p>

                    {applications.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setStatusFilter("ALL");
                            }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>

            ) : (
                <div className="applications-list">
                    <div className="applications-list-heading">
                        <div>
                            <span>APPLICATION ACTIVITY</span>
                            <h3>Your Submitted Applications</h3>
                        </div>

                        <span className="applications-count">
                            {filteredApplications.length} found
                        </span>
                    </div>

                    {filteredApplications.map((application) => {
                        const opportunity =
                            getApplicationOpportunity(application);

                        const status =
                            application.status || "PENDING";

                        const isWithdrawn =
                            status === "WITHDRAWN";

                        const isRejected =
                            status === "REJECTED";

                        const isAccepted =
                            status === "ACCEPTED";

                        const category =
                            getOpportunityCategoryLabel(application);

                        const timeline =
                            getApplicationTimeline(application);

                        const isTimelineExpanded =
                            Boolean(expandedTimeline[application.id]);

                        return (
                            <article
                                className="application-tracking-card"
                                key={application.id}
                            >
                                {/* APPLICATION DETAILS */}

                                <div className="application-card-main">
                                    <div className="application-company-icon">
                                        {opportunity.isRemote ? (
                                            <Laptop size={22} />
                                        ) : (
                                            <Building2 size={22} />
                                        )}
                                    </div>

                                    <div className="application-card-info">
                                        <span className="application-company">
                                            {getCompanyName(application)}
                                        </span>

                                        <h3>
                                            {opportunity.title ||
                                                "Career Opportunity"}
                                        </h3>

                                        <div className="application-details">
                                            <span>
                                                <BriefcaseBusiness size={14} />
                                                {category}
                                            </span>

                                            <span>
                                                <MapPin size={14} />
                                                {opportunity.isRemote
                                                    ? "Remote"
                                                    : opportunity.location ||
                                                        "Location not specified"}
                                            </span>

                                            <span>
                                                <CalendarDays size={14} />
                                                Applied{" "}
                                                {formatDate(
                                                    application.appliedAt
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* STATUS AND ACTIONS */}

                                <div className="application-card-bottom">
                                    <div
                                        className={`application-status-badge status-${status.toLowerCase()}`}
                                    >
                                        {getStatusIcon(status)}
                                        {STATUS_LABELS[status] || status}
                                    </div>

                                    <div className="application-card-actions">
                                        <button
                                            type="button"
                                            className="application-timeline-toggle"
                                            onClick={() =>
                                                toggleTimeline(application.id)
                                            }
                                            aria-expanded={isTimelineExpanded}
                                        >
                                            <History size={15} />

                                            Track Progress

                                            {isTimelineExpanded ? (
                                                <ChevronUp size={15} />
                                            ) : (
                                                <ChevronDown size={15} />
                                            )}
                                        </button>

                                        {!isWithdrawn &&
                                            !isRejected &&
                                            !isAccepted && (
                                                <button
                                                    type="button"
                                                    className="application-withdraw-button"
                                                    disabled={
                                                        withdrawingId ===
                                                        application.id
                                                    }
                                                    onClick={() =>
                                                        handleWithdraw(
                                                            application
                                                        )
                                                    }
                                                >
                                                    {withdrawingId ===
                                                    application.id ? (
                                                        <>
                                                            <LoaderCircle
                                                                size={15}
                                                                className="applications-spin"
                                                            />
                                                            Withdrawing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RotateCcw
                                                                size={15}
                                                            />
                                                            Withdraw
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                    </div>
                                </div>

                                {/* APPLICATION TIMELINE */}

                                {isTimelineExpanded && (
                                    <div className="application-timeline">
                                        <div className="application-timeline-heading">
                                            <div>
                                                <span>
                                                    STATUS HISTORY
                                                </span>
                                                <h4>
                                                    Application Timeline
                                                </h4>
                                            </div>

                                            <span className="timeline-event-count">
                                                {timeline.length}{" "}
                                                {timeline.length === 1
                                                    ? "event"
                                                    : "events"}
                                            </span>
                                        </div>

                                        <div className="application-timeline-list">
                                            {timeline.map((event, index) => {
                                                const eventStatus =
                                                    event.toStatus ||
                                                    "PENDING";

                                                const eventLabel =
                                                    STATUS_LABELS[
                                                        eventStatus
                                                    ] || eventStatus;

                                                return (
                                                    <div
                                                        className="application-timeline-event"
                                                        key={
                                                            event.id ||
                                                            `${eventStatus}-${index}`
                                                        }
                                                    >
                                                        <div className="application-timeline-marker">
                                                            <CircleDot
                                                                size={18}
                                                            />
                                                        </div>

                                                        <div className="application-timeline-content">
                                                            <div className="timeline-event-top">
                                                                <strong>
                                                                    {eventLabel}
                                                                </strong>

                                                                <span>
                                                                    {formatDateTime(
                                                                        event.createdAt
                                                                    )}
                                                                </span>
                                                            </div>

                                                            {event.note && (
                                                                <p>
                                                                    {event.note}
                                                                </p>
                                                            )}

                                                            {event.changedByRole && (
                                                                <small>
                                                                    Updated by{" "}
                                                                    {event.changedByRole ===
                                                                    "EMPLOYER"
                                                                        ? "Employer"
                                                                        : event.changedByRole ===
                                                                            "STUDENT"
                                                                          ? "Student"
                                                                          : event.changedByRole}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default StudentApplications;
