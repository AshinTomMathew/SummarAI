import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import NewSessionPage from './pages/NewSessionPage';
import TranscriptPage from './pages/TranscriptPage';
import ChatPage from './pages/ChatPage';
import ExportPage from './pages/ExportPage';
import ProfilePage from './pages/ProfilePage';
import GuestModePage from './pages/GuestModePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/new-session" element={<NewSessionPage />} />
                <Route path="/transcript" element={<TranscriptPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/guest" element={<GuestModePage />} />
            </Routes>
        </Router>
    );
}

export default App;
