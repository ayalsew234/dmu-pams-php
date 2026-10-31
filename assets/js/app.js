// Global State Variables
let assets = [];
let transfers = [];
let maintenance = [];
let procurementData = { vendors: [], purchaseOrders: [], receipts: [] };
let warehouseData = { assets: [], vouchers: [], custodians: [] };
let custodianData = { assets: [], incidents: [] };
let auditorData = {
    overview: {},
    valuationByCampus: [],
    valuationByDepartment: [],
    receiptAssetReconciliation: [],
    invoiceDiscrepancies: [],
    openIncidents: [],
    inspections: [],
    latestPhysicalCount: null
};
let disposalCommitteeCases = [];
let currentTagAssetId = '';
let physicalCountSession = null;
let physicalCountLoadError = '';
let currentUser = null;
let csrfToken = '';
let authenticationMode = 'login';
let gateScanner = null;
let gateScanInProgress = false;
let auditScanner = null;
let auditScanInProgress = false;
let warehouseScanner = null;
let warehouseScanInProgress = false;
let lastWarehouseScannedText = '';
let lastWarehouseScanAt = 0;
let campusChartInstance = null;
let conditionChartInstance = null;

// Language system — translations loaded from assets/js/lang/*.js
window.PAMS_LANG = window.PAMS_LANG || {};

// Only locales with translation files are available in the selectors.
const SUPPORTED_LANGS = ['en', 'am', 'om', 'so', 'ti', 'gz', 'ar', 'bn', 'fr'];

let selectedLanguage = 'en';

function translateText(value) {
    if (selectedLanguage === 'en') return value;
    const map = window.PAMS_LANG[selectedLanguage];
    if (map && map[value]) return map[value];
    return value;
}

const originalTextNodes = new WeakMap();
const originalAttributes = new WeakMap();

function translateElement(element) {
    if (element.nodeType === Node.TEXT_NODE) {
        if (!originalTextNodes.has(element)) originalTextNodes.set(element, element.nodeValue);
        const original = originalTextNodes.get(element);
        const trimmed = original.trim();
        if (!trimmed) return;
        const translated = translateText(trimmed);
        const start = original.indexOf(trimmed);
        element.nodeValue = `${original.slice(0, start)}${translated}${original.slice(start + trimmed.length)}`;
        return;
    }
    if (element.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(translateElement);
    const elements = [element, ...element.querySelectorAll('*')];
    elements.forEach(child => ['aria-label', 'placeholder', 'title'].forEach(attr => {
        const current = child.getAttribute(attr);
        if (current === null) return;
        let originals = originalAttributes.get(child);
        if (!originals) {
            originals = new Map();
            originalAttributes.set(child, originals);
        }
        if (!originals.has(attr)) originals.set(attr, current);
        child.setAttribute(attr, translateText(originals.get(attr)));
    }));
}
function setLanguage(language) {
    selectedLanguage = SUPPORTED_LANGS.includes(language) ? language : 'en';
    document.documentElement.lang = selectedLanguage;
    document.documentElement.dir = selectedLanguage === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('pams-language', selectedLanguage);
    document.querySelectorAll('.language-selector').forEach(sel => { sel.value = selectedLanguage; });
    translateElement(document.body);
}

function initializeLanguage() {
    const saved = localStorage.getItem('pams-language');
    selectedLanguage = SUPPORTED_LANGS.includes(saved) ? saved : 'en';
    document.querySelectorAll('.language-selector').forEach(sel => {
        sel.value = selectedLanguage;
        sel.addEventListener('change', () => setLanguage(sel.value));
    });
    setLanguage(selectedLanguage);
    const observer = new MutationObserver(records => {
        records.forEach(record => record.addedNodes.forEach(translateElement));
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    initializeLanguage();
    updateBrightnessIcon();
    initializeAuthentication();
});

// Toast Helper
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

async function requestJson(url, options = {}) {
    const requestOptions = { ...options, headers: { ...(options.headers || {}) } };
    if ((requestOptions.method || 'GET').toUpperCase() !== 'GET' && csrfToken) {
        requestOptions.headers['X-CSRF-Token'] = csrfToken;
    }
    const response = await fetch(url, requestOptions);
    let result;
    try {
        result = await response.json();
    } catch (error) {
        throw new Error('The server returned an unreadable response.');
    }
    if (!response.ok || !result.success) {
        throw new Error(result.error || `Request failed (${response.status}).`);
    }
    return result;
}

    const roleNames = {
        system_admin: 'System Administrator',
        property_admin: 'Property Admin / Stock Officer',
        procurement_officer: 'Procurement & Purchasing Officer',
        storekeeper: 'Storekeeper / Warehouse Custodian',
        department_head: 'Department Head / Dean',
        asset_custodian: 'End-User / Faculty / Staff',
        internal_auditor: 'Internal Auditor & Finance Officer',
        disposal_committee: 'Asset Disposal Committee Member',
        technician: 'Maintenance / IT Technician',
        gate_security: 'Gate Security Officer'
    };

    async function initializeAuthentication() {
        try {
            const response = await requestJson('api/auth.php?action=status');
            csrfToken = response.data.csrfToken;
            if (response.data.setupRequired) {
                setAuthenticationMode('setup');
                return;
            }
            if (!response.data.user) {
                setAuthenticationMode('login');
                return;
            }
            await enterApplication(response.data.user);
        } catch (err) {
            showAuthenticationError(`Authentication service is unavailable: ${err.message}`);
        }
    }

    function setAuthenticationMode(mode) {
        authenticationMode = mode;
        const setup = mode === 'setup';
        document.getElementById('authHeading').textContent = setup ? 'Create the first administrator' : 'Sign in to PAMS';
        document.getElementById('authDescription').textContent = setup
            ? 'Initial setup is open because no user accounts exist. This creates the System Administrator account.'
            : 'Use your assigned DMU account.';
        document.getElementById('authNameField').classList.toggle('hidden', !setup);
        document.getElementById('authFullName').required = setup;
        document.getElementById('authPassword').autocomplete = setup ? 'new-password' : 'current-password';
        document.getElementById('authPassword').minLength = setup ? 12 : 0;
        document.getElementById('authPasswordHint').classList.toggle('hidden', !setup);
        document.getElementById('authSubmit').textContent = setup ? 'Create Administrator Account' : 'Sign in';
    }

    function showAuthenticationError(message) {
        const error = document.getElementById('authError');
        error.textContent = message;
        error.classList.remove('hidden');
    }

    async function submitAuthentication(event) {
        event.preventDefault();
        const form = event.target;
        const submitButton = document.getElementById('authSubmit');
        const error = document.getElementById('authError');
        error.classList.add('hidden');
        submitButton.disabled = true;
        const payload = {
            username: form.elements.username.value.trim(),
            password: form.elements.password.value
        };
        if (authenticationMode === 'setup') payload.fullName = form.elements.fullName.value.trim();
        try {
            const action = authenticationMode === 'setup' ? 'setup' : 'login';
            await requestJson(`api/auth.php?action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const response = await requestJson('api/auth.php?action=status');
            csrfToken = response.data.csrfToken;
            if (!response.data.user) throw new Error('Sign in did not establish an account session.');
            await enterApplication(response.data.user);
        } catch (err) {
            showAuthenticationError(err.message);
        } finally {
            submitButton.disabled = false;
        }
    }

    async function enterApplication(user) {
        currentUser = user;
        document.getElementById('authPanel').classList.add('hidden');
        ['appHeader', 'appNav', 'appMain', 'appFooter'].forEach(id => {
            document.getElementById(id).classList.remove('hidden');
        });
        document.getElementById('currentUserName').textContent = user.full_name;
        document.getElementById('currentUserRole').textContent = roleNames[user.role] || user.role;
        document.getElementById('userBadge').textContent = (roleNames[user.role] || user.role)
            .split(/[ /]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0])
            .join('')
            .toUpperCase();
        applyRoleAccess();
        await loadAllData();
    }

    function applyRoleAccess() {
        const role = currentUser.role;
        const access = {
            system_admin: ['dashboard', 'procurement', 'warehouse', 'registry', 'transfers', 'maintenance', 'disposal', 'audit', 'reports', 'users', 'audit-logs'],
            property_admin: ['dashboard', 'procurement', 'warehouse', 'registry', 'transfers', 'maintenance', 'disposal', 'audit', 'reports', 'audit-logs'],
            internal_auditor: ['dashboard', 'registry', 'audit', 'compliance', 'reports', 'audit-logs'],
            disposal_committee: ['disposal-committee'],
            procurement_officer: ['procurement'],
            storekeeper: ['warehouse'],
            asset_custodian: ['my-assets'],
            department_head: ['registry', 'transfers', 'maintenance'],
            technician: ['registry', 'maintenance'],
            gate_security: ['transfers']
        };
        const allowedTabs = access[role] || [];
        document.querySelectorAll('.tab-content').forEach(section => section.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(button => button.classList.add('hidden'));
        allowedTabs.forEach(tab => {
            document.getElementById(`tab-${tab}`).classList.remove('hidden');
            document.getElementById(`nav-${tab}`).classList.remove('hidden');
        });

        const firstTab = allowedTabs[0];
        if (firstTab) switchTab(firstTab);
        document.getElementById('roleOverview').classList.toggle('hidden', role !== 'system_admin');

        const canManageAssets = ['system_admin', 'property_admin', 'department_head'].includes(role);
        const canLogMaintenance = ['system_admin', 'property_admin', 'department_head', 'asset_custodian', 'technician'].includes(role);
        const canCreateTransfers = ['system_admin', 'property_admin', 'department_head'].includes(role);
        ['dashboardAddAssetButton', 'registryAddAssetButton'].forEach(id => {
            document.getElementById(id).classList.toggle('hidden', !canManageAssets);
        });
        ['dashboardTransferButton', 'newTransferButton'].forEach(id => {
            document.getElementById(id).classList.toggle('hidden', !canCreateTransfers);
        });
        ['dashboardMaintenanceButton', 'maintenanceLogButton'].forEach(id => {
            document.getElementById(id).classList.toggle('hidden', !canLogMaintenance);
        });
        document.getElementById('gateScannerPanel').classList.toggle('hidden', !['system_admin', 'property_admin', 'gate_security'].includes(role));
        document.getElementById('transfersTable').classList.toggle('hidden', role === 'gate_security');
        document.getElementById('nav-users').classList.toggle('hidden', role !== 'system_admin');
        document.getElementById('nav-audit-logs').classList.toggle('hidden', !['system_admin', 'property_admin', 'internal_auditor'].includes(role));
        document.getElementById('maintenanceAdminFields').classList.toggle('hidden', role === 'asset_custodian');
        const departmentInput = document.getElementById('new-department');
        departmentInput.readOnly = role === 'department_head';
        if (role === 'department_head') departmentInput.value = currentUser.department || '';
        departmentInput.placeholder = role === 'department_head' ? 'Assigned department' : 'e.g. Computer Science';
    }

    async function signOut() {
        try {
            await requestJson('api/auth.php?action=logout', { method: 'POST' });
            window.location.reload();
        } catch (err) {
            console.error('Sign out failed:', err);
            showToast(`Could not sign out: ${err.message}`);
        }
    }

    function toggleUserDepartmentField(roleSelect) {
        const formId = roleSelect.getAttribute('form');
        const department = formId
            ? document.querySelector(`#tab-users input[name="department"][form="${formId}"]`)
            : document.querySelector('#tab-users input[name="department"]');
        if (!department) return;
        department.required = ['department_head', 'asset_custodian'].includes(roleSelect.value);
    }

    async function loadUsers() {
        const response = await requestJson('api/auth.php?action=users');
        const tbody = document.getElementById('usersTableBody');
        const roleOptions = Object.entries(roleNames).map(([value, label]) => ({ value, label }));
        tbody.innerHTML = response.data.map(user => {
            const formId = `user-form-${Number(user.id)}`;
            const options = roleOptions.map(role => `
                <option value="${role.value}" ${user.role === role.value ? 'selected' : ''}>${escapeHtml(role.label)}</option>
            `).join('');
            return `
            <tr>
                <td class="p-3"><input form="${formId}" name="fullName" required value="${escapeHtml(user.full_name)}" class="w-44 p-2 rounded border dark:bg-slate-900 dark:border-slate-600"></td>
                <td class="p-3">${escapeHtml(user.username)}</td>
                <td class="p-3"><select form="${formId}" name="role" onchange="toggleUserDepartmentField(this)" class="w-52 p-2 rounded border dark:bg-slate-900 dark:border-slate-600" ${Number(user.id) === Number(currentUser.id) ? 'disabled' : ''}>${options}</select></td>
                <td class="p-3"><input form="${formId}" name="department" value="${escapeHtml(user.department || '')}" placeholder="Department" class="w-40 p-2 rounded border dark:bg-slate-900 dark:border-slate-600"></td>
                <td class="p-3">${user.is_active ? 'Active' : 'Disabled'}</td>
                <td class="p-3 space-y-2">
                    <form id="${formId}" onsubmit="updateUserAccount(event, ${Number(user.id)})"></form>
                    <input form="${formId}" name="password" type="password" minlength="12" placeholder="New password (optional)" class="w-48 p-2 rounded border dark:bg-slate-900 dark:border-slate-600">
                    <button form="${formId}" type="submit" class="px-2 py-1 rounded bg-indigo-900 text-white">Save</button>
                    ${Number(user.id) === Number(currentUser.id) ? '<span class="text-xs text-slate-500">Current account</span>' : `<button onclick="setUserActive(${Number(user.id)}, ${user.is_active ? 'false' : 'true'})" class="px-2 py-1 rounded ${user.is_active ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">${user.is_active ? 'Disable' : 'Enable'}</button>`}
                </td>
            </tr>
        `}).join('');
        response.data.forEach(user => {
            const select = document.querySelector(`#tab-users select[name="role"][form="user-form-${Number(user.id)}"]`);
            if (select) toggleUserDepartmentField(select);
        });
    }

    async function updateUserAccount(event, userId) {
        event.preventDefault();
        const form = event.target;
        const submit = document.querySelector(`button[form="${form.id}"][type="submit"]`);
        submit.disabled = true;
        try {
            const result = await requestJson('api/auth.php?action=user-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    fullName: form.elements.fullName.value,
                    role: currentUser.id === userId ? 'system_admin' : document.querySelector(`select[form="${form.id}"]`).value,
                    department: document.querySelector(`input[name="department"][form="${form.id}"]`).value,
                    password: document.querySelector(`input[name="password"][form="${form.id}"]`).value
                })
            });
            showToast(result.message);
            await loadUsers();
            if (Number(userId) === Number(currentUser.id)) {
                await initializeAuthentication();
            }
        } catch (err) {
            showToast(`Could not update account: ${err.message}`);
        } finally {
            submit.disabled = false;
        }
    }

    async function createUserAccount(event) {
        event.preventDefault();
        const form = event.target;
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = true;
        try {
            const result = await requestJson('api/auth.php?action=users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: form.elements.fullName.value,
                    username: form.elements.username.value,
                    password: form.elements.password.value,
                    role: form.elements.role.value,
                    department: form.elements.department.value
                })
            });
            showToast(result.message);
            form.reset();
            toggleUserDepartmentField(form.elements.role);
            await loadUsers();
        } catch (err) {
            showToast(`Could not create user: ${err.message}`);
        } finally {
            submit.disabled = false;
        }
    }

    async function setUserActive(userId, isActive) {
        try {
            const result = await requestJson('api/auth.php?action=user-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isActive })
            });
            showToast(result.message);
            await loadUsers();
        } catch (err) {
            showToast(`Could not update account: ${err.message}`);
        }
    }

    async function loadAuditLogs() {
        const response = await requestJson('api/audit-logs.php');
        document.getElementById('auditLogsTableBody').innerHTML = response.data.map(log => `
            <tr>
                <td class="p-3 whitespace-nowrap">${escapeHtml(log.created_at)}</td>
                <td class="p-3">${escapeHtml(log.full_name || 'System')} (${escapeHtml(log.username || '—')})</td>
                <td class="p-3 font-mono">${escapeHtml(log.action)}</td>
                <td class="p-3">${escapeHtml(log.details || '')}</td>
            </tr>
        `).join('');
    }
