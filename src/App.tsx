import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

/* ─── Types ─────────────────────────────────────────────────── */
type ViewerTab = {
  id: string;
  label: string;
  viewerUrl: string;
};

/* ─── Home Page ─────────────────────────────────────────────── */
function Home() {
  const [activeTab, setActiveTab] = useState<'scan' | 'local' | string>('scan');
  const [viewerTabs, setViewerTabs] = useState<ViewerTab[]>([]);

  const openViewerTab = useCallback((label: string, viewerUrl: string) => {
    const id = `viewer-${Date.now()}`;
    const newTab: ViewerTab = { id, label, viewerUrl };
    setViewerTabs(prev => [...prev, newTab]);
    setActiveTab(id);
  }, []);

  const closeTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewerTabs(prev => {
      const remaining = prev.filter(t => t.id !== id);
      return remaining;
    });
    setActiveTab(prev => {
      if (prev === id) {
        const remaining = viewerTabs.filter(t => t.id !== id);
        return remaining.length > 0 ? remaining[remaining.length - 1].id : 'scan';
      }
      return prev;
    });
  }, [viewerTabs]);

  const activeViewer = viewerTabs.find(t => t.id === activeTab);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
    }}>

      {/* ── Top branding bar ── */}
      <div style={{
        height: '44px',
        backgroundColor: '#0a1628',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.25rem',
        flexShrink: 0,
      }}>
        <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '15px', letterSpacing: '0.04em' }}>
          iCare
        </span>
        <span style={{ color: '#334155', margin: '0 0.5rem' }}>|</span>
        <span style={{ color: '#64748b', fontSize: '12px' }}>Medical Imaging Platform</span>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        height: '34px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '0 0.75rem',
        gap: '1px',
        flexShrink: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
      }}>
        {/* Static tab: Open Study Scan */}
        <Tab
          label="Open Study Scan"
          isActive={activeTab === 'scan'}
          onClick={() => setActiveTab('scan')}
        />

        {/* Static tab: Drag & Drop */}
        <Tab
          label="Drag & Drop Local DICOM"
          isActive={activeTab === 'local'}
          onClick={() => setActiveTab('local')}
        />

        {/* Dynamic viewer tabs */}
        {viewerTabs.map(tab => (
          <Tab
            key={tab.id}
            label={tab.label}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            onClose={e => closeTab(tab.id, e)}
          />
        ))}
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Static panels — always mounted, visibility toggled */}
        <div style={{ ...centeredStyle, display: activeTab === 'scan' ? 'flex' : 'none' }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '2rem 2.5rem',
            maxWidth: '560px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>🩻</span>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', fontWeight: 600 }}>Remote Study Scans</h2>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px', marginTop: '2px' }}>Select a study scan below to open in the viewer.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Study 1 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                gap: '1rem',
              }}>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Study 1742493</div>
                  <div style={{ color: '#64748b', fontSize: '11px', wordBreak: 'break-all', marginTop: '2px' }}>files.icareteleservices.com</div>
                </div>
                <button
                  onClick={() => openViewerTab(
                    'Study Scan 1742493',
                    '/viewer/dicomjson?url=' + encodeURIComponent('https://files.icareteleservices.com/json/1742493.json')
                  )}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#38bdf8',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0ea5e9')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#38bdf8')}
                >
                  View
                </button>
              </div>

              {/* Study 2 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                gap: '1rem',
              }}>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Study 36 (Anikra)</div>
                  <div style={{ color: '#64748b', fontSize: '11px', wordBreak: 'break-all', marginTop: '2px' }}>files.anikrafoundation.com</div>
                </div>
                <button
                  onClick={() => openViewerTab(
                    'Study Scan 36',
                    '/viewer/dicomjson?url=' + encodeURIComponent('https://files.anikrafoundation.com/json/36.json')
                  )}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#38bdf8',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0ea5e9')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#38bdf8')}
                >
                  View
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...centeredStyle, display: activeTab === 'local' ? 'flex' : 'none' }}>
          <ActionCard
            icon="📂"
            title="Drag & Drop Local DICOM"
            description="Load DICOM files directly from your computer using drag & drop."
            buttonLabel="Open Local Viewer"
            onOpen={() => openViewerTab('Local DICOM', '/viewer/localbasic')}
          />
        </div>

        {/* Dynamic viewer iframes — all mounted once opened, visibility toggled */}
        {viewerTabs.map(tab => (
          <div
            key={tab.id}
            style={{
              display: activeTab === tab.id ? 'block' : 'none',
              position: 'absolute',
              inset: 0,
            }}
          >
            <iframe
              src={tab.viewerUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              allow="fullscreen"
              title={tab.label}
            />
          </div>
        ))}

        {/* Empty state when no tab matches */}
        {activeTab !== 'scan' && activeTab !== 'local' && !activeViewer && (
          <div style={{ ...centeredStyle, display: 'flex', color: '#475569' }}>
            <p>Select a tab to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab component ─────────────────────────────────────────── */
function Tab({
  label,
  isActive,
  onClick,
  onClose,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  onClose?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0 12px',
        height: '34px',
        backgroundColor: isActive ? '#1e293b' : 'transparent',
        color: isActive ? '#f1f5f9' : '#64748b',
        border: 'none',
        borderTop: isActive ? '2px solid #38bdf8' : '2px solid transparent',
        borderRadius: '6px 6px 0 0',
        cursor: 'pointer',
        fontSize: '12.5px',
        fontWeight: isActive ? 600 : 400,
        transition: 'all 0.12s ease',
        outline: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.color = '#cbd5e1';
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1e293b60';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        }
      }}
    >
      {label}
      {onClose && (
        <span
          onClick={onClose}
          title="Close tab"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            fontSize: '11px',
            color: '#64748b',
            backgroundColor: 'transparent',
            transition: 'all 0.12s',
            lineHeight: 1,
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLSpanElement).style.backgroundColor = '#ef444430';
            (e.currentTarget as HTMLSpanElement).style.color = '#f87171';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLSpanElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLSpanElement).style.color = '#64748b';
          }}
        >
          ✕
        </span>
      )}
    </button>
  );
}

/* ─── Action card ───────────────────────────────────────────── */
function ActionCard({
  icon,
  title,
  description,
  buttonLabel,
  onOpen,
}: {
  icon: string;
  title: string;
  description: string;
  buttonLabel: string;
  onOpen: () => void;
}) {
  return (
    <div style={{
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '2.5rem 3rem',
      maxWidth: '440px',
      width: '100%',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <div style={{ fontSize: '52px' }}>{icon}</div>
      <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', fontWeight: 600 }}>{title}</h2>
      <p style={{ margin: 0, color: '#94a3b8', fontSize: '13.5px', lineHeight: '1.65' }}>{description}</p>
      <button
        onClick={onOpen}
        style={{
          marginTop: '0.25rem',
          padding: '0.65rem 1.75rem',
          backgroundColor: '#38bdf8',
          color: '#0f172a',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '13.5px',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0ea5e9')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#38bdf8')}
      >
        {buttonLabel} →
      </button>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────── */
const centeredStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
};

/* ─── App root ──────────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
