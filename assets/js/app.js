// Global State Variables
let assets = [];
let transfers = [];
let maintenance = [];
let physicalCountSession = null;
let physicalCountLoadError = '';
let currentUser = null;
let csrfToken = '';
let authenticationMode = 'login';
let gateScanner = null;
let gateScanInProgress = false;
let auditScanner = null;
let auditScanInProgress = false;
let campusChartInstance = null;
let conditionChartInstance = null;

const amharicTranslations = {
    'Language / ቋንቋ': 'ቋንቋ',
    'Select language': 'ቋንቋ ይምረጡ',
    'Sign in to PAMS': 'ወደ PAMS ይግቡ',
    'Use your assigned DMU account.': 'የተመደበልዎትን የDMU መለያ ይጠቀሙ።',
    'Create the first administrator': 'የመጀመሪያውን አስተዳዳሪ ይፍጠሩ',
    'Initial setup is open because no user accounts exist. This creates the System Administrator account.': 'ምንም የተጠቃሚ መለያ ስለሌለ የመጀመሪያ ማዋቀር ክፍት ነው። ይህ የስርዓት አስተዳዳሪ መለያ ይፈጥራል።',
    'Create Administrator Account': 'የአስተዳዳሪ መለያ ይፍጠሩ',
    'Administrator full name': 'የአስተዳዳሪው ሙሉ ስም',
    'Username': 'የተጠቃሚ ስም',
    'Password': 'የይለፍ ቃል',
    'Use at least 12 characters for the first administrator password.': 'ለመጀመሪያው አስተዳዳሪ የይለፍ ቃል ቢያንስ 12 ቁምፊዎችን ይጠቀሙ።',
    'Sign in': 'ግባ',
    'Sign out': 'ውጣ',
    'Fiscal Year': 'የበጀት ዓመት',
    'Active Custodians': 'ንቁ ኃላፊዎች',
    'Dashboard': 'ዳሽቦርድ',
    'Asset Registry': 'የንብረት መዝገብ',
    'Issuance & Transfers': 'ርክክብ እና ዝውውር',
    'Maintenance & Repairs': 'ጥገና እና ማስተካከያ',
    'Depreciation & Disposal': 'የዋጋ ቅናሽ እና ማስወገድ',
    'Inventory Audit': 'የንብረት ቆጠራ ኦዲት',
    'DMU Reports Generator': 'የDMU ሪፖርት ማዘጋጃ',
    'User & Role Management': 'የተጠቃሚ እና ሚና አስተዳደር',
    'System Audit Logs': 'የስርዓት ኦዲት መዝገቦች',
    'DMU Executive Asset Dashboard': 'የDMU ንብረት አስተዳደር ዳሽቦርድ',
    'Central overview for DMU property governance, departmental operations, technical services, and gate transit.': 'የDMU ንብረት አስተዳደር፣ የመምሪያ ሥራዎች፣ የቴክኒክ አገልግሎቶች እና የግቢ መግቢያ እንቅስቃሴዎች አጠቃላይ እይታ።',
    '+ Add Asset': '+ ንብረት ጨምር',
    'Transfer Item': 'ንብረት አዛውር',
    'Log Repair': 'ጥገና መዝግብ',
    'Total Valuation': 'ጠቅላላ ግምት ዋጋ',
    'Capital Assets': 'ቋሚ ንብረቶች',
    'Registered Assets': 'የተመዘገቡ ንብረቶች',
    'Items Tracked': 'ክትትል የሚደረግባቸው ዕቃዎች',
    'Active & Assigned': 'ንቁ እና የተመደቡ',
    'In Active Use': 'በአገልግሎት ላይ',
    'Assets Requiring Maintenance': 'ጥገና የሚያስፈልጋቸው ንብረቶች',
    'Damaged / Under Repair': 'የተበላሹ / በጥገና ላይ',
    'Pending Disposal': 'ለማስወገድ የሚጠብቁ',
    'Obsolete Equipment': 'ጊዜ ያለፈባቸው መሣሪያዎች',
    'DMU Central Management — Role Responsibilities': 'የDMU ማዕከላዊ አስተዳደር — የሚና ኃላፊነቶች',
    'Workflow guidance only. User accounts, authentication, and role-enforced permissions are not configured in this version.': 'ይህ የሥራ ሂደት መመሪያ ብቻ ነው። በዚህ ስሪት የተጠቃሚ መለያዎች፣ ማረጋገጫ እና በሚና ላይ የተመሠረቱ ፈቃዶች አልተዋቀሩም።',
    'System Administrator': 'የስርዓት አስተዳዳሪ',
    'Property Admin / Stock Officer': 'የንብረት አስተዳዳሪ / የእቃ ጠባቂ',
    'Department Head / Dean': 'የመምሪያ ኃላፊ / ዲን',
    'Maintenance / IT Technician': 'የጥገና / የIT ቴክኒሻን',
    'Gate Security Officer': 'የበር ጥበቃ ኃላፊ',
    'Campus Valuation Breakdown (ETB Millions)': 'በግቢ የተከፋፈለ የንብረት ግምት ዋጋ (ሚሊዮን ብር)',
    'Total monetary value of equipment distributed per DMU campus': 'በእያንዳንዱ የDMU ግቢ የተመደቡ መሣሪያዎች ጠቅላላ የገንዘብ ዋጋ',
    'Asset Health & Condition': 'የንብረት ጤና እና ሁኔታ',
    'Physical condition status ratio': 'የአካላዊ ሁኔታ ሁኔታ መጠን',
    'Search Tag ID, Asset Name, Custodian, Serial...': 'መለያ ቁጥር፣ የንብረት ስም፣ ኃላፊ ወይም መለያ ቁጥር ፈልግ...',
    '+ Register New Property': '+ አዲስ ንብረት መዝግብ',
    'Filter Campus': 'በግቢ አጣራ',
    'All Campuses': 'ሁሉም ግቢዎች',
    'Filter Category': 'በምድብ አጣራ',
    'All Categories': 'ሁሉም ምድቦች',
    'Filter Condition': 'በሁኔታ አጣራ',
    'All Conditions': 'ሁሉም ሁኔታዎች',
    'Asset Tag & Name': 'የንብረት መለያ እና ስም',
    'Category': 'ምድብ',
    'Location / Campus': 'ቦታ / ግቢ',
    'Custodian': 'ኃላፊ',
    'Cost (ETB)': 'ዋጋ (ብር)',
    'Condition': 'ሁኔታ',
    'Actions': 'ድርጊቶች',
    'Inter-Department & Campus Transfers': 'በመምሪያ እና በግቢ መካከል ዝውውር',
    'Track movement of university equipment between faculties and generate official Gate Passes.': 'በፋኩልቲዎች መካከል የዩኒቨርሲቲ መሣሪያዎችን እንቅስቃሴ ይከታተሉ እና ይፋዊ የመውጫ ፈቃዶችን ያዘጋጁ።',
    'Expected Registered Items': 'የሚጠበቁ የተመዘገቡ ዕቃዎች',
    'Verified Present': 'መኖራቸው የተረጋገጠ',
    'Discrepancy / Unaccounted': 'ልዩነት / ያልተገኙ',
    'Audit Checklist & Location Log': 'የኦዲት ማረጋገጫ ዝርዝር እና የቦታ መዝገብ',
    'DMU Property Administration Reports': 'የDMU ንብረት አስተዳደር ሪፖርቶች',
    'Annual Property Inventory Summary': 'ዓመታዊ የንብረት ቆጠራ ማጠቃለያ',
    'Print Full Master Ledger': 'ሙሉ ዋና መዝገብ አትም',
    'Departmental Custodian Clearance': 'የመምሪያ ንብረት ኃላፊ ማጣሪያ',
    'Print Clearance Form': 'የማጣሪያ ቅጽ አትም',
    'Name': 'ስም',
    'Role': 'ሚና',
    'Department': 'መምሪያ',
    'Status': 'ሁኔታ',
    'Action': 'ድርጊት',
    'Time': 'ሰዓት',
    'User': 'ተጠቃሚ',
    'Details': 'ዝርዝሮች',
    'Main Campus': 'ዋና ግቢ',
    'Health Sciences': 'የጤና ሳይንስ',
    'Technology Institute': 'የቴክኖሎጂ ተቋም',
    'Agriculture Campus': 'የግብርና ግቢ',
    'Electronics': 'ኤሌክትሮኒክስ',
    'Lab Equipment': 'የላቦራቶሪ መሣሪያ',
    'Vehicles': 'ተሽከርካሪዎች',
    'Furniture': 'የቤት ዕቃዎች',
    'New': 'አዲስ',
    'Good': 'ጥሩ',
    'Fair': 'መካከለኛ',
    'Damaged': 'የተበላሸ',
    'Obsolete': 'ጊዜ ያለፈበት',
    'Cancel': 'ሰርዝ',
    'Close': 'ዝጋ',
    'Save': 'አስቀምጥ',
    'Submit': 'አስገባ',
    'Search': 'ፈልግ',
    'Verified': 'ተረጋግጧል',
    'Not verified': 'አልተረጋገጠም',
    'Start QR Count': 'የQR ቆጠራ ጀምር',
    'Stop Camera': 'ካሜራውን አቁም',
    'Create Account': 'መለያ ፍጠር',
    'Full name': 'ሙሉ ስም',
    'Property Admin': 'የንብረት አስተዳዳሪ',
    'Temporary password (12+ chars)': 'ጊዜያዊ የይለፍ ቃል (12+ ቁምፊዎች)',
    'Department (for Dept Head)': 'መምሪያ (ለመምሪያ ኃላፊ)',
    'No property items found.': 'ምንም የንብረት ዕቃ አልተገኘም።',
    'Choose Asset': 'ንብረት ይምረጡ',
    'Low Priority': 'ዝቅተኛ ቅድሚያ',
    'Medium Priority': 'መካከለኛ ቅድሚያ',
    'Urgent Priority': 'አስቸኳይ ቅድሚያ',
    'Switch to dark mode': 'ወደ ጨለማ ሁነታ ቀይር',
    'Switch to light mode': 'ወደ ብርሃን ሁነታ ቀይር'
};

