const supabase = window.supabaseClient;

const form = document.getElementById("resetPasswordForm")
const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");
const resetBtn = document.getElementById("resetBtn");

let submitting = false;

/* -------------------------
   PASSWORD RESET
-------------------------- */

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submitting) return;

  errorMsg.textContent = "";
  successMsg.textContent = "";

  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirm").value;

  if (password !== confirm) {
    errorMsg.textContent = "Passwords do not match";
    return;
  }

  submitting = true;
  resetBtn.disabled = true;
  resetBtn.textContent = "Updating password...";

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    errorMsg.textContent = "Invalid or expired reset link. Please request a new one.";
    resetBtn.disabled = false;
    resetBtn.textContent = "Reset Password";
    submitting = false;
    return;
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    errorMsg.textContent = error.message;
    resetBtn.disabled = false;
    resetBtn.textContent = "Reset Password";
    submitting = false;
    return;
  }

  // Success
  successMsg.textContent =
    "Password updated successfully. Redirecting to login...";

  setTimeout(() => {
    window.location.replace("./login.html");
  }, 1500);
});
