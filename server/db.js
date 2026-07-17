import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, "db.json");

const adapter = new JSONFile(file);
const db = new Low(adapter, { users: [], exams: [], attempts: [] });

export async function initDb() {
  await db.read();
  
  // Seed database if empty
  if (!db.data.users || db.data.users.length === 0) {
    db.data = {
      users: [
        {
          id: "u_admin",
          name: "Demo Recruiter",
          email: "admin@demo.com",
          password: "recruiter123", // Stored plainly for prototype verification
          role: "recruiter"
        },
        {
          id: "u_candidate1",
          name: "Aditi Sharma",
          email: "aditi@demo.com",
          password: "candidate123",
          role: "candidate"
        },
        {
          id: "u_candidate2",
          name: "Rohan Verma",
          email: "rohan@demo.com",
          password: "candidate123",
          role: "candidate"
        }
      ],
      exams: [
        {
          id: "ex_1",
          title: "Fullstack Developer Assessment",
          durationMinutes: 45,
          questionCount: 3,
          questions: [
            {
              id: "q_1",
              type: "mcq",
              title: "Time Complexity of Binary Search",
              prompt: "What is the worst-case time complexity of searching in a sorted array using Binary Search?",
              options: [
                "O(1)",
                "O(N)",
                "O(log N)",
                "O(N log N)"
              ],
              correctIndex: 2
            },
            {
              id: "q_2",
              type: "coding",
              title: "Reverse a String",
              prompt: "Write a function/program that takes a string input and outputs its reverse.\n\nInput: 'hello'\nOutput: 'olleh'",
              language: "python",
              starterCode: {
                python: "def reverse_string(s):\n    # Write your code here\n    pass\n\n# Read stdin for test execution\nimport sys\nif __name__ == '__main__':\n    inp = sys.stdin.read().strip()\n    print(reverse_string(inp))",
                javascript: "function reverseString(s) {\n    // Write your code here\n    return '';\n}\n\n// Read stdin for test execution\nconst fs = require('fs');\nconst inp = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(reverseString(inp));"
              },
              testCases: [
                { input: "hello", output: "olleh", hidden: false },
                { input: "ProctorIQ", inputDisp: "ProctorIQ", output: "QIrotcorP", hidden: false },
                { input: "racecar", output: "racecar", hidden: true }
              ]
            },
            {
              id: "q_3",
              type: "coding",
              title: "Fibonacci Number",
              prompt: "Write a function/program that calculates the Nth Fibonacci number.\n\nInput: 5\nOutput: 5 (Sequence: 0, 1, 1, 2, 3, 5...)",
              language: "python",
              starterCode: {
                python: "def fib(n):\n    # Write your code here\n    return 0\n\nimport sys\nif __name__ == '__main__':\n    inp = sys.stdin.read().strip()\n    if inp:\n        print(fib(int(inp)))",
                javascript: "function fib(n) {\n    // Write your code here\n    return 0;\n}\n\nconst fs = require('fs');\nconst inp = fs.readFileSync(0, 'utf-8').trim();\nif (inp) {\n    console.log(fib(parseInt(inp, 10)));\n}"
              },
              testCases: [
                { input: "5", output: "5", hidden: false },
                { input: "8", output: "21", hidden: false },
                { input: "10", output: "55", hidden: true }
              ]
            }
          ]
        }
      ],
      attempts: []
    };
    await db.write();
  }
}

export { db };
