// LinkedIn API Client Library for PostPilot

// --- Response Types ---

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface LinkedInEngagementData {
  impressions: number;
  reactions: number;
  comments: number;
  reposts: number;
  engagements: number;
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
    scope: data.scope,
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

/** Upload an image to LinkedIn and return its URN */
export async function uploadImageToLinkedIn(
  accessToken: string,
  memberId: string,
  imageBuffer: ArrayBuffer,
  contentType: string
): Promise<string> {
  // Step 1: Initialize upload — register the image asset
  const initResponse = await fetch(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202602",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: `urn:li:person:${memberId}`,
        },
      }),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.text();
    throw new Error(`LinkedIn image init failed: ${error}`);
  }

  const initData = await initResponse.json();
  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;

  if (!uploadUrl || !imageUrn) {
    throw new Error("LinkedIn did not return upload URL or image URN");
  }

  // Step 2: Upload the image binary
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`LinkedIn image upload failed: ${error}`);
  }

  return imageUrn;
}

export async function publishToLinkedIn(
  accessToken: string,
  memberId: string,
  content: string,
  hashtags: string[],
  title?: string | null,
  imageUrn?: string | null
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

  // Build post body — with or without image
  const postBody: Record<string, unknown> = {
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
  };

  if (imageUrn) {
    postBody.content = {
      media: {
        id: imageUrn,
      },
    };
  }

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202602",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postBody),
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
    scope: data.scope,
  };
}

/**
 * Fetch engagement analytics for a specific LinkedIn post.
 * Requires `r_member_postAnalytics` OAuth scope.
 * Uses the memberCreatorPostAnalytics API with per-metric TOTAL aggregation.
 * See: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics
 */
export async function fetchPostEngagement(
  accessToken: string,
  postUrn: string
): Promise<LinkedInEngagementData> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": "202602",
    "Content-Type": "application/json",
  };

  // The post URN from LinkedIn is typically "urn:li:share:123" or "urn:li:ugcPost:123"
  // The entity parameter format: entity=(share:urn%3Ali%3Ashare%3A123) or entity=(ugc:urn%3Ali%3AugcPost%3A123)
  let entityParam: string;
  if (postUrn.includes("ugcPost")) {
    entityParam = `(ugc:${encodeURIComponent(postUrn)})`;
  } else {
    entityParam = `(share:${encodeURIComponent(postUrn)})`;
  }

  const metricTypes = ["IMPRESSION", "REACTION", "COMMENT", "RESHARE"] as const;
  const results: Record<string, number> = {};

  // Fetch each metric type in parallel with TOTAL aggregation
  const fetches = metricTypes.map(async (metricType) => {
    try {
      const url = `https://api.linkedin.com/rest/memberCreatorPostAnalytics?q=entity&entity=${entityParam}&queryType=${metricType}&aggregation=TOTAL`;
      const res = await fetch(url, { headers });

      if (res.ok) {
        const data = await res.json();
        const total = data.elements?.reduce(
          (sum: number, el: { count?: number }) => sum + (el.count ?? 0),
          0
        ) ?? 0;
        results[metricType] = total;
      } else {
        results[metricType] = 0;
      }
    } catch {
      results[metricType] = 0;
    }
  });

  await Promise.all(fetches);

  const impressions = results.IMPRESSION ?? 0;
  const reactions = results.REACTION ?? 0;
  const comments = results.COMMENT ?? 0;
  const reposts = results.RESHARE ?? 0;
  const engagements = reactions + comments + reposts;

  return { impressions, reactions, comments, reposts, engagements };
}
