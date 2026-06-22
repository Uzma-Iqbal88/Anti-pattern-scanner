import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import './App.css';
const MOCK_FILES = {
  'users.py': {
    name: 'users.py',
    language: 'python',
    code: [
      { text: '# User management service', isComment: true },
      { text: 'from datetime import *', hasAntipattern: 'wildcard_imports' },
      { text: '' },
      { text: 'def create_profile(username, roles=[]):', hasAntipattern: 'dangerous_default_value' },
      { text: '    roles.append("member")' },
      { text: '    return {"username": username, "roles": roles}' },
      { text: '' },
      { text: 'def save_log(message):' },
      { text: '    with open("log.txt", "w") as f:', hasAntipattern: 'unspecified_encoding' },
      { text: '        f.write(message)' },
      { text: '' },
      { text: 'def on_request_end(handler):' },
      { text: '    """Called when request ends."""' },
      { text: '    pass', hasAntipattern: 'unnecessary_pass' },
    ]
  },
  'analytics.py': {
    name: 'analytics.py',
    language: 'python',
    code: [
      { text: '# Analytics processing module', isComment: true },
      { text: 'from numpy import *', hasAntipattern: 'wildcard_imports' },
      { text: '' },
      { text: 'class MetricTracker:' },
      { text: '    def __init__(self):' },
      { text: '        self.name = "tracker"' },
      { text: '' },
      { text: '    def setup(self):' },
      { text: '        self.history = []', hasAntipattern: 'attribute_outside_init' },
      { text: '        self.total = 0', hasAntipattern: 'attribute_outside_init' },
      { text: '' },
      { text: 'def parse_path(text):' },
      { text: '    return re.split("(\\d+)", text)', hasAntipattern: 'anomalous_backslash' },
    ]
  }
};

const ANTIPATTERNS = {
  'wildcard_imports': {
    id: 'wildcard_imports',
    name: 'Wildcard Import (import *)',
    category: 'Import Issues',
    severity: 'warning',
    fileName: 'users.py',
    lineNumber: 2,
    description: 'Using "from module import *" imports all definitions into the local namespace.',
    impact: 'Pollutes the local namespace, makes it hard to trace where objects originate, and can cause naming conflicts.',
    fix: 'Import only what you need explicitly.',
    fixCode: 'from datetime import datetime',
    problemCode: 'from datetime import *',
    refactorReason: 'Replacing the wildcard import with explicit named imports prevents namespace pollution.'
  },
  'dangerous_default_value': {
    id: 'dangerous_default_value',
    name: 'Dangerous Default Value',
    category: 'Arguments Issues',
    severity: 'critical',
    fileName: 'users.py',
    lineNumber: 4,
    description: 'A mutable object (list, dict, set) is used as a default function parameter.',
    impact: 'Default values are evaluated once at definition. The same list is shared across all calls, causing state to accumulate unexpectedly.',
    fix: 'Use None as default and initialize the mutable object inside the function.',
    fixCode: 'def create_profile(username, roles=None):\n    if roles is None:\n        roles = []',
    problemCode: 'def create_profile(username, roles=[]):',
    refactorReason: 'Moving the mutable default argument initialization into the function body prevents shared state bugs.'
  },
  'unspecified_encoding': {
    id: 'unspecified_encoding',
    name: 'Unspecified Encoding',
    category: 'Wrong Coding Practices',
    severity: 'warning',
    fileName: 'users.py',
    lineNumber: 9,
    description: 'open() is called without specifying the encoding parameter.',
    impact: 'Default encoding is platform-dependent, causing inconsistent behavior across different operating systems.',
    fix: 'Always specify encoding explicitly in open() calls.',
    fixCode: 'with open("log.txt", "w", encoding="utf-8") as f:',
    problemCode: 'with open("log.txt", "w") as f:',
    refactorReason: 'Adding explicit utf-8 encoding ensures cross-platform consistency when writing files.'
  },
  'unnecessary_pass': {
    id: 'unnecessary_pass',
    name: 'Unnecessary Pass',
    category: 'Wrong Coding Practices',
    severity: 'warning',
    fileName: 'users.py',
    lineNumber: 14,
    description: 'A pass statement is used in a block that already has a docstring.',
    impact: 'Adds noise to the code with no functional purpose, reducing readability.',
    fix: 'Remove the pass statement — the docstring alone is sufficient.',
    fixCode: 'def on_request_end(handler):\n    """Called when request ends."""',
    problemCode: 'def on_request_end(handler):\n    """Called when request ends."""\n    pass',
    refactorReason: 'Removing the pass statement makes the code cleaner since the docstring satisfies the block requirement.'
  },
  'attribute_outside_init': {
    id: 'attribute_outside_init',
    name: 'Attribute Defined Outside __init__',
    category: 'Wrong Coding Practices',
    severity: 'critical',
    fileName: 'analytics.py',
    lineNumber: 9,
    description: 'Instance attributes are defined outside the __init__ method.',
    impact: 'Makes class structure unclear and can cause AttributeError if methods are called in an unexpected order.',
    fix: 'Define all instance attributes inside __init__, using None as placeholder if needed.',
    fixCode: 'def __init__(self):\n    self.name = "tracker"\n    self.history = []\n    self.total = 0',
    problemCode: 'def setup(self):\n    self.history = []\n    self.total = 0',
    refactorReason: 'Declaring attributes in __init__ makes the object\'s shape predictable and prevents undefined attribute errors.'
  },
  'anomalous_backslash': {
    id: 'anomalous_backslash',
    name: 'Anomalous Backslash in String',
    category: 'Wrong Coding Practices',
    severity: 'warning',
    fileName: 'analytics.py',
    lineNumber: 13,
    description: 'A backslash in a string is not a recognized escape sequence (e.g. \\d, \\s).',
    impact: 'Python keeps the backslash literally but behavior may change in future versions, causing regex bugs.',
    fix: 'Use a raw string (prefix with r) to avoid ambiguous backslash sequences.',
    fixCode: 'return re.split(r"(\\d+)", text)',
    problemCode: 'return re.split("(\\d+)", text)',
    refactorReason: 'Using a raw string literal (r"") correctly escapes the backslash for the regex engine.'
  }
};