// Dark Mode Toggle
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    updateBrightnessIcon();
}

function updateBrightnessIcon() {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const moonIcon = document.getElementById('brightnessMoonIcon');
    const sunIcon = document.getElementById('brightnessSunIcon');
    const toggle = document.getElementById('brightnessToggle');
    if (!moonIcon || !sunIcon || !toggle) return;

    moonIcon.classList.toggle('hidden', isDarkMode);
    sunIcon.classList.toggle('hidden', !isDarkMode);
    toggle.classList.toggle('bg-indigo-900/60', isDarkMode);
    toggle.classList.toggle('hover:bg-indigo-800', isDarkMode);
    toggle.classList.toggle('text-white', isDarkMode);
    toggle.classList.toggle('border-indigo-700', isDarkMode);
    toggle.classList.toggle('bg-white', !isDarkMode);
    toggle.classList.toggle('hover:bg-slate-100', !isDarkMode);
    toggle.classList.toggle('text-black', !isDarkMode);
    toggle.classList.toggle('border-white', !isDarkMode);
    const label = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
    toggle.title = label;
    toggle.setAttribute('aria-label', label);
}

// Modal Handlers
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    if (id === 'transferModal' || id === 'maintenanceModal') {
        populateAssetSelects();
    }
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function printContent(target) {
    document.body.dataset.printTarget = target;
    window.addEventListener('afterprint', () => {
        delete document.body.dataset.printTarget;
    }, { once: true });
    window.print();
}

function printMasterLedger() {
    const body = document.getElementById('printLedgerBody');
    body.innerHTML = assets.map(asset => `
        <tr>
            <td>${escapeHtml(asset.id)}</td>
            <td>${escapeHtml(asset.name)}</td>
            <td>${escapeHtml(asset.category)}</td>
            <td>${escapeHtml(asset.campus)}</td>
            <td>${escapeHtml(asset.department)}</td>
            <td>${escapeHtml(asset.building)} / ${escapeHtml(asset.room)}</td>
            <td>${escapeHtml(asset.custodian)}</td>
            <td>${parseFloat(asset.cost).toLocaleString()}</td>
            <td>${escapeHtml(asset.condition)}</td>
            <td>${escapeHtml(asset.status)}</td>
        </tr>
    `).join('');
    document.getElementById('printLedgerDate').textContent = new Date().toLocaleDateString();
    printContent('ledger');
}

function printClearanceForm() {
    document.getElementById('clearanceDate').textContent = new Date().toLocaleDateString();
    printContent('clearance');
}

// Tab Navigation Controller
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('border-indigo-600', 'text-indigo-600', 'dark:text-amber-400', 'dark:border-amber-400');
        btn.classList.add('border-transparent', 'text-slate-600');
    });

    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    const activeNav = document.getElementById(`nav-${tabId}`);
    if (activeNav) {
        activeNav.classList.add('border-indigo-600', 'text-indigo-600', 'dark:text-amber-400', 'dark:border-amber-400');
        activeNav.classList.remove('border-transparent', 'text-slate-600');
    }
}

// Fetch Data from PHP APIs
async function loadAllData() {
    try {
        const role = currentUser.role;
        const requests = [];
        if (['system_admin', 'property_admin', 'department_head', 'internal_auditor', 'technician'].includes(role)) {
            requests.push(requestJson('api/assets.php').then(result => { assets = result.data; }));
        } else if (role === 'asset_custodian') {
            requests.push(requestJson('api/custodian.php').then(result => {
                custodianData = result.data;
                assets = custodianData.assets;
            }));
        } else {
            assets = [];
        }
        if (role !== 'asset_custodian') custodianData = { assets: [], incidents: [] };
        if (['system_admin', 'property_admin', 'department_head'].includes(role)) {
            requests.push(requestJson('api/transfers.php').then(result => { transfers = result.data; }));
        } else {
            transfers = [];
        }
        if (['system_admin', 'property_admin', 'department_head', 'asset_custodian', 'technician'].includes(role)) {
            requests.push(requestJson('api/maintenance.php').then(result => { maintenance = result.data; }));
        } else {
            maintenance = [];
        }
        if (['system_admin', 'property_admin', 'procurement_officer'].includes(role)) {
            requests.push(requestJson('api/procurement.php').then(result => {
                procurementData = result.data;
                renderProcurement();
            }));
        } else {
            procurementData = { vendors: [], purchaseOrders: [], receipts: [] };
        }
        if (['system_admin', 'property_admin', 'storekeeper'].includes(role)) {
            requests.push(requestJson('api/warehouse.php').then(result => {
                warehouseData = result.data;
                renderWarehouse();
            }));
        } else {
            warehouseData = { assets: [], vouchers: [], custodians: [] };
        }
        if (role === 'internal_auditor') {
            requests.push(requestJson('api/auditor.php').then(result => { auditorData = result.data; }));
        } else {
            auditorData = {
                overview: {},
                valuationByCampus: [],
                valuationByDepartment: [],
                receiptAssetReconciliation: [],
                invoiceDiscrepancies: [],
                openIncidents: [],
                inspections: [],
                latestPhysicalCount: null
            };
        }
        if (role === 'disposal_committee') {
            requests.push(requestJson('api/disposal-committee.php').then(result => {
                disposalCommitteeCases = result.data;
            }));
        } else {
            disposalCommitteeCases = [];
        }
        await Promise.all(requests);

        if (['system_admin', 'property_admin', 'internal_auditor'].includes(role)) renderDashboard();
        renderAssetsTable();
        renderTransfersTable();
        renderMaintenanceGrid();
        renderMaintenanceGrid('custodianMaintenanceGrid');
        renderCustodianWorkspace();
        if (role === 'internal_auditor') renderAuditorWorkspace();
        renderDisposalTable();
        if (role === 'disposal_committee') renderDisposalCommitteeCases();
        if (!['system_admin', 'property_admin', 'procurement_officer'].includes(role)) {
            renderProcurement();
        }
        if (!['system_admin', 'property_admin', 'storekeeper'].includes(role)) {
            renderWarehouse();
        }
    } catch (err) {
        console.error('Failed to load PAMS data:', err);
        showToast(`Could not load data: ${err.message}`);
        return;
    }

    if (['system_admin', 'property_admin', 'internal_auditor'].includes(currentUser.role)) {
        try {
            const resAudit = await requestJson('api/physical-count.php');
            physicalCountSession = resAudit.data;
            physicalCountLoadError = '';
        } catch (err) {
            physicalCountSession = null;
            physicalCountLoadError = `Physical count unavailable: ${err.message}`;
            console.error('Failed to load physical count session:', err);
            showToast(`Other data loaded, but physical count could not load: ${err.message}`);
        }
        renderAuditSection();
    }

    if (currentUser.role === 'system_admin') {
        try {
            await loadUsers();
        } catch (err) {
            console.error('Failed to load user accounts:', err);
            showToast(`Could not load user accounts: ${err.message}`);
        }
    }
    if (['system_admin', 'property_admin', 'internal_auditor'].includes(currentUser.role)) {
        try {
            await loadAuditLogs();
        } catch (err) {
            console.error('Failed to load audit logs:', err);
            showToast(`Could not load audit logs: ${err.message}`);
        }
    }
}

