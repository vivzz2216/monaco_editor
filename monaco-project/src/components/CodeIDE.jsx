import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";

const API_BASE = "http://localhost:3001/api";

export default function CodeIDE() {
  const [fileTree, setFileTree] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContents, setFileContents] = useState({});
  const [terminalOutput, setTerminalOutput] = useState("Ready to execute code...\n");
  const [isRunning, setIsRunning] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const fileInputRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    loadFileTree();
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const loadFileTree = async () => {
    try {
      const response = await axios.get(`${API_BASE}/files`);
      setFileTree(response.data.tree);
    } catch (error) {
      console.error("Failed to load file tree:", error);
    }
  };

  const loadFileContent = async (filePath) => {
    if (fileContents[filePath]) return;
    
    try {
      const response = await axios.get(`${API_BASE}/file?path=${encodeURIComponent(filePath)}`);
      setFileContents(prev => ({ ...prev, [filePath]: response.data.content }));
    } catch (error) {
      console.error("Failed to load file:", error);
    }
  };

  const handleFileClick = async (file) => {
    if (file.type === 'folder') return;
    
    await loadFileContent(file.path);
    
    if (!openFiles.find(f => f.path === file.path)) {
      setOpenFiles(prev => [...prev, file]);
    }
    setActiveFile(file);
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      await loadFileTree();
      setTerminalOutput(prev => prev + `Uploaded ${files.length} file(s) successfully\n`);
    } catch (error) {
      setTerminalOutput(prev => prev + `Upload failed: ${error.message}\n`);
    }
  };

  const handleCreateFile = async () => {
    const fileName = prompt("Enter file name:");
    if (!fileName) return;
    
    try {
      await axios.post(`${API_BASE}/file`, {
        path: fileName,
        content: ""
      });
      await loadFileTree();
      setTerminalOutput(prev => prev + `Created file: ${fileName}\n`);
    } catch (error) {
      setTerminalOutput(prev => prev + `Failed to create file: ${error.message}\n`);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;
    
    try {
      await axios.post(`${API_BASE}/folder`, { path: folderName });
      await loadFileTree();
      setTerminalOutput(prev => prev + `Created folder: ${folderName}\n`);
    } catch (error) {
      setTerminalOutput(prev => prev + `Failed to create folder: ${error.message}\n`);
    }
  };

  const handleDeleteFile = async (file) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    
    try {
      await axios.delete(`${API_BASE}/file?path=${encodeURIComponent(file.path)}`);
      await loadFileTree();
      
      setOpenFiles(prev => prev.filter(f => f.path !== file.path));
      if (activeFile?.path === file.path) {
        setActiveFile(openFiles[0] || null);
      }
      
      setTerminalOutput(prev => prev + `Deleted: ${file.name}\n`);
    } catch (error) {
      setTerminalOutput(prev => prev + `Failed to delete: ${error.message}\n`);
    }
  };

  const handleEditorChange = (value) => {
    if (!activeFile) return;
    
    setFileContents(prev => ({
      ...prev,
      [activeFile.path]: value
    }));
  };

  const handleSaveFile = async () => {
    if (!activeFile) return;
    
    try {
      await axios.post(`${API_BASE}/file`, {
        path: activeFile.path,
        content: fileContents[activeFile.path] || ""
      });
      setTerminalOutput(prev => prev + `Saved: ${activeFile.name}\n`);
    } catch (error) {
      setTerminalOutput(prev => prev + `Save failed: ${error.message}\n`);
    }
  };

  const handleInstallPackages = async () => {
    const packages = prompt("Enter Python packages to install (space-separated):");
    if (!packages) return;
    
    const timestamp = new Date().toLocaleTimeString();
    setTerminalOutput(prev => prev + `\n[${timestamp}] Installing packages: ${packages}...\n`);
    
    try {
      const response = await axios.post(`${API_BASE}/install-packages`, {
        packages: packages.split(' '),
        language: 'python'
      });
      
      setTerminalOutput(prev => prev + `${response.data.output}\n[${timestamp}] Installation completed\n`);
    } catch (error) {
      setTerminalOutput(prev => prev + `ERROR: ${error.message}\n`);
    }
  };

  const handleRun = async () => {
    if (!activeFile) {
      setTerminalOutput(prev => prev + "No file selected to run\n");
      return;
    }
    
    setIsRunning(true);
    const timestamp = new Date().toLocaleTimeString();
    setTerminalOutput(prev => prev + `\n[${timestamp}] Running ${activeFile.name}...\n`);
    
    const ext = activeFile.name.split('.').pop();
    const language = ext === 'py' ? 'python' : ext === 'js' ? 'javascript' : ext === 'ts' ? 'typescript' : 
                     ext === 'java' ? 'java' : ext === 'c' ? 'c' : ext === 'cpp' ? 'cpp' : 
                     ext === 'go' ? 'go' : ext === 'rs' ? 'rust' : ext === 'rb' ? 'ruby' : 
                     ext === 'php' ? 'php' : ext === 'sh' ? 'shell' : ext;
    
    try {
      await handleSaveFile();
      
      const response = await axios.post(`${API_BASE}/execute`, {
        code: fileContents[activeFile.path] || "",
        language,
        filePath: activeFile.path
      });
      
      setTerminalOutput(prev => prev + `${response.data.output}\n[${timestamp}] Execution completed\n`);
    } catch (error) {
      setTerminalOutput(prev => prev + `ERROR: ${error.message}\n[${timestamp}] Execution failed\n`);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const renderFileTree = (items, depth = 0) => {
    return items.map(item => (
      <div key={item.path}>
        <div
          style={{
            ...styles.fileItem,
            paddingLeft: `${depth * 20 + 10}px`,
            backgroundColor: activeFile?.path === item.path ? '#37373d' : 'transparent'
          }}
          onClick={() => item.type === 'folder' ? toggleFolder(item.path) : handleFileClick(item)}
          onContextMenu={(e) => {
            e.preventDefault();
            if (confirm(`Delete ${item.name}?`)) {
              handleDeleteFile(item);
            }
          }}
        >
          <span style={{ marginRight: '8px' }}>
            {item.type === 'folder' ? (expandedFolders.has(item.path) ? '📂' : '📁') : '📄'}
          </span>
          <span>{item.name}</span>
        </div>
        {item.type === 'folder' && expandedFolders.has(item.path) && item.children && (
          <div>{renderFileTree(item.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  const getLanguage = (fileName) => {
    const ext = fileName?.split('.').pop() || '';
    const langMap = {
      'py': 'python',
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'sh': 'shell',
    };
    return langMap[ext] || 'plaintext';
  };

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: "#1e1e1e",
      color: "#cccccc"
    },
    titleBar: {
      height: "30px",
      backgroundColor: "#323233",
      display: "flex",
      alignItems: "center",
      padding: "0 15px",
      fontSize: "13px",
      borderBottom: "1px solid #2d2d30"
    },
    mainLayout: {
      display: "flex",
      flex: 1,
      overflow: "hidden"
    },
    activityBar: {
      width: "48px",
      backgroundColor: "#2c2c2c",
      borderRight: "1px solid #2d2d30",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "10px 0"
    },
    sidebar: {
      width: "250px",
      backgroundColor: "#252526",
      borderRight: "1px solid #2d2d30",
      display: "flex",
      flexDirection: "column"
    },
    sidebarHeader: {
      height: "35px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 15px",
      fontSize: "11px",
      fontWeight: "bold",
      textTransform: "uppercase",
      backgroundColor: "#252526",
      borderBottom: "1px solid #2d2d30"
    },
    sidebarContent: {
      flex: 1,
      overflowY: "auto"
    },
    editorContainer: {
      flex: 1,
      display: "flex",
      flexDirection: "column"
    },
    tabBar: {
      height: "35px",
      backgroundColor: "#2d2d30",
      display: "flex",
      alignItems: "center",
      borderBottom: "1px solid #2d2d30",
      overflowX: "auto"
    },
    tab: {
      height: "35px",
      padding: "0 15px",
      display: "flex",
      alignItems: "center",
      borderRight: "1px solid #2d2d30",
      fontSize: "13px",
      cursor: "pointer",
      whiteSpace: "nowrap"
    },
    toolbar: {
      height: "40px",
      backgroundColor: "#2d2d30",
      display: "flex",
      alignItems: "center",
      padding: "0 15px",
      gap: "10px",
      borderBottom: "1px solid #2d2d30"
    },
    button: {
      padding: "6px 12px",
      backgroundColor: "#0e639c",
      color: "white",
      border: "none",
      borderRadius: "2px",
      fontSize: "13px",
      cursor: "pointer"
    },
    editorArea: {
      flex: 1,
      position: "relative"
    },
    terminal: {
      height: "200px",
      backgroundColor: "#0c0c0c",
      borderTop: "1px solid #2d2d30",
      display: "flex",
      flexDirection: "column"
    },
    terminalHeader: {
      height: "35px",
      backgroundColor: "#252526",
      display: "flex",
      alignItems: "center",
      padding: "0 15px",
      fontSize: "13px",
      borderBottom: "1px solid #2d2d30"
    },
    terminalContent: {
      flex: 1,
      padding: "10px",
      fontFamily: "'Consolas', 'Courier New', monospace",
      fontSize: "14px",
      color: "#cccccc",
      overflowY: "auto",
      whiteSpace: "pre-wrap",
      backgroundColor: "#0c0c0c"
    },
    statusBar: {
      height: "22px",
      backgroundColor: "#007acc",
      display: "flex",
      alignItems: "center",
      padding: "0 15px",
      fontSize: "12px",
      color: "white"
    },
    iconButton: {
      width: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      borderRadius: "4px",
      margin: "2px 0"
    },
    fileItem: {
      padding: "4px 10px",
      fontSize: "13px",
      cursor: "pointer",
      color: "#cccccc",
      display: "flex",
      alignItems: "center"
    },
    actionButton: {
      cursor: "pointer",
      fontSize: "16px",
      padding: "2px 5px"
    }
  };

  return (
    <div style={styles.container}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        multiple
      />
      
      <div style={styles.titleBar}>
        Monaco Code IDE - Full Stack
      </div>

      <div style={styles.mainLayout}>
        <div style={styles.activityBar}>
          <div style={{...styles.iconButton, backgroundColor: "#37373d"}}>📁</div>
          <div style={styles.iconButton}>🔍</div>
          <div style={styles.iconButton}>🌿</div>
        </div>

        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span>Explorer</span>
            <div style={{ display: 'flex', gap: '5px' }}>
              <span style={styles.actionButton} onClick={handleCreateFile} title="New File">📄</span>
              <span style={styles.actionButton} onClick={handleCreateFolder} title="New Folder">📁</span>
              <span style={styles.actionButton} onClick={() => fileInputRef.current?.click()} title="Upload">📤</span>
            </div>
          </div>
          <div style={styles.sidebarContent}>
            {renderFileTree(fileTree)}
          </div>
        </div>

        <div style={styles.editorContainer}>
          <div style={styles.tabBar}>
            {openFiles.map(file => (
              <div
                key={file.path}
                style={{
                  ...styles.tab,
                  backgroundColor: activeFile?.path === file.path ? '#1e1e1e' : '#2d2d30'
                }}
                onClick={() => setActiveFile(file)}
              >
                {file.name}
                <span
                  style={{ marginLeft: '8px', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFiles(prev => prev.filter(f => f.path !== file.path));
                    if (activeFile?.path === file.path) {
                      setActiveFile(openFiles[0] || null);
                    }
                  }}
                >
                  ×
                </span>
              </div>
            ))}
          </div>

          <div style={styles.toolbar}>
            <button
              onClick={handleSaveFile}
              disabled={!activeFile}
              style={{
                ...styles.button,
                backgroundColor: activeFile ? "#0e639c" : "#666",
                cursor: activeFile ? "pointer" : "not-allowed"
              }}
            >
              💾 Save
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning || !activeFile}
              style={{
                ...styles.button,
                backgroundColor: (isRunning || !activeFile) ? "#666" : "#0e639c",
                cursor: (isRunning || !activeFile) ? "not-allowed" : "pointer"
              }}
            >
              {isRunning ? "⏳ Running..." : "▶️ Run"}
            </button>
            <button
              onClick={handleInstallPackages}
              style={{
                ...styles.button,
                backgroundColor: "#0e639c"
              }}
            >
              📦 Install Packages
            </button>
            <span style={{ marginLeft: 'auto', fontSize: '13px' }}>
              {activeFile ? activeFile.path : 'No file selected'}
            </span>
          </div>

          <div style={styles.editorArea}>
            {activeFile ? (
              <Editor
                height="100%"
                language={getLanguage(activeFile.name)}
                value={fileContents[activeFile.path] || ""}
                theme="vs-dark"
                onChange={handleEditorChange}
                options={{
                  automaticLayout: true,
                  fontSize: 14,
                  minimap: { enabled: true },
                  lineNumbers: "on",
                  renderWhitespace: "selection",
                  scrollBeyondLastLine: false,
                  wordWrap: "on"
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#858585' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📝</div>
                  <div>Upload files or create a new file to get started</div>
                </div>
              </div>
            )}
          </div>

          <div style={styles.terminal}>
            <div style={styles.terminalHeader}>
              🖥️ TERMINAL
            </div>
            <div style={styles.terminalContent} ref={terminalRef}>
              {terminalOutput}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.statusBar}>
        <span>Files: {fileTree.length}</span>
        <span style={{marginLeft: "20px"}}>
          {activeFile ? getLanguage(activeFile.name) : 'No file'}
        </span>
        <span style={{marginLeft: "auto"}}>
          Backend: Connected
        </span>
      </div>
    </div>
  );
}
