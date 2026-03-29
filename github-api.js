/**
 * Spock GitHub API Wrapper
 * Handles reading and writing JSON files and photos to a GitHub repository.
 */

const GitHubAPI = {
    getConfig() {
        return {
            user: localStorage.getItem('gh_user'),
            repo: localStorage.getItem('gh_repo'),
            token: localStorage.getItem('gh_token')
        };
    },

    isConfigured() {
        const { user, repo, token } = this.getConfig();
        return !!(user && repo && token);
    },

    /**
     * Fetches a file from GitHub
     * @param {string} path - Path to the file in the repo (e.g., 'journal.json')
     * @returns {Promise<{content: any, sha: string}>}
     */
    async getFile(path) {
        const { user, repo, token } = this.getConfig();
        if (!this.isConfigured()) throw new Error("GitHub not configured");

        const response = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}?t=${Date.now()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) return { content: null, sha: null };
            throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
        }

        const data = await response.json();
        const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
        return { content, sha: data.sha };
    },

    /**
     * Saves a file to GitHub
     * @param {string} path - Path to the file
     * @param {any} content - Content to save (will be stringified)
     * @param {string} sha - The SHA of the file if updating
     * @param {string} message - Commit message
     */
    async saveFile(path, content, sha = null, message = "Update from Spock") {
        const { user, repo, token } = this.getConfig();
        const body = {
            message,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))))
        };
        if (sha) body.sha = sha;

        let response = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        // 409/422: Conflict or already exists but no SHA provided
        if ((response.status === 409 || response.status === 422) && !sha) {
            console.log("⚠️ Synchronization Conflict - Fetching SHA for:", path);
            const { sha: currentSha } = await this.getFile(path);
            if (currentSha) {
                body.sha = currentSha;
                response = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
            }
        }

        if (!response.ok) {
            throw new Error(`Failed to save ${path}: ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Uploads a base64 image to GitHub
     */
    async uploadImage(base64Content, fileName, message = "Upload photo from Spock") {
        const { user, repo, token } = this.getConfig();
        const path = `photos/${fileName}`;
        
        const response = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                content: base64Content
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to upload image: ${response.statusText}`);
        }

        const data = await response.json();
        return `https://raw.githubusercontent.com/${user}/${repo}/main/${path}`;
    }
};
