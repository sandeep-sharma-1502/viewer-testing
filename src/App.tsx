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
  const [customStudyId, setCustomStudyId] = useState('');

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
    <div className="w-screen h-screen bg-[#0f172a] flex flex-col font-sans overflow-hidden select-none">

      {/* ── Top branding bar ── */}
      <div className="h-[44px] bg-[#0a1628] border-b border-[#1e293b] flex items-center px-5 shrink-0">
        <span className="text-[#38bdf8] font-bold text-[15px] tracking-wider">
          iCare
        </span>
        <span className="text-[#334155] mx-2">|</span>
        <span className="text-[#64748b] text-[12px]">Medical Imaging Platform</span>
      </div>

      {/* ── Tab bar ── */}
      <div className="h-[34px] bg-[#0f172a] border-b border-[#1e293b] flex items-end px-3 gap-px shrink-0 overflow-x-auto overflow-y-hidden">
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
      <div className="flex-1 overflow-hidden relative">

        {/* Static panels — always mounted, visibility toggled */}
        <div 
          className="absolute inset-0 flex items-center justify-center p-8"
          style={{ display: activeTab === 'scan' ? 'flex' : 'none' }}
        >
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-8 px-10 max-w-[560px] w-full flex flex-col gap-6">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-[40px]">🩻</span>
            </div>

            {/* Custom Study ID Input */}
            <div className="flex flex-col gap-2 p-4 bg-[#0f172a] border border-[#1e293b] rounded-lg text-left">
              <label className="text-[#94a3b8] text-[13px] font-medium">Enter Custom Study ID / GUID:</label>
              <div className="flex gap-2 flex-col">
                <div className="flex gap-[10px]">
                  <input
                    type="text"
                    placeholder="e.g., 1742493 or 36"
                    value={customStudyId}
                    onChange={e => setCustomStudyId(e.target.value)}
                    className="flex-1 p-2 px-3 bg-[#1e293b] border border-[#475569] rounded-md text-[#f8fafc] text-[13.5px] outline-none focus:border-[#38bdf8] transition-colors"
                  />
                </div>
                <div className="flex gap-2 flex-wrap mt-1">
                  <button
                    disabled={!customStudyId.trim()}
                    onClick={() => {
                      const trimmed = customStudyId.trim();
                      const host = trimmed === '1742493' ? 'files.icareteleservices.com' : 'files.anikrafoundation.com';
                      openViewerTab(
                        `Study ${trimmed} (JSON)`,
                        `/viewer/dicomjson?url=` + encodeURIComponent(`https://${host}/json/${trimmed}.json`)
                      );
                    }}
                    className={`flex-1 min-w-[120px] p-2 px-3 rounded-md font-bold text-[11px] whitespace-nowrap transition-colors ${
                      customStudyId.trim()
                        ? 'bg-[#38bdf8] text-[#0f172a] cursor-pointer hover:bg-[#0ea5e9]'
                        : 'bg-[#334155] text-[#64748b] cursor-not-allowed'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    disabled={!customStudyId.trim()}
                    onClick={() => {
                      const trimmed = customStudyId.trim();
                      openViewerTab(
                        `Study ${trimmed} (POST)`,
                        `/viewer/dicomjson?studyGUID=${trimmed}`
                      );
                    }}
                    className={`flex-1 min-w-[120px] p-2 px-3 rounded-md font-bold text-[11px] whitespace-nowrap transition-colors ${
                      customStudyId.trim()
                        ? 'bg-[#10b981] text-[#0f172a] cursor-pointer hover:bg-[#059669]'
                        : 'bg-[#334155] text-[#64748b] cursor-not-allowed'
                    }`}
                  >
                    POST
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[10px]">
              {/* Study 1 */}
              <div className="flex items-center justify-between p-3 px-4 bg-[#0f172a] border border-[#1e293b] rounded-lg gap-4">
                <div className="flex-1 text-left">
                  <div className="text-[#f8fafc] text-[14px] font-semibold">Study 1742493</div>
                  <div className="text-[#64748b] text-[11px] break-all mt-0.5">files.icareteleservices.com</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openViewerTab(
                      'Study 1742493 (JSON)',
                      '/viewer/dicomjson?url=' + encodeURIComponent('https://files.icareteleservices.com/json/1742493.json')
                    )}
                    className="p-1.5 px-3 bg-[#38bdf8] text-[#0f172a] border-none rounded-md font-bold text-[12px] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#0ea5e9]"
                  >
                    View (JSON)
                  </button>
                  <button
                    onClick={() => openViewerTab(
                      'Study 1742493 (POST)',
                      '/viewer/dicomjson?studyGUID=1742493'
                    )}
                    className="p-1.5 px-3 bg-[#10b981] text-[#0f172a] border-none rounded-md font-bold text-[12px] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#059669]"
                  >
                    View (POST)
                  </button>
                </div>
              </div>

              {/* Study 2 */}
              <div className="flex items-center justify-between p-3 px-4 bg-[#0f172a] border border-[#1e293b] rounded-lg gap-4">
                <div className="flex-1 text-left">
                  <div className="text-[#f8fafc] text-[14px] font-semibold">Study 36 (Anikra)</div>
                  <div className="text-[#64748b] text-[11px] break-all mt-0.5">files.anikrafoundation.com</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openViewerTab(
                      'Study 36 (JSON)',
                      '/viewer/dicomjson?url=' + encodeURIComponent('https://files.anikrafoundation.com/json/36.json')
                    )}
                    className="p-1.5 px-3 bg-[#38bdf8] text-[#0f172a] border-none rounded-md font-bold text-[12px] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#0ea5e9]"
                  >
                    View (JSON)
                  </button>
                  <button
                    onClick={() => openViewerTab(
                      'Study 36 (POST)',
                      '/viewer/dicomjson?studyGUID=36'
                    )}
                    className="p-1.5 px-3 bg-[#10b981] text-[#0f172a] border-none rounded-md font-bold text-[12px] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#059669]"
                  >
                    View (POST)
                  </button>
                </div>
              </div>

              {/* Study 3 */}
              <div className="flex items-center justify-between p-3 px-4 bg-[#0f172a] border border-[#1e293b] rounded-lg gap-4">
                <div className="flex-1 text-left">
                  <div className="text-[#f8fafc] text-[14px] font-semibold">Study 32 (Anikra)</div>
                  <div className="text-[#64748b] text-[11px] break-all mt-0.5">files.anikrafoundation.com</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openViewerTab(
                      'Study 32 (JSON)',
                      '/viewer/dicomjson?url=' + encodeURIComponent('https://files.anikrafoundation.com/json/32.json')
                    )}
                    className="p-1.5 px-3 bg-[#38bdf8] text-[#0f172a] border-none rounded-md font-bold text-[12px] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#0ea5e9]"
                  >
                    View (JSON)
                  </button>
                  <button
                    onClick={() => openViewerTab(
                      'Study 32 (POST)',
                      '/viewer/dicomjson?studyGUID=32'
                    )}
                    className="p-1.5 px-3 bg-[#10b981] text-[#0f172a] border-none rounded-md font-bold text-[12px] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#059669]"
                  >
                    View (POST)
                  </button>
                </div>
              </div>

              {/* Study 4 */}
              <div className="flex items-center justify-between p-3 px-4 bg-[#0f172a] border border-[#1e293b] rounded-lg gap-4">
                <div className="flex-1 text-left">
                  <div className="text-[#f8fafc] text-[14px] font-semibold">Study 44 (Anikra)</div>
                  <div className="text-[#64748b] text-[11px] break-all mt-0.5">files.anikrafoundation.com</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openViewerTab(
                      'Study 44 (JSON)',
                      '/viewer/dicomjson?url=' + encodeURIComponent('https://files.anikrafoundation.com/json/44.json')
                    )}
                    className="p-1.5 px-3 bg-[#38bdf8] text-[#0f172a] border-none rounded-md font-bold text-[12px] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#0ea5e9]"
                  >
                    View (JSON)
                  </button>
                  <button
                    onClick={() => openViewerTab(
                      'Study 44 (POST)',
                      '/viewer/dicomjson?studyGUID=44'
                    )}
                    className="p-1.5 px-3 bg-[#10b981] text-[#0f172a] border-none rounded-md font-bold text-[12px] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#059669]"
                  >
                    View (POST)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div 
          className="absolute inset-0 flex items-center justify-center p-8"
          style={{ display: activeTab === 'local' ? 'flex' : 'none' }}
        >
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
            className="absolute inset-0"
            style={{ display: activeTab === tab.id ? 'block' : 'none' }}
          >
            <iframe
              src={tab.viewerUrl}
              width="100%"
              height="100%"
              className="border-none"
              allow="fullscreen"
              title={tab.label}
            />
          </div>
        ))}

        {/* Empty state when no tab matches */}
        {activeTab !== 'scan' && activeTab !== 'local' && !activeViewer && (
          <div 
            className="absolute inset-0 flex items-center justify-center p-8 text-[#475569]"
            style={{ display: 'flex' }}
          >
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
      className={`inline-flex items-center gap-1.5 px-3 h-[34px] rounded-t-md cursor-pointer text-[12.5px] transition-all shrink-0 whitespace-nowrap outline-none border-none border-t-2 ${
        isActive
          ? 'bg-[#1e293b] text-[#f1f5f9] font-semibold border-t-[#38bdf8]'
          : 'bg-transparent text-[#64748b] border-t-transparent hover:text-[#cbd5e1] hover:bg-[#1e293b60]'
      }`}
    >
      {label}
      {onClose && (
        <span
          onClick={onClose}
          title="Close tab"
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[11px] text-[#64748b] bg-transparent transition-all cursor-pointer leading-none hover:bg-red-500/20 hover:text-red-400"
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
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-10 px-12 max-w-[440px] w-full text-center flex flex-col items-center gap-4">
      <div className="text-[52px]">{icon}</div>
      <h2 className="m-0 text-[18px] text-[#f8fafc] font-semibold">{title}</h2>
      <p className="m-0 text-[#94a3b8] text-[13.5px] leading-relaxed">{description}</p>
      <button
        onClick={onOpen}
        className="mt-1 p-2.5 px-7 bg-[#38bdf8] text-[#0f172a] border-none rounded-lg font-bold text-[13.5px] cursor-pointer transition-colors hover:bg-[#0ea5e9]"
      >
        {buttonLabel} →
      </button>
    </div>
  );
}

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