function renderProcurement() {
    const vendorSelect = document.getElementById('procurementVendorSelect');
    const orderSelect = document.getElementById('receiptPurchaseOrderSelect');
    const selectedVendor = vendorSelect.value;
    const selectedOrder = orderSelect.value;

    vendorSelect.innerHTML = '<option value="">Select supplier</option>' + procurementData.vendors.map(vendor =>
        `<option value="${Number(vendor.id)}">${escapeHtml(vendor.name)}</option>`
    ).join('');
    vendorSelect.value = selectedVendor;

    const outstandingOrders = procurementData.purchaseOrders.filter(order =>
        order.status !== 'Received' && order.status !== 'Cancelled'
    );
    orderSelect.innerHTML = '<option value="">Select an outstanding order</option>' + outstandingOrders.map(order => {
        const remaining = Number(order.quantity) - Number(order.received_quantity);
        return `<option value="${escapeHtml(order.id)}">${escapeHtml(order.id)} — ${escapeHtml(order.item_name)} (${remaining} remaining)</option>`;
    }).join('');
    orderSelect.value = selectedOrder;
    updateReceiptQuantityLimit();

    document.getElementById('purchaseOrdersTableBody').innerHTML = procurementData.purchaseOrders.length
        ? procurementData.purchaseOrders.map(order => `
            <tr>
                <td class="p-3 font-medium">${escapeHtml(order.id)}</td>
                <td class="p-3">${escapeHtml(order.vendor_name)}</td>
                <td class="p-3">${escapeHtml(order.item_name)}<span class="block text-slate-500">${escapeHtml(order.campus)} / ${escapeHtml(order.department)}</span></td>
                <td class="p-3">${Number(order.received_quantity)} / ${Number(order.quantity)}</td>
                <td class="p-3">${Number(order.unit_cost).toLocaleString()}</td>
                <td class="p-3">${escapeHtml(order.status)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="6" class="p-4 text-center text-slate-500">No purchase orders yet.</td></tr>';

    document.getElementById('goodsReceiptsTableBody').innerHTML = procurementData.receipts.length
        ? procurementData.receipts.map(receipt => {
            const difference = Number(receipt.invoice_difference || 0);
            const invoiceAction = receipt.invoice_status === 'Matched'
                ? '<span class="text-emerald-700 font-medium">Matched</span>'
                : `<form onsubmit="matchProcurementInvoice(event, '${escapeHtml(receipt.id)}')" class="flex min-w-64 gap-1">
                    <input name="invoiceNumber" required value="${escapeHtml(receipt.invoice_number || '')}" placeholder="Invoice #" class="w-24 min-w-0 p-1 rounded border dark:bg-slate-900 dark:border-slate-600">
                    <input name="invoiceAmount" required type="number" min="0" step="0.01" value="${receipt.invoice_amount === null ? '' : escapeHtml(receipt.invoice_amount)}" placeholder="Amount" class="w-24 min-w-0 p-1 rounded border dark:bg-slate-900 dark:border-slate-600">
                    <button type="submit" class="rounded bg-indigo-900 px-2 py-1 text-white">Match</button>
                </form>`;
            return `<tr>
                <td class="p-3 font-medium">${escapeHtml(receipt.id)}</td>
                <td class="p-3">${escapeHtml(receipt.purchase_order_id)}<span class="block text-slate-500">${escapeHtml(receipt.vendor_name)}</span></td>
                <td class="p-3">${escapeHtml(receipt.item_name)} × ${Number(receipt.quantity_received)}</td>
                <td class="p-3">${escapeHtml(receipt.invoice_number || 'Not entered')}</td>
                <td class="p-3">${receipt.invoice_amount === null ? '—' : Number(receipt.invoice_amount).toLocaleString()}</td>
                <td class="p-3">${escapeHtml(receipt.invoice_status)}${receipt.invoice_status === 'Discrepant' ? `<span class="block text-rose-600">${difference > 0 ? '+' : ''}${difference.toLocaleString()} ETB</span>` : ''}</td>
                <td class="p-3">${invoiceAction}</td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="7" class="p-4 text-center text-slate-500">No goods have been received yet.</td></tr>';
}

function updateReceiptQuantityLimit() {
    const order = procurementData.purchaseOrders.find(item =>
        item.id === document.getElementById('receiptPurchaseOrderSelect').value
    );
    const quantityInput = document.querySelector('#tab-procurement form[onsubmit="recordGoodsReceipt(event)"] [name="quantityReceived"]');
    if (!quantityInput) return;
    const remaining = order ? Number(order.quantity) - Number(order.received_quantity) : 0;
    quantityInput.max = remaining || '';
    quantityInput.placeholder = order ? `Quantity received (up to ${remaining})` : 'Quantity received';
}

function renderWarehouse() {
    const assetsBody = document.getElementById('warehouseAssetsTableBody');
    const vouchersBody = document.getElementById('stockIssuesTableBody');
    if (!assetsBody || !vouchersBody) return;

    const recipientSelect = document.getElementById('warehouseRecipientUser');
    const selectedRecipient = recipientSelect.value;
    recipientSelect.innerHTML = '<option value="">Optional: link to a staff account</option>' + warehouseData.custodians.map(person =>
        `<option value="${Number(person.id)}">${escapeHtml(person.full_name)} — ${escapeHtml(person.department)}</option>`
    ).join('');
    recipientSelect.value = selectedRecipient;

    assetsBody.innerHTML = warehouseData.assets.length
        ? warehouseData.assets.map(asset => {
            const available = ['In Stock', 'Temporary Storage'].includes(asset.stock_status);
            const storage = asset.storage_location ? `: ${escapeHtml(asset.storage_location)}` : '';
            const tagged = asset.tagged_at
                ? `<span class="text-emerald-700">Tagged ${escapeHtml(asset.tagged_at)}</span>`
                : '<span class="text-amber-700">Not tagged</span>';
            return `<tr>
                <td class="p-3"><input type="checkbox" class="warehouse-asset-select" data-asset-id="${escapeHtml(asset.id)}" ${available ? '' : 'disabled'} aria-label="Select ${escapeHtml(asset.id)}"></td>
                <td class="p-3"><strong class="font-mono">${escapeHtml(asset.id)}</strong><span class="block">${escapeHtml(asset.name)}</span><span class="text-slate-500">${escapeHtml(asset.serial)}</span></td>
                <td class="p-3">${escapeHtml(asset.campus)}<span class="block text-slate-500">${escapeHtml(asset.building)} / ${escapeHtml(asset.room)}</span></td>
                <td class="p-3">${escapeHtml(asset.custodian)}<span class="block text-slate-500">${escapeHtml(asset.department)}</span></td>
                <td class="p-3"><strong>${escapeHtml(asset.stock_status)}</strong><span class="block text-slate-500">${storage}</span></td>
                <td class="p-3">${escapeHtml(asset.condition)}</td>
                <td class="p-3"><button type="button" onclick="viewTagModal('${escapeHtml(asset.id)}')" class="rounded bg-indigo-900 px-2 py-1 text-white">Print / Tag</button><span class="mt-1 block">${tagged}</span></td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="7" class="p-4 text-center text-slate-500">No assets are registered in stock.</td></tr>';

    vouchersBody.innerHTML = warehouseData.vouchers.length
        ? warehouseData.vouchers.map(voucher => `
            <tr>
                <td class="p-3 font-mono font-bold">${escapeHtml(voucher.id)}</td>
                <td class="p-3">${escapeHtml(voucher.issue_date)}</td>
                <td class="p-3">${escapeHtml(voucher.recipient_name)}<span class="block text-slate-500">${escapeHtml(voucher.recipient_department)}</span></td>
                <td class="p-3">${Number(voucher.item_count)}<span class="block text-slate-500">${voucher.items.map(item => escapeHtml(item.asset_id)).join(', ')}</span></td>
                <td class="p-3">${escapeHtml(voucher.purpose || '—')}</td>
                <td class="p-3">${escapeHtml(voucher.issued_by || 'Account unavailable')}</td>
                <td class="p-3"><button type="button" onclick="openStockIssueVoucher('${escapeHtml(voucher.id)}')" class="rounded bg-slate-200 px-2 py-1 dark:bg-slate-700">Print SIV</button></td>
            </tr>
        `).join('')
        : '<tr><td colspan="7" class="p-4 text-center text-slate-500">No stock issue vouchers recorded yet.</td></tr>';

    document.getElementById('warehouseSelectAll').checked = false;
}

function setWarehouseRecipient(select) {
    const recipient = warehouseData.custodians.find(person => String(person.id) === select.value);
    select.form.elements.recipientName.value = recipient ? recipient.full_name : '';
    select.form.elements.recipientDepartment.value = recipient ? recipient.department : '';
}

function selectedWarehouseAssets() {
    return [...document.querySelectorAll('.warehouse-asset-select:checked')].map(input => input.dataset.assetId);
}

function toggleWarehouseSelection(selectAll) {
    document.querySelectorAll('.warehouse-asset-select:not(:disabled)').forEach(input => {
        input.checked = selectAll.checked;
    });
}

async function submitWarehouseAction(action, fields = {}) {
    const assetIds = selectedWarehouseAssets();
    if (!assetIds.length) {
        showToast('Select at least one available stock item first.');
        return null;
    }
    try {
        const result = await requestJson('api/warehouse.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...fields, action, assetIds })
        });
        showToast(result.message);
        await loadAllData();
        if (result.voucherId) openStockIssueVoucher(result.voucherId);
        return result;
    } catch (err) {
        console.error(`Warehouse ${action} failed:`, err);
        showToast(`Could not complete warehouse action: ${err.message}`);
        return null;
    }
}

async function issueSelectedStock(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    const result = await submitWarehouseAction('issue', fields);
    if (result) form.reset();
}

async function allocateSelectedStock(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    const result = await submitWarehouseAction('allocate', fields);
    if (result) form.reset();
}

async function releaseSelectedStock() {
    await submitWarehouseAction('release');
}

function openStockIssueVoucher(voucherId) {
    const voucher = warehouseData.vouchers.find(item => item.id === voucherId);
    if (!voucher) {
        showToast('Stock issue voucher was not found. Reload the warehouse list and try again.');
        return;
    }
    document.getElementById('siv-number').textContent = voucher.id;
    document.getElementById('siv-date').textContent = voucher.issue_date;
    document.getElementById('siv-recipient').textContent = voucher.recipient_name;
    document.getElementById('siv-department').textContent = voucher.recipient_department;
    document.getElementById('siv-purpose').textContent = voucher.purpose || '—';
    document.getElementById('siv-items').innerHTML = voucher.items.map((item, index) => `
        <tr>
            <td class="border p-2">${index + 1}</td>
            <td class="border p-2 font-mono">${escapeHtml(item.asset_id)}</td>
            <td class="border p-2">${escapeHtml(item.asset_name)}</td>
            <td class="border p-2">${escapeHtml(item.serial)}</td>
            <td class="border p-2">${escapeHtml(item.condition_at_issue)}</td>
        </tr>
    `).join('');
    openModal('sivModal');
}

async function submitProcurementForm(event, action, successMessage) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
        const payload = Object.fromEntries(new FormData(form).entries());
        payload.action = action;
        const result = await requestJson('api/procurement.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showToast(successMessage(result));
        form.reset();
        await loadAllData();
    } catch (err) {
        console.error(`Procurement ${action} failed:`, err);
        showToast(`Could not complete procurement action: ${err.message}`);
    } finally {
        submitButton.disabled = false;
    }
}

function registerSupplier(event) {
    return submitProcurementForm(event, 'vendor', result => `${result.message} Supplier ID: ${result.id}`);
}

function createPurchaseOrder(event) {
    return submitProcurementForm(event, 'order', result => `${result.message} PO: ${result.id}`);
}

function recordGoodsReceipt(event) {
    return submitProcurementForm(event, 'receive', result =>
        `${result.message} GRN: ${result.receiptId}${result.invoiceStatus === 'Discrepant' ? ' Invoice discrepancy requires review.' : ''}`
    );
}

async function matchProcurementInvoice(event, receiptId) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
        const payload = Object.fromEntries(new FormData(form).entries());
        payload.receiptId = receiptId;
        const result = await requestJson('api/procurement.php', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showToast(result.message);
        await loadAllData();
    } catch (err) {
        console.error('Invoice matching failed:', err);
        showToast(`Could not match invoice: ${err.message}`);
    } finally {
        submitButton.disabled = false;
    }
}

// Calculate & Render Executive Dashboard
function renderDashboard() {
    const totalVal = assets.reduce((sum, item) => sum + parseFloat(item.cost), 0);
    const activeCount = assets.filter(a => a.status === 'Active').length;
    const maintCount = assets.filter(a => a.status === 'Under Maintenance' || a.condition === 'Damaged').length;
    const disposalCount = assets.filter(a => a.condition === 'Obsolete' || a.status === 'Pending Disposal').length;

    document.getElementById('metric-valuation').textContent = `${totalVal.toLocaleString()} ETB`;
    document.getElementById('metric-total').textContent = assets.length;
    document.getElementById('metric-active').textContent = activeCount;
    document.getElementById('metric-maintenance').textContent = maintCount;
    document.getElementById('metric-disposal').textContent = disposalCount;

    renderCharts();
}

// Render Chart.js Visualizations
function renderCharts() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js is unavailable; dashboard charts were skipped.');
        return;
    }

    const campuses = ['Main Campus', 'Health Sciences', 'Technology Institute', 'Agriculture Campus'];
    const campusValues = campuses.map(c => {
        const sum = assets.filter(a => a.campus === c).reduce((acc, i) => acc + parseFloat(i.cost), 0);
        return (sum / 1000000).toFixed(2);
    });

    const conditions = ['New', 'Good', 'Fair', 'Damaged', 'Obsolete'];
    const conditionCounts = conditions.map(cond => assets.filter(a => a.condition === cond).length);

    // Destroy existing instances if re-rendering
    if (campusChartInstance) campusChartInstance.destroy();
    if (conditionChartInstance) conditionChartInstance.destroy();

    const ctxCampus = document.getElementById('campusChart').getContext('2d');
    campusChartInstance = new Chart(ctxCampus, {
        type: 'bar',
        data: {
            labels: campuses,
            datasets: [{ label: 'Valuation (Million ETB)', data: campusValues, backgroundColor: '#3b82f6', borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxCondition = document.getElementById('conditionChart').getContext('2d');
    conditionChartInstance = new Chart(ctxCondition, {
        type: 'doughnut',
        data: {
            labels: conditions,
            datasets: [{ data: conditionCounts, backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Render Asset Registry Table
function renderAssetsTable() {
    const query = document.getElementById('searchQuery').value.trim().toLowerCase();
    const campFilter = document.getElementById('filterCampus')?.value || 'All';
    const catFilter = document.getElementById('filterCategory')?.value || 'All';
    const condFilter = document.getElementById('filterCondition')?.value || 'All';
    const recencyFilter = document.getElementById('filterAssetRecency')?.value || '30';
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 30);

    const tbody = document.getElementById('assetsTableBody');
    tbody.innerHTML = '';

    const filtered = assets.filter(a => {
        const searchable = [a.name, a.id, a.custodian, a.serial, a.campus, a.department,
            a.review_flagged_at ? 'flagged for review' : ''].join(' ').toLowerCase();
        const matchSearch = searchable.includes(query);
        const matchCampus = campFilter === 'All' || a.campus === campFilter;
        const matchCat = catFilter === 'All' || a.category === catFilter;
        const matchCond = condFilter === 'All' || a.condition === condFilter;
        const createdAt = a.created_at ? new Date(String(a.created_at).replace(' ', 'T')) : null;
        const matchRecency = recencyFilter === 'all'
            || (createdAt && !Number.isNaN(createdAt.getTime()) && createdAt >= recentCutoff);
        return matchSearch && matchCampus && matchCat && matchCond && matchRecency;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colSpan="7" class="p-8 text-center text-slate-400">No property items found.</td></tr>`;
        return;
    }

    filtered.forEach(item => {
        const canResubmitDisposal = item.status === 'Pending Disposal' && item.disposal_case_status === 'Rejected';
        const canManageReviewFlag = ['system_admin', 'property_admin', 'internal_auditor'].includes(currentUser.role);
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td class="p-3.5">
                    <div class="font-mono text-indigo-600 dark:text-amber-400 font-bold">${escapeHtml(item.id)}</div>
                    <div class="font-semibold text-sm">${escapeHtml(item.name)}</div>
                    <span class="text-[10px] text-slate-400">S/N: ${escapeHtml(item.serial)}</span>
                    ${item.review_flagged_at ? '<span class="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Flagged for review</span>' : ''}
                </td>
                <td class="p-3.5"><span class="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">${escapeHtml(item.category)}</span></td>
                <td class="p-3.5">
                    <p class="font-medium">${escapeHtml(item.campus)}</p>
                    <p class="text-[10px] text-slate-400">${escapeHtml(item.department)} • ${escapeHtml(item.room)}</p>
                </td>
                <td class="p-3.5 font-medium">${escapeHtml(item.custodian)}</td>
                <td class="p-3.5 font-bold">${parseFloat(item.cost).toLocaleString()} ETB</td>
                <td class="p-3.5"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">${escapeHtml(item.condition)}</span></td>
                <td class="p-3.5 text-right space-x-2">
                    <button onclick="viewTagModal('${item.id}')" class="p-1.5 rounded bg-slate-100 dark:bg-slate-700">Tag Sheet</button>
                    ${currentUser.role === 'system_admin' ? `<button onclick="deleteAsset('${escapeHtml(item.id)}')" class="p-1.5 rounded bg-rose-100 text-rose-800">Delete Asset</button>` : ''}
                    ${canManageReviewFlag ? `<button onclick="setAssetReviewFlag('${escapeHtml(item.id)}', ${item.review_flagged_at ? 'false' : 'true'})" class="p-1.5 rounded bg-amber-100 text-amber-900">${item.review_flagged_at ? 'Clear Review Flag' : 'Flag for Review'}</button>` : ''}
                    ${['system_admin', 'property_admin'].includes(currentUser.role) && (item.status === 'Pending Disposal'
                        ? (canResubmitDisposal ? `<button onclick="flagDisposal('${escapeHtml(item.id)}')" class="p-1.5 rounded bg-amber-100 text-amber-900">Resubmit Disposal Review</button>` : '')
                        : `<button onclick="flagDisposal('${escapeHtml(item.id)}')" class="p-1.5 rounded bg-rose-100 text-rose-800">Archive / Disposal Review</button>`)}
                </td>
            </tr>
        `;
    });
}

// Render Transfers Table
function renderTransfersTable() {
    const tbody = document.getElementById('transfersTableBody');
    tbody.innerHTML = '';
    transfers.forEach(tr => {
        const statusClass = tr.status === 'Approved'
            ? 'bg-emerald-100 text-emerald-800'
            : tr.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800';
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td class="p-3.5 font-bold font-mono text-indigo-600 dark:text-amber-400">${escapeHtml(tr.id)}</td>
                <td class="p-3.5 font-medium">${escapeHtml(tr.asset_name)}<br><span class="text-[10px] text-slate-400">${escapeHtml(tr.asset_id)}</span></td>
                <td class="p-3.5">${escapeHtml(tr.from_campus)}<br><span class="text-slate-400">${escapeHtml(tr.from_dept)}</span></td>
                <td class="p-3.5">${escapeHtml(tr.to_campus)}<br><span class="text-indigo-600 dark:text-amber-400 font-medium">${escapeHtml(tr.to_dept)}</span></td>
                <td class="p-3.5">${escapeHtml(tr.requested_by)}</td>
                <td class="p-3.5 font-mono text-xs">${escapeHtml(tr.gate_pass)}</td>
                <td class="p-3.5"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass}">${escapeHtml(tr.status)}</span></td>
                <td class="p-3.5 text-right space-y-1">
                    ${tr.status === 'Pending' && (['system_admin', 'property_admin'].includes(currentUser.role) || (currentUser.role === 'department_head' && tr.from_dept === currentUser.department)) ? `<button onclick="updateTransferStatus('${escapeHtml(tr.id)}', 'Approved')" class="bg-emerald-700 text-white px-2 py-1 rounded text-xs">Approve</button><button onclick="updateTransferStatus('${escapeHtml(tr.id)}', 'Rejected')" class="bg-rose-700 text-white px-2 py-1 rounded text-xs">Reject</button>` : ''}
                    ${['system_admin', 'property_admin', 'department_head'].includes(currentUser.role) ? `<button onclick="openGatePassModal('${escapeHtml(tr.id)}')" class="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">Print Voucher</button>` : ''}
                </td>
            </tr>
        `;
    });
}

async function updateTransferStatus(transferId, status) {
    const confirmation = status === 'Approved'
        ? 'Approve this request and update the asset to its destination location?'
        : 'Reject this transfer request?';
    if (!window.confirm(confirmation)) return;

    try {
        const result = await requestJson('api/transfers.php', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transferId, status })
        });
        showToast(result.message);
        await loadAllData();
    } catch (err) {
        console.error('Failed to update transfer decision:', err);
        showToast(`Could not update transfer: ${err.message}`);
    }
}

