import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Providers } from "./providers";
import { AppShellLayout } from "./routes/app-shell-layout";
import OnboardingPage from "./routes/OnboardingPage";
import DashboardPage from "./routes/DashboardPage";
import InboxPage from "./routes/InboxPage";
import IdeasPage from "./routes/IdeasPage";
import ReviewPage from "./routes/ReviewPage";
import ProjectsPage from "./routes/ProjectsPage";
import ProjectDetailPage from "./routes/ProjectDetailPage";
import PeoplePage from "./routes/PeoplePage";
import PersonProfilePage from "./routes/PersonProfilePage";
import MeetingsPage from "./routes/MeetingsPage";
import PublicationsPage from "./routes/PublicationsPage";
import PublicationDetailPage from "./routes/PublicationDetailPage";
import GrantsPage from "./routes/GrantsPage";
import SettingsPage from "./routes/SettingsPage";
import PortfolioPage from "./routes/PortfolioPage";
import SupervisionPage from "./routes/SupervisionPage";
import CalendarPage from "./routes/CalendarPage";
import MemoryPage from "./routes/MemoryPage";
import SearchPage from "./routes/SearchPage";

// The graph explorer pulls in @xyflow/react, by far the heaviest single
// dependency added for it — split it into its own chunk so every other
// route doesn't pay for it on first load.
const GraphPage = lazy(() => import("./routes/GraphPage"));

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          <Route element={<AppShellLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/ideas" element={<IdeasPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/people/:id" element={<PersonProfilePage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/publications" element={<PublicationsPage />} />
            <Route path="/publications/:id" element={<PublicationDetailPage />} />
            <Route path="/grants" element={<GrantsPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/supervision" element={<SupervisionPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route
              path="/graph"
              element={
                <Suspense fallback={null}>
                  <GraphPage />
                </Suspense>
              }
            />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </Providers>
  );
}
