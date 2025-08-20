
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html'; // Security redirect if not logged in
        return;
    }

    // --- DOM Elements ---
    const policiesTableBody = document.querySelector('#policiesTable tbody');
    const policyModal = document.getElementById('policyModal');
    const policyForm = document.getElementById('policyForm');
    const modalTitle = document.getElementById('modalTitle');
    const policyMessage = document.getElementById('policyMessage');
    const adminList = document.getElementById('adminList');
    const addAdminForm = document.getElementById('addAdminForm');
    const adminMessage = document.getElementById('adminMessage');

    // --- Main Functions ---

    // Fetch and display all policies in the table
    async function loadPolicies() {
        const response = await fetch('/api/policies');
        const policies = await response.json();
        policiesTableBody.innerHTML = ''; // Clear table before loading
        policies.forEach(policy => {
            const row = `
                <tr>
                    <td>${policy.id}</td>
                    <td>${policy.name}</td>
                    <td>${policy.minAge} - ${policy.maxAge}</td>
                    <td>
                        <button class="btn btn-sm" data-id="${policy.id}">Edit</button>
                        <button class="btn btn-sm btn-danger" data-id="${policy.id}">Delete</button>
                    </td>
                </tr>
            `;
            policiesTableBody.insertAdjacentHTML('beforeend', row);
        });
    }

    // Fetch and display all admins in the list
    async function loadAdmins() {
        const response = await fetch('/api/admins', { headers: { 'Authorization': `Bearer ${token}` } });
        const admins = await response.json();
        adminList.innerHTML = '';
        admins.forEach(admin => {
            const li = `<li>${admin.username} (${admin.email})</li>`;
            adminList.insertAdjacentHTML('beforeend', li);
        });
    }

    // --- Event Handlers ---

    // Handle clicks on Edit and Delete buttons
    policiesTableBody.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.dataset.id;
        if (!id) return;

        if (target.textContent === 'Edit') {
            const response = await fetch('/api/policies');
            const policies = await response.json();
            const policy = policies.find(p => p.id == id);
            
            modalTitle.textContent = 'Edit Policy';
            document.getElementById('policyId').value = policy.id;
            document.getElementById('policyName').value = policy.name;
            document.getElementById('minAge').value = policy.minAge;
            document.getElementById('maxAge').value = policy.maxAge;
            document.getElementById('description').value = policy.description || '';
            document.getElementById('rateTable').value = policy.rateTable ? JSON.stringify(policy.rateTable, null, 2) : '';
            document.getElementById('bonus').value = policy.bonus || '';
            policyMessage.textContent = '';
            policyModal.style.display = 'block';
        }

        if (target.textContent === 'Delete') {
            if (!confirm('Are you sure you want to delete this policy? This cannot be undone.')) return;
            
            const response = await fetch(`/api/policies/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                loadPolicies();
            } else {
                alert('Failed to delete policy.');
            }
        }
    });

    // Handle policy form submission (for both adding and editing)
    policyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('policyId').value;
        const isEditing = !!id;
        let rateTableValue = null;
        try {
            const rateTableString = document.getElementById('rateTable').value;
            if (rateTableString.trim()) {
                rateTableValue = JSON.parse(rateTableString);
            }
        } catch (error) {
            policyMessage.textContent = 'Error: Invalid JSON format in Rate Table.';
            policyMessage.style.color = 'red';
            return;
        }

        const policyData = {
            name: document.getElementById('policyName').value,
            minAge: document.getElementById('minAge').value,
            maxAge: document.getElementById('maxAge').value,
            description: document.getElementById('description').value,
            rateTable: rateTableValue,
            bonus: document.getElementById('bonus').value
        };

        const url = isEditing ? `/api/policies/${id}` : '/api/policies';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(policyData)
        });
        
        const data = await response.json();
        policyMessage.textContent = data.message;
        if (response.ok) {
            policyMessage.style.color = 'green';
            loadPolicies();
            setTimeout(() => { policyModal.style.display = 'none'; }, 1500);
        } else {
            policyMessage.style.color = 'red';
        }
    });

    // Handle add admin form submission
    addAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const response = await fetch('/api/add-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                username: document.getElementById('adminUsername').value,
                email: document.getElementById('adminEmail').value,
                password: document.getElementById('adminPassword').value
            })
        });
        const data = await response.json();
        adminMessage.textContent = data.message;
        if (response.ok) {
            adminMessage.style.color = 'green';
            loadAdmins();
            addAdminForm.reset();
        } else {
            adminMessage.style.color = 'red';
        }
    });

    // Modal controls
    document.getElementById('showAddPolicyFormBtn').addEventListener('click', () => {
        modalTitle.textContent = 'Add New Policy';
        policyForm.reset();
        document.getElementById('policyId').value = '';
        policyMessage.textContent = '';
        policyModal.style.display = 'block';
    });
    document.querySelector('.close-modal').addEventListener('click', () => {
        policyModal.style.display = 'none';
    });
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    // Initial data load
    loadPolicies();
    loadAdmins();
});