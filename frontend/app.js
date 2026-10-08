let token = localStorage.getItem("internship_token");
let currentUser = null;

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`/api${path}`, { ...options, headers });
  let data = {};
  try { data = await response.json(); } catch {}

  if (!response.ok) {
    const error = new Error(data?.error?.message || "Request failed.");
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

function showNotice(message, type = "ok") {
  $("notice").innerHTML = `<div class="notice ${type}">${escapeHtml(message)}</div>`;
}

function forbiddenState(message = "You are not authorized to access this area.") {
  return `<div class="forbidden"><h2>403 — Not Authorized</h2><p>${escapeHtml(message)}</p><p class="muted">The server denied the request. This state is not based only on hidden frontend buttons.</p></div>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

async function login(email, password) {
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem("internship_token", token);
    renderShell();
    await loadAll();
  } catch (e) {
    showNotice(e.message, "error");
  }
}

function demoLogin(email) {
  login(email, "Password123!");
}

$("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  login($("email").value, $("password").value);
});

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem("internship_token");
  $("loginView").hidden = false;
  $("appView").hidden = true;
}

function renderShell() {
  $("loginView").hidden = true;
  $("appView").hidden = false;
  $("session").innerHTML = `
    <span>${escapeHtml(currentUser.name)}</span>
    <span class="badge">${escapeHtml(currentUser.role)}</span>
    <button style="width:auto;margin-left:8px" onclick="logout()">Logout</button>`;
  $("studentTab").hidden = currentUser.role !== "student";
  $("companyTab").hidden = currentUser.role !== "company";
  $("adminTab").hidden = currentUser.role !== "admin";
}

async function loadAll() {
  try {
    const me = await api("/auth/me");
    currentUser = me.user;
    renderShell();
    await loadInternships();

    if (currentUser.role === "student") await loadStudent();
    if (currentUser.role === "company") await loadCompany();
    if (currentUser.role === "admin") await loadAdmin();
  } catch (e) {
    if (e.status === 401) logout();
    else showNotice(e.message, "error");
  }
}

function showSection(id) {
  ["internships","student","company","admin"].forEach(x => {
    $(x).hidden = x !== id;
  });
}

async function loadInternships() {
  try {
    const data = await api("/internships");
    $("internships").innerHTML = `
      <div class="row"><h2>Active internships</h2>${currentUser.role === "company" || currentUser.role === "admin"
        ? `<button style="width:auto" onclick="showCreateForm()">Create internship</button>` : ""}</div>
      <div id="createForm"></div>
      ${data.internships.map(i => `
        <article class="card">
          <div class="row">
            <h3>${escapeHtml(i.title)}</h3>
            <span class="badge">${escapeHtml(i.company_name)}</span>
          </div>
          <p>${escapeHtml(i.description)}</p>
          <p class="muted">${escapeHtml(i.location)}</p>
          ${currentUser.role === "student" ? `<button onclick="applyTo(${i.id})">Apply</button>` : ""}
        </article>
      `).join("")}`;
  } catch (e) {
    $("internships").innerHTML = e.status === 403 ? forbiddenState(e.message) : `<div class="notice error">${escapeHtml(e.message)}</div>`;
  }
}

function showCreateForm() {
  $("createForm").innerHTML = `
    <div class="panel">
      <h3>New internship</h3>
      <form onsubmit="createInternship(event)">
        <input name="title" placeholder="Title" required>
        <textarea name="description" placeholder="Description" required></textarea>
        <input name="location" placeholder="Location" required>
        <button>Create</button>
      </form>
    </div>`;
}

async function createInternship(event) {
  event.preventDefault();
  const f = new FormData(event.target);
  try {
    await api("/internships", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(f))
    });
    showNotice("Internship created.");
    await loadInternships();
    await loadCompany();
  } catch (e) {
    showNotice(e.message, "error");
  }
}

async function applyTo(id) {
  try {
    await api(`/internships/${id}/apply`, { method: "POST" });
    showNotice("Application submitted.");
    await loadStudent();
  } catch (e) {
    showNotice(e.message, "error");
  }
}

async function loadStudent() {
  const section = $("student");
  try {
    const data = await api("/dashboard/student");
    section.innerHTML = `
      <h2>My Applications</h2>
      ${data.applications.length ? `<div class="card"><table>
        <tr><th>Internship</th><th>Company</th><th>Status</th><th>Action</th></tr>
        ${data.applications.map(a => `<tr>
          <td>${escapeHtml(a.title)}</td>
          <td>${escapeHtml(a.company_name)}</td>
          <td><span class="badge">${escapeHtml(a.status)}</span></td>
          <td>${a.status !== "withdrawn" ? `<button onclick="withdraw(${a.id})">Withdraw</button>` : ""}</td>
        </tr>`).join("")}
      </table></div>` : `<div class="card">No applications yet.</div>`}`;
  } catch (e) {
    section.innerHTML = e.status === 403 ? forbiddenState(e.message) : `<div class="notice error">${escapeHtml(e.message)}</div>`;
  }
}

async function withdraw(id) {
  try {
    await api(`/applications/${id}/withdraw`, { method: "POST" });
    showNotice("Application withdrawn.");
    await loadStudent();
  } catch (e) {
    showNotice(e.message, "error");
  }
}

async function loadCompany() {
  const section = $("company");
  try {
    const data = await api("/dashboard/company");
    section.innerHTML = `
      <h2>Company Dashboard</h2>
      <div class="card">
        <h3>My internships</h3>
        ${data.internships.map(i => `
          <div class="row" style="margin:12px 0">
            <span><b>${escapeHtml(i.title)}</b> — ${escapeHtml(i.location)}</span>
            <span class="actions">
              <button onclick="editInternship(${i.id}, '${escapeHtml(i.title)}')">Edit</button>
              <button class="danger" onclick="deleteInternship(${i.id})">Delete</button>
            </span>
          </div>`).join("")}
      </div>
      <div class="card">
        <h3>Applicants to my postings</h3>
        <table>
          <tr><th>Student</th><th>Internship</th><th>Status</th><th>Update</th></tr>
          ${data.applications.map(a => `<tr>
            <td>${escapeHtml(a.student_name)}<br><span class="muted">${escapeHtml(a.student_email)}</span></td>
            <td>${escapeHtml(a.title)}</td>
            <td>${escapeHtml(a.status)}</td>
            <td>
              <select onchange="updateStatus(${a.id}, this.value)">
                ${["pending","reviewing","accepted","rejected","withdrawn"].map(s => `<option ${s===a.status?"selected":""}>${s}</option>`).join("")}
              </select>
            </td>
          </tr>`).join("")}
        </table>
      </div>`;
  } catch (e) {
    section.innerHTML = e.status === 403 ? forbiddenState(e.message) : `<div class="notice error">${escapeHtml(e.message)}</div>`;
  }
}

async function editInternship(id, oldTitle) {
  const title = prompt("New title", oldTitle);
  if (!title) return;
  try {
    await api(`/internships/${id}`, { method: "PATCH", body: JSON.stringify({ title }) });
    showNotice("Internship updated.");
    await loadInternships();
    await loadCompany();
  } catch (e) {
    showNotice(e.status === 403 ? "403 — Not authorized to edit this internship." : e.message, "error");
  }
}

async function deleteInternship(id) {
  if (!confirm("Delete this internship?")) return;
  try {
    await api(`/internships/${id}`, { method: "DELETE" });
    showNotice("Internship deleted.");
    await loadInternships();
    await loadCompany();
  } catch (e) {
    showNotice(e.status === 403 ? "403 — Not authorized to delete this internship." : e.message, "error");
  }
}

async function updateStatus(id, status) {
  try {
    await api(`/applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    showNotice("Application status updated.");
  } catch (e) {
    showNotice(e.status === 403 ? "403 — Not authorized to update this application." : e.message, "error");
    await loadCompany();
  }
}