async function startGateScanner() {
    const reader = document.getElementById('gateScannerReader');
    const startButton = document.getElementById('startGateScannerButton');
    const stopButton = document.getElementById('stopGateScannerButton');
    if (typeof Html5Qrcode === 'undefined') {
        showGateScanResult('error', 'Camera scanner library could not be loaded. Enter the voucher number manually.');
        return;
    }
    if (!window.isSecureContext) {
        showGateScanResult('error', 'Camera access requires a secure page. Open PAMS through http://localhost or HTTPS, or enter the voucher number manually.');
        return;
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        showGateScanResult('error', 'This browser does not support camera access. Use a current browser or enter the voucher number manually.');
        return;
    }

    startButton.disabled = true;
    reader.classList.remove('hidden');
    try {
        gateScanner = gateScanner || new Html5Qrcode('gateScannerReader');
        await gateScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 180 } },
            async decodedText => {
                if (gateScanInProgress) return;
                gateScanInProgress = true;
                const gatePass = extractGatePassFromQrPayload(decodedText);
                document.getElementById('gatePassLookup').value = gatePass;
                await lookupGatePassValue(gatePass);
                await stopGateScanner();
                gateScanInProgress = false;
            },
            () => {}
        );
        stopButton.classList.remove('hidden');
    } catch (err) {
        reader.classList.add('hidden');
        console.error('Could not start gate security camera:', err);
        const cameraError = err?.name;
        const message = cameraError === 'NotAllowedError' || cameraError === 'PermissionDeniedError'
            ? 'Camera permission is blocked. Allow camera access for this site in your browser settings, then try again. You can also enter the voucher number manually.'
            : cameraError === 'NotFoundError' || cameraError === 'DevicesNotFoundError'
                ? 'No camera was found on this device. Connect a camera or enter the voucher number manually.'
                : cameraError === 'NotReadableError' || cameraError === 'TrackStartError'
                    ? 'The camera is already in use by another app or could not be started. Close other apps using it and try again, or enter the voucher number manually.'
                    : 'Could not start the camera. Check the browser camera permission and make sure no other app is using it, or enter the voucher number manually.';
        showGateScanResult('error', message);
    } finally {
        startButton.disabled = false;
    }
}

function extractGatePassFromQrPayload(decodedText) {
    const rawText = String(decodedText || '').trim();
    const match = rawText.match(/(?:gate\s*pass|voucher(?:\s*number)?)\s*[:=]\s*([^\r\n]+)/i);
    return (match ? match[1] : rawText).trim();
}

async function stopGateScanner() {
    const reader = document.getElementById('gateScannerReader');
    const stopButton = document.getElementById('stopGateScannerButton');
    if (gateScanner && gateScanner.isScanning) {
        try {
            await gateScanner.stop();
        } catch (err) {
            console.error('Could not stop gate security camera:', err);
            showGateScanResult('error', 'The camera scanner could not be stopped cleanly. Close this page to release camera access.');
        }
    }
    reader.classList.add('hidden');
    stopButton.classList.add('hidden');
}

async function lookupGatePass(event) {
    event.preventDefault();
    await lookupGatePassValue(document.getElementById('gatePassLookup').value);
}

async function lookupGatePassValue(value) {
    const gatePass = value.trim();
    if (!gatePass) {
        showGateScanResult('error', 'Enter or scan a gate-pass voucher number.');
        return;
    }

    try {
        const result = await requestJson(`api/gate-clearance.php?gatePass=${encodeURIComponent(gatePass)}`);
        const transfer = result.data;
        const authorized = transfer.status === 'Approved';
        const checkedOut = Array.isArray(transfer.events) && transfer.events.some(event => event.event_type === 'Check-out');
        const checkedIn = Array.isArray(transfer.events) && transfer.events.some(event => event.event_type === 'Check-in');
        const nextEvent = !checkedOut ? 'Check-out' : !checkedIn ? 'Check-in' : '';
        const heading = authorized ? 'RELEASE AUTHORIZED' : `NOT AUTHORIZED — ${transfer.status.toUpperCase()}`;
        const classes = authorized
            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
            : 'border-rose-300 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200';
        const issueForm = `
            <div class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <p class="font-semibold text-xs uppercase tracking-wide">Report suspicious or invalid pass</p>
                <form onsubmit="reportSuspiciousGatePass(event, '${escapeHtml(gatePass)}')" class="mt-2 grid grid-cols-1 gap-2">
                    <select name="reason" class="p-2 rounded border border-amber-300 bg-white text-slate-900 text-xs">
                        <option value="Suspicious or duplicate gate pass">Suspicious or duplicate gate pass</option>
                        <option value="Invalid or expired gate pass">Invalid or expired gate pass</option>
                        <option value="Transfer mismatch or unexpected asset">Transfer mismatch or unexpected asset</option>
                    </select>
                    <textarea name="details" rows="2" maxlength="500" placeholder="Add notes about the issue found at the gate" class="p-2 rounded border border-amber-300 bg-white text-slate-900 text-xs"></textarea>
                    <button type="submit" class="bg-amber-600 text-white px-3 py-2 rounded font-semibold text-xs">Report issue</button>
                </form>
            </div>
        `;
        showGateScanResult(authorized ? 'success' : 'denied', `
            <div class="rounded-lg border p-4 ${classes}">
                <p class="font-bold">${escapeHtml(heading)}</p>
                <p class="mt-2"><strong>Gate pass:</strong> ${escapeHtml(transfer.gate_pass)}</p>
                <p><strong>Asset:</strong> ${escapeHtml(transfer.asset_name)} (${escapeHtml(transfer.asset_id)})</p>
                <p><strong>From:</strong> ${escapeHtml(transfer.from_campus)} — ${escapeHtml(transfer.from_dept)}</p>
                <p><strong>To:</strong> ${escapeHtml(transfer.to_campus)} — ${escapeHtml(transfer.to_dept)}</p>
                <p><strong>Requested by:</strong> ${escapeHtml(transfer.requested_by)}</p>
                <p><strong>Transfer status:</strong> ${escapeHtml(transfer.status)}</p>
                ${Array.isArray(transfer.events) && transfer.events.length ? `<div class="mt-3 border-t border-current/20 pt-2"><strong>Transit record</strong>${transfer.events.map(event => `<p>${escapeHtml(event.event_type)}: ${escapeHtml(event.driver_name)} / ${escapeHtml(event.gate_officer)} at ${escapeHtml(event.event_at)}</p>`).join('')}</div>` : ''}
                ${authorized && nextEvent ? `
                    <form onsubmit="recordGateTransit(event, '${escapeHtml(transfer.id)}', '${nextEvent}')" class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input name="driverName" required maxlength="255" placeholder="Driver full name" class="p-2 rounded border text-slate-900">
                        <input name="gateOfficer" required maxlength="255" placeholder="Gate officer full name" class="p-2 rounded border text-slate-900">
                        <button type="submit" class="sm:col-span-2 bg-indigo-900 text-white px-3 py-2 rounded font-semibold">Record ${nextEvent}</button>
                    </form>` : ''}
                ${authorized && !nextEvent ? '<p class="mt-3 font-semibold">Transit check-out and check-in are complete.</p>' : ''}
                ${!authorized ? issueForm : ''}
            </div>
        `, true);
    } catch (err) {
        console.error('Gate pass verification failed:', err);
        const warningBox = `
            <div class="rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                <p class="font-bold">INVALID OR UNKNOWN GATE PASS</p>
                <p class="mt-2">${escapeHtml(err.message)}</p>
                <form onsubmit="reportSuspiciousGatePass(event, '${escapeHtml(gatePass)}')" class="mt-3 grid grid-cols-1 gap-2">
                    <select name="reason" class="p-2 rounded border border-rose-300 bg-white text-slate-900 text-xs">
                        <option value="Unknown or invalid gate pass">Unknown or invalid gate pass</option>
                        <option value="Repeat scan of a cancelled pass">Repeat scan of a cancelled pass</option>
                        <option value="Potential counterfeit gate pass">Potential counterfeit gate pass</option>
                    </select>
                    <textarea name="details" rows="2" maxlength="500" placeholder="Describe the issue" class="p-2 rounded border border-rose-300 bg-white text-slate-900 text-xs"></textarea>
                    <button type="submit" class="bg-rose-700 text-white px-3 py-2 rounded font-semibold text-xs">Report issue</button>
                </form>
            </div>
        `;
        showGateScanResult('error', warningBox, true);
    }
}

async function reportSuspiciousGatePass(event, gatePass) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
        const result = await requestJson('api/gate-clearance.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'report',
                gatePass,
                reason: form.elements.reason.value,
                details: form.elements.details.value
            })
        });
        showToast(result.message);
        showGateScanResult('denied', `<div class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><p class="font-bold">REPORT SUBMITTED</p><p class="mt-2">${escapeHtml(result.message)}</p></div>`, true);
    } catch (err) {
        console.error('Could not report suspicious gate pass:', err);
        showGateScanResult('error', `Could not submit gate-pass alert: ${escapeHtml(err.message)}`);
    } finally {
        submitButton.disabled = false;
    }
}

async function recordGateTransit(event, transferId, eventType) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const payload = {
        transferId,
        eventType,
        driverName: form.elements.driverName.value,
        gateOfficer: form.elements.gateOfficer.value
    };
    submitButton.disabled = true;
    try {
        const result = await requestJson('api/gate-clearance.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showToast(result.message);
        await lookupGatePassValue(document.getElementById('gatePassLookup').value);
        await loadAllData();
    } catch (err) {
        console.error('Could not record gate transit event:', err);
        showGateScanResult('error', `Could not record transit clearance: ${err.message}`);
    } finally {
        submitButton.disabled = false;
    }
}

function showGateScanResult(type, content, isHtml = false) {
    const result = document.getElementById('gateScanResult');
    result.classList.remove('hidden', 'border-rose-300', 'bg-rose-50', 'text-rose-900', 'border-amber-300', 'bg-amber-50', 'text-amber-900');
    if (type === 'error') {
        result.classList.add('border-rose-300', 'bg-rose-50', 'text-rose-900');
    } else if (type === 'denied') {
        result.classList.add('border-amber-300', 'bg-amber-50', 'text-amber-900');
    }
    if (isHtml) result.innerHTML = content;
    else result.textContent = content;
}

