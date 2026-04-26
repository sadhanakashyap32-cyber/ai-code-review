const ALLOWED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cpp", ".c", ".h", ".go", ".rs", ".rb", ".php"];
const IGNORED_DIRS = ["node_modules", "dist", "build", ".next", "vendor", "coverage", "public", ".git"];
const MAX_FILE_SIZE = 150000; // ~150KB per file
const MAX_TOTAL_CHARS = 500000; // Roughly ~125,000 tokens for Gemini

/**
 * Extracts owner and repo from a GitHub URL.
 */
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

/**
 * Validates a file path to see if it should be included.
 */
function isValidFile(path, size) {
  if (size > MAX_FILE_SIZE) return false;

  const parts = path.split("/");
  const isIgnoredDir = parts.some(part => IGNORED_DIRS.includes(part));
  if (isIgnoredDir) return false;

  const ext = "." + path.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false;

  // Filter out likely minified files
  if (path.includes(".min.") || path.includes("-min.")) return false;

  return true;
}

/**
 * Calculates prioritize sorting (put src, app, core, lib higher).
 */
function getFilePriority(path) {
  const p = path.toLowerCase();
  if (p.startsWith("src/") || p.startsWith("app/")) return 3;
  if (p.includes("core/") || p.includes("lib/")) return 2;
  if (p.includes("components/") || p.includes("utils/")) return 1;
  return 0; // Root or other
}

export async function fetchGithubRepoData(repoUrl) {
  const { owner, repo } = parseGithubUrl(repoUrl);

  const headers = {
    Accept: "application/vnd.github.v3+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // 1. Get Repo Details (for default branch)
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    throw new Error("Failed to fetch repository. Ensure it is public and the URL is correct.");
  }
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;

  // 2. Fetch Git Tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    { headers }
  );
  
  if (!treeRes.ok) {
    throw new Error("Failed to fetch repository tree.");
  }
  const treeData = await treeRes.json();
  
  if (treeData.truncated) {
    console.warn("GitHub tree was truncated due to massive size.");
  }

  // 3. Filter tree
  const files = treeData.tree
    .filter(node => node.type === "blob" && isValidFile(node.path, node.size))
    .sort((a, b) => getFilePriority(b.path) - getFilePriority(a.path)); // Sort highest priority first

  if (files.length === 0) {
    throw new Error("No supported source files found in the repository.");
  }

  // 4. Download file content safely keeping total string below MAX_TOTAL_CHARS
  let combinedCode = "";
  let filesAnalyzed = 0;
  let isTruncated = false;

  // To prevent extremely slow fetches, cap parallel downloads and overall chunk length.
  // We fetch sequentially or small batches to strictly enforce the char limit.
  for (const file of files) {
    if (combinedCode.length > MAX_TOTAL_CHARS) {
      isTruncated = true;
      break;
    }

    try {
      // Instead of raw github user content (which can be cached), hit the API blobs if preferred, 
      // but raw.githubusercontent is faster and doesn't hit API rate limits.
      const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`);
      if (rawRes.ok) {
        const text = await rawRes.text();
        
        // Skip huge chunks in a single file
        if (text.length > MAX_FILE_SIZE) continue;

        combinedCode += `\n\n### File: ${file.path} ###\n` +
                        `\`\`\`${file.path.split('.').pop()}\n` +
                        text +
                        `\n\`\`\`\n`;
        filesAnalyzed++;
      }
    } catch (e) {
      console.warn(`Failed to fetch ${file.path}`, e);
    }
  }

  return {
    combinedCode,
    filesAnalyzed,
    totalMatchedFiles: files.length,
    isTruncated,
    repoSize: repoData.size,
  };
}
