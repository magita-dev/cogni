import { exec, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { cryptoTicks } from "./riskEngine.js"; // Helper placeholder if any

const TIMEOUT_LIMIT_MS = 4000;

function generateTempId() {
  return Math.random().toString(36).slice(2, 9);
}

// Check if compiler exists on system
function checkCommandExists(cmd) {
  try {
    execSync(os.platform() === "win32" ? `where ${cmd}` : `which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function executeCode(code, language, input = "") {
  const tempId = generateTempId();
  const tempDir = path.join(os.tmpdir(), `proctoriq_${tempId}`);
  fs.mkdirSync(tempDir, { recursive: true });

  let filename = "";
  let compileCmd = "";
  let runCmd = "";
  let isCompiled = false;

  const cleanInput = input.trim();

  switch (language) {
    case "javascript":
      filename = "solution.js";
      runCmd = `node ${filename}`;
      break;

    case "python":
      filename = "solution.py";
      // Gracefully fall back if python3 command is not mapped on Windows
      const hasPython3 = checkCommandExists("python3");
      runCmd = `${hasPython3 ? "python3" : "python"} ${filename}`;
      break;

    case "c":
      filename = "solution.c";
      isCompiled = true;
      compileCmd = `gcc ${filename} -o exec_${tempId}`;
      runCmd = os.platform() === "win32" ? `exec_${tempId}.exe` : `./exec_${tempId}`;
      break;

    case "cpp":
    case "c++":
      filename = "solution.cpp";
      isCompiled = true;
      compileCmd = `g++ ${filename} -o exec_${tempId}`;
      runCmd = os.platform() === "win32" ? `exec_${tempId}.exe` : `./exec_${tempId}`;
      break;

    default:
      return { output: "", error: "Unsupported language selection" };
  }

  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, code);

  return new Promise((resolve) => {
    const cleanup = () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup lock exceptions
      }
    };

    const runProcess = () => {
      const proc = exec(runCmd, { cwd: tempDir, timeout: TIMEOUT_LIMIT_MS }, (err, stdout, stderr) => {
        cleanup();
        if (err && err.killed) {
          return resolve({ output: "", error: "Execution Timeout (Infinite Loop Detected)" });
        }
        if (stderr) {
          return resolve({ output: stdout.trim(), error: stderr.trim() });
        }
        resolve({ output: stdout.trim(), error: "" });
      });

      if (cleanInput && proc.stdin) {
        proc.stdin.write(cleanInput);
        proc.stdin.end();
      }
    };

    if (isCompiled) {
      exec(compileCmd, { cwd: tempDir }, (err, stdout, stderr) => {
        if (err) {
          cleanup();
          return resolve({ output: "", error: `Compilation Error:\n${stderr || stdout || err.message}` });
        }
        runProcess();
      });
    } else {
      runProcess();
    }
  });
}