// Render Maintenance Tickets
function renderMaintenanceGrid(containerId = 'maintenanceGrid') {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    maintenance.forEach(m => {
        const status = m.status === 'Under Repair' ? 'In Progress' : m.status;
        grid.innerHTML += `
            <div class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div class="flex items-center justify-between">
                    <span class="font-mono text-xs text-amber-600 font-bold">${escapeHtml(m.id)}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${m.priority === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}">${escapeHtml(m.priority)} Priority</span>
                </div>
                <div>
                    <h4 class="font-bold text-base">${escapeHtml(m.asset_name)}</h4>
                    <p class="text-xs text-slate-500 font-mono">Tag: ${escapeHtml(m.asset_id)}</p>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">"${escapeHtml(m.issue)}"</p>
                ${m.diagnosis ? `<p class="text-xs"><span class="text-slate-400">Diagnosis:</span> ${escapeHtml(m.diagnosis)}</p>` : ''}
                <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div><span class="text-slate-400 block">Technician</span><span class="font-medium">${escapeHtml(m.technician)}</span></div>
                    <div class="text-right"><span class="text-slate-400 block">Est. Cost</span><span class="font-bold text-emerald-600">${parseFloat(m.estimated_cost).toLocaleString()} ETB</span></div>
                    <div><span class="text-slate-400 block">Actual Cost</span><span class="font-bold">${parseFloat(m.actual_cost || 0).toLocaleString()} ETB</span></div>
                    <div class="text-right"><span class="text-slate-400 block">Status</span><span class="font-semibold">${escapeHtml(status)}</span></div>
                </div>
                ${m.spare_parts ? `<p class="text-xs"><span class="text-slate-400">Parts:</span> ${escapeHtml(m.spare_parts)}</p>` : ''}
                ${currentUser.role === 'technician' && status !== 'Completed' && status !== 'Cancelled' ? `
                    <form onsubmit="updateMaintenanceWorkorder(event, '${escapeHtml(m.id)}')" class="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                        <select name="status" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs">
                            <option value="In Progress" ${status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        <textarea name="diagnosis" rows="2" placeholder="Technician diagnosis" class="sm:col-span-2 p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs">${escapeHtml(m.diagnosis || '')}</textarea>
                        <input name="actualCost" type="number" min="0" step="0.01" value="${escapeHtml(m.actual_cost || 0)}" placeholder="Actual cost (ETB)" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs">
                        <textarea name="spareParts" rows="2" placeholder="Spare parts / materials used" class="sm:col-span-2 p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs">${escapeHtml(m.spare_parts || '')}</textarea>
                        <button type="submit" class="sm:col-span-2 bg-indigo-900 text-white px-3 py-2 rounded text-xs font-semibold">Save Work Order</button>
                    </form>` : ''}
            </div>
        `;
    });
}

function renderCustodianWorkspace() {
    const assetsBody = document.getElementById('custodianAssetsTableBody');
    const incidentsBody = document.getElementById('custodianIncidentsTableBody');
    const incidentAssetSelect = document.getElementById('incidentAssetId');
    if (!assetsBody || !incidentsBody || !incidentAssetSelect) return;

    const selectedAsset = incidentAssetSelect.value;
    incidentAssetSelect.innerHTML = '<option value="">Select your assigned asset</option>' + custodianData.assets.map(asset =>
        `<option value="${escapeHtml(asset.id)}">${escapeHtml(asset.id)} — ${escapeHtml(asset.name)}</option>`
    ).join('');
    incidentAssetSelect.value = selectedAsset;

    assetsBody.innerHTML = custodianData.assets.length
        ? custodianData.assets.map(asset => {
            const acknowledged = Boolean(asset.acknowledged_at);
            const acknowledgement = acknowledged
                ? `<span class="font-medium text-emerald-700">Acknowledged ${escapeHtml(asset.acknowledged_at)}</span>`
                : '<span class="text-amber-700">Awaiting your acknowledgement</span>';
            const action = acknowledged
                ? '<span class="text-slate-500">Receipt confirmed</span>'
                : `<button type="button" onclick="acknowledgeCustodianAsset('${escapeHtml(asset.id)}')" class="rounded bg-indigo-900 px-3 py-1.5 text-white">Confirm receipt / e-sign</button>`;
            return `<tr>
                <td class="p-3"><strong class="font-mono">${escapeHtml(asset.id)}</strong><span class="block">${escapeHtml(asset.name)}</span><span class="text-slate-500">${escapeHtml(asset.category)}</span></td>
                <td class="p-3">${escapeHtml(asset.campus)}<span class="block text-slate-500">${escapeHtml(asset.building)} / ${escapeHtml(asset.room)}</span></td>
                <td class="p-3">${escapeHtml(asset.condition)}<span class="block text-slate-500">${escapeHtml(asset.status)}</span></td>
                <td class="p-3">${acknowledgement}</td>
                <td class="p-3">${action}</td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="5" class="p-4 text-center text-slate-500">No assets are currently assigned to your account.</td></tr>';

    incidentsBody.innerHTML = custodianData.incidents.length
        ? custodianData.incidents.map(incident => `
            <tr>
                <td class="p-2">${escapeHtml(incident.reported_at)}</td>
                <td class="p-2">${escapeHtml(incident.asset_id)}<span class="block text-slate-500">${escapeHtml(incident.asset_name)}</span></td>
                <td class="p-2">${escapeHtml(incident.incident_type)}<span class="block text-slate-500">${escapeHtml(incident.status)}</span></td>
                <td class="p-2">${escapeHtml(incident.description)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="4" class="p-3 text-center text-slate-500">No incident reports submitted.</td></tr>';
}

function renderAuditorWorkspace() {
    const overview = auditorData.overview || {};
    document.getElementById('auditor-asset-count').textContent = Number(overview.asset_count || 0).toLocaleString();
    document.getElementById('auditor-asset-value').textContent = `${Number(overview.registered_value || 0).toLocaleString()} ETB`;
    document.getElementById('auditor-invoice-count').textContent = auditorData.invoiceDiscrepancies.length.toLocaleString();
    document.getElementById('auditor-incident-count').textContent = auditorData.openIncidents.length.toLocaleString();

    const count = auditorData.latestPhysicalCount;
    document.getElementById('auditor-count-summary').textContent = count
        ? `Session #${count.id} (${count.status}) — ${Number(count.verified_count || 0)} verified, ${Number(count.missing_count || 0)} marked missing, ${Number(count.pending_count || 0)} pending out of ${Number(count.expected_count || 0)} assets. Started ${count.started_at}.`
        : 'No physical count session has been recorded.';

    const renderValuations = (rows, bodyId) => {
        document.getElementById(bodyId).innerHTML = rows.length
            ? rows.map(row => `<tr><td class="p-3">${escapeHtml(row.label)}</td><td class="p-3">${Number(row.asset_count).toLocaleString()}</td><td class="p-3 font-medium">${Number(row.registered_value).toLocaleString()}</td></tr>`).join('')
            : '<tr><td colspan="3" class="p-3 text-center text-slate-500">No valuation data available.</td></tr>';
    };
    renderValuations(auditorData.valuationByCampus, 'auditorCampusValuationBody');
    renderValuations(auditorData.valuationByDepartment, 'auditorDepartmentValuationBody');

    document.getElementById('auditorReceiptReconciliationBody').innerHTML = auditorData.receiptAssetReconciliation.length
        ? auditorData.receiptAssetReconciliation.map(row => {
            const variance = Number(row.quantity_difference);
            const reconciled = variance === 0;
            return `<tr>
                <td class="p-3 font-mono">${escapeHtml(row.receipt_id)}<span class="block text-slate-500">${escapeHtml(row.purchase_order_id)}</span></td>
                <td class="p-3">${escapeHtml(row.vendor_name)}<span class="block text-slate-500">${escapeHtml(row.item_name)}</span></td>
                <td class="p-3">${Number(row.quantity_received).toLocaleString()}</td>
                <td class="p-3">${Number(row.registered_asset_count).toLocaleString()}</td>
                <td class="p-3 font-semibold ${reconciled ? 'text-emerald-700' : 'text-rose-700'}">${variance > 0 ? '+' : ''}${variance.toLocaleString()}${reconciled ? ' (reconciled)' : ' (quantity variance)'}</td>
                <td class="p-3">${Number(row.value_difference || 0).toLocaleString()}</td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="6" class="p-3 text-center text-slate-500">No goods receipts available for reconciliation.</td></tr>';

    document.getElementById('auditorInvoiceVarianceBody').innerHTML = auditorData.invoiceDiscrepancies.length
        ? auditorData.invoiceDiscrepancies.map(row => `
            <tr>
                <td class="p-3 font-mono">${escapeHtml(row.receipt_id)}<span class="block text-slate-500">${escapeHtml(row.purchase_order_id)}</span></td>
                <td class="p-3">${escapeHtml(row.vendor_name)}<span class="block text-slate-500">${escapeHtml(row.item_name)}</span></td>
                <td class="p-3">${escapeHtml(row.invoice_number || 'Not supplied')}<span class="block text-slate-500">${Number(row.invoice_amount || 0).toLocaleString()} ETB</span></td>
                <td class="p-3 font-semibold ${Number(row.invoice_difference) < 0 ? 'text-rose-700' : 'text-amber-700'}">${Number(row.invoice_difference || 0).toLocaleString()} ETB</td>
                <td class="p-3">${escapeHtml(row.received_date)}</td>
            </tr>`).join('')
        : '<tr><td colspan="5" class="p-3 text-center text-slate-500">No recorded invoice discrepancies.</td></tr>';

    document.getElementById('auditorIncidentsBody').innerHTML = auditorData.openIncidents.length
        ? auditorData.openIncidents.map(row => `
            <tr>
                <td class="p-3">${escapeHtml(row.reported_at)}<span class="block text-slate-500">${escapeHtml(row.reporter)}</span></td>
                <td class="p-3">${escapeHtml(row.asset_id)}<span class="block text-slate-500">${escapeHtml(row.asset_name)}</span></td>
                <td class="p-3">${escapeHtml(row.incident_type)}</td>
                <td class="p-3">${escapeHtml(row.description)}</td>
                <td class="p-3">${escapeHtml(row.status)}</td>
            </tr>`).join('')
        : '<tr><td colspan="5" class="p-3 text-center text-slate-500">No unresolved asset incidents.</td></tr>';

    const assetSelect = document.getElementById('auditorInspectionAsset');
    const selectedAsset = assetSelect.value;
    assetSelect.innerHTML = '<option value="">Optional: related asset</option>' + assets.map(asset =>
        `<option value="${escapeHtml(asset.id)}">${escapeHtml(asset.id)} — ${escapeHtml(asset.name)}</option>`
    ).join('');
    assetSelect.value = selectedAsset;

    document.getElementById('auditorInspectionsBody').innerHTML = auditorData.inspections.length
        ? auditorData.inspections.map(row => `
            <tr>
                <td class="p-3">${escapeHtml(row.created_at)}<span class="block text-slate-500">${escapeHtml(row.inspector || 'Account unavailable')}</span></td>
                <td class="p-3">${escapeHtml(row.inspection_type)}<span class="block font-semibold ${row.risk_level === 'High' ? 'text-rose-700' : row.risk_level === 'Medium' ? 'text-amber-700' : 'text-emerald-700'}">${escapeHtml(row.risk_level)} risk</span></td>
                <td class="p-3"><strong>${escapeHtml(row.title)}</strong><span class="block whitespace-pre-wrap">${escapeHtml(row.findings)}</span></td>
                <td class="p-3">${row.asset_id ? `${escapeHtml(row.asset_id)} — ${escapeHtml(row.asset_name || 'Asset unavailable')}` : '—'}</td>
                <td class="p-3">${escapeHtml(row.status)}</td>
                <td class="p-3">${row.status === 'Closed'
                    ? '—'
                    : `<select onchange="updateComplianceInspection(${Number(row.id)}, this.value)" class="rounded border p-1 dark:bg-slate-900 dark:border-slate-700">
                        <option value="">Change status</option>
                        <option value="Open">Open</option><option value="Under Review">Under Review</option><option value="Closed">Closed</option>
                    </select>`}</td>
            </tr>`).join('')
        : '<tr><td colspan="6" class="p-3 text-center text-slate-500">No inspection findings have been recorded.</td></tr>';
}

async function createComplianceInspection(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const payload = Object.fromEntries(new FormData(form).entries());
    button.disabled = true;
    try {
        const result = await requestJson('api/auditor.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showToast(result.message);
        form.reset();
        await loadAllData();
    } catch (err) {
        console.error('Could not record compliance inspection:', err);
        showToast(`Could not record inspection: ${err.message}`);
    } finally {
        button.disabled = false;
    }
}

async function updateComplianceInspection(inspectionId, status) {
    if (!status) return;
    try {
        const result = await requestJson('api/auditor.php', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inspectionId, status })
        });
        showToast(result.message);
        await loadAllData();
    } catch (err) {
        console.error('Could not update compliance inspection:', err);
        showToast(`Could not update inspection: ${err.message}`);
        await loadAllData();
    }
}

async function acknowledgeCustodianAsset(assetId) {
    if (!window.confirm('Confirm that you received and accept responsibility for this assigned asset? This electronic acknowledgement will be recorded with your account and the current time.')) {
        return;
    }
    try {
        const result = await requestJson('api/custodian.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'acknowledge', assetId })
        });
        showToast(result.message);
        await loadAllData();
    } catch (err) {
        console.error('Could not acknowledge asset assignment:', err);
        showToast(`Could not acknowledge assignment: ${err.message}`);
    }
}

async function submitCustodianIncident(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.action = 'incident';
    submitButton.disabled = true;
    try {
        const result = await requestJson('api/custodian.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showToast(result.message);
        form.reset();
        await loadAllData();
    } catch (err) {
        console.error('Could not submit asset incident report:', err);
        showToast(`Could not submit incident report: ${err.message}`);
    } finally {
        submitButton.disabled = false;
    }
}

async function updateMaintenanceWorkorder(event, maintenanceId) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
        const result = await requestJson('api/maintenance.php', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                maintenanceId,
                status: form.elements.status.value,
                diagnosis: form.elements.diagnosis.value,
                actualCost: form.elements.actualCost.value,
                spareParts: form.elements.spareParts.value
            })
        });
        showToast(result.message);
        await loadAllData();
    } catch (err) {
        console.error('Failed to update maintenance work order:', err);
        showToast(`Could not update work order: ${err.message}`);
    } finally {
        submitButton.disabled = false;
    }
}
// Render 5-Year Straight-Line Depreciation & Disposal
function renderDisposalTable() {
    const tbody = document.getElementById('disposalTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const now = new Date();
    const asOf = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const rows = assets.map(ast => {
        const [year, month, day] = String(ast.acq_date).slice(0, 10).split('-').map(Number);
        const acquisitionDate = new Date(Date.UTC(year, month - 1, day));
        const acquisitionTime = acquisitionDate.getTime();
        const usefulLifeEnd = Date.UTC(year + 5, month - 1, day);
        const cost = Number(ast.cost);
        const invalidDate = !year || acquisitionDate.getUTCFullYear() !== year
            || acquisitionDate.getUTCMonth() !== month - 1
            || acquisitionDate.getUTCDate() !== day;
        const depreciationRatio = invalidDate || asOf <= acquisitionTime
            ? 0
            : Math.min(1, (asOf - acquisitionTime) / (usefulLifeEnd - acquisitionTime));
        const accumulatedDep = Math.round(cost * depreciationRatio * 100) / 100;
        const netBookValue = Math.max(0, Math.round((cost - accumulatedDep) * 100) / 100);
        const isFullyDepreciated = depreciationRatio === 1;
        const isPendingDisposal = ast.status === 'Pending Disposal';
        const canResubmitDisposal = isPendingDisposal && ast.disposal_case_status === 'Rejected';
        const isRecommended = isPendingDisposal || isFullyDepreciated
            || ast.condition === 'Obsolete' || ast.condition === 'Damaged';
        const caseStatus = ast.disposal_case_status || '';
        const isAwaitingCommittee = caseStatus === 'Requested' || caseStatus === 'Inspected';
        return {
            asset: ast,
            cost,
            accumulatedDep,
            netBookValue,
            isFullyDepreciated,
            isRecommended,
            canResubmitDisposal,
            isAwaitingCommittee,
            caseStatus
        };
    });

    const money = value => `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
    document.getElementById('disposal-total-cost').textContent = money(
        rows.reduce((total, row) => total + row.cost, 0)
    );
    document.getElementById('disposal-accumulated').textContent = money(
        rows.reduce((total, row) => total + row.accumulatedDep, 0)
    );
    document.getElementById('disposal-net-book-value').textContent = money(
        rows.reduce((total, row) => total + row.netBookValue, 0)
    );
    document.getElementById('disposal-awaiting-count').textContent = rows.filter(row => row.isAwaitingCommittee).length;

    const query = document.getElementById('disposalSearch').value.trim().toLowerCase();
    const filter = document.getElementById('disposalFilter').value;
    const filteredRows = rows.filter(row => {
        const { asset, isRecommended, isAwaitingCommittee, caseStatus } = row;
        const matchesSearch = [asset.id, asset.name, asset.department].join(' ').toLowerCase().includes(query);
        const matchesFilter = filter === 'all'
            || (filter === 'recommended' && isRecommended)
            || (filter === 'awaiting' && isAwaitingCommittee)
            || (filter === 'rejected' && caseStatus === 'Rejected');
        return matchesSearch && matchesFilter;
    });

    if (filteredRows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-400">No assets match this search or filter.</td></tr>';
        return;
    }

    filteredRows.forEach(row => {
        const { asset: ast, cost, accumulatedDep, netBookValue, isFullyDepreciated,
            isRecommended, canResubmitDisposal, isAwaitingCommittee, caseStatus } = row;
        const isPendingDisposal = ast.status === 'Pending Disposal';
        let disposalStatus = 'Retain in Active Service';
        if (caseStatus === 'Approved') {
            disposalStatus = 'Approved by Committee';
        } else if (caseStatus === 'Rejected') {
            disposalStatus = 'Rejected — resubmission available';
        } else if (isAwaitingCommittee) {
            disposalStatus = caseStatus === 'Inspected' ? 'Inspected — decision pending' : 'Awaiting committee inspection';
        } else if (isPendingDisposal) {
            disposalStatus = 'Pending disposal review';
        } else if (isRecommended) {
            disposalStatus = isFullyDepreciated ? 'Fully depreciated — recommend disposal'
                : ast.condition === 'Obsolete' ? 'Obsolete — recommend disposal'
                    : ast.condition === 'Damaged' ? 'Damaged — recommend inspection'
                        : 'Recommend disposal review';
        }
        const canSubmit = !isAwaitingCommittee && caseStatus !== 'Approved';
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td class="p-3.5"><span class="font-mono text-indigo-600 dark:text-amber-400 font-bold">${escapeHtml(ast.id)}</span><p class="font-semibold">${escapeHtml(ast.name)}</p><p class="text-[10px] text-slate-400">${escapeHtml(ast.department)}</p></td>
                <td class="p-3.5 font-bold">${money(cost)}</td>
                <td class="p-3.5">${escapeHtml(ast.acq_date)}</td>
                <td class="p-3.5">5 Years</td>
                <td class="p-3.5"><span class="font-bold ${isFullyDepreciated ? 'text-rose-500' : 'text-emerald-600'}">${money(netBookValue)}</span></td>
                <td class="p-3.5">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${caseStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800' : caseStatus === 'Rejected' ? 'bg-rose-100 text-rose-800' : isAwaitingCommittee || ast.status === 'Pending Disposal' ? 'bg-amber-100 text-amber-800' : isRecommended ? 'bg-rose-100 text-rose-800' : 'text-slate-400'}">${escapeHtml(disposalStatus)}</span>
                </td>
                <td class="p-3.5 text-right space-x-2">
                    ${canSubmit ? `<button onclick="flagDisposal('${escapeHtml(ast.id)}')" class="bg-rose-600 text-white px-2.5 py-1 rounded text-xs">${canResubmitDisposal ? 'Resubmit Request' : 'Submit for Review'}</button>` : ''}
                    ${currentUser.role === 'system_admin' ? `<button onclick="deleteAsset('${escapeHtml(ast.id)}')" class="bg-rose-100 text-rose-800 px-2.5 py-1 rounded text-xs">Delete</button>` : ''}
                </td>
            </tr>
        `;
    });
}

function renderDisposalCommitteeCases() {
    const tbody = document.getElementById('disposalCommitteeTableBody');
    if (!tbody) return;
    if (disposalCommitteeCases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">No assets are awaiting committee review.</td></tr>';
        return;
    }

    tbody.innerHTML = disposalCommitteeCases.map(caseRecord => {
        const caseId = Number(caseRecord.id);
        const location = [caseRecord.campus, caseRecord.department, caseRecord.building, caseRecord.room]
            .filter(Boolean)
            .map(escapeHtml)
            .join(' / ');
        let review = '<span class="text-slate-500">No further action required.</span>';
        if (caseRecord.case_status === 'Inspected') {
            review = `
                <form class="space-y-2" onsubmit="return false">
                    <label class="block font-medium" for="disposal-method-${caseId}">Proposed disposition</label>
                    <select id="disposal-method-${caseId}" class="w-full rounded border p-2 dark:bg-slate-900 dark:border-slate-600">
                        <option value="">Select method</option>
                        <option value="Scrap">Scrap</option>
                        <option value="Auction">Auction</option>
                        <option value="Donation">Donation</option>
                    </select>
                    <label class="block font-medium" for="disposal-decision-notes-${caseId}">Decision notes</label>
                    <textarea id="disposal-decision-notes-${caseId}" required maxlength="5000" rows="2" class="w-full rounded border p-2 dark:bg-slate-900 dark:border-slate-600" placeholder="Reason and conditions of decision"></textarea>
                    <div class="flex flex-wrap gap-2">
                        <button type="button" onclick="recordDisposalDecision(${caseId}, 'Approved')" class="rounded bg-emerald-700 px-3 py-2 text-white">Approve & Issue Certificate</button>
                        <button type="button" onclick="recordDisposalDecision(${caseId}, 'Rejected')" class="rounded bg-rose-700 px-3 py-2 text-white">Reject Request</button>
                    </div>
                </form>`;
        } else if (caseRecord.case_status === 'Approved' && caseRecord.certificate_no) {
            review = `
                <p class="font-semibold">${escapeHtml(caseRecord.disposition)} approved</p>
                <p class="font-mono">${escapeHtml(caseRecord.certificate_no)}</p>
                <button type="button" onclick="printDisposalCertificate(${caseId})" class="mt-2 rounded bg-indigo-900 px-3 py-2 text-white">Print Certificate</button>`;
        } else if (caseRecord.case_status === 'Rejected') {
            review = `<p class="font-semibold text-rose-700">Rejected — ${escapeHtml(caseRecord.disposition || 'No method recorded')}</p>
                <p class="mt-1 whitespace-pre-wrap">${escapeHtml(caseRecord.decision_notes || '')}</p>`;
        }

        let inspection = `<form class="space-y-2" onsubmit="return false">
            <label class="block font-medium" for="disposal-inspection-${caseId}">Inspection findings</label>
            <textarea id="disposal-inspection-${caseId}" required maxlength="10000" rows="3" class="w-full rounded border p-2 dark:bg-slate-900 dark:border-slate-600" placeholder="Condition, damage, repairability, and evidence"></textarea>
            <button type="button" onclick="recordDisposalInspection(${caseId})" class="rounded bg-indigo-900 px-3 py-2 text-white">Record Inspection</button>
        </form>`;
        if (caseRecord.case_status !== 'Requested') {
            inspection = `<p class="whitespace-pre-wrap">${escapeHtml(caseRecord.inspection_findings || 'No inspection findings recorded.')}</p>
                <p class="mt-1 text-slate-500">${caseRecord.inspector_name ? `Inspected by ${escapeHtml(caseRecord.inspector_name)} · ` : ''}${escapeHtml(caseRecord.inspected_at || '')}</p>`;
        }

        return `<tr class="align-top">
            <td class="p-3.5"><span class="font-mono font-bold">${escapeHtml(caseRecord.asset_id)}</span><p class="font-semibold">${escapeHtml(caseRecord.asset_name)}</p><p>${escapeHtml(caseRecord.category)}</p></td>
            <td class="p-3.5"><p>${escapeHtml(caseRecord.condition)}</p><p>${location}</p><p>${parseFloat(caseRecord.cost || 0).toLocaleString()} ETB</p></td>
            <td class="p-3.5"><span class="rounded bg-slate-100 px-2 py-1 font-semibold dark:bg-slate-700">${escapeHtml(caseRecord.case_status)}</span></td>
            <td class="p-3.5">${inspection}</td>
            <td class="p-3.5">${review}</td>
        </tr>`;
    }).join('');
}

async function recordDisposalInspection(caseId) {
    const findings = document.getElementById(`disposal-inspection-${caseId}`).value.trim();
    if (!findings) {
        showToast('Enter inspection findings before recording the inspection.');
        return;
    }
    try {
        const result = await requestJson('api/disposal-committee.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caseId, inspectionFindings: findings })
        });
        showToast(result.message);
        await loadAllData();
    } catch (err) {
        console.error('Failed to record disposal inspection:', err);
        showToast(`Could not record inspection: ${err.message}`);
    }
}

async function recordDisposalDecision(caseId, decision) {
    const disposition = document.getElementById(`disposal-method-${caseId}`).value;
    const decisionNotes = document.getElementById(`disposal-decision-notes-${caseId}`).value.trim();
    if (!disposition || !decisionNotes) {
        showToast('Select a disposal method and enter committee decision notes.');
        return;
    }
    const confirmSignature = decision === 'Approved'
        ? window.confirm(`Approve ${disposition.toLowerCase()} for this asset and issue the certificate under your account name?`)
        : false;
    if (decision === 'Approved' && !confirmSignature) return;

    try {
        const result = await requestJson('api/disposal-committee.php', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caseId, decision, disposition, decisionNotes, confirmSignature })
        });
        showToast(result.message);
        await loadAllData();
    } catch (err) {
        console.error('Failed to record disposal committee decision:', err);
        showToast(`Could not record committee decision: ${err.message}`);
    }
}

function printDisposalCertificate(caseId) {
    const caseRecord = disposalCommitteeCases.find(item => Number(item.id) === Number(caseId));
    if (!caseRecord || caseRecord.case_status !== 'Approved' || !caseRecord.certificate_no) {
        showToast('A signed certificate is not available for this case.');
        return;
    }
    const printSection = document.getElementById('disposalCertificatePrint');
    printSection.innerHTML = `
        <header class="text-center">
            <h1 class="text-2xl font-bold">DEBRE MARKOS UNIVERSITY</h1>
            <h2 class="text-lg font-semibold">PROPERTY ADMINISTRATION DIRECTORATE</h2>
            <h3 class="mt-6 text-xl font-bold">OFFICIAL ASSET DISPOSAL CERTIFICATE</h3>
        </header>
        <p class="mt-6"><strong>Certificate No.:</strong> ${escapeHtml(caseRecord.certificate_no)}</p>
        <p><strong>Issued:</strong> ${escapeHtml(caseRecord.certificate_issued_at || '')}</p>
        <p><strong>Committee decision:</strong> Approved ${escapeHtml(caseRecord.disposition)} proposal</p>
        <table><tbody>
            <tr><th>Asset tag</th><td>${escapeHtml(caseRecord.asset_id)}</td></tr>
            <tr><th>Description</th><td>${escapeHtml(caseRecord.asset_name)}</td></tr>
            <tr><th>Category / serial</th><td>${escapeHtml(caseRecord.category)} / ${escapeHtml(caseRecord.serial || '')}</td></tr>
            <tr><th>Condition</th><td>${escapeHtml(caseRecord.condition)}</td></tr>
            <tr><th>Campus / department</th><td>${escapeHtml(caseRecord.campus)} / ${escapeHtml(caseRecord.department)}</td></tr>
            <tr><th>Recorded value</th><td>${parseFloat(caseRecord.cost || 0).toLocaleString()} ETB</td></tr>
            <tr><th>Inspection findings</th><td>${escapeHtml(caseRecord.inspection_findings || '')}</td></tr>
            <tr><th>Committee notes</th><td>${escapeHtml(caseRecord.decision_notes || '')}</td></tr>
        </tbody></table>
        <p>This certificate records committee authorization for the stated disposal method. It is not evidence that the physical disposal has been completed.</p>
        <div class="mt-12 border-t pt-4">
            <p><strong>Committee member:</strong> ${escapeHtml(caseRecord.signer_name || '')}</p>
            <p><strong>Recorded electronic acknowledgement:</strong> ${escapeHtml(caseRecord.decided_at || '')}</p>
            <p class="mt-8">Committee member signature: ______________________________</p>
            <p class="mt-8">Witness / authorized officer: ______________________________</p>
        </div>`;
    printContent('disposal-certificate');
}

// Render Inventory Physical Audit Checklist
function renderAuditSection() {
    const checklist = document.getElementById('auditChecklist');
    const summary = document.getElementById('audit-session-summary');
    const startScanButton = document.getElementById('startAuditScannerButton');
    checklist.innerHTML = '';
    startScanButton.disabled = !physicalCountSession;

    if (!physicalCountSession) {
        document.getElementById('audit-expected').textContent = '0 Units';
        document.getElementById('audit-verified').textContent = '0 Units';
        document.getElementById('audit-missing').textContent = '0 Units';
        document.getElementById('audit-pending').textContent = '0 Units';
        summary.textContent = physicalCountLoadError || 'No physical count session is active.';
        checklist.innerHTML = physicalCountLoadError
            ? '<p class="text-sm text-rose-600">Apply the physical count table definitions from schema.sql, then reload this page.</p>'
            : '<p class="text-sm text-slate-500">Start a physical count session to create a checklist from the current asset register.</p>';
        return;
    }

    const sessionDate = new Date(physicalCountSession.started_at.replace(' ', 'T')).toLocaleString();
    summary.textContent = `Active session #${physicalCountSession.id} started ${sessionDate}.`;
    document.getElementById('audit-expected').textContent = `${physicalCountSession.items.length} Units`;

    physicalCountSession.items.forEach(item => {
        const isVerified = item.is_verified === true;
        checklist.innerHTML += `
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div class="flex items-center gap-3">
                    <input type="checkbox" data-asset-id="${escapeHtml(item.asset_id)}" data-count-state="${item.is_verified === null ? 'pending' : item.is_verified ? 'true' : 'false'}" onchange="updateAuditItem(this.dataset.assetId, this)" class="audit-check w-4 h-4 rounded text-indigo-600" ${isVerified ? 'checked' : ''}>
                    <div>
                        <p class="font-bold">${escapeHtml(item.asset_name)} (${escapeHtml(item.asset_id)})</p>
                        <p class="text-slate-400">${escapeHtml(item.campus)} • ${escapeHtml(item.building)} (${escapeHtml(item.room)})</p>
                    </div>
                </div>
                <span class="audit-status px-2 py-0.5 rounded font-bold ${isVerified ? 'bg-emerald-100 text-emerald-700' : item.is_verified === false ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">${isVerified ? 'Verified' : item.is_verified === false ? 'Marked missing' : 'Pending verification'}</span>
            </div>
        `;
    });
    updateAuditCounts();
}

async function startAuditScanner() {
    const reader = document.getElementById('auditScannerReader');
    const startButton = document.getElementById('startAuditScannerButton');
    const stopButton = document.getElementById('stopAuditScannerButton');
    if (!physicalCountSession) {
        showAuditScanMessage('Start a physical count session before scanning asset tags.', 'error');
        return;
    }
    if (typeof Html5Qrcode === 'undefined') {
        showAuditScanMessage('The QR scanner library could not be loaded. Verify assets manually.', 'error');
        return;
    }
    if (!window.isSecureContext) {
        showAuditScanMessage('Camera access requires a secure page. Open PAMS through http://localhost or HTTPS, or verify assets manually.', 'error');
        return;
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        showAuditScanMessage('This browser does not support camera access. Verify assets manually.', 'error');
        return;
    }

    startButton.disabled = true;
    reader.classList.remove('hidden');
    try {
        auditScanner = auditScanner || new Html5Qrcode('auditScannerReader');
        const scanOptions = { fps: 10, qrbox: { width: 240, height: 180 } };
        try {
            await auditScanner.start(
                { facingMode: 'environment' },
                scanOptions,
                handleAuditQrScan,
                () => {}
            );
        } catch (facingModeError) {
            const cameras = await Html5Qrcode.getCameras();
            if (!cameras.length) throw facingModeError;
            const camera = cameras.find(({ label }) => /back|rear|environment/i.test(label)) || cameras[0];
            await auditScanner.start(camera.id, scanOptions, handleAuditQrScan, () => {});
        }
        stopButton.classList.remove('hidden');
        showAuditScanMessage('Camera ready. Scan an asset QR tag to count it as present.', 'success');
    } catch (err) {
        reader.classList.add('hidden');
        console.error('Could not start inventory audit camera:', err);
        const cameraError = err?.name;
        const errorText = String(err?.message || err || '');
        const message = cameraError === 'NotAllowedError' || cameraError === 'PermissionDeniedError' || /permission|denied/i.test(errorText)
            ? 'Camera permission is blocked. Allow camera access for this site, then try again, or verify assets manually.'
            : cameraError === 'NotFoundError' || cameraError === 'DevicesNotFoundError' || /no camera|camera.*not found/i.test(errorText)
                ? 'No camera was found on this device. Connect a camera or verify assets manually.'
                : cameraError === 'NotReadableError' || cameraError === 'TrackStartError'
                    ? 'The camera is already in use by another app. Close it and try again, or verify assets manually.'
                    : 'Could not start the camera. Check browser permissions and camera availability, or verify assets manually.';
        showAuditScanMessage(message, 'error');
    } finally {
        startButton.disabled = Boolean(auditScanner && auditScanner.isScanning);
    }
}

function extractAssetIdFromQrPayload(decodedText) {
    const rawText = String(decodedText || '').trim();
    if (!rawText) return '';

    const normalized = rawText.replace(/\r/g, '');
    const matchPatterns = [
        /(?:asset\s*id|tag\s*id|id)\s*[:=]\s*([^\r\n]+)/i,
        /\b[A-Z]{2,}-[A-Z0-9-]+\b/i,
        /\b[A-Z0-9]{3,}-\d+\b/i
    ];

    for (const pattern of matchPatterns) {
        const match = normalized.match(pattern);
        if (match) {
            const value = (match[1] || match[0]).trim().toUpperCase();
            if (value && !/^(MAIN|IT|N\/A|APPLIED|CAMPUS|CUSTODIAN|SERIAL|DEBRE|MARKOS|UNIVERSITY)$/i.test(value)) {
                return value;
            }
        }
    }

    return rawText.toUpperCase();
}

async function startWarehouseScanner() {
    const reader = document.getElementById('warehouseScannerReader');
    const startButton = document.getElementById('startWarehouseScannerButton');
    const stopButton = document.getElementById('stopWarehouseScannerButton');
    if (typeof Html5Qrcode === 'undefined') {
        showWarehouseScanMessage('The QR scanner library could not be loaded.', 'error');
        return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        showWarehouseScanMessage('Camera scanning requires localhost or HTTPS and a browser with camera support.', 'error');
        return;
    }

    startButton.disabled = true;
    reader.classList.remove('hidden');
    try {
        warehouseScanner = warehouseScanner || new Html5Qrcode('warehouseScannerReader');
        const scanOptions = { fps: 10, qrbox: { width: 240, height: 180 } };
        try {
            await warehouseScanner.start({ facingMode: 'environment' }, scanOptions, handleWarehouseQrScan, () => {});
        } catch (facingModeError) {
            const cameras = await Html5Qrcode.getCameras();
            if (!cameras.length) throw facingModeError;
            const camera = cameras.find(({ label }) => /back|rear|environment/i.test(label)) || cameras[0];
            await warehouseScanner.start(camera.id, scanOptions, handleWarehouseQrScan, () => {});
        }
        stopButton.classList.remove('hidden');
        showWarehouseScanMessage('Camera ready. Scan a printed asset tag.', 'success');
    } catch (err) {
        reader.classList.add('hidden');
        console.error('Could not start warehouse QR scanner:', err);
        const text = /permission|denied/i.test(String(err?.message || err))
            ? 'Camera permission is blocked. Allow camera access for this site, then try again.'
            : 'Could not start the camera. Check browser permissions and camera availability.';
        showWarehouseScanMessage(text, 'error');
    } finally {
        startButton.disabled = Boolean(warehouseScanner && warehouseScanner.isScanning);
    }
}

async function handleWarehouseQrScan(decodedText) {
    const now = Date.now();
    if (warehouseScanInProgress || (decodedText === lastWarehouseScannedText && now - lastWarehouseScanAt < 1800)) return;
    warehouseScanInProgress = true;
    lastWarehouseScannedText = decodedText;
    lastWarehouseScanAt = now;
    try {
        const qrData = parseAssetQrPayload(decodedText);
        const scannedAssetId = qrData.id.trim().toUpperCase();
        const asset = warehouseData.assets.find(entry => String(entry.id).toUpperCase() === scannedAssetId)
            || assets.find(entry => String(entry.id).toUpperCase() === scannedAssetId)
            || null;
        renderWarehouseScanDetails(asset, qrData);
        if (asset) {
            showWarehouseScanMessage(`Asset ${asset.id} found. Full asset information is shown below.`, 'success');
        } else {
            showWarehouseScanMessage('QR details were read, but this asset is not in the current warehouse list.', 'error');
        }
    } catch (err) {
        console.error('Could not read warehouse asset QR code:', err);
        showWarehouseScanMessage('Could not read this QR code. Try scanning the printed asset tag again.', 'error');
    } finally {
        warehouseScanInProgress = false;
    }
}

async function stopWarehouseScanner() {
    const reader = document.getElementById('warehouseScannerReader');
    const stopButton = document.getElementById('stopWarehouseScannerButton');
    const startButton = document.getElementById('startWarehouseScannerButton');
    if (warehouseScanner && warehouseScanner.isScanning) {
        try {
            await warehouseScanner.stop();
        } catch (err) {
            console.error('Could not stop warehouse QR scanner:', err);
            showWarehouseScanMessage('The camera scanner could not be stopped cleanly. Close this page to release camera access.', 'error');
        }
    }
    if (!warehouseScanner || !warehouseScanner.isScanning) {
        reader.classList.add('hidden');
        stopButton.classList.add('hidden');
        startButton.disabled = false;
    }
}

function showWarehouseScanMessage(message, type) {
    const result = document.getElementById('warehouseScanMessage');
    result.textContent = message;
    result.classList.remove('hidden', 'text-rose-700', 'text-emerald-700');
    result.classList.add(type === 'error' ? 'text-rose-700' : 'text-emerald-700');
}

function parseAssetQrPayload(decodedText) {
    const lines = String(decodedText || '').replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean);
    const fields = {};
    lines.forEach(line => {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (match) fields[match[1].trim().toLowerCase()] = match[2].trim();
    });
    const campus = fields.campus || '';
    const campusParts = campus.match(/^(.*?)\s*\((.*?)\)\s*$/);
    return {
        id: extractAssetIdFromQrPayload(decodedText),
        name: lines.length >= 3 && /debre markos university/i.test(lines[0]) ? lines[2] : '',
        category: fields.category || '',
        campus: campusParts ? campusParts[1].trim() : campus,
        department: campusParts ? campusParts[2].trim() : '',
        custodian: fields.custodian || '',
        serial: fields['serial no'] || fields['serial number'] || '',
        condition: fields.condition || '',
        status: fields['asset status'] || '',
        stockStatus: fields['stock status'] || '',
        storageLocation: fields['storage location'] || '',
        cost: fields['acquisition cost'] || '',
        acquisitionDate: fields['acquisition date'] || '',
        building: fields.building || '',
        room: fields.room || '',
        purchaseOrder: fields['purchase order'] || '',
        goodsReceiptNote: fields['goods receipt note'] || '',
        tagStatus: fields['physical tag status'] || ''
    };
}

function renderAssetScanDetails(panelId, gridId, asset, qrData, extraDetails = []) {
    const panel = document.getElementById(panelId);
    const grid = document.getElementById(gridId);
    if (!panel || !grid) return;

    const value = (...candidates) => {
        const found = candidates.find(candidate => candidate !== null && candidate !== undefined && String(candidate).trim() !== '');
        return found === undefined ? 'Not provided' : String(found);
    };
    const details = [
        ['Asset ID', value(asset?.id, asset?.asset_id, qrData.id)],
        ['Asset name', value(asset?.name, asset?.asset_name, qrData.name)],
        ['Category', value(asset?.category, qrData.category)],
        ['Serial number', value(asset?.serial, qrData.serial)],
        ['Campus', value(asset?.campus, qrData.campus)],
        ['Department', value(asset?.department, qrData.department)],
        ['Building', value(asset?.building, qrData.building)],
        ['Room', value(asset?.room, qrData.room)],
        ['Custodian', value(asset?.custodian, qrData.custodian)],
        ['Acquisition cost (ETB)', value(asset?.cost, qrData.cost)],
        ['Acquisition date', value(asset?.acq_date, qrData.acquisitionDate)],
        ['Condition', value(asset?.condition, qrData.condition)],
        ['Asset status', value(asset?.status, qrData.status)],
        ['Stock status', value(asset?.stock_status, qrData.stockStatus)],
        ['Storage location', value(asset?.storage_location, qrData.storageLocation)],
        ['Purchase order', value(asset?.purchase_order_id, qrData.purchaseOrder)],
        ['Goods receipt note', value(asset?.goods_receipt_note_id, qrData.goodsReceiptNote)],
        ['Physical tag status', value(asset?.tagged_at ? `Applied ${asset.tagged_at}` : '', qrData.tagStatus)],
        ...extraDetails
    ];

    grid.innerHTML = details.map(([label, detail]) => `
        <div>
            <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">${escapeHtml(label)}</dt>
            <dd class="font-semibold break-words">${escapeHtml(detail)}</dd>
        </div>
    `).join('');
    panel.classList.remove('hidden');
}

function renderAuditScanDetails(asset, qrData, countStatus) {
    renderAssetScanDetails('auditScanDetails', 'auditScanDetailsGrid', asset, qrData, [
        ['Physical count', countStatus || 'Not recorded']
    ]);
}

function renderWarehouseScanDetails(asset, qrData) {
    renderAssetScanDetails('warehouseScanDetails', 'warehouseScanDetailsGrid', asset, qrData);
}

function buildAssetQrPayload(item) {
    const assetId = item?.id || 'Unknown asset';
    const assetName = item?.name || 'Unknown item';
    const campus = item?.campus || 'N/A';
    const department = item?.department || 'N/A';
    const custodian = item?.custodian || 'N/A';
    const serial = item?.serial || 'N/A';
    const category = item?.category || 'N/A';
    const building = item?.building || 'N/A';
    const room = item?.room || 'N/A';
    const acquisitionCost = item?.cost ?? 'N/A';
    const acquisitionDate = item?.acq_date || 'N/A';
    const condition = item?.condition || 'N/A';
    const status = item?.status || 'N/A';
    const stockStatus = item?.stock_status || 'N/A';
    const storageLocation = item?.storage_location || 'N/A';
    const purchaseOrder = item?.purchase_order_id || 'N/A';
    const goodsReceiptNote = item?.goods_receipt_note_id || 'N/A';
    const tagStatus = item?.tagged_at ? `Applied ${item.tagged_at}` : 'Not yet applied';

    return [
        'Debre Markos University',
        `Asset ID: ${assetId}`,
        assetName,
        `Category: ${category}`,
        `Campus: ${campus} (${department})`,
        `Building: ${building}`,
        `Room: ${room}`,
        `Custodian: ${custodian}`,
        `Serial No: ${serial}`,
        `Acquisition cost: ${acquisitionCost}`,
        `Acquisition date: ${acquisitionDate}`,
        `Condition: ${condition}`,
        `Asset status: ${status}`,
        `Stock status: ${stockStatus}`,
        `Storage location: ${storageLocation}`,
        `Purchase order: ${purchaseOrder}`,
        `Goods receipt note: ${goodsReceiptNote}`,
        `Physical tag status: ${tagStatus}`
    ].join('\n');
}

async function handleAuditQrScan(decodedText) {
    if (auditScanInProgress) return;
    auditScanInProgress = true;
    try {
        const qrData = parseAssetQrPayload(decodedText);
        const scannedAssetId = qrData.id.trim().toUpperCase();
        const item = physicalCountSession?.items.find(
            entry => entry.asset_id.toUpperCase() === scannedAssetId
        );
        const asset = assets.find(entry => entry.id.toUpperCase() === scannedAssetId)
            || warehouseData.assets.find(entry => entry.id.toUpperCase() === scannedAssetId)
            || item;
        if (!item) {
            renderAuditScanDetails(asset, qrData, 'Not included in the active physical count session');
            showAuditScanMessage(`No asset with ID "${scannedAssetId}" is in this count session.`, 'error');
            return;
        }
        if (item.is_verified === true) {
            renderAuditScanDetails(asset, qrData, 'Already counted as present');
            showAuditScanMessage(`${item.asset_id} was already counted as present.`, 'success');
            return;
        }

        const checkbox = [...document.querySelectorAll('.audit-check')]
            .find(entry => entry.dataset.assetId === item.asset_id);
        if (!checkbox) {
            throw new Error('The matching asset is not available in the audit checklist.');
        }
        checkbox.checked = true;
        const saved = await updateAuditItem(item.asset_id, checkbox);
        if (saved) {
            renderAuditScanDetails(asset, qrData, 'Counted as present');
            showAuditScanMessage(`${item.asset_id} counted as present. Scan the next asset tag.`, 'success');
        }
    } catch (err) {
        console.error('Could not record scanned inventory asset:', err);
        showAuditScanMessage(`Could not count scanned asset: ${err.message}`, 'error');
    } finally {
        auditScanInProgress = false;
    }
}

async function stopAuditScanner() {
    const reader = document.getElementById('auditScannerReader');
    const stopButton = document.getElementById('stopAuditScannerButton');
    const startButton = document.getElementById('startAuditScannerButton');
    if (auditScanner && auditScanner.isScanning) {
        try {
            await auditScanner.stop();
        } catch (err) {
            console.error('Could not stop inventory audit camera:', err);
            showAuditScanMessage('The camera scanner could not be stopped cleanly. Close this page to release camera access.', 'error');
        }
    }
    if (!auditScanner || !auditScanner.isScanning) {
        reader.classList.add('hidden');
        stopButton.classList.add('hidden');
        startButton.disabled = false;
    }
}

function showAuditScanMessage(message, type) {
    const result = document.getElementById('auditScanMessage');
    result.textContent = message;
    result.classList.remove('hidden', 'text-rose-700', 'text-emerald-700');
    result.classList.add(type === 'error' ? 'text-rose-700' : 'text-emerald-700');
}

function updateAuditCounts() {
    const checks = [...document.querySelectorAll('.audit-check')];
    const verified = checks.filter(check => check.checked).length;
    const missing = checks.filter(check => check.dataset.countState === 'false').length;
    const pending = checks.filter(check => check.dataset.countState === 'pending').length;
    document.getElementById('audit-verified').textContent = `${verified} Units`;
    document.getElementById('audit-missing').textContent = `${missing} Units`;
    document.getElementById('audit-pending').textContent = `${pending} Units`;
    checks.forEach(check => {
        const status = check.closest('div.p-3').querySelector('.audit-status');
        const verifiedNow = check.dataset.countState === 'true';
        const missingNow = check.dataset.countState === 'false';
        status.textContent = verifiedNow ? 'Verified' : missingNow ? 'Marked missing' : 'Pending verification';
        status.classList.toggle('bg-emerald-100', verifiedNow);
        status.classList.toggle('text-emerald-700', verifiedNow);
        status.classList.toggle('bg-rose-100', missingNow);
        status.classList.toggle('text-rose-700', missingNow);
        status.classList.toggle('bg-amber-100', !verifiedNow && !missingNow);
        status.classList.toggle('text-amber-700', !verifiedNow && !missingNow);
    });
}

async function updateAuditItem(assetId, checkbox) {
    const checked = checkbox.checked;
    checkbox.disabled = true;
    try {
        await requestJson('api/physical-count.php', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: physicalCountSession.id,
                assetId,
                isVerified: checked
            })
        });
        const item = physicalCountSession.items.find(entry => entry.asset_id === assetId);
        checkbox.dataset.countState = checked ? 'true' : 'false';
        if (item) item.is_verified = checked;
        updateAuditCounts();
        if (currentUser.role === 'internal_auditor'
            && auditorData.latestPhysicalCount?.id === physicalCountSession.id) {
            const items = physicalCountSession.items;
            auditorData.latestPhysicalCount.verified_count = items.filter(entry => entry.is_verified === true).length;
            auditorData.latestPhysicalCount.missing_count = items.filter(entry => entry.is_verified === false).length;
            auditorData.latestPhysicalCount.pending_count = items.filter(entry => entry.is_verified === null).length;
            renderAuditorWorkspace();
        }
        return true;
    } catch (err) {
        checkbox.checked = !checked;
        console.error('Failed to update physical count item:', err);
        showToast(`Could not save count result: ${err.message}`);
        return false;
    } finally {
        checkbox.disabled = false;
    }
}

async function startAuditSession() {
    if (physicalCountSession && !window.confirm('Starting a new count will complete the current session. Its saved results will be kept. Continue?')) {
        return;
    }

    const button = document.getElementById('startAuditSessionButton');
    button.disabled = true;
    try {
        const result = await requestJson('api/physical-count.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        physicalCountSession = result.data;
        renderAuditSection();
        if (currentUser.role === 'internal_auditor') {
            auditorData.latestPhysicalCount = {
                id: physicalCountSession.id,
                status: physicalCountSession.status,
                started_at: physicalCountSession.started_at,
                expected_count: physicalCountSession.items.length,
                verified_count: 0,
                missing_count: 0,
                pending_count: physicalCountSession.items.length
            };
            renderAuditorWorkspace();
        }
        showToast(`Physical count session #${physicalCountSession.id} started.`);
    } catch (err) {
        console.error('Failed to start physical count session:', err);
        showToast(`Could not start physical count: ${err.message}`);
    } finally {
        button.disabled = false;
    }
}

// Populate Modal Dropdown Options dynamically
function populateAssetSelects() {
    const selTransfer = document.getElementById('transfer-asset-select');
    const selMaint = document.getElementById('maint-asset-select');

    selTransfer.innerHTML = '<option value="">-- Choose Asset --</option>';
    selMaint.innerHTML = '<option value="">-- Choose Asset --</option>';

    assets.forEach(a => {
        selTransfer.innerHTML += `<option value="${escapeHtml(a.id)}">${escapeHtml(a.id)} - ${escapeHtml(a.name)} (${escapeHtml(a.campus)})</option>`;
        selMaint.innerHTML += `<option value="${escapeHtml(a.id)}">${escapeHtml(a.id)} - ${escapeHtml(a.name)}</option>`;
    });
}

// Modal View Asset Tag & QRCode Generation
function viewTagModal(id) {
    const item = assets.find(a => a.id === id) || warehouseData.assets.find(a => a.id === id);
    if (!item) return;

    currentTagAssetId = item.id;
    document.getElementById('tag-id').textContent = item.id;
    document.getElementById('tag-name').textContent = item.name;
    document.getElementById('tag-campus').textContent = `${item.campus} (${item.department})`;
    document.getElementById('tag-custodian').textContent = item.custodian;
    document.getElementById('tag-serial').textContent = item.serial;
    document.getElementById('tag-status').textContent = item.tagged_at
        ? `Applied ${item.tagged_at}`
        : 'Not yet applied';
    document.getElementById('markTagAppliedButton').classList.toggle(
        'hidden',
        !['system_admin', 'property_admin', 'storekeeper'].includes(currentUser.role)
    );

    // Render QR Code inside tag container using the full asset details for readability when scanned.
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    const qrPayload = buildAssetQrPayload(item);
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, { text: qrPayload, width: 180, height: 180 });
    } else {
        qrContainer.textContent = qrPayload;
    }

    openModal('viewTagModal');
}

async function markAssetTagApplied() {
    if (!currentTagAssetId) {
        showToast('Select an asset before marking its tag applied.');
        return;
    }
    try {
        const result = await requestJson('api/warehouse.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark-tagged', assetId: currentTagAssetId })
        });
        showToast(result.message);
        await loadAllData();
        const updatedAsset = assets.find(asset => asset.id === currentTagAssetId)
            || warehouseData.assets.find(asset => asset.id === currentTagAssetId);
        document.getElementById('tag-status').textContent = updatedAsset?.tagged_at
            ? `Applied ${updatedAsset.tagged_at}`
            : 'Applied';
    } catch (err) {
        console.error('Could not update the asset tag status:', err);
        showToast(`Could not mark the asset tag applied: ${err.message}`);
    }
}

// Modal View Gate Pass Voucher
function openGatePassModal(id) {
    const tr = transfers.find(t => t.id === id);
    if (!tr) return;

    document.getElementById('gp-num').textContent = tr.gate_pass;
    document.getElementById('gp-date').textContent = tr.transfer_date;
    document.getElementById('gp-assetName').textContent = tr.asset_name;
    document.getElementById('gp-assetId').textContent = tr.asset_id;
    document.getElementById('gp-origin').textContent = `${tr.from_campus} (${tr.from_dept})`;
    document.getElementById('gp-dest').textContent = `${tr.to_campus} (${tr.to_dept})`;
    document.getElementById('gp-officer').textContent = tr.requested_by;
    const qrContainer = document.getElementById('gp-qrcode');
    qrContainer.innerHTML = '';
    const qrPayload = buildGatePassQrPayload(tr);
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, { text: qrPayload, width: 180, height: 180 });
    } else {
        qrContainer.textContent = qrPayload;
    }

    openModal('gatePassModal');
}

