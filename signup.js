const supabaseClient = window.supabaseClient;
const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");
const form = document.getElementById("signupForm");
const signupBtn = document.getElementById("signupBtn");
const googleBtn = document.getElementById("googleBtn");

let submitting = false;

// -------------------------
// HELPERS
// -------------------------
function resetSubmit() {
  submitting = false;
  signupBtn.disabled = false;
  signupBtn.textContent = "Create Account";
}

// -------------------------
// AUTH STATE LISTENER
// -------------------------
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event !== "SIGNED_IN" || !session) return;

  const verified = !!session.user.email_confirmed_at;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!verified || !profile) {
    window.location.replace("./basic-info.html");
  } else {
    window.location.replace("./profile-form.html");
  }
});

// -------------------------
// EMAIL SIGNUP
// -------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submitting) return;

  errorMsg.textContent = "";
  submitting = true;
  signupBtn.disabled = true;
  signupBtn.textContent = "Creating account...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirm-password").value;
  const termsAccepted = document.getElementById("terms").checked;

  if (!termsAccepted) {
    errorMsg.textContent = "You must accept Terms & Privacy Policy";
    return resetSubmit();
  }

  if (password !== confirm) {
    errorMsg.textContent = "Passwords do not match";
    return resetSubmit();
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${location.origin}/src/auth/basic-info.html`
    }
  });

  if (error) {
    // if any error
    errorMsg.textContent = error.message;
    return resetSubmit();
  }

  successMsg.textContent =
    "If an account exists for this email, a verification link has been sent. Please check your inbox.";

  form.reset();
  signupBtn.disabled = true;
  signupBtn.textContent = "Check your email";
});

// -------------------------
// GOOGLE OAUTH
// -------------------------
// googleBtn.addEventListener("click", async () => {
//   await supabaseClient.auth.signInWithOAuth({
//     provider: "google",
//     options: {
//       redirectTo: `${location.origin}/src/auth/basic-info.html`
//     }
//   });
// });
