const supabaseClient = window.supabaseClient;

const grid = document.getElementById("categoryGrid");
const form = document.getElementById("profileForm");
const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");

let artistId = null;
let saving = false;

/* -------------------------
   LOAD CATEGORIES UI
-------------------------- */
async function loadInterface() {
  grid.innerHTML = "";

  // get session user
  const { data: { session } } =
    await supabaseClient.auth.getSession();

  if (!session) {
    window.location.replace("./login.html");
    return;
  }

  artistId = session.user.id;

  // fetch categories
  const { data: allCats, error: catErr } =
    await supabaseClient.from("categories").select("*");

  if (catErr) {
    console.error(catErr);
    return;
  }

  // fetch artist categories
  const { data: artist } =
    await supabaseClient
      .from("artists")
      .select("category_ids")
      .eq("id", artistId)
      .maybeSingle();

  const selectedIds = artist?.category_ids || [];

  allCats.forEach(cat => {
    const isChecked = selectedIds.includes(cat.id);

    const wrapper = document.createElement("div");

    wrapper.innerHTML = `
      <input
        type="checkbox"
        id="cat-${cat.id}"
        value="${cat.id}"
        class="peer hidden"
        area-labelledby="label-${cat.id}"
        ${isChecked ? "checked" : ""}
      >

      <label for="cat-${cat.id}" id="label-${cat.id}"
        class="cursor-pointer flex items-center gap-3 px-6 py-1 rounded-full transition-all
        bg-[#4B4545] text-[#A59E9E] hover:outline-none hover:ring-2 hover:ring-[#7D27CE] capitalize
        peer-checked:bg-[#7D27CE] peer-checked:text-white">

        <span>${cat.name}</span>
      </label>
    `;

    grid.appendChild(wrapper);
  });
}

/* -------------------------
   LOAD CITIES UI
-------------------------- */
async function getCities() {
  errorMsg=""
  const { data, error } = await supabaseClient
    .from('cities') // table name
    .select('name') // Select the columns you need (e.g., id and name)

  if (error) {
    errorMsg.textContent = error.message)
    return []
  }
  return data
}

// Function to populate the select element
async function populateCitySelect() {
  const citySelect = document.getElementById('base-city-select');
  const cities = await getCities();

  cities.forEach(city => {
    const option = document.createElement('option')
    option.value = city.name // The value of the option (often an ID)
    option.textContent = city.name // The text displayed to the user
    citySelect.appendChild(option)
  })
}

// Call the function to populate when the page loads
populateCitySelect()



/* -------------------------
   SAVE SELECTION
-------------------------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (saving) return;

  errorMsg.textContent="";
  successMsg.textContent="";

  saving = true;

  const checkedInputs =
    document.querySelectorAll(".peer:checked");

  const updatedIds = Array.from(checkedInputs)
    .map(input => input.value);

  const { error } = await supabaseClient
    .from("artists")
    .update({ category_ids: updatedIds })
    .eq("id", artistId);

  saving = false;

  if (error) {
    errorMsg.textContent=error.message;
    return;
  }

  successMsg.textContent="Categories updated!";
  return;
});

loadInterface();
