import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { loadPyodide } from "pyodide";

export default function CodeIDE() {
  const [pyodide, setPyodide] = useState(null);
  const [code, setCode] = useState('print("Hello world")');
  const [language, setLanguage] = useState("python");
  const [output, setOutput] = useState("");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(true);

  // Load Pyodide once on mount
  useEffect(() => {
    const initPyodide = async () => {
      try {
        setTerminalOutput("Loading Python interpreter...\n");
        const py = await loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
        });
        setPyodide(py);
        setPyodideLoading(false);
        setTerminalOutput(prev => prev + "Python interpreter loaded successfully!\n");
      } catch (error) {
        setPyodideLoading(false);
        setTerminalOutput(prev => prev + `ERROR: Failed to load Python interpreter: ${error.message}\n`);
      }
    };
    initPyodide();
  }, []);

  const handleRun = async () => {
    if (language === "python" && pyodideLoading) {
      setTerminalOutput(prev => prev + "ERROR: Python interpreter is still loading. Please wait...\n");
      return;
    }
    
    setIsRunning(true);
    const timestamp = new Date().toLocaleTimeString();
    setTerminalOutput(prev => prev + `\n[${timestamp}] Running ${language} code...\n`);
    
    try {
      if (language === "python") {
        if (!pyodide) {
          const errorMsg = "Python interpreter is not available";
          setOutput(errorMsg);
          setTerminalOutput(prev => prev + `ERROR: ${errorMsg}\n`);
          setIsRunning(false);
          return;
        }
        // Redirect stdout to capture print output
        await pyodide.runPythonAsync(`import sys\nfrom io import StringIO\n_sys_stdout = sys.stdout\nsys.stdout = StringIO()`);
        try {
          await pyodide.runPythonAsync(code);
          const outputText = await pyodide.runPythonAsync("sys.stdout.getvalue()");
          const result = String(outputText);
          setOutput(result);
          setTerminalOutput(prev => prev + `${result}\n[${timestamp}] Execution completed successfully.\n`);
          // Auto-scroll terminal
          setTimeout(() => {
            const terminal = document.querySelector('.terminal-content');
            if (terminal) terminal.scrollTop = terminal.scrollHeight;
          }, 100);
        } finally {
          // Restore stdout
          await pyodide.runPythonAsync("sys.stdout = _sys_stdout");
        }
      } else if (language === "javascript") {
        const result = eval(code);
        const output = String(result);
        setOutput(output);
        setTerminalOutput(prev => prev + `${output}\n[${timestamp}] Execution completed successfully.\n`);
        // Auto-scroll terminal
        setTimeout(() => {
          const terminal = document.querySelector('.terminal-content');
          if (terminal) terminal.scrollTop = terminal.scrollHeight;
        }, 100);
      } else {
        const errorMsg = `Run not supported for ${language} yet.`;
        setOutput(errorMsg);
        setTerminalOutput(prev => prev + `ERROR: ${errorMsg}\n`);
      }
    } catch (err) {
      setOutput(err.message);
      setTerminalOutput(prev => prev + `ERROR: ${err.message}\n[${timestamp}] Execution failed.\n`);
      // Auto-scroll terminal
      setTimeout(() => {
        const terminal = document.querySelector('.terminal-content');
        if (terminal) terminal.scrollTop = terminal.scrollHeight;
      }, 100);
    } finally {
      setIsRunning(false);
    }
  };

  const vsCodeStyles = {
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
      padding: "0 15px",
      fontSize: "11px",
      fontWeight: "bold",
      textTransform: "uppercase",
      backgroundColor: "#252526",
      borderBottom: "1px solid #2d2d30"
    },
    sidebarContent: {
      flex: 1,
      padding: "10px"
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
      borderBottom: "1px solid #2d2d30"
    },
    tab: {
      height: "35px",
      padding: "0 15px",
      display: "flex",
      alignItems: "center",
      backgroundColor: "#1e1e1e",
      borderRight: "1px solid #2d2d30",
      fontSize: "13px",
      cursor: "pointer"
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
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "5px"
    },
    select: {
      padding: "4px 8px",
      backgroundColor: "#3c3c3c",
      color: "#cccccc",
      border: "1px solid #463f50",
      borderRadius: "2px",
      fontSize: "13px"
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
      padding: "2px 0",
      fontSize: "13px",
      cursor: "pointer",
      color: "#cccccc"
    },
    activeFileItem: {
      padding: "2px 0",
      fontSize: "13px",
      cursor: "pointer",
      color: "#ffffff",
      backgroundColor: "#37373d",
      paddingLeft: "8px",
      marginLeft: "-8px",
      borderRadius: "3px"
    }
  };

  return (
    <div style={vsCodeStyles.container}>
      {/* Title Bar */}
      <div style={vsCodeStyles.titleBar}>
        Monaco Code IDE - {language.charAt(0).toUpperCase() + language.slice(1)}
      </div>

      <div style={vsCodeStyles.mainLayout}>
        {/* Activity Bar */}
        <div style={vsCodeStyles.activityBar}>
          <div style={{...vsCodeStyles.iconButton, backgroundColor: "#37373d"}}>📁</div>
          <div style={vsCodeStyles.iconButton}>🔍</div>
          <div style={vsCodeStyles.iconButton}>🌿</div>
          <div style={vsCodeStyles.iconButton}>🐛</div>
          <div style={vsCodeStyles.iconButton}>📦</div>
        </div>

        {/* Sidebar */}
        <div style={vsCodeStyles.sidebar}>
          <div style={vsCodeStyles.sidebarHeader}>
            Explorer
          </div>
          <div style={vsCodeStyles.sidebarContent}>
            <div style={{fontSize: "11px", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase"}}>
              Workspace
            </div>
            <div style={vsCodeStyles.activeFileItem}>📄 main.{language === "python" ? "py" : "js"}</div>
            <div style={vsCodeStyles.fileItem}>📄 package.json</div>
            <div style={vsCodeStyles.fileItem}>📁 src/</div>
            <div style={vsCodeStyles.fileItem}>📁 public/</div>
          </div>
        </div>

        {/* Editor Container */}
        <div style={vsCodeStyles.editorContainer}>
          {/* Tab Bar */}
          <div style={vsCodeStyles.tabBar}>
            <div style={vsCodeStyles.tab}>
              main.{language === "python" ? "py" : "js"} ●
            </div>
          </div>

          {/* Toolbar */}
          <div style={vsCodeStyles.toolbar}>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              style={vsCodeStyles.select}
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
            <button 
              onClick={handleRun} 
              disabled={isRunning || (language === "python" && pyodideLoading)}
              style={{
                ...vsCodeStyles.button,
                backgroundColor: (isRunning || (language === "python" && pyodideLoading)) ? "#666" : "#0e639c",
                cursor: (isRunning || (language === "python" && pyodideLoading)) ? "not-allowed" : "pointer"
              }}
            >
              {isRunning ? "⏳ Running..." : (language === "python" && pyodideLoading) ? "⏳ Loading Python..." : "▶️ Run"}
            </button>
          </div>

          {/* Editor */}
          <div style={vsCodeStyles.editorArea}>
            <Editor
              height="100%"
              language={language}
              value={code}
              theme="vs-dark"
              onChange={(value) => setCode(value)}
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
          </div>

          {/* Terminal */}
          <div style={vsCodeStyles.terminal}>
            <div style={vsCodeStyles.terminalHeader}>
              🖥️ TERMINAL
            </div>
            <div className="terminal-content" style={vsCodeStyles.terminalContent}>
              {terminalOutput || "Ready to execute code..."}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={vsCodeStyles.statusBar}>
        <span>Ln 1, Col 1</span>
        <span style={{marginLeft: "20px"}}>
          {language === "python" ? "🐍 Python" : "🟨 JavaScript"}
        </span>
        <span style={{marginLeft: "auto"}}>
          {language === "python" ? (pyodideLoading ? "⏳ Loading Python..." : "✅ Python Ready") : "✅ JavaScript Ready"}
        </span>
      </div>
    </div>
  );
}
