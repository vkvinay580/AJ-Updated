document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[name="full_name"]').forEach(field=>{
    field.style.textTransform='uppercase';
    field.value=field.value.toUpperCase();
    field.addEventListener('input',()=>{field.value=field.value.toUpperCase();});
  });
  document.querySelectorAll('.person-cell strong').forEach(name=>{
    name.textContent=name.textContent.toUpperCase();
  });
  document.querySelectorAll('.actions a[href^="view.php?id="]').forEach(link=>{
    if(link.textContent.trim()==='View') link.textContent='Update';
  });
  const photo=document.querySelector('#photo');
  const preview=document.querySelector('#photoPreview');
  if(photo&&preview){photo.addEventListener('change',()=>{const f=photo.files?.[0];if(f){preview.src=URL.createObjectURL(f);}})}
  document.querySelectorAll('[data-confirm]').forEach(el=>el.addEventListener('click',e=>{if(!confirm(el.dataset.confirm))e.preventDefault();}));
});
