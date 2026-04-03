// LinkedIn API Client Library for PostPilot

// --- Response Types ---

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

export interface LinkedInPublishResult {
  postId: string;
  postUrl: string;
}

// --- Helper ---

function getClientCredentials() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables must be set"
    );
  }
  return { clientId, clientSecret };
}

// --- Functions ---

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret } = getClientCredentials();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn token exchange failed: ${error}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
    refresh_token: data.refresh_token,
  };
}

export async function getLinkedInMemberId(
  accessToken: string
): Promise<string> {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn userinfo request failed: ${error}`);
  }

  const data = await response.json();
  return data.sub;
}

export async function publishToLinkedIn(
  accessToken: string,
  memberId: string,
  content: string,
  hashtags: string[],
  title?: string | null
): Promise<LinkedInPublishResult> {
  const hashtagText = hashtags
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join(" ");

  // Prepend title as a bold first line if provided
  const bodyWithTitle =
    title && title !== "Untitled Post"
      ? `${title}\n\n${content}`
      : content;

  const fullText = hashtagText
    ? `${bodyWithTitle}\n\n${hashtagText}`
    : bodyWithTitle;

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202602",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,
      commentary: fullText,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn publish failed: ${error}`);
  }

  const postUrn = response.headers.get("x-restli-id") || "";
  const postUrl = `https://www.linkedin.com/feed/update/${postUrn}/`;

  return { postId: postUrn, postUrl };
}

export async function refreshLinkedInToken(
  refreshToken: string
): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret } = getClientCredentials();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn token refresh failed: ${error}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
    refresh_token: data.refresh_token,
  };
}
