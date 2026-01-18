/**
 * Reddit API Service
 * Provides OAuth authentication and search functionality for stock-related discussions
 */

type RedditPost = {
    title: string;
    url: string;
    body: string;
    subreddit: string;
    score: number;
    numComments: number;
    author: string;
    created: number;
    permalink: string;
};

type RedditComment = {
    body: string;
    score: number;
    author: string;
    permalink: string;
};

export type RedditResult = {
    title: string;
    url: string;
    snippet: string;
    subreddit: string;
    score: number;
    published_date?: string;
    topComments: string[];
};

// Environment variables
const clientId = import.meta.env.VITE_REDDIT_CLIENT_ID as string | undefined;
const clientSecret = import.meta.env.VITE_REDDIT_CLIENT_SECRET as string | undefined;

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

// Target subreddits for stock discussions
const STOCK_SUBREDDITS = ['wallstreetbets', 'stocks', 'investing', 'stockmarket', 'options'];

/**
 * Get OAuth access token using client credentials flow (app-only auth)
 */
const getAccessToken = async (): Promise<string> => {
    // Return cached token if valid (with 60s buffer)
    if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
        return cachedToken.token;
    }

    if (!clientId || !clientSecret) {
        throw new Error('Missing Reddit API credentials');
    }

    const credentials = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'StockAnalyzer/1.0',
        },
        body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Reddit OAuth error:', errorText);
        throw new Error(`Reddit OAuth failed: ${response.status}`);
    }

    const data = await response.json();

    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return cachedToken.token;
};

/**
 * Make authenticated request to Reddit API
 */
const redditFetch = async (endpoint: string): Promise<any> => {
    const token = await getAccessToken();

    const response = await fetch(`https://oauth.reddit.com${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'StockAnalyzer/1.0',
        },
    });

    if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
    }

    return response.json();
};

/**
 * Search for stock discussions across target subreddits
 */
export const searchReddit = async (
    ticker: string,
    companyName?: string,
    options: { limit?: number; timeFilter?: 'day' | 'week' | 'month' | 'year' } = {}
): Promise<RedditResult[]> => {
    const { limit = 10, timeFilter = 'month' } = options;

    if (!clientId || !clientSecret) {
        console.warn('Reddit API credentials not configured, skipping Reddit search');
        return [];
    }

    const searchQuery = companyName
        ? `${ticker} OR "${companyName}"`
        : ticker;

    try {
        // Search across all target subreddits
        const subredditString = STOCK_SUBREDDITS.join('+');
        const endpoint = `/r/${subredditString}/search?q=${encodeURIComponent(searchQuery)}&restrict_sr=on&sort=relevance&t=${timeFilter}&limit=${limit}`;

        const data = await redditFetch(endpoint);
        const posts: RedditPost[] = (data.data?.children || []).map((child: any) => ({
            title: child.data.title,
            url: `https://reddit.com${child.data.permalink}`,
            body: child.data.selftext || '',
            subreddit: child.data.subreddit,
            score: child.data.score,
            numComments: child.data.num_comments,
            author: child.data.author,
            created: child.data.created_utc,
            permalink: child.data.permalink,
        }));

        // Fetch top comments for each post (limit to top 3 posts to reduce API calls)
        const results: RedditResult[] = await Promise.all(
            posts.slice(0, 6).map(async (post) => {
                let topComments: string[] = [];

                try {
                    // Fetch comments for this post
                    const commentsData = await redditFetch(`${post.permalink}?limit=5&sort=top`);
                    const comments = commentsData[1]?.data?.children || [];

                    topComments = comments
                        .filter((c: any) => c.kind === 't1' && c.data.body && c.data.body.length > 20)
                        .slice(0, 3)
                        .map((c: any) => c.data.body.slice(0, 200));
                } catch (err) {
                    console.warn('Failed to fetch comments for post:', post.url);
                }

                // Format published date
                const postDate = new Date(post.created * 1000);
                const publishedDate = postDate.toISOString().split('T')[0];

                return {
                    title: post.title,
                    url: post.url,
                    snippet: post.body.slice(0, 300) || post.title,
                    subreddit: post.subreddit,
                    score: post.score,
                    published_date: publishedDate,
                    topComments,
                };
            })
        );

        return results;
    } catch (err) {
        console.error('Reddit search error:', err);
        return [];
    }
};

/**
 * Format Reddit results for LLM prompt consumption
 */
export const formatRedditForPrompt = (results: RedditResult[]): string => {
    if (results.length === 0) {
        return 'No Reddit discussions found.';
    }

    return results.map((r, idx) => {
        const commentsSection = r.topComments.length > 0
            ? `\nTop Comments:\n${r.topComments.map(c => `  - "${c}"`).join('\n')}`
            : '';

        return `(${idx + 1}) [r/${r.subreddit}] ${r.title}
Date: ${r.published_date || 'Unknown'} | Score: ${r.score} upvotes
${r.url}
${r.snippet}${commentsSection}`;
    }).join('\n\n');
};

/**
 * Check if Reddit API is configured
 */
export const isRedditConfigured = (): boolean => {
    return Boolean(clientId && clientSecret);
};
