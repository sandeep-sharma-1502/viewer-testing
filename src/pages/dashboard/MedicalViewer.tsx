
import { useSearchParams } from 'react-router-dom';

export default function MedicalViewer() {
  const [searchParams] = useSearchParams();
  const jsonUrl = searchParams.get('url') || 'https://files.icareteleservices.com/json/1742493.json';

  // Condition to trigger local drag and drop or study rendering
  const viewerUrl = searchParams.get('url') === 'local'
    ? '/viewer/localbasic'
    : `/viewer/dicomjson?url=${encodeURIComponent(jsonUrl)}`;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header bar */}
      <div style={{
        height: '48px',
        backgroundColor: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1rem',
        borderBottom: '1px solid #334155'
      }}>
        <a 
          href="/" 
          style={{ 
            color: 'white', 
            textDecoration: 'none', 
            fontWeight: 'bold', 
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>← Back to LMS Dashboard</span>
        </a>
      </div>
      
      {/* Iframe rendering the medical viewer */}
      <iframe
        src={viewerUrl}
        width="100%"
        height="100%"
        style={{ border: 'none', flexGrow: 1 }}
        allow="fullscreen"
        title="Cornerstone Medical Viewer"
      />
    </div>
  );
}