function buildGatePassQrPayload(transfer) {
    return [
        'Debre Markos University Gate Pass',
        `Gate Pass: ${transfer.gate_pass || 'N/A'}`,
        `Transfer ID: ${transfer.id || 'N/A'}`,
        `Asset ID: ${transfer.asset_id || 'N/A'}`,
        `Asset Name: ${transfer.asset_name || 'N/A'}`,
        `Transfer Date: ${transfer.transfer_date || 'N/A'}`,
        `From: ${transfer.from_campus || 'N/A'} (${transfer.from_dept || 'N/A'})`,
        `To: ${transfer.to_campus || 'N/A'} (${transfer.to_dept || 'N/A'})`,
        `Requested By: ${transfer.requested_by || 'N/A'}`,
        `Approval Status: ${transfer.status || 'N/A'}`
    ].join('\n');
}

async function flagDisposal(id) {
    try {
        const result = await requestJson('api/assets.php', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetId: id })
        });
        showToast(result.message);
        await loadAllData();
    } catch (err) {
        console.error('Failed to flag asset for disposal:', err);
        showToast(`Could not flag asset: ${err.message}`);
    }
}

async function deleteAsset(id) {
    const item = assets.find(asset => asset.id === id);
    if (!item || !window.confirm(`Permanently delete "${item.name}" (${item.id})? Assets with linked records cannot be deleted.`)) {
        return;
    }

    try {
        const result = await requestJson('api/assets.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetId: id })
        });
        showToast(result.message);
        await loadAllData();
    } catch (err) {
        console.error('Failed to delete asset:', err);
        showToast(`Could not delete asset: ${err.message}`);
    }
}

