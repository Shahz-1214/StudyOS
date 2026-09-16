import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Onboarding from '@/pages/Onboarding';
import Profile from '@/pages/Profile';
import Progress from '@/pages/Progress';
import ComingSoon from '@/pages/ComingSoon';
import ErrorBoundary from '@/components/ErrorBoundary';
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
import Resources from '@/pages/Resources';
import Subscription from '@/pages/Subscription';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
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
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/resources" element={<Resources />} />
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
      <Route path="*" element={<PageNotFound />} />
    </Routes>
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