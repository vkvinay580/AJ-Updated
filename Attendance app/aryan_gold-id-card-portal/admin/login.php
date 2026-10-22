<?php
require dirname(__DIR__) . '/bootstrap.php';
if (!empty($_SESSION['admin_id'])) redirect('index.php');
$error='';
if ($_SERVER['REQUEST_METHOD']==='POST'){
 verify_csrf();
 $email=strtolower(trim($_POST['email']??''));$password=$_POST['password']??'';
 $stmt=db()->prepare('SELECT * FROM admins WHERE email=? LIMIT 1');$stmt->execute([$email]);$admin=$stmt->fetch();
 if($admin&&password_verify($password,$admin['password_hash'])){session_regenerate_id(true);$_SESSION['admin_id']=$admin['id'];$_SESSION['admin_name']=$admin['name'];redirect('index.php');}
 $error='Invalid email or password.';
}
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" type="image/png" href="../assets/img/favicon.png?v=20261020"><title>Admin Login</title><link rel="stylesheet" href="../assets/css/app.css"></head><body class="auth-page"><main class="auth-shell"><section class="auth-card"><img src="../assets/img/aryan_gold-logo.png" alt="Aryan Gold" style="width:180px"><h1>Administrator login</h1><p>Review employee submissions and generate ID cards.</p><?php if($error):?><div class="alert danger"><?=e($error)?></div><?php endif;?><form method="post" class="stack"><input type="hidden" name="csrf" value="<?=e(csrf_token())?>"><label>Email<input type="email" name="email" required autofocus></label><label>Password<input type="password" name="password" required></label><button class="btn primary">Sign in</button></form><a class="text-link" href="../index.php">Return to employee form</a></section></main></body></html>
