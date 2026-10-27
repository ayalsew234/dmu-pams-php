<?php
require_once __DIR__ . '/bootstrap.php';

$roles = ['system_admin', 'property_admin', 'procurement_officer'];
$user = api_require_roles($roles);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    try {
        $vendors = $pdo->query('SELECT id, name, contact_name, email, phone, tax_number FROM vendors ORDER BY name')->fetchAll();
        $purchaseOrders = $pdo->query(
            "SELECT po.*, v.name AS vendor_name,
                COALESCE((SELECT SUM(gr.quantity_received) FROM goods_receipt_notes gr WHERE gr.purchase_order_id = po.id), 0) AS received_quantity
             FROM purchase_orders po
             JOIN vendors v ON v.id = po.vendor_id
             ORDER BY po.created_at DESC"
        )->fetchAll();
        $receipts = $pdo->query(
            'SELECT gr.*, po.item_name, po.unit_cost, po.vendor_id, v.name AS vendor_name
             FROM goods_receipt_notes gr
             JOIN purchase_orders po ON po.id = gr.purchase_order_id
             JOIN vendors v ON v.id = po.vendor_id
             ORDER BY gr.created_at DESC'
        )->fetchAll();
        api_response([
            'success' => true,
            'data' => [
                'vendors' => $vendors,
                'purchaseOrders' => $purchaseOrders,
                'receipts' => $receipts,
            ],
        ]);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

if ($method === 'PATCH') {
    try {
        $input = api_request_data();
        $receiptId = api_required_string($input, 'receiptId', 'Goods Receiving Note');
        $invoiceNumber = api_required_string($input, 'invoiceNumber', 'Invoice number');
        if (!isset($input['invoiceAmount']) || !is_numeric($input['invoiceAmount'])) {
            throw new InvalidArgumentException('Invoice amount must be a valid non-negative number.');
        }
        $invoiceAmount = api_cost($input, 'invoiceAmount');

        $pdo->beginTransaction();
        $receiptStmt = $pdo->prepare(
            'SELECT gr.id, gr.quantity_received, gr.purchase_order_id, po.unit_cost
             FROM goods_receipt_notes gr
             JOIN purchase_orders po ON po.id = gr.purchase_order_id
             WHERE gr.id = ? FOR UPDATE'
        );
        $receiptStmt->execute([$receiptId]);
        $receipt = $receiptStmt->fetch();
        if (!$receipt) {
            throw new InvalidArgumentException('The selected Goods Receiving Note does not exist.');
        }

        $expectedAmount = (float)$receipt['quantity_received'] * (float)$receipt['unit_cost'];
        $difference = round($invoiceAmount - $expectedAmount, 2);
        $invoiceStatus = abs($difference) <= 0.01 ? 'Matched' : 'Discrepant';
        $update = $pdo->prepare(
            'UPDATE goods_receipt_notes
             SET invoice_number = ?, invoice_amount = ?, invoice_status = ?, invoice_difference = ?
             WHERE id = ?'
        );
        $update->execute([$invoiceNumber, $invoiceAmount, $invoiceStatus, $difference, $receiptId]);
        api_audit('procurement_invoice_matched', "Invoice $invoiceNumber for GRN $receiptId marked $invoiceStatus.");
        $pdo->commit();
        api_response([
            'success' => true,
            'message' => $invoiceStatus === 'Matched'
                ? 'Invoice matched the received goods value.'
                : 'Invoice discrepancy recorded for review.',
            'invoiceStatus' => $invoiceStatus,
            'difference' => $difference,
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        api_handle_error($e);
    }
}

api_require_method('POST');

try {
    $input = api_request_data();
    $action = api_required_string($input, 'action', 'Procurement action');

    if ($action === 'vendor') {
        $name = api_required_string($input, 'name', 'Supplier name');
        $email = api_optional_string($input, 'email');
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Enter a valid supplier email address.');
        }
        $insert = $pdo->prepare(
            'INSERT INTO vendors (name, contact_name, email, phone, tax_number, address)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([
            $name,
            api_optional_string($input, 'contactName') ?: null,
            $email ?: null,
            api_optional_string($input, 'phone') ?: null,
            api_optional_string($input, 'taxNumber') ?: null,
            api_optional_string($input, 'address') ?: null,
        ]);
        $vendorId = (int)$pdo->lastInsertId();
        api_audit('procurement_vendor_registered', "Registered supplier $name (ID $vendorId).");
        api_response(['success' => true, 'message' => 'Supplier registered.', 'id' => $vendorId], 201);
    }

    if ($action === 'order') {
        $vendorId = filter_var($input['vendorId'] ?? null, FILTER_VALIDATE_INT);
        if (!$vendorId || $vendorId < 1) {
            throw new InvalidArgumentException('Select a valid supplier.');
        }
        $quantity = filter_var($input['quantity'] ?? null, FILTER_VALIDATE_INT);
        if (!$quantity || $quantity < 1 || $quantity > 1000) {
            throw new InvalidArgumentException('Order quantity must be a whole number between 1 and 1,000.');
        }
        $unitCost = api_cost($input, 'unitCost');
        $vendorCheck = $pdo->prepare('SELECT 1 FROM vendors WHERE id = ?');
        $vendorCheck->execute([$vendorId]);
        if (!$vendorCheck->fetchColumn()) {
            throw new InvalidArgumentException('The selected supplier does not exist.');
        }

        $id = 'PO-' . date('Y') . '-' . api_next_id($pdo, 'purchase_orders');
        $insert = $pdo->prepare(
            "INSERT INTO purchase_orders
                (id, vendor_id, item_name, category, quantity, unit_cost, campus, department, building, room, order_date, expected_date, status, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ordered', ?, ?)"
        );
        $insert->execute([
            $id,
            $vendorId,
            api_required_string($input, 'itemName', 'Asset/item name'),
            api_required_string($input, 'category', 'Category'),
            $quantity,
            $unitCost,
            api_required_string($input, 'campus', 'Campus'),
            api_required_string($input, 'department', 'Department'),
            api_optional_string($input, 'building', 'Unassigned') ?: 'Unassigned',
            api_optional_string($input, 'room', 'Unassigned') ?: 'Unassigned',
            api_date($input, 'orderDate', 'Order date'),
            !empty($input['expectedDate']) ? api_date($input, 'expectedDate', 'Expected delivery date') : null,
            api_optional_string($input, 'notes') ?: null,
            $user['id'],
        ]);
        api_audit('procurement_order_created', "Created purchase order $id.");
        api_response(['success' => true, 'message' => 'Purchase order created.', 'id' => $id], 201);
    }

    if ($action === 'receive') {
        $purchaseOrderId = api_required_string($input, 'purchaseOrderId', 'Purchase order');
        $quantity = filter_var($input['quantityReceived'] ?? null, FILTER_VALIDATE_INT);
        if (!$quantity || $quantity < 1 || $quantity > 1000) {
            throw new InvalidArgumentException('Received quantity must be a whole number between 1 and 1,000.');
        }
        $invoiceNumber = api_optional_string($input, 'invoiceNumber');
        $hasInvoiceAmount = isset($input['invoiceAmount']) && $input['invoiceAmount'] !== '';
        if (($invoiceNumber !== '') !== $hasInvoiceAmount) {
            throw new InvalidArgumentException('Provide both invoice number and invoice amount to match an invoice.');
        }
        $invoiceAmount = $hasInvoiceAmount ? api_cost($input, 'invoiceAmount') : null;
        $receivedDate = api_date($input, 'receivedDate', 'Received date');

        $pdo->beginTransaction();
        $orderStmt = $pdo->prepare('SELECT * FROM purchase_orders WHERE id = ? FOR UPDATE');
        $orderStmt->execute([$purchaseOrderId]);
        $order = $orderStmt->fetch();
        if (!$order || $order['status'] === 'Cancelled') {
            throw new InvalidArgumentException('The selected order does not exist or was cancelled.');
        }
        $receivedStmt = $pdo->prepare(
            'SELECT COALESCE(SUM(quantity_received), 0) FROM goods_receipt_notes WHERE purchase_order_id = ?'
        );
        $receivedStmt->execute([$purchaseOrderId]);
        $alreadyReceived = (int)$receivedStmt->fetchColumn();
        if ($alreadyReceived + $quantity > (int)$order['quantity']) {
            throw new InvalidArgumentException('Received quantity exceeds the outstanding order quantity.');
        }

        $receiptId = 'GRN-' . date('Y') . '-' . api_next_id($pdo, 'goods_receipt_notes');
        $invoiceStatus = 'Pending';
        $invoiceDifference = null;
        if ($hasInvoiceAmount) {
            $invoiceDifference = round((float)$invoiceAmount - ($quantity * (float)$order['unit_cost']), 2);
            $invoiceStatus = abs($invoiceDifference) <= 0.01 ? 'Matched' : 'Discrepant';
        }
        $receiptInsert = $pdo->prepare(
            'INSERT INTO goods_receipt_notes
                (id, purchase_order_id, quantity_received, received_date, received_by, invoice_number, invoice_amount, invoice_status, invoice_difference, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $receiptInsert->execute([
            $receiptId,
            $purchaseOrderId,
            $quantity,
            $receivedDate,
            $user['id'],
            $invoiceNumber !== '' ? $invoiceNumber : null,
            $invoiceAmount,
            $invoiceStatus,
            $invoiceDifference,
            api_optional_string($input, 'notes') ?: null,
        ]);

        $assetIds = [];
        $nextAssetNumber = (int)api_next_id($pdo, 'assets');
        for ($unit = 0; $unit < $quantity; $unit++) {
            $assetNumber = str_pad((string)($nextAssetNumber + $unit), 3, '0', STR_PAD_LEFT);
            $assetId = 'DMU-AST-' . date('Y') . '-' . $assetNumber;
            $assetInsert = $pdo->prepare(
                "INSERT INTO assets
                        (id, name, category, campus, department, building, room, custodian, cost, acq_date, `condition`, status, serial, purchase_order_id, goods_receipt_note_id, stock_status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'Unassigned', ?, ?, 'New', 'Active', 'N/A', ?, ?, 'In Stock')"
            );
            $assetInsert->execute([
                $assetId,
                $order['item_name'],
                $order['category'],
                $order['campus'],
                $order['department'],
                $order['building'],
                $order['room'],
                $order['unit_cost'],
                $receivedDate,
                $purchaseOrderId,
                $receiptId,
            ]);
            $assetIds[] = $assetId;
        }

        $totalReceived = $alreadyReceived + $quantity;
        $status = $totalReceived === (int)$order['quantity'] ? 'Received' : 'Partially Received';
        $statusUpdate = $pdo->prepare('UPDATE purchase_orders SET status = ? WHERE id = ?');
        $statusUpdate->execute([$status, $purchaseOrderId]);
        api_audit('procurement_goods_received', "Created $receiptId for $purchaseOrderId; registered " . count($assetIds) . ' asset(s).');
        $pdo->commit();
        api_response([
            'success' => true,
            'message' => "Goods received. $quantity asset(s) were added to the inventory.",
            'receiptId' => $receiptId,
            'assetIds' => $assetIds,
            'invoiceStatus' => $invoiceStatus,
        ], 201);
    }

    throw new InvalidArgumentException('Select a valid procurement action.');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e instanceof PDOException && (string)$e->getCode() === '23000') {
        api_response(['success' => false, 'error' => 'A record with that supplier name or identifier already exists.'], 409);
    }
    api_handle_error($e);
}
