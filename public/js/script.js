document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("no-scroll", isOpen);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("no-scroll");
      });
    });
  }

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const revealElements = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealElements.forEach((element) => observer.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add("visible"));
  }

  const lightbox = document.querySelector(".lightbox");
  const lightboxImage = lightbox?.querySelector("img");
  const lightboxText = lightbox?.querySelector("p");
  const closeButton = lightbox?.querySelector(".lightbox-close");
  let lastFocusedElement = null;

  document.querySelectorAll(".project").forEach((project) => {
    project.addEventListener("click", () => {
      if (!lightbox || !lightboxImage) return;

      lastFocusedElement = document.activeElement;
      lightboxImage.src = project.dataset.image || "";
      lightboxImage.alt = project.dataset.title || "Project";
      if (lightboxText) lightboxText.textContent = project.dataset.title || "";

      lightbox.classList.add("active");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
      closeButton?.focus();
    });
  });

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
  }

  closeButton?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });

  loadReviews();
});

function starString(value) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function formatReviewDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("el-GR", {
    year: "numeric",
    month: "long"
  }).format(date);
}

function createReviewCard(review, index) {
  const article = document.createElement("article");
  article.className = `review-card${index === 1 ? " review-featured" : ""}`;

  const stars = document.createElement("div");
  stars.className = "stars";
  stars.setAttribute("aria-label", `${review.rating || 0} από 5 αστέρια`);
  stars.textContent = starString(review.rating);
  article.appendChild(stars);

  const quote = document.createElement("blockquote");
  quote.textContent = review.comment || "Αξιολόγηση μέσω Google.";
  article.appendChild(quote);

  if (review.owner_reply) {
    const reply = document.createElement("div");
    reply.className = "owner-reply";

    const label = document.createElement("strong");
    label.textContent = "Απάντηση επιχείρησης";
    const text = document.createElement("p");
    text.textContent = review.owner_reply;

    reply.append(label, text);
    article.appendChild(reply);
  }

  const person = document.createElement("div");
  person.className = "review-person";

  const name = document.createElement("strong");
  name.textContent = review.customer_name || "Google User";
  person.appendChild(name);

  const date = formatReviewDate(review.review_date);
  if (date) {
    const dateElement = document.createElement("span");
    dateElement.textContent = date;
    person.appendChild(dateElement);
  }

  article.appendChild(person);
  return article;
}

async function loadReviews() {
  const container = document.getElementById("reviews-container");
  const averageRating = document.getElementById("average-rating");
  const averageStars = document.getElementById("average-stars");
  const totalReviews = document.getElementById("total-reviews");
  const googleLink = document.getElementById("google-reviews-link");

  if (!container) return;

  try {
    const response = await fetch("/api/reviews", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Reviews unavailable");

    const average = Number(data.summary?.averageRating || 0);
    const total = Number(data.summary?.totalReviews || 0);

    if (averageRating) averageRating.textContent = average ? average.toFixed(1) : "—";
    if (averageStars) {
      averageStars.textContent = average ? starString(average) : "☆☆☆☆☆";
      averageStars.setAttribute("aria-label", average ? `${average} από 5 αστέρια` : "Χωρίς αξιολογήσεις");
    }
    if (totalReviews) totalReviews.textContent = String(total);

    if (googleLink && data.googleReviewsUrl) {
      googleLink.href = data.googleReviewsUrl;
      googleLink.hidden = false;
    }

    container.replaceChildren();

    const reviews = Array.isArray(data.reviews) ? data.reviews.slice(0, 6) : [];
    if (!reviews.length) {
      const empty = document.createElement("div");
      empty.className = "review-empty";
      empty.textContent = data.googleConfigured
        ? "Δεν υπάρχουν αποθηκευμένες κριτικές ακόμη. Θα εμφανιστούν μετά τον πρώτο συγχρονισμό με το Google Business Profile."
        : "Οι Google κριτικές θα εμφανιστούν εδώ μόλις συνδεθεί το Google Business Profile.";
      container.appendChild(empty);
      return;
    }

    reviews.forEach((review, index) => {
      container.appendChild(createReviewCard(review, index));
    });
  } catch (error) {
    console.error("Review loading failed:", error);
    container.replaceChildren();
    const errorMessage = document.createElement("div");
    errorMessage.className = "review-error";
    errorMessage.textContent = "Οι κριτικές δεν είναι διαθέσιμες αυτή τη στιγμή.";
    container.appendChild(errorMessage);
  }
}
