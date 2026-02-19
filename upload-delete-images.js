// get session user
async function init() {
    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.replace("./login.html");
        return;
    }

    const artistId = user.id;

};

init();
const bucket = "artist-media";

const fileInput = document.getElementById("profileImgInput");
const uploadBtn = document.getElementById("uploadProfileImgBtn");
const preview = document.getElementById("profileImagePreview");
const deleteBtn = document.getElementById("deleteProfileBtn");

let currentProfilePath = null;

// resize images and convert to webp
async function resizeImage(file, size) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => (img.src = e.target.result);
        reader.readAsDataURL(file);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext("2d");

            // center square crop
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;

            ctx.drawImage(
                img,
                sx,
                sy,
                minSide,
                minSide,
                0,
                0,
                size,
                size
            );

            canvas.toBlob(
                (blob) => {
                    const resizedFile = new File(
                        [blob],
                        file.name.replace(/\.\w+$/, ".webp"),
                        {
                            type: "image/webp",
                            lastModified: Date.now(),
                        }
                    );

                    resolve(resizedFile);
                },
                "image/webp",
                0.9 // quality
            );
        };
    });
};


// /* ----------------------*/
//        Profile pic 
// /* ----------------------*/

/* Upload button clicked */
uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select an image first.");
        return;
    }

    /* STEP 1: find old profile */
    const { data: oldMedia } = await supabaseClient
        .from("artist_media")
        .select("*")
        .eq("user_id", artistId)
        .eq("media_type", "profile")
        .maybeSingle();

    /* STEP 2: delete old storage file */
    if (oldMedia) {
        await supabaseClient.storage
            .from(bucket)
            .remove([oldMedia.media_url]);

        await supabase
            .from("artist_media")
            .delete()
            .eq("id", oldMedia.id);
    }

    // /* STEP 3: resize */ resize before upload
    const resizedFile = await resizeImage(file, 400);

    const path = `artists/${artistId}/profile.webp`;

    /* STEP 4: upload */
    const { error } = await supabaseClient.storage
        .from(bucket)
        .upload(path, resizedFile, { upsert: true });

    if (error) {
        alert(error.message);
        return;
    }

    // get profile pic public url
    const { data: publicUrl } = supabaseClient.storage
        .from("artist-media")
        .getPublicUrl(path);

    /* STEP 5: save DB */
    await supabaseClient.from("artist_media").insert({
        user_id: artistId,
        media_url: publicUrl.publicUrl,
        media_type: "profile"
    });

    /* STEP 6: preview */
    const { data } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(path);

    preview.src = data.publicUrl;
    deleteBtn.classList.remove("hidden");
    currentProfilePath = path;

    // reset input so same file can be reselected later
    fileInput.value = "";
});

