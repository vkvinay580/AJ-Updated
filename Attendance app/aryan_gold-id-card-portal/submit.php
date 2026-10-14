<?php
require __DIR__ . '/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') redirect('index.php');
verify_csrf();

try {
    $fullName = mb_strtoupper(trim($_POST['full_name'] ?? ''), 'UTF-8');
    $designation = trim($_POST['designation'] ?? '');
    $employeeCode = strtoupper(trim($_POST['employee_code'] ?? ''));
    $blood = trim($_POST['blood_group'] ?? '');
    $phone = preg_replace('/\D+/', '', (string)($_POST['phone'] ?? ''));
    $emergencyContact = preg_replace('/\D+/', '', (string)($_POST['emergency_contact'] ?? ''));
    $homeAddress = mb_strtoupper(trim($_POST['home_address'] ?? ''), 'UTF-8');
    $companyAddress = trim((string)($config['company']['address'] ?? ''));

    if (!$fullName || !$designation || !$employeeCode || !$blood || !$phone || !$emergencyContact || !$homeAddress) throw new RuntimeException('Please complete all required fields.');
    if (mb_strlen($homeAddress) > 50) throw new RuntimeException('Employee home address must not exceed 50 characters.');
    if (!preg_match('/^\d{10}$/', $phone)) throw new RuntimeException('Employee contact must contain exactly 10 digits.');
    if (!preg_match('/^\d{10}$/', $emergencyContact)) throw new RuntimeException('Emergency contact must contain exactly 10 digits.');
    if (!in_array($blood, ['A+','A-','B+','B-','AB+','AB-','O+','O-'], true)) throw new RuntimeException('Select a valid blood group.');
    if (find_duplicate_employee($employeeCode, $phone, $fullName, $homeAddress)) {
        throw new RuntimeException('These employee details already exist. Duplicate submissions are not allowed. Contact the administrator to update the existing record.');
    }
    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) throw new RuntimeException('A passport-style employee photograph is mandatory.');

    $file = $_FILES['photo'];
    $maxBytes = ((int)$config['security']['max_photo_mb']) * 1024 * 1024;
    if ($file['size'] > $maxBytes) throw new RuntimeException('The photograph exceeds the allowed file size.');
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    if (!in_array($mime, $config['security']['allowed_photo_mime'], true)) throw new RuntimeException('Only JPG, PNG and WebP photographs are allowed.');
    $ext = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$mime];
    $filename = bin2hex(random_bytes(16)) . '.' . $ext;
    $relativePath = 'uploads/photos/' . $filename;
    $destination = __DIR__ . '/' . $relativePath;
    if (!move_uploaded_file($file['tmp_name'], $destination)) throw new RuntimeException('Unable to save the photograph.');

    $stmt = db()->prepare('INSERT INTO employees(public_token,full_name,designation,employee_code,blood_group,phone,emergency_contact,company_address,home_address,photo_path) VALUES(?,?,?,?,?,?,?,?,?,?)');
    $stmt->execute([bin2hex(random_bytes(16)), $fullName, $designation, $employeeCode, $blood, $phone, $emergencyContact, $companyAddress, $homeAddress, $relativePath]);
    flash('success', 'Your details were submitted successfully. The administration team will review them.');
} catch (PDOException $e) {
    if (($e->errorInfo[1] ?? null) === 1062) flash('danger', 'This employee ID has already been submitted. Contact the administrator for corrections.');
    else flash('danger', 'The submission could not be saved. Please try again.');
} catch (Throwable $e) {
    flash('danger', $e->getMessage());
}
redirect('index.php#application');