async function setAssetReviewFlag(id, flagged) {
    try {
        const result = await requestJson('api/assets.php', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'review-flag', assetId: id, flagged })
        });
        showToast(result.message);
        await loadAllData();
    } catch (err) {
        console.error('Failed to update asset review flag:', err);
        showToast(`Could not update review flag: ${err.message}`);
    }
}

// Submit Handlers
async function handleCreateAsset(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
        const payload = {
            name: document.getElementById('new-name').value,
            serial: document.getElementById('new-serial').value,
            category: document.getElementById('new-category').value,
            campus: document.getElementById('new-campus').value,
            department: document.getElementById('new-department').value,
            building: document.getElementById('new-building').value,
            room: document.getElementById('new-room').value,
            custodian: document.getElementById('new-custodian').value,
            cost: document.getElementById('new-cost').value,
            acqDate: document.getElementById('new-acqDate').value,
            condition: document.getElementById('new-condition').value
        };

        const data = await requestJson('api/assets.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showToast(`${data.message} Asset ID: ${data.id}`);
        closeModal('addAssetModal');
        e.target.reset();
        await loadAllData();
    } catch (err) {
        console.error('Failed to register asset:', err);
        showToast(`Could not register asset: ${err.message}`);
    } finally {
        submitButton.disabled = false;
    }
}

