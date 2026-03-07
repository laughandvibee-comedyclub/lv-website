const supabaseClient = window.supabaseClient;

const form = document.getElementById("profileForm");
const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");

let artistId = null;
let saving = false;

/* -------------------------
   Fields required for first submit
-------------------------- */
const requiredFields = [
    "#base-city-select",
    "#experience-select",
    "#bio",
    "#audience-select"
];

// Generalize Selection Logic
async function loadSelectable({
    table,
    gridElementId,
    artistColumn,
    selectedIds = []
}) {
    const grid = document.getElementById(gridElementId);
    if (!grid) {
        console.error("Grid element not found:", gridElementId);
        return;
    }
    grid.innerHTML = "";

    // get session user
    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session) {
        window.location.replace("./login.html");
        return;
    }

    artistId = session.user.id;

    //  fetch all items from the table
    const { data: allItems, error: itemErr } =
        await supabaseClient.from(table).select("*");

    if (itemErr) {
        console.error(itemErr);
        return;
    }

    // fetch artist from Supabase (might be null for new user)
    const { data: artist } = await supabaseClient
        .from("artists")
        .select(artistColumn)
        .eq("user_id", artistId)
        .maybeSingle();

    // fetch draft from localStorage if exists
    const draft = JSON.parse(localStorage.getItem("artistDraft")) || {};

    const finalSelectedIds = (
        artist?.[artistColumn] ||
        draft[artistColumn] ||
        []
    ).map(String); // convert to strings for safe comparison

    allItems.forEach(item => {
        const isChecked = finalSelectedIds.includes(String(item.id)); // build checkbox with ${isChecked ? "checked" : "" }

        const wrapper = document.createElement("div");

        wrapper.innerHTML = `
      <input
        type="checkbox"
        id="${table}-${item.id}"
        value="${item.id}"
        data-column="${artistColumn}"
        data-label="${item.name}"
        class="peer selectable hidden"
        area-labelledby="label-${item.id}"
        ${isChecked ? "checked" : ""}
      >

      <label for="${table}-${item.id}"
        class="cursor-pointer flex items-center gap-3 px-6 py-1 rounded-full transition-all
        bg-[#4B4545] text-[#A59E9E] hover:outline-none hover:ring-2 hover:ring-[#7D27CE] capitalize
        peer-checked:bg-[#7D27CE] peer-checked:text-white">

        <span>${item.name}</span>
      </label>
    `;

        grid.appendChild(wrapper);
    });
}

/* -------------------------
   LOAD in UI
-------------------------- */
async function loadInterface() {
    // get session user
    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session) {
        window.location.replace("./login.html");
        return;
    }

    artistId = session.user.id;

    // load profile info
    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("full_name, whatsapp_number, email")
            .eq("id", artistId)
            .maybeSingle();

    if (profileError) {
        console.error(profileError);
    } else if (profile) {
        document.getElementById("full-name").value =
            profile.full_name || "";

        document.getElementById("namePreview").textContent =
            profile.full_name || "Artist Name";

        document.getElementById("phone").value =
            profile.whatsapp_number || "";

        document.getElementById("email").value =
            profile.email || "";
    }


    // Check if artist row exists
    const { data: artist } = await supabaseClient
        .from("artists")
        .select("id")
        .eq("user_id", artistId)
        .maybeSingle();

    if (!artist) {
        await loadSelectable({
            table: "categories",
            gridElementId: "categoryGrid",
            artistColumn: "category_ids"
        });

        await loadSelectable({
            table: "languages",
            gridElementId: "languageGrid",
            artistColumn: "language_ids"
        });

        await loadSelectable({
            table: "performance_types",
            gridElementId: "performanceGrid",
            artistColumn: "performance_type_ids"
        });

        await loadSelectable({
            table: "availability",
            gridElementId: "availabilityGrid",
            artistColumn: "availability_ids"
        });
    }
}

/* -------------------------
   LOAD CITIES UI
-------------------------- */
async function getCities() {
    errorMsg.textContent = "";
    const { data, error } = await supabaseClient
        .from('cities') // table name
        .select('name') // Select the columns you need (e.g., id and name)

    if (error) {
        errorMsg.textContent = error.message;
        return []
    }
    return data
}

/* -------------------------
   LOAD EXPERIENCE UI
-------------------------- */
async function getExperience() {
    errorMsg.textContent = "";
    const { data, error } = await supabaseClient
        .from('experience') // table name
        .select('name') // Select the columns you need (e.g., id and name)

    if (error) {
        errorMsg.textContent = error.message;
        return []
    }
    return data
}

