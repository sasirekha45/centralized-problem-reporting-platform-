document.addEventListener("DOMContentLoaded", async function () {
    const currentPath = window.location.pathname;
    const page = currentPath.substring(currentPath.lastIndexOf("/") + 1);
    const API_URL = 'http://localhost:3000/api';

    // Helpers
    function getCurrentUser() { const raw = localStorage.getItem("currentUser"); return raw ? JSON.parse(raw) : null; }
    function setCurrentUser(user) { localStorage.setItem("currentUser", JSON.stringify(user)); }
    function logout() { localStorage.removeItem("currentUser"); window.location.href = "Home.html"; }

    async function getFreshData() {
        try { const res = await fetch(`${API_URL}/data`); return await res.json(); }
        catch (e) { return { residents: [], workers: [], requests: [], complaints: [], pendingResidents: [], pendingWorkers: [] }; }
    }

    document.getElementById("logout-btn")?.addEventListener("click", logout);

    // Router
    if (page === "index.html" || page === "" || page === "Login.html") initLoginPage();
    else if (page.includes("Supervisor")) initSupervisorConsole();
    else if (page.includes("Resident")) initResidentDashboard();
    else if (page.includes("Worker")) initWorkerPanel();

    // 1. LOGIN & REGISTER
    function initLoginPage() {
        document.getElementById("login-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: document.getElementById("username").value, password: document.getElementById("password").value })
            });
            const data = await res.json();
            if (data.success) {
                setCurrentUser({ id: data.user.id, name: data.user.full_name || data.user.name, role: data.role });
                window.location.href = data.role === "resident" ? "Resident-Dashboard.html" : (data.role === "worker" ? "Worker-Panel.html" : "Supervisor Console.html");
            } else alert(data.message);
        });

        document.getElementById("register-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                role: document.getElementById("reg-role").value,
                username: document.getElementById("reg-username").value,
                password: document.getElementById("reg-password").value,
                name: document.getElementById("reg-name").value,
                phone: document.getElementById("reg-phone").value,
                email: document.getElementById("reg-email").value,
                address: document.getElementById("reg-address").value
            };
            const res = await fetch(`${API_URL}/register`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            const d = await res.json();
            alert(d.message);
            if(d.success) document.getElementById("register-modal").style.display = "none";
        });
        document.getElementById("register-btn")?.addEventListener("click", () => document.getElementById("register-modal").style.display = "flex");
        document.getElementById("register-close-btn")?.addEventListener("click", () => document.getElementById("register-modal").style.display = "none");
    }

    // 2. RESIDENT DASHBOARD
    async function initResidentDashboard() {
        const user = getCurrentUser();
        if(!user) return window.location.href = "Login.html";
        document.getElementById("resident-name-header").textContent = user.name;
        
        let dbData = await getFreshData();
        let currentRateReq = null;

        // Create Request
        document.getElementById("create-request-btn")?.addEventListener("click", () => document.getElementById("req-modal").style.display = "flex");
        document.getElementById("req-close")?.addEventListener("click", () => document.getElementById("req-modal").style.display = "none");
        
        document.getElementById("req-submit")?.addEventListener("click", async () => {
            const type = document.getElementById("req-type").value;
            const desc = document.getElementById("req-desc").value;
            await fetch(`${API_URL}/request`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ residentId: user.id, type, description: desc })
            });
            alert("Request Submitted!");
            document.getElementById("req-modal").style.display = "none";
            renderMyRequests();
        });

        async function renderMyRequests() {
            dbData = await getFreshData();
            const list = document.getElementById("resident-requests");
            list.innerHTML = "";
            const myReqs = dbData.requests.filter(r => r.resident_id === user.id);
            
            if(myReqs.length === 0) list.innerHTML = "<p class='meta'>No requests yet.</p>";

            myReqs.forEach(r => {
                let statusColor = r.status === 'Completed' ? '#22c55e' : (r.status === 'Assigned' ? '#3b82f6' : '#f59e0b');
                
                // Find worker details if assigned
                let workerDetails = "";
                if(r.assigned_worker_id) {
                    const w = dbData.workers.find(x => x.id === r.assigned_worker_id);
                    if(w) workerDetails = `<div class="worker-box mt-2"><small>👷 Assigned: <strong>${w.full_name}</strong> (${w.phone})</small></div>`;
                }

                // Resident Action: Rate only if Completed
                let action = "";
                if (r.status === 'Completed') {
                    if (!r.rating) {
                        action = `<button class="btn small-btn rate-btn mt-2" data-id="${r.id}">Rate & Feedback</button>`;
                    } else {
                        action = `<div class="mt-2 text-success">Thanks for feedback! (${r.rating} ⭐)</div>`;
                    }
                } else if (r.status === 'Assigned') {
                    action = `<span class="meta text-active">Work in Progress...</span>`;
                } else {
                    action = `<span class="meta">Pending Assignment...</span>`;
                }

                list.innerHTML += `
                    <div class="card mb-2">
                        <div class="flex justify-between"><strong>${r.type}</strong><span style="color:${statusColor}">${r.status}</span></div>
                        <p class="meta">${r.description}</p>
                        ${workerDetails}
                        ${action}
                    </div>`;
            });

            document.querySelectorAll(".rate-btn").forEach(b => {
                b.onclick = () => { currentRateReq = b.dataset.id; document.getElementById("rate-modal").style.display = "flex"; };
            });
        }
        renderMyRequests();

        // Rating Submission
        document.querySelectorAll(".star").forEach(s => s.onclick = function() {
            document.querySelectorAll(".star").forEach(st => st.style.opacity = st.dataset.val <= this.dataset.val ? "1" : "0.3");
            document.getElementById("rate-val").value = this.dataset.val;
        });
        document.getElementById("rate-submit")?.addEventListener("click", async () => {
            const val = document.getElementById("rate-val").value;
            const fb = document.getElementById("rate-fb").value;
            await fetch(`${API_URL}/rate`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ requestId: currentRateReq, rating: val, feedback: fb }) });
            alert("Thank you!"); document.getElementById("rate-modal").style.display = "none"; renderMyRequests();
        });
        document.getElementById("rate-close")?.addEventListener("click", () => document.getElementById("rate-modal").style.display = "none");
    }

    // 3. WORKER PANEL
    async function initWorkerPanel() {
        const user = getCurrentUser();
        if(!user) return window.location.href = "Login.html";
        document.getElementById("worker-name-header").textContent = user.name;
        let dbData = await getFreshData();

        const renderTasks = () => {
            const list = document.getElementById("worker-tasks");
            list.innerHTML = "";
            const tasks = dbData.requests.filter(r => r.assigned_worker_id === user.id);
            if(tasks.length === 0) list.innerHTML = "<p>No tasks assigned.</p>";
            
            tasks.forEach(r => {
                const res = dbData.residents.find(x => x.id === r.resident_id);
                
                // Worker Action: Mark Done only if Assigned
                let actionBtn = "";
                if (r.status === 'Assigned') {
                    actionBtn = `<button class="btn small-btn done-btn" data-id="${r.id}" style="margin-top:10px;">✅ Mark Work Done</button>`;
                } else if (r.status === 'Completed') {
                    actionBtn = `<div class="chip text-success mt-2">Completed</div>`;
                }

                list.innerHTML += `
                    <div class="card mb-2">
                        <div class="flex justify-between"><h3>${r.type}</h3><span class="chip">${r.status}</span></div>
                        <p>${r.description}</p>
                        <p class="meta">📍 ${res ? res.address : 'Unknown Address'} | 📞 ${res ? res.phone : ''}</p>
                        ${actionBtn}
                    </div>`;
            });
            
            // Mark Done Event
            document.querySelectorAll(".done-btn").forEach(btn => {
                btn.onclick = async () => {
                    if(!confirm("Are you sure you finished this work?")) return;
                    const res = await fetch(`${API_URL}/work-complete`, {
                        method: 'POST', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ requestId: btn.dataset.id })
                    });
                    const d = await res.json();
                    if(d.success) { alert("Good job!"); dbData = await getFreshData(); renderTasks(); }
                };
            });
        };
        renderTasks();

        document.getElementById("complain-btn")?.addEventListener("click", () => document.getElementById("comp-modal").style.display = "flex");
        document.getElementById("comp-close")?.addEventListener("click", () => document.getElementById("comp-modal").style.display = "none");
        
        document.getElementById("comp-submit")?.addEventListener("click", async () => {
            const fd = new FormData();
            fd.append("workerId", user.id);
            fd.append("description", document.getElementById("comp-desc").value);
            const f = document.getElementById("comp-file").files[0];
            if(f) fd.append("attachment", f);
            
            await fetch(`${API_URL}/complaint`, { method: 'POST', body: fd });
            alert("Complaint Sent."); document.getElementById("comp-modal").style.display = "none";
        });
    }

    // 4. SUPERVISOR CONSOLE
    async function initSupervisorConsole() {
        const user = getCurrentUser();
        if(!user) return window.location.href = "Login.html";
        document.getElementById("supervisor-name").textContent = user.name;
        let dbData = await getFreshData();
        let assignReqId = null;

        const navs = [{id:"nav-dash",v:"view-dash"},{id:"nav-res",v:"view-res"},{id:"nav-work",v:"view-work"},{id:"nav-app",v:"view-app"}];
        navs.forEach(n => {
            document.getElementById(n.id)?.addEventListener("click", (e) => {
                e.preventDefault();
                document.querySelectorAll(".view-section").forEach(x => x.classList.remove("active-view"));
                document.getElementById(n.v).classList.add("active-view");
                document.querySelectorAll(".nav-link").forEach(x => x.classList.remove("active"));
                e.target.classList.add("active");
            });
        });

        const render = () => {
            // Residents Table
            document.querySelector("#residents-table tbody").innerHTML = dbData.residents.map(r => 
                `<tr><td>${r.full_name}</td><td>${r.phone}</td><td>${r.address}</td><td><button class="btn small-btn secondary del-user" data-id="${r.id}" data-role="resident">Remove</button></td></tr>`).join('');
            
            // Workers Table
            document.querySelector("#workers-table tbody").innerHTML = dbData.workers.map(w => 
                `<tr><td>${w.full_name}</td><td>${w.phone}</td><td>${w.performance_score || 0}</td><td><button class="btn small-btn secondary del-user" data-id="${w.id}" data-role="worker">Remove</button></td></tr>`).join('');

            // Requests Table (Dashboard)
            const tb = document.querySelector("#requests-table tbody");
            tb.innerHTML = "";
            dbData.requests.forEach(r => {
                const resName = dbData.residents.find(x => x.id === r.resident_id)?.full_name || "Unk";
                let workerCell = '<span class="meta">Unassigned</span>';
                let action = `<button class="btn small-btn assign-trigger" data-id="${r.id}">Assign</button>`;

                if(r.assigned_worker_id) {
                    const w = dbData.workers.find(x => x.id === r.assigned_worker_id);
                    workerCell = w ? `<b>${w.full_name}</b>` : 'Deleted Worker';
                    action = `<span class="chip">${r.status}</span>`;
                }

                // Show Rating & Feedback logic
                let feedbackHtml = '-';
                if (r.rating) {
                    feedbackHtml = `<div><span style="color:gold">⭐ ${r.rating}</span><br><small style="color:#aaa; font-style:italic;">"${r.feedback}"</small></div>`;
                }

                tb.innerHTML += `<tr><td>${resName}</td><td>${r.type}</td><td>${workerCell}</td><td>${action}</td><td>${feedbackHtml}</td></tr>`;
            });

            // Complaints
            const clist = document.getElementById("complaints-list");
            clist.innerHTML = "";
            dbData.complaints.forEach(c => {
                let att = c.attachment ? `<a href="http://localhost:3000/uploads/${c.attachment}" target="_blank">📎 View File</a>` : "";
                clist.innerHTML += `<div class="card mb-2" style="border-left:3px solid crimson"><div class="flex justify-between"><strong>${c.worker_name}</strong><small>${new Date(c.created_at).toLocaleDateString()}</small></div><p>${c.description}</p>${att}</div>`;
            });

            // Pending Approvals
            const apCon = document.getElementById("approvals-list");
            apCon.innerHTML = "";
            const pending = [...dbData.pendingResidents.map(x=>({...x,role:'resident'})), ...dbData.pendingWorkers.map(x=>({...x,role:'worker'}))];
            if(pending.length === 0) apCon.innerHTML = "<p>No pending approvals.</p>";
            pending.forEach(p => {
                apCon.innerHTML += `<div class="card mb-2 flex justify-between items-center"><div><b>${p.full_name}</b> <span class="chip">${p.role}</span><br><small>${p.email}</small></div><button class="btn small-btn approve-btn" data-id="${p.id}" data-role="${p.role}">Approve</button></div>`;
            });

            bindEvents();
        };

        const bindEvents = () => {
            document.querySelectorAll(".approve-btn").forEach(b => b.onclick = async () => {
                await fetch(`${API_URL}/approve`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: b.dataset.id, role: b.dataset.role }) });
                alert("Approved"); dbData = await getFreshData(); render();
            });
            document.querySelectorAll(".del-user").forEach(b => b.onclick = async () => {
                if(!confirm("Are you sure?")) return;
                const res = await fetch(`${API_URL}/delete-user`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: b.dataset.id, role: b.dataset.role }) });
                const d = await res.json();
                if(d.success) { alert("Removed"); dbData = await getFreshData(); render(); } else alert(d.message);
            });
            document.querySelectorAll(".assign-trigger").forEach(b => b.onclick = () => {
                assignReqId = b.dataset.id;
                const sel = document.getElementById("worker-select");
                sel.innerHTML = "<option value=''>Select Worker...</option>";
                dbData.workers.forEach(w => sel.innerHTML += `<option value="${w.id}">${w.full_name} (Score: ${w.performance_score})</option>`);
                document.getElementById("assign-modal").style.display = "flex";
            });
        };

        document.getElementById("confirm-assign")?.addEventListener("click", async () => {
            const wid = document.getElementById("worker-select").value;
            if(!wid) return alert("Select a worker");
            await fetch(`${API_URL}/assign`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ requestId: assignReqId, workerId: wid }) });
            alert("Assigned!"); document.getElementById("assign-modal").style.display = "none"; dbData = await getFreshData(); render();
        });
        document.getElementById("close-assign")?.addEventListener("click", () => document.getElementById("assign-modal").style.display = "none");

        render();
    }
});