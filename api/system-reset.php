<?php
require_once __DIR__ . '/bootstrap.php';

api_require_method('POST');
$admin = api_require_roles(['system_admin']);

try {
    $input = api_request_data();
    if (($input['confirmation'] ?? '') !== 'DELETE ALL DATA') {
        throw new InvalidArgumentException('Type DELETE ALL DATA exactly to confirm this action.');
    }

    // Child rows are deleted before their parents. The signed-in administrator is preserved.
    $tables = [
        'gate_transit_events',
        'physical_count_items',
        'physical_count_sessions',
        'stock_issue_voucher_items',
        'asset_acknowledgements',
        'asset_incidents',
        'maintenance',
        'transfers',
        'asset_disposal_cases',
        'compliance_inspections',
        'assets',
        'goods_receipt_notes',
        'purchase_orders',
        'stock_issue_vouchers',
        'vendors',
        'system_audit_logs',
    ];

    $pdo->beginTransaction();
    $deletedRows = 0;
    foreach ($tables as $table) {
        $deletedRows += $pdo->exec("DELETE FROM `$table`");
    }
    $deleteOtherAccounts = $pdo->prepare('DELETE FROM users WHERE id <> ?');
    $deleteOtherAccounts->execute([$admin['id']]);
    $deletedRows += $deleteOtherAccounts->rowCount();
    $pdo->commit();

    api_response([
        'success' => true,
        'message' => "All application records and other user accounts were deleted. Your System Administrator account was kept. ($deletedRows records removed.)",
        'deletedRecords' => $deletedRows,
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    api_handle_error($error);
}
