<?php
require dirname(__DIR__) . '/bootstrap.php';
admin_required();
$flash = null;
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
        if (!$fullName || !$designation || !$employeeCode || !$blood || !$phone || !$emergencyContact || !$homeAddress) throw new RuntimeException('Complete all required fields.');
        if (mb_strlen($homeAddress) > 50) throw new RuntimeException('Employee home address must not exceed 50 characters.');
        if (!preg_match('/^\d{10}$/', $phone)) throw new RuntimeException('Employee contact must contain exactly 10 digits.');
        if (!preg_match('/^\d{10}$/', $emergencyContact)) throw new RuntimeException('Emergency contact must contain exactly 10 digits.');
        if (!in_array($blood, ['A+','A-','B+','B-','AB+','AB-','O+','O-'], true)) throw new RuntimeException('Select a valid blood group.');
        $duplicate = find_duplicate_employee($employeeCode, $phone, $fullName, $homeAddress);
        if ($duplicate) {
            throw new RuntimeException('Employee already exists as '.$duplicate['employee_code'].' (record #'.$duplicate['id'].'). Use Update on the dashboard instead of adding a duplicate.');
        }
        if (empty($_FILES['photo']['tmp_name']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) throw new RuntimeException('A passport-style employee photograph is mandatory.');
        $file = $_FILES['photo'];
        $maxBytes = ((int)$config['security']['max_photo_mb']) * 1024 * 1024;
        if ($file['size'] > $maxBytes) throw new RuntimeException('Photograph is too large.');
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if (!in_array($mime, $config['security']['allowed_photo_mime'], true)) throw new RuntimeException('Use JPG, PNG or WebP photograph only.');
        $ext = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$mime];
        $name = bin2hex(random_bytes(16)).'.'.$ext;
        $relative = 'uploads/photos/'.$name;
        if (!move_uploaded_file($file['tmp_name'], dirname(__DIR__).'/'.$relative)) throw new RuntimeException('Could not save photograph.');
        $stmt = db()->prepare('INSERT INTO employees(public_token,full_name,designation,employee_code,blood_group,phone,emergency_contact,company_address,home_address,photo_path,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
        $stmt->execute([bin2hex(random_bytes(16)),$fullName,$designation,$employeeCode,$blood,$phone,$emergencyContact,$companyAddress,$homeAddress,$relative,'approved']);
        $id=(int)db()->lastInsertId();
        flash('success','Employee added successfully. You can now generate the ID card.');
        redirect('card.php?id='.$id);
    } catch (PDOException $e) {
        $flash=['type'=>'danger','message'=>$e->getCode()==='23000'?'Employee ID already exists.':'Could not add employee.'];
    } catch (Throwable $e) {$flash=['type'=>'danger','message'=>$e->getMessage()];}
}
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Add employee</title><link rel="stylesheet" href="../assets/css/app.css"></head><body>
<div class="dashboard"><aside class="sidebar"><img src="../assets/img/aryan_gold-logo.png" alt="Aryan Gold"><nav class="nav"><a href="index.php">Dashboard</a><a class="active" href="add.php">Add employee</a><a href="../index.php" target="_blank">Employee form</a></nav><div class="sidebar-bottom"><a class="btn ghost" style="width:100%" href="logout.php">Sign out</a></div></aside>
<main class="main"><div class="main-head"><div><h1>Add employee</h1><p style="color:var(--muted);margin:6px 0 0">Create an approved employee record directly from existing company information.</p></div></div>
<?php if($flash):?><div class="alert <?=e($flash['type'])?>"><?=e($flash['message'])?></div><?php endif;?>
<section class="detail-card"><div class="excel-import"><div><strong>Fill from Excel</strong><p>Upload an XLSX, XLS or CSV file. The first data row will fill this form automatically.</p><small>Headers: full_name, designation, employee_code, blood_group, employee_contact, emergency_contact, home_address</small></div><label class="btn gold">Choose Excel file<input type="file" id="excelFile" accept=".xlsx,.xls,.csv" hidden></label></div><div class="alert danger" id="excelError" style="display:none;margin-top:16px"></div><hr style="border:0;border-top:1px solid var(--line);margin:24px 0">
<form method="post" enctype="multipart/form-data" class="form-grid" id="employeeForm"><input type="hidden" name="csrf" value="<?=e(csrf_token())?>">
<div class="field"><label>Full name *</label><input name="full_name" required oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase" value="<?=e(mb_strtoupper((string)($_POST['full_name']??''), 'UTF-8'))?>"></div><div class="field"><label>Designation *</label><input name="designation" required value="<?=e($_POST['designation']??'')?>"></div>
<div class="field"><label>Employee ID *</label><input name="employee_code" required value="<?=e($_POST['employee_code']??'')?>"></div><div class="field"><label>Blood group *</label><select name="blood_group" required><option value="">Select</option><?php foreach(['A+','A-','B+','B-','AB+','AB-','O+','O-'] as $b):?><option value="<?=$b?>" <?=($_POST['blood_group']??'')===$b?'selected':''?>><?=$b?></option><?php endforeach;?></select></div>
<div class="field"><label>Employee contact * (exactly 10 digits)</label><input name="phone" type="tel" inputmode="numeric" minlength="10" maxlength="10" pattern="[0-9]{10}" required title="Enter exactly 10 digits" oninput="this.value=this.value.replace(/\D/g,'').slice(0,10)" value="<?=e($_POST['phone']??'')?>"></div>
<div class="field"><label>Emergency contact * (exactly 10 digits)</label><input name="emergency_contact" type="tel" inputmode="numeric" minlength="10" maxlength="10" pattern="[0-9]{10}" required title="Enter exactly 10 digits" oninput="this.value=this.value.replace(/\D/g,'').slice(0,10)" value="<?=e($_POST['emergency_contact']??'')?>"><small>Mandatory. A 9-digit number will not be accepted.</small></div>
<div class="field"><label>Passport-style employee photograph *</label><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required><small>Mandatory: upload a clear, front-facing passport photograph.</small></div>
<div class="field full"><label>Employee home address * (maximum 50 characters)</label><textarea name="home_address" rows="3" maxlength="50" required oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"><?=e($_POST['home_address']??'')?></textarea><small>Maximum 50 characters. Letters will be saved in capitals.</small></div>
<div class="field full"><label>Company address (fixed)</label><textarea rows="3" readonly class="fixed-field" aria-readonly="true"><?=e($config['company']['address'])?></textarea><small>Fixed official address — this cannot be edited.</small></div>
<div class="field full"><button class="btn primary" type="submit">Add employee &amp; Generate ID card</button></div></form></section></main></div>
<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script><script>
const excelFile=document.getElementById('excelFile'),employeeForm=document.getElementById('employeeForm'),excelError=document.getElementById('excelError');
const aliases={fullname:'full_name',name:'full_name',employeename:'full_name',role:'designation',jobtitle:'designation',employeeid:'employee_code',empcode:'employee_code',empid:'employee_code',blood:'blood_group',bloodgroup:'blood_group',mobile:'phone',employeecontact:'phone',phonenumber:'phone',emergencycontact:'emergency_contact',address:'home_address',homeaddress:'home_address',employeehomeaddress:'home_address'};
function keyName(value){const key=String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');return aliases[key]||({full_name:'full_name',designation:'designation',employee_code:'employee_code',blood_group:'blood_group',phone:'phone',employee_contact:'phone',emergency_contact:'emergency_contact',home_address:'home_address'}[String(value??'').toLowerCase().trim()]||'')}
excelFile.addEventListener('change',async()=>{excelError.style.display='none';try{if(!excelFile.files[0])return;if(typeof XLSX==='undefined')throw new Error('Excel reader could not load. Check the internet connection and try again.');const workbook=XLSX.read(await excelFile.files[0].arrayBuffer(),{cellDates:true});const sheet=workbook.Sheets[workbook.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});if(rows.length<2)throw new Error('The spreadsheet must contain a header row and at least one employee row.');const headers=rows[0].map(keyName),values=rows[1];let filled=0;headers.forEach((name,i)=>{if(!name||!employeeForm.elements[name])return;employeeForm.elements[name].value=String(values[i]??'').trim();filled++});if(!filled)throw new Error('No supported headers were found. Use the header names shown above.');employeeForm.scrollIntoView({behavior:'smooth',block:'start'});}catch(error){excelError.textContent=error.message;excelError.style.display='block'}});
</script></body></html>
