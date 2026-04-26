const ALLOWED_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cpp", ".c", ".h", 
  ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".sql", ".yaml", ".yml"
];
const IGNORED_DIRS = ["node_modules", "dist", "build", ".next", "vendor", "coverage", "public", ".git", "__tests__", "tests"];
const MAX_FILE_SIZE = 150000; 
const MAX_TOTAL_CHARS = 500000; 

function parseGithubUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parsed.hostname !== "github.com" || parts.length < 2) {
      throw new Error("Invalid GitHub URL");
    }
    return { owner: parts[0], repo: parts[1].replace(".git", "") };
  } catch (err) {
    throw new Error("Invalid GitHub URL format");
  }
}

function isValidFile(path, size) {
  if (size > MAX_FILE_SIZE) return false;
  const parts = path.split("/");
  const isIgnoredDir = parts.some(part => IGNORED_DIRS.includes(part));
  if (isIgnoredDir) return false;
  
  const fileName = parts[parts.length - 1].toLowerCase();
  if (fileName.includes(".min.") || fileName.includes("-min.")) return false;
  if (fileName.startsWith(".") && fileName !== ".env.example") return false;

  const ext = "." + fileName.split(".").pop();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false;
  return true;
}

function getFilePriority(path) {
  const p = path.toLowerCase();
  // Critical entry points
  if (p === "package.json" || p === "requirements.txt" || p === "go.mod" || p === "cargo.toml") return 5;
  if (p.startsWith("app/") || p.startsWith("src/app/") || p.startsWith("pages/")) return 4;
  if (p.startsWith("src/") || p.startsWith("lib/")) return 3;
  if (p.includes("api/") || p.includes("core/")) return 2;
  if (p.includes("components/") || p.includes("utils/")) return 1;
  return 0;
}

export async function fetchGithubRepoData(repoUrl) {
  const { owner, repo } = parseGithubUrl(repoUrl);
  const headers = { Accept: "application/vnd.github.v3+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) throw new Error("Failed to fetch repository.");
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
  if (!treeRes.ok) throw new Error("Failed to fetch repository tree.");
  const treeData = await treeRes.json();

  const files = treeData.tree
    .filter(node => node.type === "blob" && isValidFile(node.path, node.size))
    .sort((a, b) => getFilePriority(b.path) - getFilePriority(a.path));

  let combinedCode = "";
  let filesAnalyzed = 0;
  let isTruncated = false;

  for (const file of files) {
    if (combinedCode.length > MAX_TOTAL_CHARS) {
      isTruncated = true;
      break;
    }
    try {
      const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`);
      if (rawRes.ok) {
        const text = await rawRes.text();
        if (text.length > MAX_FILE_SIZE) continue;
        combinedCode += `\n\n### File: ${file.path} ###\n` + "```" + file.path.split('.').pop() + "\n" + text + "\n```\n";
        filesAnalyzed++;
      }
    } catch (e) {
      console.warn(`Failed to fetch ${file.path}`, e);
    }
  }

  return { combinedCode, filesAnalyzed, isTruncated, repoSize: repoData.size };
}
