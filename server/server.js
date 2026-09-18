require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express");
const path = require("path");
const db = require("./database");
const { hasGoogleConfiguration, syncReviews } = require("./google-reviews");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, "..", "public");

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, service: "km-website" });
});

app.get("/api/reviews", (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT
        id,
        google_review_id,
        customer_name,
        rating,
        comment,
        review_date,
        customer_photo,
        google_url,
        owner_reply
      FROM reviews
      ORDER BY review_date DESC, id DESC
      LIMIT 30
    `).all();

    const summary = db.prepare(`
      SELECT ROUND(AVG(rating), 1) AS average_rating, COUNT(*) AS total_reviews
      FROM reviews
    `).get();

    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({
      success: true,
      reviews,
      summary: {
        averageRating: summary.average_rating || 0,
        totalReviews: summary.total_reviews || 0
      },
      googleReviewsUrl: process.env.GOOGLE_REVIEWS_PUBLIC_URL || null,
      googleConfigured: hasGoogleConfiguration()
    });
  } catch (error) {
    console.error("Unable to load reviews:", error);
    res.status(500).json({ success: false, error: "Unable to load reviews." });
  }
});

app.post("/api/reviews/sync", async (req, res) => {
  const configuredToken = process.env.REVIEWS_SYNC_TOKEN;
  const suppliedToken =
    req.get("x-sync-token") ||
    (req.get("authorization") || "").replace(/^Bearer\s+/i, "");

  if (!configuredToken) {
    return res.status(503).json({
      success: false,
      error: "Manual review sync is disabled. Set REVIEWS_SYNC_TOKEN first."
    });
  }

  if (suppliedToken !== configuredToken) {
    return res.status(401).json({ success: false, error: "Unauthorized." });
  }

  try {
    const count = await syncReviews();
    res.json({ success: true, synced: count });
  } catch (error) {
    console.error("Review sync failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/robots.txt", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.type("text/plain").send(
    `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
});

app.get("/sitemap.xml", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      `<url><loc>${baseUrl}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>` +
      `<url><loc>${baseUrl}/kouzines.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>` +
      `<url><loc>${baseUrl}/ntoulapes.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>` +
      `<url><loc>${baseUrl}/portes.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>` +
      `<url><loc>${baseUrl}/eidikes-kataskeves.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>` +
      `</urlset>`
  );
});

app.use(
  express.static(publicDir, {
    dotfiles: "deny",
    index: "index.html",
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
  })
);

app.use((req, res) => {
  if (req.method === "GET" && !req.path.startsWith("/api/")) {
    return res.status(404).sendFile(path.join(publicDir, "404.html"));
  }
  return res.status(404).json({ success: false, error: "Not found." });
});

const server = app.listen(PORT, () => {
  console.log(`K.M website running on port ${PORT}`);

  const autoSync = process.env.AUTO_SYNC_REVIEWS !== "false";
  if (autoSync && hasGoogleConfiguration()) {
    const syncNow = async () => {
      try {
        const count = await syncReviews();
        console.log(`Google Reviews sync completed: ${count} reviews.`);
      } catch (error) {
        console.error("Automatic Google Reviews sync failed:", error.message);
      }
    };

    setTimeout(syncNow, 3000).unref();

    const hours = Math.max(1, Number(process.env.REVIEWS_SYNC_INTERVAL_HOURS) || 12);
    setInterval(syncNow, hours * 60 * 60 * 1000).unref();
  }
});

function shutdown() {
  try {
    db.close();
  } finally {
    server.close(() => process.exit(0));
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