const englishTranslations = Object.fromEntries(
    Object.entries(amharicTranslations).map(([english, amharic]) => [amharic, english])
);

let selectedLanguage = 'en';

function translateText(value) {
    if (selectedLanguage === 'am') return amharicTranslations[value] || value;
    return englishTranslations[value] || value;
}

function translateElement(element) {
    if (element.nodeType === Node.TEXT_NODE) {
        const trimmedText = element.nodeValue.trim();
        const translatedText = translateText(trimmedText);
        if (trimmedText && translatedText !== trimmedText) {
            const start = element.nodeValue.indexOf(trimmedText);
            element.nodeValue = `${element.nodeValue.slice(0, start)}${translatedText}${element.nodeValue.slice(start + trimmedText.length)}`;
        }
        return;
    }

    if (element.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(translateElement);

    const elements = [element, ...element.querySelectorAll('*')];
    elements.forEach(child => ['aria-label', 'placeholder', 'title'].forEach(attribute => {
        const value = child.getAttribute(attribute);
        if (value) child.setAttribute(attribute, translateText(value));
    }));
}

function setLanguage(language) {
    selectedLanguage = language === 'am' ? 'am' : 'en';
    document.documentElement.lang = selectedLanguage;
    localStorage.setItem('pams-language', selectedLanguage);
    document.querySelectorAll('.language-selector').forEach(selector => {
        selector.value = selectedLanguage;
    });
    translateElement(document.body);
}

function initializeLanguage() {
    const savedLanguage = localStorage.getItem('pams-language');
    selectedLanguage = savedLanguage === 'am' ? 'am' : 'en';
    document.querySelectorAll('.language-selector').forEach(selector => {
        selector.value = selectedLanguage;
        selector.addEventListener('change', () => setLanguage(selector.value));
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
        department_head: 'Department Head / Dean',
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
            system_admin: ['dashboard', 'registry', 'transfers', 'maintenance', 'disposal', 'audit', 'reports', 'users', 'audit-logs'],
            property_admin: ['dashboard', 'registry', 'transfers', 'maintenance', 'disposal', 'audit', 'reports', 'audit-logs'],
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
        const canLogMaintenance = ['system_admin', 'property_admin', 'department_head', 'technician'].includes(role);
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
        document.getElementById('nav-audit-logs').classList.toggle('hidden', !['system_admin', 'property_admin'].includes(role));
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
        department.required = roleSelect.value === 'department_head';
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
        if (['system_admin', 'property_admin', 'department_head', 'technician'].includes(role)) {
            requests.push(requestJson('api/assets.php').then(result => { assets = result.data; }));
        } else {
            assets = [];
        }
        if (['system_admin', 'property_admin', 'department_head'].includes(role)) {
            requests.push(requestJson('api/transfers.php').then(result => { transfers = result.data; }));
        } else {
            transfers = [];
        }
        if (['system_admin', 'property_admin', 'department_head', 'technician'].includes(role)) {
            requests.push(requestJson('api/maintenance.php').then(result => { maintenance = result.data; }));
        } else {
            maintenance = [];
        }
        await Promise.all(requests);

        if (['system_admin', 'property_admin'].includes(role)) renderDashboard();
        renderAssetsTable();
        renderTransfersTable();
        renderMaintenanceGrid();
        renderDisposalTable();
    } catch (err) {
        console.error('Failed to load PAMS data:', err);
        showToast(`Could not load data: ${err.message}`);
        return;
    }

    if (['system_admin', 'property_admin'].includes(currentUser.role)) {
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
    if (['system_admin', 'property_admin'].includes(currentUser.role)) {
        try {
            await loadAuditLogs();
        } catch (err) {
            console.error('Failed to load audit logs:', err);
            showToast(`Could not load audit logs: ${err.message}`);
        }
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

    const tbody = document.getElementById('assetsTableBody');
    tbody.innerHTML = '';

    const filtered = assets.filter(a => {
        const searchable = [a.name, a.id, a.custodian, a.serial, a.campus, a.department].join(' ').toLowerCase();
        const matchSearch = searchable.includes(query);
        const matchCampus = campFilter === 'All' || a.campus === campFilter;
        const matchCat = catFilter === 'All' || a.category === catFilter;
        const matchCond = condFilter === 'All' || a.condition === condFilter;
        return matchSearch && matchCampus && matchCat && matchCond;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colSpan="7" class="p-8 text-center text-slate-400">No property items found.</td></tr>`;
        return;
    }

    filtered.forEach(item => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td class="p-3.5">
                    <div class="font-mono text-indigo-600 dark:text-amber-400 font-bold">${escapeHtml(item.id)}</div>
                    <div class="font-semibold text-sm">${escapeHtml(item.name)}</div>
                    <span class="text-[10px] text-slate-400">S/N: ${escapeHtml(item.serial)}</span>
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
                    ${['system_admin', 'property_admin'].includes(currentUser.role) && (item.status === 'Pending Disposal' ? '' : `<button onclick="flagDisposal('${escapeHtml(item.id)}')" class="p-1.5 rounded bg-rose-100 text-rose-800">Archive / Disposal Review</button>`)}
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
                document.getElementById('gatePassLookup').value = decodedText.trim();
                await lookupGatePassValue(decodedText.trim());
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
function renderMaintenanceGrid() {
    const grid = document.getElementById('maintenanceGrid');
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
    tbody.innerHTML = '';

    assets.forEach(ast => {
        const acqYear = new Date(ast.acq_date).getFullYear();
        const yearsElapsed = Math.max(0, new Date().getFullYear() - acqYear);
        const cost = parseFloat(ast.cost);
        const annualDep = cost / 5;
        const accumulatedDep = Math.min(cost, annualDep * yearsElapsed);
        const netBookValue = Math.max(0, cost - accumulatedDep);
        const isFullyDepreciated = netBookValue === 0;
        const isPendingDisposal = ast.status === 'Pending Disposal';
        const isRecommended = isPendingDisposal || isFullyDepreciated || ast.condition === 'Obsolete';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td class="p-3.5"><span class="font-mono text-indigo-600 dark:text-amber-400 font-bold">${escapeHtml(ast.id)}</span><p class="font-semibold">${escapeHtml(ast.name)}</p></td>
                <td class="p-3.5 font-bold">${cost.toLocaleString()} ETB</td>
                <td class="p-3.5">${escapeHtml(ast.acq_date)}</td>
                <td class="p-3.5">5 Years</td>
                <td class="p-3.5"><span class="font-bold ${isFullyDepreciated ? 'text-rose-500' : 'text-emerald-600'}">${netBookValue.toLocaleString()} ETB</span></td>
                <td class="p-3.5">
                    ${isPendingDisposal ? `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">Pending Disposal Review</span>` : isRecommended ? `<span class="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold">Recommend Auction</span>` : `<span class="text-slate-400">Retain in Active Service</span>`}
                </td>
                <td class="p-3.5 text-right">
                    ${isRecommended && !isPendingDisposal ? `<button onclick="flagDisposal('${escapeHtml(ast.id)}')" class="bg-rose-600 text-white px-2.5 py-1 rounded text-xs">Flag Disposal</button>` : ''}
                </td>
            </tr>
        `;
    });
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
                    <input type="checkbox" data-asset-id="${escapeHtml(item.asset_id)}" onchange="updateAuditItem(this.dataset.assetId, this)" class="audit-check w-4 h-4 rounded text-indigo-600" ${isVerified ? 'checked' : ''}>
                    <div>
                        <p class="font-bold">${escapeHtml(item.asset_name)} (${escapeHtml(item.asset_id)})</p>
                        <p class="text-slate-400">${escapeHtml(item.campus)} • ${escapeHtml(item.building)} (${escapeHtml(item.room)})</p>
                    </div>
                </div>
                <span class="audit-status px-2 py-0.5 rounded font-bold ${isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${isVerified ? 'Verified' : 'Not verified'}</span>
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

async function handleAuditQrScan(decodedText) {
    if (auditScanInProgress) return;
    auditScanInProgress = true;
    try {
        const scannedAssetId = decodedText.trim().toUpperCase();
        const item = physicalCountSession?.items.find(
            entry => entry.asset_id.toUpperCase() === scannedAssetId
        );
        if (!item) {
            showAuditScanMessage(`No asset with ID "${scannedAssetId}" is in this count session.`, 'error');
            return;
        }
        if (item.is_verified === true) {
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
    document.getElementById('audit-verified').textContent = `${verified} Units`;
    document.getElementById('audit-missing').textContent = `${checks.length - verified} Units`;
    checks.forEach(check => {
        const status = check.closest('div.p-3').querySelector('.audit-status');
        status.textContent = check.checked ? 'Verified' : 'Not verified';
        status.classList.toggle('bg-emerald-100', check.checked);
        status.classList.toggle('text-emerald-700', check.checked);
        status.classList.toggle('bg-rose-100', !check.checked);
        status.classList.toggle('text-rose-700', !check.checked);
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
        if (item) item.is_verified = checked;
        updateAuditCounts();
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
    const item = assets.find(a => a.id === id);
    if (!item) return;

    document.getElementById('tag-id').textContent = item.id;
    document.getElementById('tag-name').textContent = item.name;
    document.getElementById('tag-campus').textContent = `${item.campus} (${item.department})`;
    document.getElementById('tag-custodian').textContent = item.custodian;
    document.getElementById('tag-serial').textContent = item.serial;

    // Render QR Code inside tag container
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, { text: item.id, width: 128, height: 128 });
    } else {
        qrContainer.textContent = item.id;
    }

    openModal('viewTagModal');
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
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, { text: tr.gate_pass, width: 112, height: 112 });
    } else {
        qrContainer.textContent = tr.gate_pass;
    }

    openModal('gatePassModal');
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