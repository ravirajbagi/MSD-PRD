/**
 * Create an anonymous GitHub Gist containing the notebook .ipynb file.
 * Returns the raw Gist URL that can be used to open the notebook in Colab.
 *
 * Anonymous Gists don't require authentication, but are rate-limited.
 * If GITHUB_TOKEN env var is set, it's used to increase rate limits.
 */
export async function createGist(
  filename: string,
  content: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Use token if available (optional — anonymous works too)
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      description: `PaperToNotebook: ${filename}`,
      public: true,
      files: {
        [filename]: { content },
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GitHub Gist creation failed (${response.status}): ${err}`);
  }

  const data = await response.json() as { id: string; html_url: string };

  // Colab URL format for Gist: https://colab.research.google.com/gist/{gist_id}/{filename}
  const colabUrl = `https://colab.research.google.com/gist/${data.id}/${filename.replace('.ipynb', '')}`;
  return colabUrl;
}
