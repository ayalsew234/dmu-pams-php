<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DMU Property Asset & Management System (PAMS-ETH)</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              brand: { 900: '#1e1b4b', 950: '#0f172a', gold: '#f59e0b' }
            }
          }
        }
      }
    </script>
    <!-- Chart.js for Visual Analytics -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- QRCode.js for QR Tag Rendering -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="site-background min-h-screen flex flex-col bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 transition-colors">

    <!-- Toast Notification Container -->
    <div id="toast" class="hidden fixed top-5 right-5 z-50 bg-amber-500 text-slate-950 font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span id="toastMsg">Notification Message</span>
    </div>

    <!-- Institutional Header & Branding -->
    <header id="appHeader" class="hidden border-b bg-indigo-950 border-indigo-900 text-white px-6 py-4">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center font-bold text-slate-950 border-2 border-amber-300 text-xl shadow-lg">
                    DMU
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h1 class="text-xl font-bold tracking-wide">DEBRE MARKOS UNIVERSITY</h1>
                        <span class="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-500/30">
                            Central Management
                        </span>
                    </div>
                    <p class="text-xs text-indigo-200">
                        ደብረ ማርቆስ ዩኒቨርሲቲ • Asset & Property Management System (PAMS-ETH)
                    </p>
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm">
                <div class="hidden lg:flex items-center gap-4 bg-indigo-900/50 border border-indigo-800 px-4 py-2 rounded-lg text-xs">
                    <div>
                        <span class="text-indigo-300 block">Fiscal Year</span>
                        <span class="font-semibold text-white">2018 E.C. / 2026 G.C.</span>
                    </div>
                    <div class="h-6 w-px bg-indigo-800"></div>
                    <div>
                        <span class="text-indigo-300 block">Active Custodians</span>
                        <span class="font-semibold text-white">1,420 Staff</span>
                    </div>
                </div>

                <button id="brightnessToggle" onclick="toggleDarkMode()" class="p-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-amber-400 border border-indigo-700 transition" title="Switch to dark mode" aria-label="Switch to dark mode">
                    <svg id="brightnessMoonIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                    <svg id="brightnessSunIcon" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                </button>

                <label class="flex items-center gap-2 text-xs text-indigo-100">
                    <span>Language / ቋንቋ</span>
                    <select class="language-selector rounded-md border border-indigo-700 bg-indigo-900 px-2 py-1 text-white" aria-label="Select language">
                        <option value="en">English</option>
                        <option value="am">አማርኛ</option>
                    </select>
                </label>

                <div class="flex items-center gap-2 border-l border-indigo-800 pl-4">
                    <div id="userBadge" class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-500/40">
                        DMU
                    </div>
                    <div class="text-left text-xs">
                        <p id="currentUserName" class="font-semibold text-white"></p>
                        <p id="currentUserRole" class="text-indigo-300"></p>
                    </div>
                    <button onclick="signOut()" class="ml-2 text-xs text-indigo-200 hover:text-white underline">Sign out</button>
                </div>
            </div>
        </div>
    </header>

    <!-- Navigation Tabs -->
    <nav id="appNav" class="hidden border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button onclick="switchTab('dashboard')" id="nav-dashboard" class="nav-btn flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-indigo-600 text-indigo-600 dark:text-amber-400 dark:border-amber-400">
                Dashboard
            </button>
            <button onclick="switchTab('procurement')" id="nav-procurement" class="nav-btn hidden flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                Procurement & Receiving
            </button>
            <button onclick="switchTab('warehouse')" id="nav-warehouse" class="nav-btn hidden flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                Warehouse & Stock Issues
            </button>
            <button onclick="switchTab('my-assets')" id="nav-my-assets" class="nav-btn hidden flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                My Assets
            </button>
            <button onclick="switchTab('registry')" id="nav-registry" class="nav-btn flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                Asset Registry
            </button>
            <button onclick="switchTab('transfers')" id="nav-transfers" class="nav-btn flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                Issuance & Transfers
            </button>
            <button onclick="switchTab('maintenance')" id="nav-maintenance" class="nav-btn flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                Maintenance & Repairs
            </button>
            <button onclick="switchTab('disposal')" id="nav-disposal" class="nav-btn flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                Depreciation & Disposal
            </button>
            <button onclick="switchTab('disposal-committee')" id="nav-disposal-committee" class="nav-btn hidden flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                Disposal Committee
            </button>
            <button onclick="switchTab('audit')" id="nav-audit" class="nav-btn flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                Inventory Audit
            </button>
            <button onclick="switchTab('compliance')" id="nav-compliance" class="nav-btn hidden flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                Finance & Compliance
            </button>
            <button onclick="switchTab('reports')" id="nav-reports" class="nav-btn flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                DMU Reports Generator
            </button>
            <button onclick="switchTab('users')" id="nav-users" class="nav-btn hidden flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                User & Role Management
            </button>
            <button onclick="switchTab('audit-logs')" id="nav-audit-logs" class="nav-btn hidden flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900">
                System Audit Logs
            </button>
        </div>
    </nav>

    <section id="authPanel" class="auth-hero relative flex-1 flex items-center justify-center p-4">
        <div class="auth-hero-overlay" aria-hidden="true"></div>
        <div class="relative z-10 w-full max-w-md rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-6 shadow-xl space-y-5">
            <div class="flex items-center justify-end gap-2 text-sm">
                <label for="authLanguageSelector" class="font-medium">Language / ቋንቋ</label>
                <select id="authLanguageSelector" class="language-selector rounded-md border border-slate-300 bg-white px-2 py-1 dark:bg-slate-900 dark:border-slate-700" aria-label="Select language">
                    <option value="en">English</option>
                    <option value="am">አማርኛ</option>
                </select>
            </div>
            <div class="text-center">
                <div class="mx-auto w-12 h-12 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center">DMU</div>
                <h2 id="authHeading" class="text-xl font-bold mt-3">DEBRE MARKOS UNIVERSITY</h2>
                <p id="authDescription" class="text-sm text-slate-500 mt-1">Use your assigned DMU account.</p>
            </div>
            <form id="authForm" onsubmit="submitAuthentication(event)" class="space-y-3">
                <div id="authNameField" class="hidden">
                    <label for="authFullName" class="block text-sm font-medium mb-1">Administrator full name</label>
                    <input id="authFullName" name="fullName" autocomplete="name" class="w-full p-2.5 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                </div>
                <div>
                    <label for="authUsername" class="block text-sm font-medium mb-1">Username</label>
                    <input id="authUsername" name="username" required autocomplete="username" class="w-full p-2.5 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                </div>
                <div>
                    <label for="authPassword" class="block text-sm font-medium mb-1">Password</label>
                    <input id="authPassword" name="password" required type="password" autocomplete="current-password" class="w-full p-2.5 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <p id="authPasswordHint" class="hidden text-xs text-slate-500 mt-1">Use at least 12 characters for the first administrator password.</p>
                </div>
                <div id="authError" class="hidden text-sm text-rose-700 bg-rose-50 p-3 rounded-lg" role="alert"></div>
                <button id="authSubmit" type="submit" class="w-full bg-indigo-900 hover:bg-indigo-800 text-white py-2.5 rounded-lg font-semibold">Sign in</button>
            </form>
        </div>
    </section>

    <!-- Main Dynamic Content Body -->
    <main id="appMain" class="hidden flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        <!-- TAB 1: DASHBOARD -->
        <section id="tab-dashboard" class="tab-content space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 class="text-2xl font-bold tracking-tight"  style="font-weight: bold;">DMU Executive Asset Dashboard</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Central overview for DMU property governance, departmental operations, technical services, and gate transit.</p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    <button id="dashboardAddAssetButton" onclick="openModal('addAssetModal')" class="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition">
                        + Add Asset
                    </button>
                    <button id="dashboardTransferButton" onclick="openModal('transferModal')" class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-medium text-sm shadow-sm">
                        Transfer Item
                    </button>
                    <button id="dashboardMaintenanceButton" onclick="openModal('maintenanceModal')" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-medium px-4 py-2 rounded-lg text-sm shadow-sm">
                        Log Repair
                    </button>
                </div>
            </div>

            <!-- Dashboard Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                    <span class="text-xs font-semibold uppercase text-slate-500">Total Valuation</span>
                    <div id="metric-valuation" class="text-xl font-bold tracking-tight mt-2">0 ETB</div>
                    <span class="text-xs text-slate-400 mt-1 block">Capital Assets</span>
                </div>
                <div class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                    <span class="text-xs font-semibold uppercase text-slate-500">Registered Assets</span>
                    <div id="metric-total" class="text-xl font-bold tracking-tight mt-2">0</div>
                    <span class="text-xs text-slate-400 mt-1 block">Items Tracked</span>
                </div>
                <div class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                    <span class="text-xs font-semibold uppercase text-slate-500">Active & Assigned</span>
                    <div id="metric-active" class="text-xl font-bold tracking-tight mt-2">0</div>
                    <span class="text-xs text-slate-400 mt-1 block">In Active Use</span>
                </div>
                <div class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                    <span class="text-xs font-semibold uppercase text-slate-500">Assets Requiring Maintenance</span>
                    <div id="metric-maintenance" class="text-xl font-bold tracking-tight mt-2 text-amber-500">0</div>
                    <span class="text-xs text-slate-400 mt-1 block">Damaged / Under Repair</span>
                </div>
                <div class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                    <span class="text-xs font-semibold uppercase text-slate-500">Pending Disposal</span>
                    <div id="metric-disposal" class="text-xl font-bold tracking-tight mt-2 text-rose-500">0</div>
                    <span class="text-xs text-slate-400 mt-1 block">Obsolete Equipment</span>
                </div>
            </div>

            <div id="roleOverview" class="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-5 space-y-4">
                <div>
                    <h3 class="font-bold">DMU Central Management — Role Responsibilities</h3>
                    <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">Role-specific modules are protected by both the application interface and API permissions.</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div class="rounded-lg bg-white/80 dark:bg-slate-900/70 p-3"><strong>System Administrator</strong><p class="text-slate-500 mt-1">User and role administration, security, and system audit logs; infrastructure configuration and backups are handled operationally.</p></div>
                    <div class="rounded-lg bg-white/80 dark:bg-slate-900/70 p-3"><strong>Property Admin / Stock Officer</strong><p class="text-slate-500 mt-1">Global asset register, transfer decisions, annual counts, depreciation, and disposal recommendations.</p></div>
                    <div class="rounded-lg bg-white/80 dark:bg-slate-900/70 p-3"><strong>Internal Auditor & Finance Officer</strong><p class="text-slate-500 mt-1">Independently verify inventory, review asset valuation and invoice variances, inspect audit events, and record compliance findings.</p></div>
                    <div class="rounded-lg bg-white/80 dark:bg-slate-900/70 p-3"><strong>Procurement & Purchasing Officer</strong><p class="text-slate-500 mt-1">Register suppliers, create purchase orders, record goods received, match invoices, and register received assets.</p></div>
                    <div class="rounded-lg bg-white/80 dark:bg-slate-900/70 p-3"><strong>Storekeeper / Warehouse Custodian</strong><p class="text-slate-500 mt-1">Allocate temporary storage, issue available stock with SIV records, and print/apply physical QR asset tags.</p></div>
                    <div class="rounded-lg bg-white/80 dark:bg-slate-900/70 p-3"><strong>Department Head / Dean</strong><p class="text-slate-500 mt-1">Department inventory, equipment requests, transfer requests, handovers, and maintenance submissions.</p></div>
                    <div class="rounded-lg bg-white/80 dark:bg-slate-900/70 p-3"><strong>Maintenance / IT Technician</strong><p class="text-slate-500 mt-1">Work-order progress, diagnosis, repair costs, parts notes, and disposal recommendations.</p></div>
                    <div class="rounded-lg bg-white/80 dark:bg-slate-900/70 p-3"><strong>Gate Security Officer</strong><p class="text-slate-500 mt-1">Gate-pass QR verification, driver capture, and transit check-out/check-in.</p></div>
                </div>
            </div>

            <!-- Interactive Analytics Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2 p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 class="font-bold text-base mb-1">Campus Valuation Breakdown (ETB Millions)</h3>
                    <p class="text-xs text-slate-500 mb-4">Total monetary value of equipment distributed per DMU campus</p>
                    <div class="h-64 w-full">
                        <canvas id="campusChart"></canvas>
                    </div>
                </div>
                <div class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 class="font-bold text-base mb-1">Asset Health & Condition</h3>
                    <p class="text-xs text-slate-500 mb-4">Physical condition status ratio</p>
                    <div class="h-56 w-full flex justify-center">
                        <canvas id="conditionChart"></canvas>
                    </div>
                </div>
            </div>
        </section>

        <section id="tab-procurement" class="tab-content hidden space-y-6">
            <div>
                <h2 class="text-2xl font-bold">Procurement, Purchase Orders & Goods Receiving</h2>
                <p class="text-sm text-slate-500">Register suppliers, track purchase orders, receive goods, match supplier invoices, and add received units to the asset register.</p>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <form onsubmit="registerSupplier(event)" class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 class="font-bold">Register Supplier</h3>
                    <input name="name" required maxlength="255" placeholder="Supplier / vendor name" class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input name="contactName" placeholder="Contact person" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <input name="email" type="email" placeholder="Email" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <input name="phone" placeholder="Phone" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <input name="taxNumber" placeholder="Tax / TIN number" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    </div>
                    <input name="address" placeholder="Supplier address" class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <button type="submit" class="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium">Save Supplier</button>
                </form>

                <form onsubmit="createPurchaseOrder(event)" class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 class="font-bold">Create Purchase Order</h3>
                    <select id="procurementVendorSelect" name="vendorId" required class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <option value="">Register/select supplier</option>
                    </select>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input name="itemName" required placeholder="Asset / item description" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <input name="category" required placeholder="Category" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <input name="quantity" required type="number" min="1" step="1" placeholder="Quantity" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <input name="unitCost" required type="number" min="0" step="0.01" placeholder="Unit cost (ETB)" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <input name="campus" required placeholder="Receiving campus" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <input name="department" required placeholder="Receiving department" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <input name="building" placeholder="Building (optional)" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <input name="room" placeholder="Room (optional)" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <label class="text-xs text-slate-500">Order date<input name="orderDate" type="date" class="mt-1 w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700"></label>
                        <label class="text-xs text-slate-500">Expected delivery<input name="expectedDate" type="date" class="mt-1 w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700"></label>
                    </div>
                    <textarea name="notes" rows="2" placeholder="Purchase order notes" class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700"></textarea>
                    <button type="submit" class="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium">Create Purchase Order</button>
                </form>
            </div>

            <form onsubmit="recordGoodsReceipt(event)" class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 space-y-3">
                <h3 class="font-bold">Record Goods Receiving Note & Invoice</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select id="receiptPurchaseOrderSelect" name="purchaseOrderId" required onchange="updateReceiptQuantityLimit()" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <option value="">Select an outstanding order</option>
                    </select>
                    <input name="quantityReceived" required type="number" min="1" step="1" placeholder="Quantity received" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <label class="text-xs text-slate-500">Received date<input name="receivedDate" type="date" class="mt-1 w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700"></label>
                    <input name="invoiceNumber" placeholder="Supplier invoice number (optional)" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <input name="invoiceAmount" type="number" min="0" step="0.01" placeholder="Invoice amount (ETB)" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <input name="notes" placeholder="Receiving / invoice notes" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                </div>
                <button type="submit" class="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Receive Goods & Register Assets</button>
            </form>

            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                <h3 class="p-4 font-bold">Purchase Orders</h3>
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">PO</th><th class="p-3">Supplier</th><th class="p-3">Item</th><th class="p-3">Qty received / ordered</th><th class="p-3">Unit cost (ETB)</th><th class="p-3">Status</th></tr></thead>
                    <tbody id="purchaseOrdersTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                </table>
            </div>
            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                <h3 class="p-4 font-bold">Goods Receiving Notes & Invoice Matching</h3>
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">GRN</th><th class="p-3">PO / Supplier</th><th class="p-3">Item / Qty</th><th class="p-3">Invoice</th><th class="p-3">Amount (ETB)</th><th class="p-3">Match status</th><th class="p-3">Invoice action</th></tr></thead>
                    <tbody id="goodsReceiptsTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                </table>
            </div>
        </section>

        <section id="tab-warehouse" class="tab-content hidden space-y-6">
            <div>
                <h2 class="text-2xl font-bold">Warehouse & Physical Stock Control</h2>
                <p class="text-sm text-slate-500">Allocate buffer storage, issue stock with a Stock Issue Voucher (SIV), and print QR asset tags for physical labeling.</p>
            </div>

            <form onsubmit="issueSelectedStock(event)" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <select name="recipientUserId" id="warehouseRecipientUser" onchange="setWarehouseRecipient(this)" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <option value="">Optional: link to a staff account</option>
                </select>
                <input name="recipientName" required placeholder="Receiving staff member" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                <input name="recipientDepartment" required placeholder="Receiving department" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                <input name="purpose" placeholder="Issue purpose / reference" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                <button type="submit" class="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium">Issue Selected Stock & Create SIV</button>
            </form>
            <p class="-mt-4 text-xs text-slate-500">Linking a staff account assigns the selected assets to that account's personal inventory. Manual recipients remain available for non-account holders.</p>

            <form onsubmit="allocateSelectedStock(event)" class="flex flex-col sm:flex-row gap-3 p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <input name="storageLocation" required maxlength="255" placeholder="Temporary storage / buffer location" class="min-w-0 flex-1 p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                <button type="submit" class="bg-amber-500 text-slate-950 px-4 py-2 rounded-lg text-sm font-medium">Allocate Selected to Temporary Storage</button>
                <button type="button" onclick="releaseSelectedStock()" class="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium">Release to Available Stock</button>
            </form>
            <p class="text-xs text-slate-500">Select assets below to issue, allocate, or release them. QR tags can be printed per asset for physical barcode labeling.</p>

            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3"><input id="warehouseSelectAll" type="checkbox" aria-label="Select all available stock" onchange="toggleWarehouseSelection(this)"></th><th class="p-3">Asset / Tag ID</th><th class="p-3">Location</th><th class="p-3">Custodian</th><th class="p-3">Stock status / storage</th><th class="p-3">Condition</th><th class="p-3">Physical tag</th></tr></thead>
                    <tbody id="warehouseAssetsTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                </table>
            </div>

            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                <h3 class="p-4 font-bold">Stock Issue Voucher History</h3>
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">SIV Number</th><th class="p-3">Issue date</th><th class="p-3">Recipient / department</th><th class="p-3">Items</th><th class="p-3">Purpose</th><th class="p-3">Issued by</th><th class="p-3">Action</th></tr></thead>
                    <tbody id="stockIssuesTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                </table>
            </div>
        </section>

        <section id="tab-my-assets" class="tab-content hidden space-y-6">
            <div>
                <h2 class="text-2xl font-bold">My Assigned Assets</h2>
                <p class="text-sm text-slate-500">Review your personal inventory, electronically acknowledge received assignments, report loss, damage, or theft, and request maintenance directly.</p>
            </div>
            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">Asset Tag / Name</th><th class="p-3">Location</th><th class="p-3">Condition</th><th class="p-3">Assignment Acknowledgement</th><th class="p-3">Action</th></tr></thead>
                    <tbody id="custodianAssetsTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                </table>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <form onsubmit="submitCustodianIncident(event)" class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 class="font-bold">Report Loss, Damage, or Theft</h3>
                    <select id="incidentAssetId" name="assetId" required class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <option value="">Select your assigned asset</option>
                    </select>
                    <select name="incidentType" required class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <option value="">Select incident type</option><option value="Loss">Loss</option><option value="Damage">Damage</option><option value="Theft">Theft</option>
                    </select>
                    <textarea name="description" required maxlength="5000" rows="4" placeholder="Describe what happened, when, and where." class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700"></textarea>
                    <button type="submit" class="bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Submit Incident Report</button>
                </form>
                <div class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 class="font-bold">My Incident Reports</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-2">Reported</th><th class="p-2">Asset</th><th class="p-2">Type / Status</th><th class="p-2">Details</th></tr></thead>
                            <tbody id="custodianIncidentsTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="space-y-3">
                <div>
                    <h3 class="text-lg font-bold">My Maintenance Requests</h3>
                    <p class="text-xs text-slate-500">Create a ticket for an asset assigned to you and follow its repair status.</p>
                </div>
                <button id="custodianMaintenanceButton" onclick="openModal('maintenanceModal')" class="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm">+ Create Maintenance Ticket</button>
                <div id="custodianMaintenanceGrid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
            </div>
        </section>

        <!-- TAB 2: ASSET REGISTRY -->
        <section id="tab-registry" class="tab-content hidden space-y-6">
            <div class="p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                    <input type="text" id="searchQuery" oninput="renderAssetsTable()" placeholder="Search Tag ID, Asset Name, Custodian, Serial..." class="w-full md:w-96 pl-4 pr-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <button id="registryAddAssetButton" onclick="openModal('addAssetModal')" class="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Register New Property</button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <div>
                        <label class="block text-slate-500 mb-1">Filter Campus</label>
                        <select id="filterCampus" onchange="renderAssetsTable()" class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                            <option value="All">All Campuses</option>
                            <option value="Main Campus">Main Campus</option>
                            <option value="Health Sciences">Health Sciences</option>
                            <option value="Technology Institute">Technology Institute</option>
                            <option value="Agriculture Campus">Agriculture Campus</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-500 mb-1">Filter Category</label>
                        <select id="filterCategory" onchange="renderAssetsTable()" class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                            <option value="All">All Categories</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Lab Equipment">Lab Equipment</option>
                            <option value="Vehicles">Vehicles</option>
                            <option value="Furniture">Furniture</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-500 mb-1">Filter Condition</label>
                        <select id="filterCondition" onchange="renderAssetsTable()" class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                            <option value="All">All Conditions</option>
                            <option value="New">New</option>
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Damaged">Damaged</option>
                            <option value="Obsolete">Obsolete</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="border-b bg-slate-100 dark:bg-slate-900 font-semibold uppercase">
                            <th class="p-3.5">Asset Tag & Name</th>
                            <th class="p-3.5">Category</th>
                            <th class="p-3.5">Location / Campus</th>
                            <th class="p-3.5">Custodian</th>
                            <th class="p-3.5">Cost (ETB)</th>
                            <th class="p-3.5">Condition</th>
                            <th class="p-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="assetsTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                </table>
            </div>
        </section>

        <!-- TAB 3: ISSUANCE & TRANSFERS -->
        <section id="tab-transfers" class="tab-content hidden space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold">Inter-Department & Campus Transfers</h2>
                    <p class="text-sm text-slate-500">Track movement of university equipment between faculties and generate official Gate Passes.</p>
                </div>
                <button id="newTransferButton" onclick="openModal('transferModal')" class="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium">New Transfer Order</button>
            </div>
            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div id="gateScannerPanel" class="p-5 border-b border-slate-200 dark:border-slate-700 space-y-4">
                    <div>
                                <h3 class="font-bold">Gate Security Scanner & Transit Clearance</h3>
                                <p class="text-xs text-slate-500 mt-1">Scan a gate-pass QR code, verify approval, and record driver and officer for check-out/check-in.</p>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        <div class="space-y-3">
                            <div id="gateScannerReader" class="hidden w-full max-w-md overflow-hidden rounded-lg"></div>
                            <div class="flex flex-wrap gap-2">
                                <button id="startGateScannerButton" type="button" onclick="startGateScanner()" class="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium">Start Camera Scanner</button>
                                <button id="stopGateScannerButton" type="button" onclick="stopGateScanner()" class="hidden border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm">Stop Camera</button>
                            </div>
                            <form onsubmit="lookupGatePass(event)" class="flex gap-2">
                                <input id="gatePassLookup" required type="text" autocomplete="off" placeholder="Enter voucher number, e.g. GP-90122" class="min-w-0 flex-1 p-2.5 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm">
                                <button type="submit" class="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium">Verify Pass</button>
                            </form>
                        </div>
                        <div id="gateScanResult" class="hidden rounded-lg border p-4 text-sm" role="status" aria-live="polite"></div>
                    </div>
                </div>
                <table id="transfersTable" class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="border-b bg-slate-100 dark:bg-slate-900 font-semibold uppercase">
                            <th class="p-3.5">Transfer ID</th>
                            <th class="p-3.5">Asset Details</th>
                            <th class="p-3.5">From Location</th>
                            <th class="p-3.5">To Destination</th>
                            <th class="p-3.5">Requested By</th>
                            <th class="p-3.5">Gate Pass #</th>
                            <th class="p-3.5">Status</th>
                            <th class="p-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="transfersTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                </table>
            </div>
        </section>

        <!-- TAB 4: MAINTENANCE -->
        <section id="tab-maintenance" class="tab-content hidden space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold">Property Repairs & Work Orders</h2>
                    <p class="text-sm text-slate-500">Log damage reports, assign workshop technicians, and track repair costs in ETB.</p>
                </div>
                <button id="maintenanceLogButton" onclick="openModal('maintenanceModal')" class="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm">+ Log Repair Ticket</button>
            </div>
            <div id="maintenanceGrid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
        </section>

        <!-- TAB 5: DEPRECIATION & DISPOSAL -->
        <section id="tab-disposal" class="tab-content hidden space-y-6">
            <div>
                <h2 class="text-2xl font-bold">Straight-Line Depreciation & Public Disposal Workflow</h2>
                <p class="text-sm text-slate-500">Automated Ethiopian Public Higher Education depreciation calculation (5-Year Straight Line) & Board disposal recommendations.</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Acquisition Value</p>
                    <p id="disposal-total-cost" class="mt-2 text-xl font-bold">0 ETB</p>
                </div>
                <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Accumulated Depreciation</p>
                    <p id="disposal-accumulated" class="mt-2 text-xl font-bold text-amber-600">0 ETB</p>
                </div>
                <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Net Book Value</p>
                    <p id="disposal-net-book-value" class="mt-2 text-xl font-bold text-emerald-600">0 ETB</p>
                </div>
                <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Awaiting Committee</p>
                    <p id="disposal-awaiting-count" class="mt-2 text-xl font-bold text-rose-600">0</p>
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
                <input id="disposalSearch" type="search" oninput="renderDisposalTable()" placeholder="Search asset tag, name, or department..." class="w-full sm:flex-1 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                <select id="disposalFilter" onchange="renderDisposalTable()" class="w-full sm:w-64 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <option value="all">All assets</option>
                    <option value="recommended">Recommended for disposal</option>
                    <option value="awaiting">Awaiting committee</option>
                    <option value="rejected">Rejected by committee</option>
                </select>
            </div>
            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="border-b bg-slate-100 dark:bg-slate-900 font-semibold uppercase">
                            <th class="p-3.5">Asset ID & Name</th>
                            <th class="p-3.5">Acquisition Cost</th>
                            <th class="p-3.5">Acq. Date</th>
                            <th class="p-3.5">Useful Life</th>
                            <th class="p-3.5">Current Net Book Value (NBV)</th>
                            <th class="p-3.5">Disposal Recommendation</th>
                            <th class="p-3.5 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody id="disposalTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                </table>
            </div>
        </section>

        <section id="tab-disposal-committee" class="tab-content hidden space-y-6">
            <div>
                <h2 class="text-2xl font-bold">Asset Disposal Committee Review</h2>
                <p class="text-sm text-slate-500">Inspect submitted equipment, record a Scrap, Auction, or Donation decision, and issue a certificate for approved cases. Approval does not record that physical disposal has been completed.</p>
            </div>
            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="border-b bg-slate-100 dark:bg-slate-900 font-semibold uppercase">
                            <th class="p-3.5">Asset</th>
                            <th class="p-3.5">Condition & Location</th>
                            <th class="p-3.5">Case Status</th>
                            <th class="p-3.5">Inspection</th>
                            <th class="p-3.5">Committee Review</th>
                        </tr>
                    </thead>
                    <tbody id="disposalCommitteeTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                </table>
            </div>
        </section>

        <!-- TAB 6: AUDIT -->
        <section id="tab-audit" class="tab-content hidden space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold">Physical Count & Annual Audit Reconciliation</h2>
                    <p class="text-sm text-slate-500">Verify actual items present in campus rooms versus ledger records.</p>
                    <p id="audit-session-summary" class="text-xs text-slate-500 mt-1">No physical count session is active.</p>
                </div>
                <button id="startAuditSessionButton" onclick="startAuditSession()" class="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium">Start New Physical Count Session</button>
            </div>
            <div class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div>
                    <h3 class="font-bold text-base">Automatic Asset Count</h3>
                    <p class="text-sm text-slate-500">Scan an asset tag QR code to automatically mark that asset present. You can also verify items manually below.</p>
                </div>
                <div id="auditScannerReader" class="hidden w-full max-w-md overflow-hidden rounded-lg"></div>
                <div class="flex flex-wrap gap-2">
                    <button id="startAuditScannerButton" type="button" onclick="startAuditScanner()" class="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium">Start QR Count</button>
                    <button id="stopAuditScannerButton" type="button" onclick="stopAuditScanner()" class="hidden border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm">Stop Camera</button>
                </div>
                <p id="auditScanMessage" class="hidden text-sm" role="status" aria-live="polite"></p>
            </div>
            <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <div class="p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                    <span class="text-xs text-slate-400 font-semibold uppercase">Expected Registered Items</span>
                    <p id="audit-expected" class="text-2xl font-bold mt-1">0 Units</p>
                </div>
                <div class="p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                    <span class="text-xs text-emerald-500 font-semibold uppercase">Verified Present</span>
                    <p id="audit-verified" class="text-2xl font-bold text-emerald-600 mt-1">0 Units</p>
                </div>
                <div class="p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                    <span class="text-xs text-rose-500 font-semibold uppercase">Marked Missing</span>
                    <p id="audit-missing" class="text-2xl font-bold text-rose-500 mt-1">0 Units</p>
                </div>
                <div class="p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                    <span class="text-xs text-amber-500 font-semibold uppercase">Not Yet Verified</span>
                    <p id="audit-pending" class="text-2xl font-bold text-amber-500 mt-1">0 Units</p>
                </div>
            </div>
            <div class="p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <h3 class="font-bold text-base">Audit Checklist & Location Log</h3>
                <div id="auditChecklist" class="space-y-2"></div>
            </div>
        </section>

        <section id="tab-compliance" class="tab-content hidden space-y-6">
            <div>
                <h2 class="text-2xl font-bold">Financial Governance & Compliance Inspections</h2>
                <p class="text-sm text-slate-500">Read-only reconciliation of the asset register and procurement invoices, with open incident review and a durable log of inspection findings.</p>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"><span class="text-xs uppercase text-slate-500">Registered Assets</span><p id="auditor-asset-count" class="text-xl font-bold mt-1">0</p></div>
                <div class="p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"><span class="text-xs uppercase text-slate-500">Asset Register Value</span><p id="auditor-asset-value" class="text-xl font-bold mt-1">0 ETB</p></div>
                <div class="p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"><span class="text-xs uppercase text-slate-500">Invoice Discrepancies</span><p id="auditor-invoice-count" class="text-xl font-bold mt-1">0</p></div>
                <div class="p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"><span class="text-xs uppercase text-slate-500">Open Asset Incidents</span><p id="auditor-incident-count" class="text-xl font-bold mt-1">0</p></div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-4">
                <div><h3 class="font-bold">Physical Count Reconciliation</h3><p id="auditor-count-summary" class="text-sm text-slate-500">No count evidence available.</p></div>
                <button onclick="switchTab('audit')" class="rounded bg-indigo-900 px-4 py-2 text-sm text-white">Open Audit Mode</button>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                    <h3 class="p-4 font-bold">Asset Valuation by Campus</h3>
                    <table class="w-full text-left text-xs"><thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">Campus</th><th class="p-3">Asset count</th><th class="p-3">Register value (ETB)</th></tr></thead><tbody id="auditorCampusValuationBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody></table>
                </div>
                <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                    <h3 class="p-4 font-bold">Asset Valuation by Department</h3>
                    <table class="w-full text-left text-xs"><thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">Department</th><th class="p-3">Asset count</th><th class="p-3">Register value (ETB)</th></tr></thead><tbody id="auditorDepartmentValuationBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody></table>
                </div>
            </div>
            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                <h3 class="p-4 font-bold">Goods Receipt to Asset Ledger Reconciliation</h3>
                <table class="w-full text-left text-xs"><thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">GRN / PO</th><th class="p-3">Supplier / Item</th><th class="p-3">Received</th><th class="p-3">Asset records</th><th class="p-3">Quantity variance</th><th class="p-3">Value variance (ETB)</th></tr></thead><tbody id="auditorReceiptReconciliationBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody></table>
            </div>
            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                <h3 class="p-4 font-bold">Procurement Invoice Variances</h3>
                <table class="w-full text-left text-xs"><thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">GRN / PO</th><th class="p-3">Supplier / Item</th><th class="p-3">Invoice</th><th class="p-3">Variance (ETB)</th><th class="p-3">Received</th></tr></thead><tbody id="auditorInvoiceVarianceBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody></table>
            </div>
            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                <h3 class="p-4 font-bold">Unresolved Asset Incidents</h3>
                <table class="w-full text-left text-xs"><thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">Date / Reporter</th><th class="p-3">Asset</th><th class="p-3">Incident</th><th class="p-3">Description</th><th class="p-3">Status</th></tr></thead><tbody id="auditorIncidentsBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody></table>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <form onsubmit="createComplianceInspection(event)" class="xl:col-span-1 p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 class="font-bold">Record Inspection Finding</h3>
                    <input name="title" required maxlength="255" placeholder="Finding title" class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <select name="inspectionType" required class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <option value="Anti-Fraud">Anti-Fraud</option><option value="Asset Compliance">Asset Compliance</option><option value="Financial Review">Financial Review</option><option value="Other">Other</option>
                    </select>
                    <select name="riskLevel" required class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <option value="Low">Low risk</option><option value="Medium" selected>Medium risk</option><option value="High">High risk</option>
                    </select>
                    <select name="assetId" id="auditorInspectionAsset" class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <option value="">Optional: related asset</option>
                    </select>
                    <textarea name="findings" required maxlength="10000" rows="5" placeholder="Evidence, control issue, and recommended follow-up" class="w-full p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700"></textarea>
                    <button type="submit" class="rounded bg-indigo-900 px-4 py-2 text-sm font-medium text-white">Save Inspection</button>
                </form>
                <div class="xl:col-span-2 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                    <h3 class="p-4 font-bold">Compliance Inspection Register</h3>
                    <table class="w-full text-left text-xs"><thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">Date / Inspector</th><th class="p-3">Type / Risk</th><th class="p-3">Finding</th><th class="p-3">Related asset</th><th class="p-3">Status</th><th class="p-3">Update</th></tr></thead><tbody id="auditorInspectionsBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody></table>
                </div>
            </div>
            <div class="flex justify-end"><button onclick="switchTab('reports'); printMasterLedger()" class="rounded bg-slate-700 px-4 py-2 text-sm text-white">Print Full Asset Ledger</button></div>
        </section>

        <!-- TAB 7: REPORTS -->
        <section id="tab-reports" class="tab-content hidden space-y-6 max-w-4xl mx-auto">
            <div class="text-center space-y-2">
                <h2 class="text-2xl font-bold">DMU Property Administration Reports</h2>
                <p class="text-sm text-slate-500">Generate standardized official documentation for the Ethiopian Ministry of Education & Ministry of Finance.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-6 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <h3 class="font-bold text-lg">Annual Property Inventory Summary</h3>
                    <p class="text-xs text-slate-500">Comprehensive summary of all assets categorized by campus valuation, serial status, and condition breakdown.</p>
                    <button onclick="printMasterLedger()" class="w-full bg-indigo-900 text-white py-2 rounded-lg text-sm font-medium">Print Full Master Ledger</button>
                </div>
                <div class="p-6 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <h3 class="font-bold text-lg">Departmental Custodian Clearance</h3>
                    <p class="text-xs text-slate-500">Official clearance document for staff or faculty members transferring or resigning from DMU.</p>
                    <button onclick="printClearanceForm()" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 py-2 rounded-lg text-sm font-medium">Print Clearance Form</button>
                </div>
            </div>
        </section>

        <section id="tab-users" class="tab-content hidden space-y-6">
            <div>
                <h2 class="text-2xl font-bold">User & Role Management</h2>
                <p class="text-sm text-slate-500">Create staff accounts and assign a single system role. Department Head accounts are restricted to their assigned department.</p>
            </div>
            <form onsubmit="createUserAccount(event)" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 p-5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <input name="fullName" required placeholder="Full name" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                <input name="username" required autocomplete="off" placeholder="Username" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                <input name="password" required type="password" minlength="12" placeholder="Temporary password (12+ chars)" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                <select name="role" required onchange="toggleUserDepartmentField(this)" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <option value="property_admin">Property Admin</option>
                    <option value="procurement_officer">Procurement & Purchasing Officer</option>
                    <option value="storekeeper">Storekeeper / Warehouse Custodian</option>
                    <option value="department_head">Department Head / Dean</option>
                    <option value="asset_custodian">End-User / Faculty / Staff (Asset Custodian)</option>
                    <option value="internal_auditor">Internal Auditor & Finance Officer</option>
                    <option value="disposal_committee">Asset Disposal Committee Member</option>
                    <option value="technician">Maintenance / IT Technician</option>
                    <option value="gate_security">Gate Security Officer</option>
                    <option value="system_admin">System Administrator</option>
                </select>
                <input name="department" placeholder="Department (required for Dept Head / Staff)" class="p-2 rounded-lg border dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                <button type="submit" class="md:col-span-2 xl:col-span-5 bg-indigo-900 text-white px-4 py-2 rounded-lg font-semibold">Create Account</button>
            </form>
            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">Name</th><th class="p-3">Username</th><th class="p-3">Role</th><th class="p-3">Department</th><th class="p-3">Status</th><th class="p-3">Action</th></tr></thead>
                    <tbody id="usersTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                </table>
            </div>
        </section>

        <section id="tab-audit-logs" class="tab-content hidden space-y-6">
            <div>
                <h2 class="text-2xl font-bold">System Audit Logs</h2>
                <p class="text-sm text-slate-500">Read-only record of account, transfer, work-order, and gate transit actions.</p>
            </div>
            <div class="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100 dark:bg-slate-900"><tr><th class="p-3">Time</th><th class="p-3">User</th><th class="p-3">Action</th><th class="p-3">Details</th></tr></thead>
                    <tbody id="auditLogsTableBody" class="divide-y divide-slate-200 dark:divide-slate-700"></tbody>
                </table>
            </div>
        </section>

    </main>

    <section id="printLedger" class="hidden">
        <h1>Debre Markos University — Property Asset Register</h1>
        <p>Generated <span id="printLedgerDate"></span></p>
        <table>
            <thead>
                <tr>
                    <th>Asset ID</th><th>Name</th><th>Category</th><th>Campus</th>
                    <th>Department</th><th>Building / Room</th><th>Custodian</th>
                    <th>Cost (ETB)</th><th>Condition</th><th>Status</th>
                </tr>
            </thead>
            <tbody id="printLedgerBody"></tbody>
        </table>
    </section>

    <section id="printClearance" class="hidden">
        <h1>Debre Markos University</h1>
        <h2>Property Administration Directorate</h2>
        <h3>Departmental Custodian Clearance Form</h3>
        <p>Date: <span id="clearanceDate"></span></p>
        <p>Employee name: ____________________________________ &nbsp; Employee ID: __________________</p>
        <p>Department: _______________________________________ &nbsp; Campus: _______________________</p>
        <p>Reason for clearance: _________________________________________________________________</p>
        <table>
            <thead>
                <tr><th>Asset ID</th><th>Asset description</th><th>Condition / remarks</th><th>Returned</th></tr>
            </thead>
            <tbody>
                <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
                <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
                <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
                <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
            </tbody>
        </table>
        <p class="clearance-signatures">Property Officer: __________________________ &nbsp; Signature: ______________ &nbsp; Date: __________</p>
        <p>Department Head: ____________________________ &nbsp; Signature: ______________ &nbsp; Date: __________</p>
    </section>
    <section id="disposalCertificatePrint" class="hidden" aria-label="Official asset disposal certificate"></section>

    <!-- MODAL 1: ADD NEW ASSET -->
    <div id="addAssetModal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="w-full max-w-2xl rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                <h3 class="text-lg font-bold">Register New DMU Property / Asset</h3>
                <button onclick="closeModal('addAssetModal')" class="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onsubmit="handleCreateAsset(event)" class="space-y-4 text-xs">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block font-medium mb-1">Asset Name / Description *</label>
                        <input required id="new-name" type="text" placeholder="e.g. Dell PowerEdge Server" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Serial Number / Unique ID</label>
                        <input id="new-serial" type="text" placeholder="e.g. SN-99812-ET" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Category *</label>
                        <select id="new-category" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                            <option>Electronics</option><option>Lab Equipment</option><option>Vehicles</option><option>Furniture</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Campus Location *</label>
                        <select id="new-campus" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                            <option>Main Campus</option><option>Health Sciences</option><option>Technology Institute</option><option>Agriculture Campus</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Department *</label>
                        <input required id="new-department" type="text" placeholder="e.g. Computer Science" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Building</label>
                        <input id="new-building" type="text" placeholder="e.g. Administration Building" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Room</label>
                        <input id="new-room" type="text" placeholder="e.g. Room 201" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Condition</label>
                        <select id="new-condition" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                            <option>New</option><option>Good</option><option>Fair</option><option>Damaged</option><option>Obsolete</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Custodian Name & ID</label>
                        <input id="new-custodian" type="text" placeholder="e.g. Dr. Abebe Bikila (EMP-1042)" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Acquisition Cost (ETB) *</label>
                        <input required id="new-cost" type="number" placeholder="e.g. 450000" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Acquisition Date</label>
                        <input id="new-acqDate" type="date" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                </div>
                <div class="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button type="button" onclick="closeModal('addAssetModal')" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">Cancel</button>
                    <button type="submit" class="px-5 py-2 rounded-lg bg-indigo-900 text-white font-medium">Register Asset</button>
                </div>
            </form>
        </div>
    </div>

    <!-- MODAL 2: ITEM TRANSFER -->
    <div id="transferModal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="w-full max-w-lg rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                <h3 class="text-lg font-bold">Initiate Inter-Campus Property Transfer</h3>
                <button onclick="closeModal('transferModal')" class="text-slate-400">✕</button>
            </div>
            <form onsubmit="handleCreateTransfer(event)" class="space-y-4 text-xs">
                <div>
                    <label class="block font-medium mb-1">Select Property Item *</label>
                    <select required id="transfer-asset-select" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                        <!-- Populated by JS -->
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-medium mb-1">Target Campus Destination *</label>
                        <select required id="transfer-toCampus" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                            <option>Main Campus</option><option>Health Sciences</option><option>Technology Institute</option><option>Agriculture Campus</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Target Department *</label>
                        <input required id="transfer-toDept" type="text" placeholder="e.g. Property Admin" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                </div>
                <div>
                    <label class="block font-medium mb-1">Requesting Department Head / Dean</label>
                    <input id="transfer-requestedBy" type="text" placeholder="Name of requesting department head or dean" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button type="button" onclick="closeModal('transferModal')" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">Cancel</button>
                    <button type="submit" class="px-5 py-2 rounded-lg bg-indigo-900 text-white font-medium">Confirm Transfer & Gate Pass</button>
                </div>
            </form>
        </div>
    </div>

    <!-- MODAL 3: LOG MAINTENANCE -->
    <div id="maintenanceModal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="w-full max-w-md rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                <h3 class="text-lg font-bold">Log Repair & Maintenance Ticket</h3>
                <button onclick="closeModal('maintenanceModal')" class="text-slate-400">✕</button>
            </div>
            <form onsubmit="handleCreateMaintenance(event)" class="space-y-4 text-xs">
                <div>
                    <label class="block font-medium mb-1">Target Asset *</label>
                    <select required id="maint-asset-select" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700"></select>
                </div>
                <div>
                    <label class="block font-medium mb-1">Priority Level *</label>
                    <select id="maint-priority" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                        <option value="Low">Low Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="Urgent">Urgent Priority</option>
                    </select>
                </div>
                <div>
                    <label class="block font-medium mb-1">Issue / Fault Description *</label>
                    <textarea required id="maint-issue" rows="3" placeholder="Describe damage or malfunction..." class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700"></textarea>
                </div>
                <div id="maintenanceAdminFields" class="grid grid-cols-2 gap-3">
                    <div class="col-span-2">
                        <label class="block font-medium mb-1">Reporter</label>
                        <input id="maint-reportedBy" type="text" placeholder="Name of the reporting staff member" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Technician / Garage</label>
                        <input id="maint-technician" type="text" placeholder="e.g. DMU Workshop" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                    <div>
                        <label class="block font-medium mb-1">Est. Cost (ETB)</label>
                        <input id="maint-cost" type="number" placeholder="e.g. 15000" class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    </div>
                    <div class="col-span-2">
                        <label class="block font-medium mb-1">Spare Parts / Materials Notes</label>
                        <textarea id="maint-parts" rows="2" placeholder="Parts required or used..." class="w-full p-2.5 rounded-lg border dark:bg-slate-800 border-slate-300 dark:border-slate-700"></textarea>
                    </div>
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button type="button" onclick="closeModal('maintenanceModal')" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">Cancel</button>
                    <button type="submit" class="px-5 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold">Submit Ticket</button>
                </div>
            </form>
        </div>
    </div>

    <!-- MODAL 4: VIEW TAG & QR SHEET -->
    <div id="viewTagModal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="w-full max-w-lg rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800 gap-3">
                <div class="flex items-center gap-3">
                    <button type="button" onclick="closeModal('viewTagModal')" class="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:underline">
                        <span aria-hidden="true">←</span>
                        Back to Warehouse & Stock Issues
                    </button>
                </div>
                <button onclick="closeModal('viewTagModal')" class="text-slate-400" aria-label="Close tag view">✕</button>
            </div>
            <div id="tagBox" class="p-4 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/30 dark:bg-slate-800/40 space-y-3">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-[10px] uppercase font-bold tracking-widest text-indigo-900 dark:text-indigo-300">Debre Markos University</span>
                        <p id="tag-id" class="font-mono text-lg font-extrabold text-indigo-600 dark:text-amber-400"></p>
                    </div>
                    <div id="qrcode" class="p-1 bg-white rounded border"></div>
                </div>
                <div class="space-y-1 text-xs border-t pt-2 border-slate-200 dark:border-slate-700">
                    <p id="tag-name" class="font-bold text-sm text-slate-900 dark:text-slate-100"></p>
                    <p><span class="text-slate-400">Campus:</span> <span id="tag-campus"></span></p>
                    <p><span class="text-slate-400">Custodian:</span> <span id="tag-custodian"></span></p>
                    <p><span class="text-slate-400">Serial No:</span> <span id="tag-serial"></span></p>
                    <p><span class="text-slate-400">Physical tag status:</span> <span id="tag-status"></span></p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="printContent('tag')" class="flex-1 bg-indigo-900 text-white py-2 rounded-lg text-xs font-semibold">Print Asset Label Tag</button>
                <button id="markTagAppliedButton" onclick="markAssetTagApplied()" class="flex-1 bg-emerald-700 text-white py-2 rounded-lg text-xs font-semibold">Mark Tag Applied</button>
            </div>
        </div>
    </div>

    <div id="sivModal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="w-full max-w-2xl bg-white text-slate-900 rounded-xl p-8 shadow-2xl space-y-5 border-4 border-indigo-950">
            <div id="sivPrintBox" class="space-y-5">
                <div class="text-center border-b-2 border-indigo-950 pb-4">
                    <h2 class="text-lg font-bold text-indigo-950">DEBRE MARKOS UNIVERSITY</h2>
                    <p class="text-xs font-semibold text-slate-600">PROPERTY ADMINISTRATION DIRECTORATE / STORE</p>
                    <p class="text-xs font-mono mt-1 underline">STOCK ISSUE VOUCHER</p>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <p>Voucher No: <strong id="siv-number"></strong></p>
                    <p>Issue date: <strong id="siv-date"></strong></p>
                    <p>Recipient: <strong id="siv-recipient"></strong></p>
                    <p>Department: <strong id="siv-department"></strong></p>
                    <p class="col-span-2">Purpose / reference: <strong id="siv-purpose"></strong></p>
                </div>
                <table class="w-full border-collapse text-xs">
                    <thead><tr><th class="border p-2">#</th><th class="border p-2">Asset tag</th><th class="border p-2">Description</th><th class="border p-2">Serial</th><th class="border p-2">Condition</th></tr></thead>
                    <tbody id="siv-items"></tbody>
                </table>
                <div class="grid grid-cols-2 gap-8 pt-8 text-xs">
                    <p class="border-t border-slate-700 pt-2">Issued by / Storekeeper signature</p>
                    <p class="border-t border-slate-700 pt-2">Received by / Recipient signature</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="printContent('siv')" class="flex-1 bg-indigo-950 text-white py-2 rounded-lg text-xs font-bold">Print Official SIV</button>
                <button onclick="closeModal('sivModal')" class="px-4 py-2 bg-slate-200 rounded-lg text-xs font-bold">Close</button>
            </div>
        </div>
    </div>

    <!-- MODAL 5: PRINTABLE GATE PASS VOUCHER -->
    <div id="gatePassModal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="w-full max-w-xl bg-white text-slate-900 rounded-xl p-8 shadow-2xl space-y-6 border-4 border-indigo-950">
            <div class="text-center border-b-2 border-indigo-950 pb-4">
                <h2 class="text-lg font-bold text-indigo-950">DEBRE MARKOS UNIVERSITY</h2>
                <p class="text-xs font-semibold text-slate-600">PROPERTY ADMINISTRATION DIRECTORATE</p>
                <p class="text-xs font-mono mt-1 underline">OFFICIAL INTER-CAMPUS GATE PASS / ITEM TRANSFER VOUCHER</p>
            </div>
            <div class="flex justify-between text-xs font-mono">
                <span>Voucher No: <strong id="gp-num"></strong></span>
                <span>Date: <strong id="gp-date"></strong></span>
            </div>
            <div id="gp-qrcode" class="flex justify-center p-3 bg-white rounded border border-slate-200"></div>
            <div class="p-4 bg-slate-100 rounded border border-slate-300 space-y-2 text-xs">
                <p><strong>Item Name:</strong> <span id="gp-assetName"></span></p>
                <p><strong>Asset Tag ID:</strong> <span id="gp-assetId"></span></p>
                <p><strong>Origin:</strong> <span id="gp-origin"></span></p>
                <p><strong>Destination:</strong> <span id="gp-dest"></span></p>
                <p><strong>Authorized Officer:</strong> <span id="gp-officer"></span></p>
            </div>
            <div class="grid grid-cols-2 gap-8 text-[11px] pt-6 border-t border-slate-300">
                <div>
                    <p class="font-bold">Released By (Property Officer):</p>
                    <div class="h-10 border-b border-slate-400 mt-2"></div>
                    <p class="text-[9px] text-slate-400 mt-1">Sign & Campus Stamp</p>
                </div>
                <div>
                    <p class="font-bold">Main Gate Security Verification:</p>
                    <div class="h-10 border-b border-slate-400 mt-2"></div>
                    <p class="text-[9px] text-slate-400 mt-1">Checked & Released</p>
                </div>
            </div>
            <div class="flex justify-end gap-3 pt-4">
                <button onclick="closeModal('gatePassModal')" class="px-4 py-2 bg-slate-200 text-slate-800 rounded text-xs">Close</button>
                <button onclick="printContent('gate-pass')" class="px-4 py-2 bg-indigo-950 text-white rounded text-xs font-bold">Print Official Voucher</button>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer id="appFooter" class="hidden border-t bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs py-4 px-6 mt-auto">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-center sm:text-left">
            <p>© 2026 Debre Markos University (DMU). Property & Asset Management System.</p>
            <p class="font-mono">PAMS-DMU v3.4 • Federal Public Property Guidelines Compliant</p>
        </div>
    </footer>

    <!-- Frontend Core Application Script -->
    <script src="https://unpkg.com/html5-qrcode@2.3.8"></script>
    <script src="assets/js/app.js?v=<?= filemtime(__DIR__ . '/assets/js/app.js') ?>"></script>
</body>
</html>