/* -------------------------
   LOAD AUDIENCE UI
-------------------------- */
async function getAudience() {
    errorMsg.textContent = "";
    const { data, error } = await supabaseClient
        .from('audience_range') // table name
        .select('name') // Select the columns you need (e.g., id and name)

    if (error) {
        errorMsg.textContent = error.message;
        return []
    }
    return data
}

/* -------------------------
   HELPER FUNCTION FOR UI IN SELECT,OPTION ELEMENTS
-------------------------- */
function capitalize(text) {
    return text.replace(/\b\w/g, char => char.toUpperCase());
}

// Function to populate the select city element
async function populateCitySelect() {
    const citySelect = document.getElementById('base-city-select');
    const cities = await getCities();

    cities.forEach(city => {
        const option = document.createElement('option')
        option.value = city.name // The value of the option (often an ID), keep DB value -> lowercase
        option.textContent = capitalize(city.name) // display nicely, The text displayed to the user
        option.className = "bg-[#4B4545] text-white capitalize"; // Limited styling support
        citySelect.appendChild(option)
    })
}

// Function to populate the select experience element
async function populateExperienceSelect() {
    const experienceSelect = document.getElementById('experience-select');
    const experience = await getExperience();

    experience.forEach(exp => {
        const option = document.createElement('option')
        option.value = exp.name // The value of the option (often an ID), keep DB value -> lowercase
        option.textContent = capitalize(exp.name) // display nicely, The text displayed to the user
        option.className = "bg-[#4B4545] text-white capitalize"; // Limited styling support
        experienceSelect.appendChild(option)
    })
}

// Function to populate the select audience range element
async function populateAudienceSelect() {
    const audienceSelect = document.getElementById('audience-select');
    const audience = await getAudience();

    audience.forEach(audience => {
        const option = document.createElement('option')
        option.value = audience.name // The value of the option (often an ID), keep DB value -> lowercase
        option.textContent = capitalize(audience.name) // display nicely, The text displayed to the user
        option.className = "bg-[#4B4545] text-white capitalize"; // Limited styling support
        audienceSelect.appendChild(option)
    })
}

// Call the function to populate when the page loads
populateCitySelect();
populateExperienceSelect();
populateAudienceSelect();

/* -------------------------
   Live Data Preview
-------------------------- */
// const nameInput = document.getElementById("");
// const namePreview = document.getElementById("namePreview");
const bioInput = document.getElementById("bio");
const bioPreview = document.getElementById("bioPreview");

bioInput.addEventListener('input', () => {
    bioPreview.textContent = bioInput.value || "Your bio will appear here. Keep it crisp and bookable.";
})

const cityPreview = document.getElementById("cityPreview");
const tagsPreview = document.getElementById("tags");

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
};

const displayTags = async () => {

}

function renderTags() {
    tagsPreview.innerHTML = "";

    const selectedCheckboxes = document.querySelectorAll(
        'input[type="checkbox"]:checked'
    );

    if (selectedCheckboxes.length === 0) {
        tagsPreview.textContent = "Selected tags will appear here";
        return;
    }

    selectedCheckboxes.forEach(cb => {
        const tag = document.createElement("span");
        tag.textContent = cb.dataset.label; // use label text
        tag.className =
            "px-1 py-0.5 text-[#928A8A] text-sm bg-transparent border border-[#928A8A] rounded capitalize";

        tagsPreview.appendChild(tag);
    });
}

document.addEventListener("change", function (e) {
    if (e.target.matches('input[type="checkbox"]')) {
        renderTags();
    }
});

/* -------------------------
   // 1. Utilities
-------------------------- */
// getCheckboxValues
function getCheckboxValues(name) {
    return [...document.querySelectorAll(
        `input[name="${name}"]:checked`
    )].map(el => el.value);
}

// setCheckboxValues
function setCheckboxValues(name, values = []) {
    const strValues = values.map(String);
    document.querySelectorAll(`input[name="${name}"]`)
        .forEach(el => {
            el.checked = strValues.includes(String(el.value));
        });
}

