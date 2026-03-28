import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Basic URL transformation to get raw content
    let rawUrl = url;
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/;
    const match = url.match(githubRegex);

    if (match) {
      const [_, user, repo, branch, path] = match;
      rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
    } else if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
      // Try to handle repo root or other formats by fetching README.md as a fallback
      // Or we could use the GitHub API here if we had a token. 
      // For now, let's just try to guess if it's a repo URL
      const repoRegex = /github\.com\/([^/]+)\/([^/]+)\/?$/;
      const repoMatch = url.match(repoRegex);
      if (repoMatch) {
        const [_, user, repo] = repoMatch;
        // Try main then master for README
        rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/main/README.md`;
      } else {
        return NextResponse.json({ error: "Please provide a valid GitHub file URL." }, { status: 400 });
      }
    }

    const response = await fetch(rawUrl);
    
    if (!response.ok) {
      // If README.md on main failed, try master
      if (rawUrl.includes('main/README.md')) {
        const masterUrl = rawUrl.replace('main/README.md', 'master/README.md');
        const masterResponse = await fetch(masterUrl);
        if (masterResponse.ok) {
          const content = await masterResponse.text();
          return NextResponse.json({ content, url: masterUrl });
        }
      }
      throw new Error(`Failed to fetch content from GitHub: ${response.statusText}`);
    }

    const content = await response.text();
    return NextResponse.json({ content, url: rawUrl });

  } catch (error) {
    console.error("GitHub Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
