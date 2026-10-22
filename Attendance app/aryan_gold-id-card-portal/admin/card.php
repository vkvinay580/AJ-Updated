<?php
require dirname(__DIR__) . '/bootstrap.php';
admin_required();
$id = (int)($_GET['id'] ?? 0);
$stmt = db()->prepare('SELECT * FROM employees WHERE id=?');
$stmt->execute([$id]);
$emp = $stmt->fetch();
if (!$emp) {
    http_response_code(404);
    exit('Employee not found');
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" type="image/png" href="../assets/img/favicon.png?v=20261020"><title>ID Card - <?=e(mb_strtoupper((string)$emp['full_name'], 'UTF-8'))?></title>
<link rel="stylesheet" href="../assets/css/app.css?v=<?=filemtime(dirname(__DIR__).'/assets/css/app.css')?>">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
</head>
<body>
<div class="dashboard">
<aside class="sidebar no-print"><img src="../assets/img/aryan_gold-logo.png" alt="Aryan Gold"><nav class="nav"><a href="index.php">Dashboard</a><a href="add.php">Add employee</a><a href="view.php?id=<?=$emp['id']?>">Employee record</a><a class="active" href="#">ID card</a></nav><div class="sidebar-bottom"><a class="btn ghost" style="width:100%" href="logout.php">Sign out</a></div></aside>
<main class="main">
<div class="main-head no-print"><div><a class="text-link" href="view.php?id=<?=$emp['id']?>">&larr; Back to employee</a><h1 style="margin-top:12px">ID card preview</h1><p style="color:var(--muted)">Front and back card preview using the official Aryan Gold design.</p></div><span class="badge <?=e($emp['status'])?>"><?=e($emp['status'])?></span></div>
<div class="id-stage supplied-id-stage">
<article class="id-card supplied-card supplied-front" id="frontCard">
<svg class="supplied-wave-art" viewBox="0 0 340 540" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="frontGold" x1="0" x2="1"><stop stop-color="#c38609"/><stop offset=".82" stop-color="#ffd957"/><stop offset="1" stop-color="#cc8a08"/></linearGradient></defs><path d="M0 0H143C158 50 161 101 157 151C153 218 141 281 138 347C136 416 145 481 157 540H0Z" fill="url(#frontGold)"/><path d="M0 0H132C147 50 150 101 146 151C142 218 130 281 127 347C125 416 134 481 146 540H0Z" fill="#3d0718"/></svg>
<img class="supplied-front-logo" src="../assets/img/aryan-gold-logo-official.png" alt="Aryan Gold Company">
<div class="supplied-side-block supplied-code"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="8" width="38" height="32" rx="3"/><circle cx="17" cy="20" r="5"/><path d="M9 34c1-6 4-9 8-9s7 3 8 9M29 18h9M29 25h7M30 33l4 4 8-10"/></svg><span>EMP CODE</span><strong><?=e($emp['employee_code'])?></strong></div>
<div class="supplied-side-block supplied-blood"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M23 42S10 29 10 19a13 13 0 1 1 26 0c0 10-13 23-13 23Z"/><path d="M15 23h8M19 19v8M31 8v8M27 12h8"/></svg><span>BLOOD GROUP</span><strong><?=e($emp['blood_group'])?></strong></div>
<div class="supplied-photo"><img src="../<?=e($emp['photo_path'])?>" alt="<?=e(mb_strtoupper((string)$emp['full_name'], 'UTF-8'))?>"></div>
<div class="supplied-name"><?=e(mb_strtoupper((string)$emp['full_name'], 'UTF-8'))?></div>
<div class="supplied-role"><?=e($emp['designation'])?></div>
<div class="supplied-rule"></div>
<div class="supplied-mobile">Mob : <?=e($emp['phone'] ?: '—')?></div>
</article>
<article class="id-card supplied-card supplied-back" id="backCard">
<svg class="supplied-wave-art" viewBox="0 0 340 540" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="backGold" x1="0" x2="1"><stop stop-color="#c38609"/><stop offset=".82" stop-color="#ffd957"/><stop offset="1" stop-color="#cc8a08"/></linearGradient></defs><path d="M0 0H104C132 81 123 159 112 241C99 338 76 428 118 540H0Z" fill="url(#backGold)"/><path d="M0 0H94C122 81 113 159 102 241C89 338 66 428 108 540H0Z" fill="#3d0718"/></svg>
<div class="supplied-emergency"><span>Emergency Contact :</span><strong><?=e($emp['emergency_contact'] ?: '—')?></strong></div>
<div class="supplied-address"><strong>Address</strong><span><?=e(mb_strtoupper((string)($emp['home_address'] ?? ''), 'UTF-8'))?></span></div>
<div class="supplied-rule back-rule-top"></div>
<img class="supplied-back-logo" src="../assets/img/aryan-gold-logo-official.png" alt="Aryan Gold Company">
<div class="supplied-rule back-rule-bottom"></div>
<div class="supplied-company"><span>Contact Us:</span><strong><?=e($config['company']['emergency_phone'])?></strong><b>Head Office:</b><p><?=e($config['company']['address'])?></p><span><?=e($config['company']['website'])?></span></div>
</article>
</div>
<div class="card-controls no-print"><button class="btn primary" onclick="downloadCard('frontCard','<?=e($emp['employee_code'])?>-front.png')">Download front PNG</button><button class="btn gold" onclick="downloadCard('backCard','<?=e($emp['employee_code'])?>-back.png')">Download back PNG</button><button class="btn ghost" onclick="window.print()">Print / Save PDF</button></div>
</main>
</div>
<script>
async function preparePhotoForExport(node){
    const image=node.querySelector('.supplied-photo img');
    if(!image)return null;
    if(!image.complete)await image.decode();
    const frame=image.parentElement;
    const width=Math.max(1,Math.round(frame.clientWidth*4));
    const height=Math.max(1,Math.round(frame.clientHeight*4));
    const naturalWidth=image.naturalWidth;
    const naturalHeight=image.naturalHeight;
    if(!naturalWidth||!naturalHeight)return null;
    const targetRatio=width/height;
    const sourceRatio=naturalWidth/naturalHeight;
    let sourceWidth=naturalWidth,sourceHeight=naturalHeight,sourceX=0,sourceY=0;
    if(sourceRatio>targetRatio){
        sourceWidth=naturalHeight*targetRatio;
        sourceX=(naturalWidth-sourceWidth)/2;
    }else{
        sourceHeight=naturalWidth/targetRatio;
        sourceY=(naturalHeight-sourceHeight)/2;
    }
    const crop=document.createElement('canvas');
    crop.width=width;
    crop.height=height;
    crop.getContext('2d').drawImage(image,sourceX,sourceY,sourceWidth,sourceHeight,0,0,width,height);
    const original={src:image.src,objectFit:image.style.objectFit};
    image.src=crop.toDataURL('image/png');
    image.style.objectFit='fill';
    await image.decode();
    return()=>{image.src=original.src;image.style.objectFit=original.objectFit};
}
async function prepareIconsForExport(node){
    const restores=[];
    for(const svg of node.querySelectorAll('.supplied-side-block svg')){
        const clone=svg.cloneNode(true);
        clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
        clone.setAttribute('width','124');
        clone.setAttribute('height','124');
        clone.setAttribute('style','fill:none;stroke:#ffffff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round');
        const source=new XMLSerializer().serializeToString(clone);
        const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));
        const rasterSource=new Image();
        rasterSource.src=url;
        await rasterSource.decode();
        const canvas=document.createElement('canvas');
        canvas.width=124;
        canvas.height=124;
        canvas.getContext('2d').drawImage(rasterSource,0,0,124,124);
        URL.revokeObjectURL(url);
        const image=document.createElement('img');
        image.src=canvas.toDataURL('image/png');
        image.alt='';
        image.style.cssText='display:block;width:31px;height:31px;margin:0 auto 7px';
        svg.insertAdjacentElement('afterend',image);
        svg.style.display='none';
        await image.decode();
        restores.push(()=>{image.remove();svg.style.display='';});
    }
    return()=>restores.forEach(restore=>restore());
}
async function downloadCard(id,name){
    const node=document.getElementById(id);
    if(typeof html2canvas==='undefined'){
        alert('Image export library could not load. Use Print / Save PDF instead.');
        return;
    }
    let restorePhoto=null,restoreIcons=null;
    try{
        restorePhoto=await preparePhotoForExport(node);
        restoreIcons=await prepareIconsForExport(node);
        const canvas=await html2canvas(node,{scale:4,useCORS:true,backgroundColor:'#ffffff',scrollX:0,scrollY:0});
        const a=document.createElement('a');
        a.download=name;
        a.href=canvas.toDataURL('image/png');
        a.click();
    }finally{
        if(restoreIcons)restoreIcons();
        if(restorePhoto)restorePhoto();
    }
}
</script>
</body>
</html>
