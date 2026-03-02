import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import JobsListPage   from './pages/JobsListPage';
import JobDetailPage  from './pages/JobDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Navigate to="/vagas" replace />} />
        <Route path="/vagas"     element={<JobsListPage />} />
        <Route path="/vagas/:slug" element={<JobDetailPage />} />
        <Route path="*"          element={<Navigate to="/vagas" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
