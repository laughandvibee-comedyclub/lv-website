const supabaseClient = window.supabaseClient;

const form = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");

/* -------------------------
   AUTH STATE LISTENER
-------------------------- */
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event !== "SIGNED_IN" || !session) return;

  const verified = !!session.user.email_confirmed_at;

  // Block unverified email users
  if (!verified) {
    errorMsg.textContent =
      "Please verify your email before continuing.";
    await supabaseClient.auth.signOut();
    loginBtn.disabled = false;
    return;
  }

  // Check if basic info (profile) exists
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("id", session.user.id)
    .maybeSingle();

  // Verified but no basic info → collect-basic-info
  if (!profile) {
    loginBtn.disabled = true;
    loginBtn.textContent = "Redirecting..."
    successMsg.textContent ="Redirecting to Basic Info page.";
    window.location.replace("./basic-info.html");
  } else {
    // Verified + basic info done → dashboard
    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in..."
    successMsg.textContent ="Signing in...";
    window.location.replace("./profile-form.html");
  }
});

/* -------------------------
   EMAIL + PASSWORD LOGIN
-------------------------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  //await supabase.auth.signOut();

  // Prevent repeat clicks
  if (loginBtn.disabled) return;

  errorMsg.textContent = "";
  successMsg.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (!email || !password) {
    errorMsg.textContent = "Please enter both email and password.";
    return;
  }

  // Lock UI
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in...";

  if (error) {
    errorMsg.textContent = error.message;
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
    return;
  }
});

/* -------------------------
   GOOGLE OAUTH LOGIN
-------------------------- */
// document.getElementById("google-btn").addEventListener("click", async () => {
//   await supabase.auth.signInWithOAuth({
//     provider: "google",
//     options: {
//       redirectTo: `${location.origin}/src/auth/basic-info.html`
//     }
//   });
// });

/* -------------------------
   FORGOT PASSWORD
-------------------------- */
resetPasswordBtn.addEventListener("click", async () => {
  errorMsg.textContent = "";
  successMsg.textContent = "";

  const email = document.getElementById("email").value.trim();

  if (!email) {
    errorMsg.textContent = "Please enter your email address to reset password";
    return;
  }

  resetPasswordBtn.disabled = true;

  await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/src/auth/reset-password.html`
  });

  // if reset password link emailed show this message
  successMsg.textContent =
    "If an account exists for this email, a password reset link has been sent. Please check your inbox.";

  resetPasswordBtn.disabled = false;
});
