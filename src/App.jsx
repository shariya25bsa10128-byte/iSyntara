
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import HomePage from "./HomePage";
import AuthPage from "./pages/AuthPage";
import StudentDashboard from "./pages/StudentDashboard";
import EmployerDashboard from "./pages/EmployerDashboard";
import InternshipDetails from "./pages/InternshipDetails";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading-screen">
        INITIALIZING ISYNTARA...
      </div>
    );
  }

  const dashboardPath =
    user?.role === "STUDENT"
      ? "/student/dashboard"
      : user?.role === "EMPLOYER"
        ? "/employer/dashboard"
        : "/";

  const studentRoute = (page) =>
    user?.role === "STUDENT" ? (
      <StudentDashboard page={page} />
    ) : (
      <Navigate
        to={user ? dashboardPath : "/login"}
        replace
      />
    );

  const employerRoute = (page) =>
    user?.role === "EMPLOYER" ? (
      <EmployerDashboard page={page} />
    ) : (
      <Navigate
        to={user ? dashboardPath : "/login"}
        replace
      />
    );

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={dashboardPath} replace />
          ) : (
            <AuthPage mode="login" />
          )
        }
      />

      <Route
        path="/register"
        element={
          user ? (
            <Navigate to={dashboardPath} replace />
          ) : (
            <AuthPage mode="register" />
          )
        }
      />

      {/* CANDIDATE PAGES */}

      <Route
        path="/student/dashboard"
        element={studentRoute("overview")}
      />

      <Route
        path="/student/profile"
        element={studentRoute("profile")}
      />

      <Route
        path="/student/resume"
        element={studentRoute("resume")}
      />

      <Route
        path="/student/internships"
        element={studentRoute("internships")}
      />

      <Route
        path="/student/applications"
        element={studentRoute("applications")}
      />

      {/* INTERNSHIP DETAILS */}

      <Route
        path="/student/internships/:id"
        element={
          user?.role === "STUDENT" ? (
            <InternshipDetails />
          ) : (
            <Navigate
              to={user ? dashboardPath : "/login"}
              replace
            />
          )
        }
      />

      {/* RECRUITER PAGES */}

      <Route
        path="/employer/dashboard"
        element={employerRoute("overview")}
      />

      <Route
        path="/employer/internships"
        element={employerRoute("internships")}
      />

      <Route
        path="/employer/applications"
        element={employerRoute("applications")}
      />

      <Route
        path="/employer/profile"
        element={employerRoute("profile")}
      />

      {/* FALLBACK */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
