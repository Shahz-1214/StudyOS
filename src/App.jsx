import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import Onboarding from '@/pages/Onboarding';
import Profile from '@/pages/Profile';
import Progress from '@/pages/Progress';
import ComingSoon from '@/pages/ComingSoon';
import ErrorBoundary from '@/components/ErrorBoundary';
import NotFound from '@/pages/errors/NotFound';
import AccessDenied from '@/pages/errors/AccessDenied';
import AuthRequired from '@/pages/errors/AuthRequired';
import OfflineGate from '@/components/errors/OfflineGate';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';
import Practice from '@/pages/Practice';
import StudyLens from '@/pages/StudyLens';
import Homework from '@/pages/Homework';
import NoteQuiz from '@/pages/NoteQuiz';
import ExamPilot from '@/pages/ExamPilot';
import FocusStudy from '@/pages/FocusStudy';
import Weakness from '@/pages/Weakness';
import LectureMind from '@/pages/LectureMind';
import EssayCheck from '@/pages/EssayCheck';
import Tasks from '@/pages/Tasks';
import StudySync from '@/pages/StudySync';
import PastPapers from '@/pages/PastPapers';
import BookReader from '@/pages/BookReader';
import AdminTextbooks from '@/pages/AdminTextbooks';
import ExamDates from '@/pages/ExamDates';
import SubjectHub from '@/pages/SubjectHub';
import ExamVault from '@/pages/ExamVault';
import HelpCenter from '@/pages/HelpCenter';
import Subscription from '@/pages/Subscription';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsConditions from '@/pages/TermsConditions';
import CookiePolicy from '@/pages/CookiePolicy';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/privacy", "/terms", "/cookies", "/error/401", "/error/403"];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const protectedPrefixes = ["/tool/", "/practice", "/past-papers", "/exam-dates", "/subject-hub", "/exam-vault", "/book/", "/admin/", "/help", "/subscription", "/onboarding", "/progress", "/profile"];
  const isProtectedRoute = location.pathname === "/" || protectedPrefixes.some((prefix) => location.pathname.startsWith(prefix));

  // Show a branded security/loading state while the auth bootstrap is running.
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <AuthLoadingScreen />;
  }

  // Handle authentication errors — but never block the dedicated auth pages
  // (login / register / forgot / reset) so unauthenticated users can reach them.
  if (authError && !isPublicRoute && isProtectedRoute) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <OfflineGate>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsConditions />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/error/401" element={<AuthRequired />} />
      <Route path="/error/403" element={<AccessDenied />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/past-papers" element={<PastPapers />} />
        <Route path="/exam-dates" element={<ExamDates />} />
        <Route path="/subject-hub" element={<SubjectHub />} />
        <Route path="/book/:id" element={<BookReader />} />
        <Route path="/admin/textbooks" element={<AdminTextbooks />} />
        <Route path="/exam-vault" element={<ExamVault />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/tool/studylens" element={<StudyLens />} />
        <Route path="/tool/homework" element={<Homework />} />
        <Route path="/tool/note-quiz" element={<NoteQuiz />} />
        <Route path="/tool/exampilot" element={<ExamPilot />} />
        <Route path="/tool/focus" element={<FocusStudy />} />
        <Route path="/tool/weakness" element={<Weakness />} />
        <Route path="/tool/lecture" element={<LectureMind />} />
        <Route path="/tool/essay" element={<EssayCheck />} />
        <Route path="/tool/tasks" element={<Tasks />} />
        <Route path="/tool/studysync" element={<StudySync />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tool/:featureId" element={<ComingSoon />} />
      </Route>
      <Route path="*" element={<NotFound />} />
      </Routes>
    </OfflineGate>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <ErrorBoundary>
            <AuthenticatedApp />
          </ErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App