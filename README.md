# K.M | Ξυλουργικές Κατασκευές

Έτοιμη production δομή για το website της K.M με Node.js / Express, SQLite και προαιρετικό συγχρονισμό Google Reviews.

## Δομή

```text
KM-WEBSITE-READY/
├── public/
│   ├── index.html
│   ├── 404.html
│   ├── favicon.svg
│   ├── css/style.css
│   ├── js/script.js
│   └── images/
├── server/
│   ├── server.js
│   ├── database.js
│   └── google-reviews.js
├── data/
├── package.json
├── .env.example
└── .gitignore
```

## 1. Εκτέλεση στον υπολογιστή

Χρειάζεται Node.js 18 ή νεότερο.

```bash
npm install
cp .env.example .env
npm start
```

Άνοιξε:

```text
http://localhost:3000
```

Για development με αυτόματο restart:

```bash
npm run dev
```

## 2. Φωτογραφίες

Η φωτογραφία που υπήρχε στο αρχικό ZIP χρησιμοποιήθηκε ως `hero.jpg` και προσωρινά και για τα 5 gallery slots ώστε να μην υπάρχουν broken images.

Αντικατάστησε τα παρακάτω αρχεία με πραγματικές φωτογραφίες έργων, κρατώντας τα ίδια ονόματα:

```text
public/images/hero.jpg
public/images/project-01.jpg
public/images/project-02.jpg
public/images/project-03.jpg
public/images/project-04.jpg
public/images/project-05.jpg
```

## 3. Google Reviews

Το website λειτουργεί και χωρίς Google API. Χωρίς credentials εμφανίζει ουδέτερο μήνυμα στη θέση των reviews.

Για πραγματικό συγχρονισμό, συμπλήρωσε στο `.env`:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_REFRESH_TOKEN=
GOOGLE_ACCOUNT_ID=
GOOGLE_LOCATION_ID=
GOOGLE_REVIEWS_PUBLIC_URL=
```

Ο αυτόματος συγχρονισμός είναι ενεργός ανά 12 ώρες όταν υπάρχουν όλα τα Google credentials:

```env
AUTO_SYNC_REVIEWS=true
REVIEWS_SYNC_INTERVAL_HOURS=12
```

Για χειροκίνητο sync όρισε ένα μεγάλο τυχαίο token:

```env
REVIEWS_SYNC_TOKEN=
```

και κάλεσε:

```bash
curl -X POST http://localhost:3000/api/reviews/sync \
  -H "Authorization: Bearer TO_TOKEN_SOU"
```

## 4. GitHub

Το πραγματικό `.env` ΔΕΝ πρέπει να ανεβαίνει στο GitHub. Το `.gitignore` το αποκλείει ήδη.

```bash
git init
git add .
git commit -m "Initial K.M website"
```

Στη συνέχεια δημιούργησε repository στο GitHub και κάνε push σύμφωνα με τις οδηγίες που θα εμφανίσει το GitHub.

## 5. Railway

1. Δημιούργησε νέο project στο Railway από το GitHub repository.
2. Το Railway θα εκτελέσει το `npm start` από το `package.json`.
3. Πρόσθεσε τις μεταβλητές του `.env.example` στο Variables section. Μην ανεβάσεις το `.env`.
4. Δημιούργησε ένα persistent Volume και κάνε mount π.χ. στο `/data`. Ο server αναγνωρίζει αυτόματα το `RAILWAY_VOLUME_MOUNT_PATH` και αποθηκεύει εκεί το `reviews.sqlite`.
5. Δημιούργησε/public domain από το Railway και άνοιξε το URL.
6. Health endpoint: `/api/health`.

## 6. Πριν δημοσιευτεί

- Αντικατάστησε τις προσωρινά επαναλαμβανόμενες gallery φωτογραφίες με τα πραγματικά έργα.
- Άλλαξε τα `Project 01` κ.λπ. στο `public/index.html` στα πραγματικά ονόματα έργων, αν θέλεις.
- Συμπλήρωσε τα Google credentials μόνο αν θέλεις live Google Reviews.
- Όταν αποκτήσεις δικό σου domain, μπορείς να προσθέσεις canonical URL και πλήρες Open Graph image URL στο `<head>`.

## Στοιχεία επικοινωνίας που έχουν ήδη διορθωθεί

- Τηλέφωνο: `+30 694 516 1391`
- Email: `kleanthis.m.mali@gmail.com`
- WhatsApp: `https://wa.me/306945161391`

