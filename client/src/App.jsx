import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OtpPage from './pages/OtpPage';
import WebauthnPage from './pages/WebauthnPage';
import DashboardPage from './pages/DashboardPage';
import SecurityQuestionPage from './pages/SecurityQuestionPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/security-question" element={<SecurityQuestionPage />} />
        <Route path="/otp" element={<OtpPage />} />
        <Route path="/webauthn" element={<WebauthnPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;