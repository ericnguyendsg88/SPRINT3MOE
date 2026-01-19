import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
import { ProvidersProvider } from "@/contexts/ProvidersContext";

// Layouts
import { AdminLayout } from "@/components/layout/AdminLayout";
import { EServiceLayout } from "@/components/layout/EServiceLayout";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AccountManagement from "./pages/admin/AccountManagement";
import StudentDetail from "./pages/admin/StudentDetail";
import StudentCourseDetail from "./pages/admin/StudentCourseDetail";
import TopUpManagement from "./pages/admin/TopUpManagement";
import CourseManagement from "./pages/admin/CourseManagement";
import CourseDetail from "./pages/admin/CourseDetail";
import CourseStudents from "./pages/admin/CourseStudents";
import FeeProcessing from "./pages/admin/FeeProcessing";
import AdminSettings from "./pages/admin/AdminSettings";

// e-Service Pages
import EServiceDashboard from "./pages/eservice/EServiceDashboard";
import EServiceCourseDetail from "./pages/eservice/CourseDetail";
import AccountBalance from "./pages/eservice/AccountBalance";
import CourseFees from "./pages/eservice/CourseFees";
import Profile from "./pages/eservice/Profile";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ProvidersProvider>
      <CurrentUserProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<Index />} />
            
            {/* Admin Portal Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="accounts" element={<AccountManagement />} />
              <Route path="accounts/:accountId" element={<StudentDetail />} />
              <Route path="accounts/:accountId/courses/:courseId" element={<StudentCourseDetail />} />
              <Route path="topup" element={<TopUpManagement />} />
              <Route path="courses" element={<CourseManagement />} />
              <Route path="courses/:courseId" element={<CourseDetail />} />
              <Route path="courses/:courseId/students" element={<CourseStudents />} />
              <Route path="fees" element={<FeeProcessing />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            
            {/* e-Service Portal Routes */}
            <Route path="/eservice" element={<EServiceLayout />}>
              <Route index element={<EServiceDashboard />} />
              <Route path="courses/:courseId" element={<EServiceCourseDetail />} />
              <Route path="balance" element={<AccountBalance />} />
              <Route path="fees" element={<CourseFees />} />
              <Route path="profile" element={<Profile />} />
              
            </Route>
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CurrentUserProvider>
    </ProvidersProvider>
  </QueryClientProvider>
);

export default App;