async function loadAdmin() {
  const section = $("admin");
  try {
    const [users, internships] = await Promise.all([
      api("/admin/users"),
      api("/admin/internships")
    ]);

    section.innerHTML = `
      <h2>Admin Panel</h2>
      <div class="card">
        <h3>Users</h3>
        <table>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Action</th></tr>
          ${users.users.map(u => `<tr>
            <td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td>
            <td>${escapeHtml(u.role)}</td><td>${u.is_active ? "Yes" : "No"}</td>
            <td><button onclick="toggleUser(${u.id}, ${u.is_active ? "false":"true"})">${u.is_active ? "Deactivate":"Activate"}</button></td>
          </tr>`).join("")}
        </table>
      </div>
      <div class="card">
        <h3>Internships</h3>
        <table>
          <tr><th>Title</th><th>Company</th><th>Active</th><th>Action</th></tr>
          ${internships.internships.map(i => `<tr>
            <td>${escapeHtml(i.title)}</td><td>${escapeHtml(i.company_name)}</td>
            <td>${i.is_active ? "Yes":"No"}</td>
            <td><button onclick="toggleInternship(${i.id}, ${i.is_active ? "false":"true"})">${i.is_active ? "Deactivate":"Activate"}</button></td>
          </tr>`).join("")}
        </table>
      </div>`;
  } catch (e) {
    section.innerHTML = e.status === 403 ? forbiddenState(e.message) : `<div class="notice error">${escapeHtml(e.message)}</div>`;
  }
}

async function toggleUser(id, active) {
  try {
    await api(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: active })
    });
    showNotice("User status changed.");
    await loadAdmin();
  } catch (e) { showNotice(e.message, "error"); }
}

async function toggleInternship(id, active) {
  try {
    await api(`/admin/internships/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: active })
    });
    showNotice("Internship status changed.");
    await loadAdmin();
    await loadInternships();
  } catch (e) { showNotice(e.message, "error"); }
}

if (token) {
  api("/auth/me").then(data => {
    currentUser = data.user;
    renderShell();
    loadAll();
  }).catch(() => logout());
}
