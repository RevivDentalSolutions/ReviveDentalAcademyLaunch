import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { supabase } from './lib/supabase';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import CourseLibrary from './pages/courses/CourseLibrary';
import CoursePlayer from './pages/courses/CoursePlayer';
import TemplateLibrary from './pages/templates/TemplateLibrary';
import MembershipPage from './pages/membership/MembershipPage';
import OfficeProDashboard from './pages/membership/OfficeProDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ResourceCenter from './pages/resources/ResourceCenter';
import { hasActiveSubscription } from './lib/supabase';

function App() {
  const navigate = useNavigate();
  const { initialize, isLoading, isAuthenticated, profile } = useAuthStore();
  const [hasOfficeProSubscription, setHasOfficeProSubscription] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const recoveryFromHash = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    if (recoveryFromHash) navigate('/reset-password', { replace: true });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password', { replace: true });
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;

    async function loadSubscriptionAccess() {
      if (!isAuthenticated) {
        setHasOfficeProSubscription(false);
        return;
      }

      const active = await hasActiveSubscription();
      if (isMounted) setHasOfficeProSubscription(active);
    }

    loadSubscriptionAccess();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, profile?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary" />
      </div>
    );
  }

  // Only admins can access the admin panel
  const isAdmin = isAuthenticated && profile?.role === 'admin';
  const hasOfficeProAccess = isAdmin || hasOfficeProSubscription;

  // Protected admin route component
  const AdminRoute = () => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/" replace />;
    return <AdminDashboard />;
  };

  return (
    <Routes>
      <Route path="/course-player/:courseId" element={<CoursePlayer />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<CourseLibrary />} />
            <Route path="/templates" element={<TemplateLibrary />} />
            <Route 
              path="/membership" 
              element={hasOfficeProAccess ? <OfficeProDashboard /> : <MembershipPage />} 
            />
            <Route path="/resources" element={<ResourceCenter />} />
            <Route path="/training" element={<div className="p-40 text-center text-gray-500 italic">Advanced Training Modules (Coming Soon)</div>} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}

export default App;
