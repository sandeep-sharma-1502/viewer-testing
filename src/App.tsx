
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import MedicalViewer from './pages/dashboard/MedicalViewer.tsx';

function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Icare</h1>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link
          to="/medical-viewer?url=https://files.icareteleservices.com/json/1742493.json"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0ea5e9',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.5rem',
            fontWeight: 'bold'
          }}
        >
          Open Study Scan
        </Link>

        <Link
          to="/medical-viewer?url=local"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#475569',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.5rem',
            fontWeight: 'bold'
          }}
        >
          Drag & Drop Local DICOM
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/medical-viewer" element={<MedicalViewer />} />
      </Routes>
    </BrowserRouter>
  );
}
