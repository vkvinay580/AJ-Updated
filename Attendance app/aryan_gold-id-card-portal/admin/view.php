<?php
require dirname(__DIR__) . '/bootstrap.php';
admin_required();

$id = (int)($_GET['id'] ?? 0);
$stmt = db()->prepare('SELECT * FROM employees WHERE id=?');
$stmt->execute([$id]);
$emp = $stmt->fetch();
if (!$emp) { http_response_code(404); exit('Employee not found'); }

$flash = pull_flash();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
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
        $status = $_POST['status'] ?? 'pending';
        $notes = trim($_POST['admin_notes'] ?? '');

        if (!$fullName || !$designation || !$employeeCode || !$blood || !$phone || !$emergencyContact || !$homeAddress) throw new RuntimeException('Complete all required fields.');
        if (!preg_match('/^\d{10}$/', $phone)) throw new RuntimeException('Employee contact must contain exactly 10 digits.');
        if (!preg_match('/^\d{10}$/', $emergencyContact)) throw new RuntimeException('Emergency contact must contain exactly 10 digits.');
        if (!in_array($blood, ['A+','A-','B+','B-','AB+','AB-','O+','O-'], true)) throw new RuntimeException('Select a valid blood group.');
        if (!in_array($status, ['pending','approved','rejected'], true)) throw new RuntimeException('Select a valid review status.');
        $duplicate = find_duplicate_employee($employeeCode, $phone, $fullName, $homeAddress, $id);
        if ($duplicate) {
            throw new RuntimeException('Another employee already uses these details: '.$duplicate['employee_code'].' (record #'.$duplicate['id'].'). Duplicate updates are not allowed.');
        }

        $photoPath = $emp['photo_path'];
        if (isset($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
            if ($_FILES['photo']['error'] !== UPLOAD_ERR_OK) throw new RuntimeException('Photograph upload failed.');
            $file = $_FILES['photo'];
            $maxBytes = ((int)$config['security']['max_photo_mb']) * 1024 * 1024;
            if ($file['size'] > $maxBytes) throw new RuntimeException('Photograph is too large.');
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
            if (!in_array($mime, $config['security']['allowed_photo_mime'], true)) throw new RuntimeException('Use JPG, PNG or WebP photograph only.');
            $ext = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$mime];
            $photoPath = 'uploads/photos/' . bin2hex(random_bytes(16)) . '.' . $ext;
            if (!move_uploaded_file($file['tmp_name'], dirname(__DIR__) . '/' . $photoPath)) throw new RuntimeException('Could not save photograph.');
        }

        $u = db()->prepare('UPDATE employees SET full_name=?,designation=?,employee_code=?,blood_group=?,phone=?,emergency_contact=?,company_address=?,home_address=?,photo_path=?,status=?,admin_notes=? WHERE id=?');
        $u->execute([$fullName,$designation,$employeeCode,$blood,$phone,$emergencyContact,$companyAddress,$homeAddress,$photoPath,$status,$notes,$id]);
        flash('success', 'All employee details were updated successfully.');
        redirect('view.php?id=' . $id);
    } catch (PDOException $e) {
        $flash = ['type'=>'danger','message'=>(($e->errorInfo[1] ?? null) === 1062 ? 'Employee ID already exists.' : 'Could not update the employee record.')];
    } catch (Throwable $e) {
        $flash = ['type'=>'danger','message'=>$e->getMessage()];
    }
}
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" type="image/png" href="../assets/img/favicon.png?v=20261020"><title><?=e(mb_strtoupper((string)$emp['full_name'], 'UTF-8'))?></title><link rel="stylesheet" href="../assets/css/app.css"></head><body>
<div class="dashboard"><aside class="sidebar"><img src="../assets/img/aryan_gold-logo.png" alt="Aryan Gold"><nav class="nav"><a href="index.php">Dashboard</a><a href="add.php">Add employee</a><a class="active" href="#">Employee record</a></nav><div class="sidebar-bottom"><a class="btn ghost" style="width:100%" href="logout.php">Sign out</a></div></aside>
<main class="main"><div class="main-head"><div><a class="text-link" href="index.php">← Back to dashboard</a><h1 style="margin-top:12px">Edit <?=e(mb_strtoupper((string)$emp['full_name'], 'UTF-8'))?></h1></div><a class="btn gold" href="card.php?id=<?=$emp['id']?>">Generate ID card</a></div>
<?php if($flash):?><div class="alert <?=e($flash['type'])?>"><?=e($flash['message'])?></div><?php endif;?>
<div class="detail-grid"><section class="detail-card"><form method="post" enctype="multipart/form-data" class="form-grid"><input type="hidden" name="csrf" value="<?=e(csrf_token())?>">
<div class="field"><label>Full name *</label><input name="full_name" required oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase" value="<?=e(mb_strtoupper((string)($_POST['full_name']??$emp['full_name']), 'UTF-8'))?>"></div>
<div class="field"><label>Designation *</label><input name="designation" required value="<?=e($_POST['designation']??$emp['designation'])?>"></div>
<div class="field"><label>Employee ID *</label><input name="employee_code" required value="<?=e($_POST['employee_code']??$emp['employee_code'])?>"></div>
<div class="field"><label>Blood group *</label><select name="blood_group" required><?php $selectedBlood=$_POST['blood_group']??$emp['blood_group'];foreach(['A+','A-','B+','B-','AB+','AB-','O+','O-'] as $b):?><option value="<?=$b?>" <?=$selectedBlood===$b?'selected':''?>><?=$b?></option><?php endforeach;?></select></div>
<div class="field"><label>Employee contact * (10 digits)</label><input name="phone" type="tel" inputmode="numeric" minlength="10" maxlength="10" pattern="[0-9]{10}" required oninput="this.value=this.value.replace(/\D/g,'').slice(0,10)" value="<?=e($_POST['phone']??($emp['phone']??''))?>"></div>
<div class="field"><label>Emergency contact * (10 digits)</label><input name="emergency_contact" type="tel" inputmode="numeric" minlength="10" maxlength="10" pattern="[0-9]{10}" required oninput="this.value=this.value.replace(/\D/g,'').slice(0,10)" value="<?=e($_POST['emergency_contact']??($emp['emergency_contact']??''))?>"></div>
<div class="field"><label>Replace passport-style photograph</label><input type="file" name="photo" accept="image/jpeg,image/png,image/webp"><small>Leave blank to keep the current mandatory photograph.</small></div>
<div class="field full"><label>Employee home address *</label><textarea name="home_address" rows="4" required oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"><?=e(mb_strtoupper((string)($_POST['home_address']??($emp['home_address']??'')), 'UTF-8'))?></textarea><small>Letters will be saved in capitals.</small></div>
<div class="field full"><label>Company address (fixed)</label><textarea rows="3" readonly class="fixed-field"><?=e($config['company']['address'])?></textarea><small>This official company address cannot be edited.</small></div>
<div class="field"><label>Review status</label><select name="status"><?php $selectedStatus=$_POST['status']??$emp['status'];foreach(['pending','approved','rejected'] as $s):?><option value="<?=$s?>" <?=$selectedStatus===$s?'selected':''?>><?=ucfirst($s)?></option><?php endforeach;?></select></div>
<div class="field full"><label>Admin notes</label><textarea name="admin_notes" rows="4"><?=e($_POST['admin_notes']??($emp['admin_notes']??''))?></textarea></div>
<div class="field full"><button class="btn primary" type="submit">Save all employee details</button></div>
</form></section><aside class="detail-card"><img class="profile-photo" src="../<?=e($emp['photo_path'])?>" alt="Employee photograph"><p style="color:var(--muted);font-size:13px">Current photograph<br>Record created <?=e(date('d M Y, h:i A',strtotime($emp['created_at'])))?></p></aside></div>
</main></div></body></html>