//Save draft while typing
function saveDraft() {
    const draft = {
        baseCity: document.querySelector("#base-city-select").value,
        experience: document.querySelector("#experience-select").value,
        portfolioLink:
            document.querySelector("#portfolio-link").value,
        instagramLink:
            document.querySelector("#instagram-link").value,
        youtubeLink:
            document.querySelector("#youtube-link").value,
        bio: document.querySelector("#bio").value,
        audienceRange: document.querySelector("#audience-select").value,
        category_ids: [...document.querySelectorAll('input[name="category_ids"]:checked')].map(el => el.value),
        language_ids: [...document.querySelectorAll('input[name="language_ids"]:checked')].map(el => el.value),
        performance_type_ids: [...document.querySelectorAll('input[name="performance_type_ids"]:checked')].map(el => el.value),
        availability_ids: [...document.querySelectorAll('input[name="availability_ids"]:checked')].map(el => el.value)
    };

    localStorage.setItem("artistDraft", JSON.stringify(draft));
};

// Restore draft after reload
function restoreDraft() {
    const draft = JSON.parse(
        localStorage.getItem("artistDraft")
    );

    if (!draft) return;

    document.querySelector("#base-city-select").value = draft.baseCity || "";
    document.querySelector("#experience-select").value = draft.experience || "";
    document.querySelector("#portfolio-link").value = draft.portfolioLink || "";
    document.querySelector("#instagram-link").value = draft.instagramLink || "";
    document.querySelector("#youtube-link").value = draft.youtubeLink || "";
    document.querySelector("#bio").value = draft.bio || "";
    document.querySelector("#audience-select").value = draft.audienceRange || "";
}

// freeze form
function freezeForm() {
    document
        .querySelectorAll("input, textarea, select")
        .forEach(el => el.disabled = true);

    document.querySelector("#submitBtn").style.display = "none";
}

// fill form
async function fillForm(artist) {
    document.querySelector("#base-city-select").value = artist.base_city || "";
    document.querySelector("#experience-select").value = artist.experience || "";
    document.querySelector("#portfolio-link").value = artist.portfolio_link || "";
    document.querySelector("#instagram-link").value = artist.instagram_link || "";
    document.querySelector("#youtube-link").value = artist.youtube_link || "";
    document.querySelector("#bio").value = artist.bio || "";
    document.querySelector("#audience-select").value = artist.audience_range || "";

    // load artist code
    document.querySelector("#artistCode").textContent =
        artist.artist_code || "";

    // load base city in the preview
    cityPreview.textContent = artist.base_city || "";

    // load artist bio in the preview
    bioPreview.textContent = artist.bio || "Your bio will appear here. Keep it crisp and bookable.";

    // to load tags in the preview
    const categories = await getNamesByIds(
        "categories",
        artist.category_ids
    );

    const performanceTypes = await getNamesByIds(
        "performance_types",
        artist.performance_type_ids
    );

    const languages = await getNamesByIds(
        "languages",
        artist.language_ids
    );

    tagsPreview.innerHTML = ""; // clear previous tags

    const allTags = [
        ...categories,
        ...performanceTypes,
        ...languages
    ];

    if (allTags.length === 0) {
        tagsPreview.textContent = "Selected tags will appear here";
        return;
    }

    allTags.forEach(tagText => {
        const tag = document.createElement("span");
        tag.textContent = tagText;
        tag.className = "px-1 py-0.5 text-[#928A8A] text-sm bg-transparent border border-[##928A8A] rounded capitalize";
        tagsPreview.appendChild(tag);
    });
}


/* -------------------------
   // 2. Load artist on page load
-------------------------- */
async function loadArtistProfile() {
    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session) return;

    const { data: artist, error } = await supabaseClient
        .from("artists")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

    if (!artist) {
        restoreDraft();
        return;
    }

    if (error) {
        console.error(error);
        return;
    }

    // fill the form (inputs, selects, checkboxes, artist code)
    if (artist) {
        fillForm(artist); // populates inputs + artist code
    } else {
        restoreDraft(); // optional: restore local draft if no artist yet
    }

    // load selectable checkboxes **with selected IDs**
    if (artist) {
        await loadSelectable({
            table: "categories",
            gridElementId: "categoryGrid",
            artistColumn: "category_ids",
            selectedIds: artist?.category_ids || []
        });

        await loadSelectable({
            table: "languages",
            gridElementId: "languageGrid",
            artistColumn: "language_ids",
            selectedIds: artist?.language_ids || []
        });

        await loadSelectable({
            table: "performance_types",
            gridElementId: "performanceGrid",
            artistColumn: "performance_type_ids",
            selectedIds: artist?.performance_type_ids || []
        });

        await loadSelectable({
            table: "availability",
            gridElementId: "availabilityGrid",
            artistColumn: "availability_ids",
            selectedIds: artist?.availability_ids || []
        });
    }

    fillForm(artist); // populates inputs + artist code
}

