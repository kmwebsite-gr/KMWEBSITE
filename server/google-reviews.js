const { google } = require("googleapis");
const db = require("./database");

function getRequiredGoogleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    accountId: process.env.GOOGLE_ACCOUNT_ID,
    locationId: process.env.GOOGLE_LOCATION_ID
  };
}

function hasGoogleConfiguration() {
  const config = getRequiredGoogleConfig();
  return Object.values(config).every(Boolean);
}

function assertGoogleConfiguration() {
  if (!hasGoogleConfiguration()) {
    throw new Error(
      "Google Reviews is not configured. Add the required GOOGLE_* variables to the environment."
    );
  }
}

function convertRating(rating) {
  if (typeof rating === "number") {
    return Math.min(5, Math.max(1, Math.round(rating)));
  }

  const ratings = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5
  };

  return ratings[rating] || 5;
}

async function getGoogleReviews() {
  assertGoogleConfiguration();

  const config = getRequiredGoogleConfig();
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  oauth2Client.setCredentials({ refresh_token: config.refreshToken });
  const accessToken = await oauth2Client.getAccessToken();

  if (!accessToken.token) {
    throw new Error("Google OAuth did not return an access token.");
  }

  const reviews = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({ pageSize: "50" });
    if (pageToken) params.set("pageToken", pageToken);

    const url =
      `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(config.accountId)}` +
      `/locations/${encodeURIComponent(config.locationId)}/reviews?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    reviews.push(...(data.reviews || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return reviews;
}

const upsertReview = db.prepare(`
  INSERT INTO reviews (
    google_review_id,
    customer_name,
    rating,
    comment,
    review_date,
    customer_photo,
    google_url,
    owner_reply,
    updated_at
  )
  VALUES (
    @google_review_id,
    @customer_name,
    @rating,
    @comment,
    @review_date,
    @customer_photo,
    @google_url,
    @owner_reply,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT(google_review_id)
  DO UPDATE SET
    customer_name = excluded.customer_name,
    rating = excluded.rating,
    comment = excluded.comment,
    review_date = excluded.review_date,
    customer_photo = excluded.customer_photo,
    google_url = excluded.google_url,
    owner_reply = excluded.owner_reply,
    updated_at = CURRENT_TIMESTAMP
`);

const saveManyReviews = db.transaction((reviews) => {
  for (const review of reviews) {
    const reviewer = review.reviewer || {};
    const reviewReply = review.reviewReply || {};
    const googleReviewId = review.reviewId || review.name;

    if (!googleReviewId) continue;

    upsertReview.run({
      google_review_id: googleReviewId,
      customer_name: reviewer.displayName || "Google User",
      rating: convertRating(review.starRating),
      comment: review.comment || "",
      review_date: review.createTime || review.updateTime || null,
      customer_photo: reviewer.profilePhotoUrl || null,
      google_url: process.env.GOOGLE_REVIEWS_PUBLIC_URL || null,
      owner_reply: reviewReply.comment || null
    });
  }
});

async function syncReviews() {
  const reviews = await getGoogleReviews();
  saveManyReviews(reviews);
  return reviews.length;
}

module.exports = {
  getGoogleReviews,
  hasGoogleConfiguration,
  syncReviews
};