async function handleCreateTransfer(e) {
    e.preventDefault();
    try {
        const assetId = document.getElementById('transfer-asset-select').value;
        if (!assets.some(asset => asset.id === assetId)) {
            throw new Error('Select a valid asset before creating a transfer.');
        }
        const payload = {
            assetId,
            toCampus: document.getElementById('transfer-toCampus').value,
            toDept: document.getElementById('transfer-toDept').value,
            requestedBy: document.getElementById('transfer-requestedBy').value
        };

        const data = await requestJson('api/transfers.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showToast(`Transfer order logged. Gate Pass ${data.gatePass} generated.`);
        closeModal('transferModal');
        e.target.reset();
        await loadAllData();
    } catch (err) {
        console.error('Failed to create transfer:', err);
        showToast(`Could not create transfer: ${err.message}`);
    }
}

async function handleCreateMaintenance(e) {
    e.preventDefault();
    try {
        const assetId = document.getElementById('maint-asset-select').value;
        if (!assets.some(asset => asset.id === assetId)) {
            throw new Error('Select a valid asset before logging maintenance.');
        }
        const payload = {
            assetId,
            priority: document.getElementById('maint-priority').value,
            issue: document.getElementById('maint-issue').value,
            reportedBy: document.getElementById('maint-reportedBy').value,
            technician: document.getElementById('maint-technician').value,
            estimatedCost: document.getElementById('maint-cost').value,
            spareParts: document.getElementById('maint-parts').value
        };

        const data = await requestJson('api/maintenance.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showToast(data.message);
        closeModal('maintenanceModal');
        e.target.reset();
        await loadAllData();
    } catch (err) {
        console.error('Failed to log maintenance:', err);
        showToast(`Could not log maintenance: ${err.message}`);
    }
}