function App() {
  const [activeFile, setActiveFile] = useState('users.py');
  const [selectedAntipatternId, setSelectedAntipatternId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanDone, setScanDone] = useState(false);
  const [scannedFiles, setScannedFiles] = useState({});
  const [showRefactorView, setShowRefactorView] = useState(false);

  const codeWindowRef = useRef(null);

  const highlightSyntax = (text) => {
    if (text.trim().startsWith('#')) {
      return <span className="syntax-comment">{text}</span>;
    }
    const parts = text.split(/(\bdef\b|\bclass\b|\bfrom\b|\bimport\b|\bwith\b|\bopen\b|\bpass\b|\bif\b|\breturn\b|\bself\b|"[^"]*"|'[^']*')/g);
    return parts.map((part, index) => {
      if (['def', 'class', 'from', 'import', 'with', 'pass', 'if', 'return'].includes(part)) {
        return <span key={index} className="syntax-keyword">{part}</span>;
      }
      if (['open', 'self'].includes(part)) {
        return <span key={index} className="syntax-function">{part}</span>;
      }
      if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
        return <span key={index} className="syntax-string">{part}</span>;
      }
      return part;
    });
  };

  const handleRunScan = () => {
    setScanning(true);
    setScanDone(false);
    setScanProgress(0);
    setSelectedAntipatternId(null);
  };

  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          setScanDone(true);
          setScannedFiles({
            'users.py': ['wildcard_imports', 'dangerous_default_value', 'unspecified_encoding', 'unnecessary_pass'],
            'analytics.py': ['attribute_outside_init', 'anomalous_backslash']
          });
          return 100;
        }
        return prev + 5;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [scanning]);

  const handleSelectAntipattern = (id) => {
    const item = ANTIPATTERNS[id];
    if (item) {
      setSelectedAntipatternId(id);
      setActiveFile(item.fileName);
      setShowRefactorView(false);
      setTimeout(() => {
        const lineEl = document.getElementById(`line-${item.lineNumber}`);
        if (lineEl && codeWindowRef.current) {
          lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  };

  const currentFile = MOCK_FILES[activeFile];
  const activeAntipattern = selectedAntipatternId ? ANTIPATTERNS[selectedAntipatternId] : null;

  const criticalCount = Object.values(ANTIPATTERNS).filter(a => a.severity === 'critical').length;
  const warningCount = Object.values(ANTIPATTERNS).filter(a => a.severity === 'warning').length;
  const totalIssues = criticalCount + warningCount;

  let letterGrade = 'A';
  let scorePercent = 100;
  if (totalIssues > 5) {
    letterGrade = 'D';
    scorePercent = 40;
  } else if (totalIssues > 2) {
    letterGrade = 'C';
    scorePercent = 60;
  } else if (totalIssues > 0) {
    letterGrade = 'B';
    scorePercent = 80;
  }

  const issuesPerFile = Object.values(ANTIPATTERNS).reduce((acc, curr) => {
    acc[curr.fileName] = (acc[curr.fileName] || 0) + 1;
    return acc;
  }, {});

  const fileData = Object.keys(issuesPerFile).map(key => ({
    name: key,
    issues: issuesPerFile[key]
  }));

  const severityData = [
    { name: 'Critical', value: criticalCount },
    { name: 'Warning', value: warningCount }
  ].filter(d => d.value > 0);

  const severityColors = { Critical: '#F09595', Warning: '#EF9F27' };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title-group">
          <span className="header-logo" role="img" aria-label="radar">📡</span>
          <h1>SRE Code Anti-Pattern Scanner</h1>
        </div>
        <div className="header-actions">
          <button
            className={`scan-btn ${scanning ? 'scanning' : ''}`}
            onClick={handleRunScan}
            disabled={scanning}
          >
            {scanning ? 'Scanning Files...' : 'Run Code Scan'}
          </button>
        </div>
      </header>

      <main className="app-workspace">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>Project Files</h3>
            <div className="file-list">
              {Object.keys(MOCK_FILES).map((fileName) => {
                const isActive = activeFile === fileName;
                const hasIssues = scanDone && scannedFiles[fileName]?.length > 0;
                return (
                  <button
                    key={fileName}
                    className={`file-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveFile(fileName);
                      if (activeAntipattern && activeAntipattern.fileName !== fileName) {
                        setSelectedAntipatternId(null);
                      }
                    }}
                  >
                    <span className="file-icon">{isActive ? '📂' : '📁'}</span>
                    {fileName}
                    {hasIssues && (
                      <span className="severity-badge critical" style={{ marginLeft: 'auto' }}>ERR</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sidebar-section" style={{ flexGrow: 1, borderBottom: 'none' }}>
            <h3>Anti-Patterns Database</h3>
            <div className="antipattern-list">
              {Object.values(ANTIPATTERNS).map((item) => {
                const isActive = selectedAntipatternId === item.id;
                const isFound = scanDone;
                return (
                  <button
                    key={item.id}
                    className={`antipattern-item ${isActive ? 'active' : ''} ${isFound ? (item.severity === 'critical' ? 'found-error' : 'found-warning') : ''
                      }`}
                    onClick={() => handleSelectAntipattern(item.id)}
                  >
                    <div className="antipattern-header">
                      <span className="antipattern-name">{item.name}</span>
                      <span className={`severity-badge ${item.severity}`}>{item.severity}</span>
                    </div>
                    <div className="antipattern-meta">
                      File: {item.fileName} • Line {item.lineNumber}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="code-viewer-container">
          <div className="editor-tabs">
            {Object.keys(MOCK_FILES).map((fileName) => (
              <div
                key={fileName}
                className={`editor-tab ${activeFile === fileName ? 'active' : ''}`}
                onClick={() => {
                  setActiveFile(fileName);
                  if (activeAntipattern && activeAntipattern.fileName !== fileName) {
                    setSelectedAntipatternId(null);
                  }
                }}
              >
                {fileName}
              </div>
            ))}
          </div>

          {scanning && (
            <div className="scanning-backdrop">
              <div className="scan-progress-box">
                <div className="progress-text">Scanning Codebase... {scanProgress}%</div>
                <div className="progress-bar-outer">
                  <div className="progress-bar-inner" style={{ width: `${scanProgress}%` }}></div>
                </div>
              </div>
            </div>
          )}

          {scanning && <div className="scan-laser-overlay"></div>}

          <div className="code-window" ref={codeWindowRef}>
            <div className="code-line-wrapper">
              {currentFile.code.map((line, index) => {
                const lineNum = index + 1;
                const hasMatchingHighlight =
                  activeAntipattern &&
                  activeAntipattern.fileName === activeFile &&
                  activeAntipattern.lineNumber === lineNum;

                const matchingAntipattern = Object.values(ANTIPATTERNS).find(
                  (a) => a.fileName === activeFile && a.lineNumber === lineNum
                );
                const shouldShowHighlight = hasMatchingHighlight || (scanDone && matchingAntipattern);
                const highlightClass = shouldShowHighlight
                  ? (matchingAntipattern?.severity === 'critical' ? 'highlighted-critical' : 'highlighted-warning')
                  : '';

                return (
                  <div key={index} id={`line-${lineNum}`} className="code-line-wrapper">
                    <div className={`code-line ${highlightClass}`}>
                      <span className="line-num">{lineNum}</span>
                      <span className="line-content">{highlightSyntax(line.text)}</span>
                    </div>
                    {shouldShowHighlight && matchingAntipattern && (
                      <div className={`diagnostic-bubble ${matchingAntipattern.severity}`}>
                        <div className="diagnostic-title">
                          ⚠️ {matchingAntipattern.severity} issue: {matchingAntipattern.name}
                        </div>
                        <div className="diagnostic-description">{matchingAntipattern.description}</div>
                        <div className="diagnostic-action">Recommendation: {matchingAntipattern.fix}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="details-sidebar">
          <div className="details-toolbar">
            <button
              className={`refactor-toggle-btn ${showRefactorView ? 'active' : ''}`}
              onClick={() => setShowRefactorView(!showRefactorView)}
              disabled={!activeAntipattern}
            >
              Refactor
            </button>
          </div>
          {activeAntipattern ? (
            showRefactorView ? (
              <div className="details-content refactor-view">
                <button className="back-btn" onClick={() => setShowRefactorView(false)}>
                  ← Back to Details
                </button>
                <div className="details-header">
                  <h2 className="details-title">Refactoring {activeAntipattern.name}</h2>
                  <p className="refactor-reason">{activeAntipattern.refactorReason}</p>
                </div>
                <div className="details-section">
                  <h4>Before (Problematic Code)</h4>
                  <pre className="fix-code-block before-code">{activeAntipattern.problemCode}</pre>
                </div>
                <div className="details-section">
                  <h4>After (Refactored Code)</h4>
                  <pre className="fix-code-block after-code">{activeAntipattern.fixCode}</pre>
                </div>
              </div>
            ) : (
              <div className="details-content">
                <div className="details-header">
                  <span className={`severity-badge ${activeAntipattern.severity}`}>
                    {activeAntipattern.severity}
                  </span>
                  <h2 className="details-title">{activeAntipattern.name}</h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Location: {activeAntipattern.fileName} • Line {activeAntipattern.lineNumber}
                  </div>
                </div>
                <div className="details-section">
                  <h4>Description</h4>
                  <div className={`details-desc-box ${activeAntipattern.severity}`}>
                    {activeAntipattern.description}
                  </div>
                </div>
                <div className="details-section">
                  <h4>Reliability / SRE Impact</h4>
                  <div className="details-desc-box" style={{ borderLeftColor: '#3b82f6' }}>
                    {activeAntipattern.impact}
                  </div>
                </div>
                <div className="details-section">
                  <h4>Recommended Secure Fix</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Replace the vulnerable section with:
                  </p>
                  <pre className="fix-code-block">{activeAntipattern.fixCode}</pre>
                </div>
              </div>
            )
          ) : (
            <div className="details-placeholder">
              <div className="details-placeholder-icon">🔍</div>
              <h3>No Antipattern Selected</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Select an antipattern from the database or scan the project to inspect issues and view fix details.
              </p>
            </div>
          )}
        </aside>
      </main>

      {scanDone && (
        <footer className="scan-dashboard-drawer new-dashboard-layout">
          <div className="dashboard-graphs-container">
            {/* Graph 1: Issues Per File (Bar Chart) */}
            <div className="graph-card animate-fade-slide">
              <h4><span style={{color: '#8b5cf6'}}>📊</span> Issues per file</h4>
              <div className="graph-content">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={fileData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.03)'}} 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
                    />
                    <Bar dataKey="issues" fill="url(#colorIssues)" radius={[4, 4, 0, 0]} barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graph 2: Severity Split (Donut Chart) */}
            <div className="graph-card animate-fade-slide" style={{ animationDelay: '0.1s' }}>
              <h4><span style={{color: '#f43f5e'}}>🍩</span> Severity split</h4>
              <div className="graph-content">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold" style={{textShadow: '0px 1px 2px rgba(0,0,0,0.8)'}}>
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={severityColors[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
                      itemStyle={{ color: '#f8fafc' }} 
                    />
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graph 3: Health Score Progress Bar */}
            <div className="graph-card animate-fade-slide" style={{ animationDelay: '0.2s' }}>
              <h4><span style={{color: '#10b981'}}>🏥</span> Health Score</h4>
              <div className="health-score-content">
                <div className={`grade-badge ${letterGrade.toLowerCase()}`}>{letterGrade}</div>
                <div className="health-progress-wrapper">
                  <div className="health-progress-bar-outer">
                    <div 
                      className={`health-progress-bar-inner bg-${letterGrade.toLowerCase()}`}
                      style={{ width: `${scorePercent}%` }}
                    ></div>
                  </div>
                  <div className="health-progress-labels">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;