/* Delete image */
deleteBtn.addEventListener("click", async () => {
    if (!currentProfilePath) return;

    const {
        data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    /* remove storage */
    await supabaseClient.storage
        .from(bucket)
        .remove([currentProfilePath]);

    /* remove DB entry */
    await supabaseClient
        .from("artist_media")
        .delete()
        .eq("user_id", user.id)
        .eq("media_type", "profile");

    preview.src =
        "/assets/images/placeholders/profile-preview-placeholder.webp";

    deleteBtn.classList.add("hidden");
    currentProfilePath = null;
});

// /* ----------------------*/
//        Gallery Pics
// /* ----------------------*/


const galleryInput = document.getElementById("galleryImgInput");
const galleryUploadBtn = document.getElementById("uploadgalleryImgBtn");
const deleteBtns = document.querySelectorAll(".deleteGalleryBtn");

const placeholder =
    "/assets/images/placeholders/gallery-preview-placeholder.webp";

const MAX_SLOTS = 6;
const MIN_REQUIRED = 5;

let galleryState = new Array(MAX_SLOTS).fill(null); // each slot: { id, url, storagePath }

// find empty slot
function getEmptySlot() {
    return galleryState.findIndex(v => v === null);
};

// helper function
function updateGalleryHint() {
  const count = galleryState.filter(Boolean).length;
  const remaining = MIN_REQUIRED - count;

  const hint = document.getElementById("galleryUploadHint");

  if (count === 0) {
    hint.textContent = "Upload 5–6 gallery images.";
  } else if (remaining > 0) {
    hint.textContent =
      `Upload at least ${remaining} more gallery images.`;
  } else if (count < MAX_SLOTS) {
    hint.textContent =
      `You can upload ${MAX_SLOTS - count} more images (optional).`;
  } else {
    hint.textContent = "Maximum gallery images uploaded.";
  }
}

// preview update
function renderGallery() {
    galleryState.forEach((item, i) => {
        const img = document.getElementById(`galleryImg${i + 1}`);
        const btn = deleteBtns[i];

        if (item) {
            img.src = item.url;
            btn.classList.remove("hidden");
        } else {
            img.src = placeholder;
            btn.classList.add("hidden");
        }
    });
};

// load gallery on page load
async function loadGallery(artistId) {
    const { data, error } = await supabaseClient
        .from("artist_media")
        .select("*")
        .eq("user_id", artistId)
        .eq("media_type", "gallery")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Gallery load failed:", error);
        return;
    }

    galleryState.fill(null);

    if (!data || data.length === 0) {
        renderGallery();
        return;
    }

    data.slice(0, MAX_SLOTS).forEach((row, i) => {
        let storagePath = row.storage_path;

        // fallback if missing
        if (!storagePath && row.media_url) {
            const fileName = row.media_url.split("/").pop();
            storagePath = `gallery/${fileName}`;
        }

        galleryState[i] = {
            id: row.id,
            url: row.media_url,
            storagePath,
        };
    });

    renderGallery();
    updateGalleryHint();
}

/* Upload gallery images flow */
galleryUploadBtn.addEventListener("click", async () => {
    const file = galleryInput.files[0];
    if (!file) return alert("Select image first");

    const slot = getEmptySlot();
    if (slot === -1) return alert("Max 6 images allowed");

    // resize -> webp
    const resizedFile = await resizeImage(file, 600);

    const fileName = `${crypto.randomUUID()}.webp`;
    const storagePath = `gallery/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
        .from("artist-media")
        .upload(storagePath, resizedFile);

    if (uploadError) return alert(uploadError.message);

    const { data: publicUrl } = supabaseClient.storage
        .from("artist-media")
        .getPublicUrl(storagePath);

    const { data: row } = await supabaseClient
        .from("artist_media")
        .insert({
            user_id: artistId,
            media_url: publicUrl.publicUrl,
            media_type: "gallery",
        })
        .select()
        .maybeSingleingle();

    galleryState[slot] = {
        id: row.id,
        url: row.media_url,
        storagePath,
    };

    renderGallery();
    updateGalleryHint();

    // reset input so same file can be reselected later
    galleryInput.value = "";
});

/* Delete gallery image */
deleteBtns.forEach((btn, index) => {
    btn.addEventListener("click", async () => {
        const item = galleryState[index];
        console.log("Deleting:", item);
        if (!item) return;

        await supabaseClient.storage
            .from("artist-media")
            .remove([item.storagePath]);

        await supabaseClient
            .from("artist_media")
            .delete()
            .eq("id", item.id);

        galleryState[index] = null;
        renderGallery();
        updateGalleryHint();
    });
});

// --------------------------- //
// preview images from artist_media table (works even on refresh)
// ---------------------------- //

document.addEventListener("DOMContentLoaded", async () => {
    /* Wait for auth user */
    const {
        data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
        console.log("User not logged in yet");
        return;
    }

    const artistId = user.id;

    loadArtistMedia(artistId);

    loadGallery(artistId);
});

async function loadArtistMedia(artistId) {
    const { data, error } = await supabaseClient
        .from("artist_media")
        .select("*")
        .eq("user_id", artistId)
        .order("created_at");

    if (error || !data) {
        console.log("No media found");
        return;
    }

    // galleryState = new Array(6).fill(null);

    /* Profile */
    const profile = data.find(m => m.media_type === "profile");

    if (profile) {
        const { data: urlData } = supabaseClient.storage
            .from(bucket)
            .getPublicUrl(profile.media_url);

        document.getElementById("profileImagePreview").src =
            urlData.publicUrl;

        document
            .getElementById("deleteProfileBtn")
            .classList.remove("hidden");

        currentProfilePath = profile.media_url;
    }
}
