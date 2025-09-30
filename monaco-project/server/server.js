import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const WORKSPACE_DIR = path.join(__dirname, '../workspace');

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(WORKSPACE_DIR, { recursive: true });
      cb(null, WORKSPACE_DIR);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    cb(null, safeName || `upload_${Date.now()}`);
  }
});

const upload = multer({ storage });

function sanitizePath(userPath) {
  const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(WORKSPACE_DIR, normalized);
  
  if (!fullPath.startsWith(WORKSPACE_DIR)) {
    throw new Error('Invalid path: attempting to access outside workspace');
  }
  
  return fullPath;
}

async function getFileTree(dir, basePath = '') {
  const items = await fs.readdir(dir, { withFileTypes: true });
  const tree = [];

  for (const item of items) {
    const itemPath = path.join(basePath, item.name);
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      const children = await getFileTree(fullPath, itemPath);
      tree.push({
        name: item.name,
        type: 'folder',
        path: itemPath,
        children
      });
    } else {
      tree.push({
        name: item.name,
        type: 'file',
        path: itemPath
      });
    }
  }

  return tree.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'folder' ? -1 : 1;
  });
}

app.get('/api/files', async (req, res) => {
  try {
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
    const tree = await getFileTree(WORKSPACE_DIR);
    res.json({ tree });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/file', async (req, res) => {
  try {
    const filePath = sanitizePath(req.query.path);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/file', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    const fullPath = sanitizePath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/file', async (req, res) => {
  try {
    const filePath = sanitizePath(req.query.path);
    const stat = await fs.stat(filePath);
    
    if (stat.isDirectory()) {
      await fs.rm(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/folder', async (req, res) => {
  try {
    const { path: folderPath } = req.body;
    const fullPath = sanitizePath(folderPath);
    await fs.mkdir(fullPath, { recursive: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    res.json({ success: true, files: req.files.map(f => f.filename) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/install-packages', async (req, res) => {
  try {
    const { packages, language } = req.body;
    let result;

    if (language === 'python') {
      const sanitizedPackages = packages.filter(pkg => 
        /^[a-zA-Z0-9][a-zA-Z0-9_\-\[\]<>=.]*$/.test(pkg) && !pkg.startsWith('-')
      );
      
      if (sanitizedPackages.length !== packages.length) {
        return res.status(400).json({ error: 'Invalid package names detected. Package names must start with alphanumeric characters.' });
      }
      
      const args = ['install', ...sanitizedPackages];
      const { spawn } = await import('child_process');
      
      return new Promise((resolve) => {
        const pip = spawn('pip3', args, { cwd: WORKSPACE_DIR });
        let output = '';
        
        pip.stdout.on('data', (data) => { output += data.toString(); });
        pip.stderr.on('data', (data) => { output += data.toString(); });
        
        pip.on('close', (code) => {
          res.json({ output: output + `\nExit code: ${code}` });
          resolve();
        });
        
        setTimeout(() => {
          pip.kill();
          res.json({ output: output + '\nInstallation timeout after 120s' });
          resolve();
        }, 120000);
      });
    } else {
      result = `Package installation not supported for ${language}`;
      res.json({ output: result });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/execute', async (req, res) => {
  try {
    const { code, language, filePath } = req.body;
    let result;
    const safeFilePath = filePath ? sanitizePath(filePath) : null;

    const { spawn } = await import('child_process');
    let command, args, extension;

    if (language === 'python') {
      command = 'python3';
      extension = 'py';
    } else if (language === 'javascript') {
      command = 'node';
      extension = 'js';
    } else if (language === 'ruby') {
      command = 'ruby';
      extension = 'rb';
    } else if (language === 'php') {
      command = 'php';
      extension = 'php';
    } else if (language === 'shell') {
      command = 'bash';
      extension = 'sh';
    } else {
      result = `Language ${language} not directly supported. Supported languages: python, javascript, ruby, php, shell\n\nNote: For compiled languages (C, C++, Java, Go, Rust), please install the required compilers/runtimes on the server first.`;
      return res.json({ output: result });
    }

    const tempFile = safeFilePath || path.join(WORKSPACE_DIR, `temp_${Date.now()}.${extension}`);
    await fs.writeFile(tempFile, code);
    args = [tempFile];

    await new Promise((resolve) => {
      const proc = spawn(command, args, { cwd: WORKSPACE_DIR });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        result = stdout + stderr;
        if (code !== 0) {
          result += `\nProcess exited with code ${code}`;
        }
        resolve();
      });

      proc.on('error', (error) => {
        result = `Execution error: ${error.message}`;
        resolve();
      });

      setTimeout(() => {
        proc.kill();
        result = (stdout + stderr) + '\nExecution timeout after 30s';
        resolve();
      }, 30000);
    });

    res.json({ output: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, 'localhost', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
