/* ============================================================
   AEGIS BANK — Authentication (demo, client-side only)
   Customer credentials are sourced from the uploaded CSV
   (embedded as CUSTOMERS in js/customers-data.js).
   Admin credentials are fixed demo values — there is no admin
   CSV in the dataset provided.
   ============================================================ */

const ADMIN_ACCOUNTS = [
  { username: "admin", password: "Admin@123", name: "Abhishek Verma", role: "Super Admin" },
  { username: "admin@aegisbank.com", password: "Admin@123", name: "Abhishek Verma", role: "Super Admin" }
];

const SESSION_KEY = "aegis_session";

const AegisAuth = {
  saveSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },
  getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  },
  clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  },
  logout(redirectTo) {
    this.clearSession();
    window.location.href = redirectTo || "../login.html";
  },
  /** Redirect to login if no valid session for the required role exists. */
  guard(requiredRole, loginPath) {
    const s = this.getSession();
    if (!s || s.role !== requiredRole) {
      window.location.href = loginPath || "../login.html";
      return null;
    }
    return s;
  },
  findCustomer(login, password) {
    const needle = String(login || "").trim().toLowerCase();
    const match = (typeof CUSTOMERS !== "undefined" ? CUSTOMERS : []).find(c =>
      (c.username && c.username.toLowerCase() === needle) ||
      (c.customer_id && c.customer_id.toLowerCase() === needle) ||
      (c.email && c.email.toLowerCase() === needle)
    );
    if (!match) return { ok: false, reason: "notfound" };
    if (match.password !== password) return { ok: false, reason: "password" };
    return { ok: true, customer: match };
  },
  findAdmin(login, password) {
    const needle = String(login || "").trim().toLowerCase();
    const match = ADMIN_ACCOUNTS.find(a => a.username.toLowerCase() === needle);
    if (!match) return { ok: false, reason: "notfound" };
    if (match.password !== password) return { ok: false, reason: "password" };
    return { ok: true, admin: match };
  }
};

/* ---------------- Login page wiring ---------------- */
(function initLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return; // not on the login page

  const roleButtons = document.querySelectorAll(".role-switch button");
  const usernameInput = document.getElementById("username");
  const usernameLabel = document.getElementById("usernameLabel");
  const passwordInput = document.getElementById("password");
  const errorBox = document.getElementById("errorBox");
  const errorText = document.getElementById("errorText");
  const headingTitle = document.getElementById("heading-title");
  const headingSub = document.getElementById("heading-sub");
  const demoHint = document.getElementById("demoHint");
  const loginBtn = document.getElementById("loginBtn");
  const loginBtnText = document.getElementById("loginBtnText");
  const togglePw = document.getElementById("togglePw");

  let currentRole = "customer";

  const ROLE_COPY = {
    customer: {
      title: "Welcome back",
      sub: "Sign in to your customer portal to continue.",
      label: "Email / Username",
      placeholder: "you@example.com",
      hint: 'Demo dataset · try <b>sneha.kumar1@example.com</b> / <b>Demo@123</b>, or any customer email from the CSV with password <b>Demo@123</b>.'
    },
    admin: {
      title: "Admin sign in",
      sub: "Access the risk intelligence & administration console.",
      label: "Admin Username",
      placeholder: "admin",
      hint: 'Demo admin login · <b>admin</b> / <b>Admin@123</b> (no admin records exist in the uploaded CSVs, so this is a fixed demo credential).'
    }
  };

  function applyRole(role) {
    currentRole = role;
    roleButtons.forEach(b => {
      const active = b.dataset.role === role;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    const copy = ROLE_COPY[role];
    headingTitle.textContent = copy.title;
    headingSub.textContent = copy.sub;
    usernameLabel.textContent = copy.label;
    usernameInput.placeholder = copy.placeholder;
    demoHint.innerHTML = copy.hint;
    hideError();
    form.reset();
  }

  roleButtons.forEach(btn => {
    btn.addEventListener("click", () => applyRole(btn.dataset.role));
  });

  togglePw.addEventListener("click", () => {
    const isPw = passwordInput.type === "password";
    passwordInput.type = isPw ? "text" : "password";
  });

  function showError(msg) {
    errorText.textContent = msg;
    errorBox.classList.add("show");
  }
  function hideError() {
    errorBox.classList.remove("show");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hideError();
    const login = usernameInput.value;
    const pw = passwordInput.value;

    loginBtn.disabled = true;
    loginBtnText.textContent = "Signing in…";

    setTimeout(() => {
      if (currentRole === "customer") {
        const res = AegisAuth.findCustomer(login, pw);
        if (!res.ok) {
          loginBtn.disabled = false;
          loginBtnText.textContent = "Sign in";
          showError(res.reason === "notfound"
            ? "No customer found with that email/ID."
            : "Incorrect password. Please try again.");
          return;
        }
        AegisAuth.saveSession({ role: "customer", customer_id: res.customer.customer_id });
        window.location.href = "customer/dashboard.html";
      } else {
        const res = AegisAuth.findAdmin(login, pw);
        if (!res.ok) {
          loginBtn.disabled = false;
          loginBtnText.textContent = "Sign in";
          showError(res.reason === "notfound"
            ? "No admin account found with that username."
            : "Incorrect password. Please try again.");
          return;
        }
        AegisAuth.saveSession({ role: "admin", username: res.admin.username, name: res.admin.name });
        window.location.href = "admin/dashboard.html";
      }
    }, 450);
  });
})();
