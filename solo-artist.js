/* =========================================================
   Solo Artist Page Loader
   ---------------------------------------------------------
   Requirements handled:
   - Load artist info
   - Resolve JSONB id arrays via lookup tables
   - Load profile + gallery images
   - Fill page sections
   ---------------------------------------------------------
   Assumes:
   - supabaseClient already initialized globally
   - Page opened with: artists.html?artist=<user_id>
   - Tables:
        artists
        artist_media
        profile.public (view)
        categories
        performance_types
        audience_ranges
        availabilities
   ========================================================= */

document.addEventListener("DOMContentLoaded", init);

async function init() {
    const artistId = getArtistIdFromURL();
    if (!artistId) {
        console.warn("Artist id missing in URL.");
        return;
    }

    try {
        const artist = await fetchArtist(artistId);
        if (!artist) return;

        const userId = artist.user_id;

        const profile = await fetchProfile(userId);
        const media = await fetchMedia(userId);

        
        await fillArtistData({ artist, profile, media });
    } catch (err) {
        console.error("Artist page load failed:", err);
    }
}

/* =========================
   URL PARAM
========================= */
function getArtistIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("artist_code");
}

/* =========================
   DATABASE FETCHERS
========================= */

async function fetchArtist(artist_code) {
    const { data, error } = await supabaseClient
        .from("artists")
        .select(`
            user_id,
            bio,
            category_ids,
            performance_type_ids,
            availability_ids,
            audience_range,
            portfolio_link,
            instagram_link,
            youtube_link
        `)
        .eq("artist_code", artist_code)
        .single();

    if (error) {
        console.error("Artist fetch error:", error);
        return null;
    }

    return data;
}

async function fetchProfile(userId) {
    const { data } = await supabaseClient
        .from("profiles_public")
        .select("full_name")
        .eq("id", userId)
        .single();

    return data;
}

async function fetchMedia(userId) {
    const { data } = await supabaseClient
        .from("artist_media")
        .select("media_url, media_type")
        .eq("user_id", userId);

    return data || [];
}

/* =========================
   LOOKUP HELPERS
========================= */

async function getNamesByIds(table, ids) {
    if (!ids || ids.length === 0) return [];

    const { data } = await supabaseClient
        .from(table)
        .select("id, name")
        .in("id", ids);

    return (data || []).map(d => d.name);
}

/* =========================
   PAGE POPULATION
========================= */

async function fillArtistData({ artist, profile, media }) {

    /* ---------- Resolve JSONB ---------- */

    const categories = await getNamesByIds(
        "categories",
        artist.category_ids
    );

    const performanceTypes = await getNamesByIds(
        "performance_types",
        artist.performance_type_ids
    );

    const availability = await getNamesByIds(
        "availability",
        artist.availability_ids
    );

    /* ---------- HERO ---------- */

    const heroTitle = document.querySelector(
        "#artist-name"
    );

    const artistTags = document.querySelector(
        "#artist-tags"
    );

    const heroBio = document.querySelector(
        "#bio"
    );

    if (heroTitle && profile?.full_name)
        heroTitle.textContent = profile.full_name;

    if (heroBio && artist?.bio)
        heroBio.textContent = artist.bio;

    artistTags.innerHTML = categories.join(" / ") + " / " + performanceTypes.join(" / ");

    /* ---------- DETAILS CARDS ---------- */

    const cards = document.querySelectorAll(
        ".artist-details-cards p"
    );

    if (cards[0])
        cards[0].textContent =
            performanceTypes.join(" / ");

    if (cards[1])
        cards[1].textContent =
            artist.audience_range || "Not specified";

    if (cards[2])
        cards[2].textContent =
            availability.join(" / ");

    /* ---------- LINKS ---------- */

    // set optional links if present
    setOptionalLink("portfolioLink", artist.portfolio_link);
    setOptionalLink("instagramLink", artist.instagram_link);
    setOptionalLink("youtubeLink", artist.youtube_link);

    /* ---------- MEDIA ---------- */

    const profileImage =
        media.find(m => m.media_type === "profile");

    const galleryImages =
        media
            .filter(m => m.media_type === "gallery")
            .slice(0, 5);

    /* Profile Image */
    const heroImg =
        document.querySelector(
            "#profile-pic"
        );

    if (heroImg && profileImage)
        heroImg.src = profileImage.media_url;

    /* Gallery Images */
    const galleryImgs =
        document.querySelectorAll(
            "#artist-gallery img"
        );

    galleryImgs.forEach((img, i) => {
        if (galleryImages[i]) {
            img.src = galleryImages[i].media_url;
        }
    });
};

    /* =========================
       OPTIONAL LINK SETTER
    ========================= */

    function setOptionalLink(elementId, url) {
    const linkElement = document.getElementById(elementId);

    if (!linkElement) return;

    if (url && url.trim() !== "") {
        linkElement.href = url;
        linkElement.classList.remove("hidden");
    } else {
        linkElement.classList.add("hidden");
    }
};