/* -------------------------
   3. Attach listeners
-------------------------- */
async function attachDraftListeners() {
    // Attach: draft while typing
    document
        .querySelectorAll("input, textarea, select")
        .forEach(el =>
            el.addEventListener("change", saveDraft)
        );
}

/* -------------------------
   SAVE SELECTION , 4. Form submit handler
-------------------------- */
async function handleFormSubmit(e) {
    e.preventDefault();
    if (saving) return;

    // Get current user session
    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session) {
        alert("Please login first.");
        saving = false;
        return;
    }

    const artistId = session.user.id;

    // Check if artist row exists
    const { data: artist } = await supabaseClient
        .from("artists")
        .select("id")
        .eq("user_id", artistId)
        .maybeSingle();

    const firstSubmit = !artist;

    // add required to inputs/selects
    requiredFields.forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.setAttribute("required", "true")
    });

    saving = true;
    errorMsg.textContent = "";
    successMsg.textContent = "";

    /* -------------------------
       COLLECT CHECKBOX SELECTIONS
    -------------------------- */

    const selections = {};

    document.querySelectorAll(".selectable:checked")
        .forEach(input => {
            const column = input.dataset.column;

            if (!selections[column]) {
                selections[column] = [];
            }

            selections[column].push(input.value); // keep as string
        });

    /* -------------------------
       COLLECT FORM VALUES
    -------------------------- */

    const baseCity = document.getElementById("base-city-select").value;
    const experience = document.getElementById("experience-select").value;
    const portfolioLink =
        document.getElementById("portfolio-link")?.value.trim() || "";
    const instagramLink =
        document.getElementById("instagram-link")?.value.trim() || "";
    const youtubeLink =
        document.getElementById("youtube-link")?.value.trim() || "";
    const bio = document.getElementById("bio").value;
    const audienceRange = document.getElementById("audience-select").value;

    // profile image required validation
    if (!currentProfilePath) {
        alert("Profile image is required.");
        return;
    }

    // gallery images validation
    const count = galleryState.filter(Boolean).length;

    if (count < 5) {
        alert("Upload at least 5 gallery images");
        return;
    }

    // maclength validation for bio
    if (bio.length > 300) {
        alert("Bio can have maximum 300 characters.");
        return;
    }

    // artist links validation
    const links = [portfolioLink, instagramLink, youtubeLink]

    for (const link of links) {
        if (link) {
            try {
                const url = new URL(link);

                if (url.protocol !== "https:") {
                    alert("URL must start with https://");
                    return;
                }

            } catch {
                alert("Enter a valid URL.");
                return;
            }
        }
    }

    // for backend
    portfolioLink: portfolioLink || "not submitted";
    instagramLink: instagramLink || "not submitted";
    youtubeLink: youtubeLink || "not submitted";

    /* -------------------------
       UPSERT ARTIST
    -------------------------- */
    const artistPayload = {
        user_id: artistId,
        base_city: baseCity,
        experience: experience,
        portfolio_link: portfolioLink,
        instagram_link: instagramLink,
        youtube_link: youtubeLink,
        bio: bio,
        audience_range: audienceRange,
        ...selections
    };

    try {
        // Upsert artist row (insert or update if user_id exists)
        const { data: savedArtist, error } = await supabaseClient
            .from("artists")
            .upsert(artistPayload, { onConflict: "user_id" })
            .select("*") // get full row including artist_code

        if (error) throw error;

        if (savedArtist?.length) {
            // Update UI with saved data
            fillForm(savedArtist[0]); // fillForm updates inputs and artist code
            successMsg.textContent = "Profile saved successfully!";
            localStorage.removeItem("artistDraft"); // clear draft
        }
    } catch (err) {
        console.error(err);
        errorMsg.textContent = err.message || "Failed to save profile.";
    } finally {
        saving = false;
    }
    alert("Profile submitted successfully!");

};

// attach eventlistener to form
form.addEventListener("submit", handleFormSubmit);

// loadInterface();

/* -------------------------
   Load after DOMContentLoaded
-------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    loadInterface();
    attachDraftListeners();
    loadArtistProfile();

});

/* -------------------------
   LOGOUT FUNCTIONALITY
-------------------------- */
document
    .getElementById("logoutBtn")
    .addEventListener("click", async (e) => {
        e.preventDefault();
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Logout failed:", error.message);
            return;
        }

        window.location.replace("./login.html");
    });
