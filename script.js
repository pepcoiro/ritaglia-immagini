(() => {
  const $ = id => document.getElementById(id);
  const drop=$('drop'), picker=$('picker'), folderPicker=$('folderPicker'), editor=$('editor'), image=$('sourceImage'), stage=$('stage'), cropBox=$('cropBox');
  const ratioSelect=$('ratio'), customRatio=$('customRatio'), ratioButtons=$('ratioButtons'), ratioAllButtons=$('ratioAllButtons'), ratioWidth=$('ratioWidth'), ratioHeight=$('ratioHeight'), strip=$('thumbnailStrip');
  let allRatio='free';
  let items=[],activeId=null,nextId=1,imageUrl=null,naturalW=0,naturalH=0;
  let crop={x:0,y:0,w:0,h:0},bounds={x:0,y:0,w:0,h:0},drag=null;
  const accepted=/^image\/(jpeg|png|webp|gif|bmp)$/;
  $('chooseFolder').addEventListener('click',()=>folderPicker.click());
  folderPicker.addEventListener('change',e=>{addFiles([...e.target.files]);folderPicker.value='';});
  $('chooseFile').addEventListener('click',()=>picker.click());
  $('chooseAnother').addEventListener('click',()=>picker.click());
  picker.addEventListener('change',e=>{addFiles([...e.target.files]);picker.value='';});
  drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
  drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');addFiles([...e.dataTransfer.files]);});
  ratioButtons.addEventListener('click',e=>{const b=e.target.closest('[data-ratio]');if(!b)return;saveActiveCrop();ratioSelect.value=b.dataset.ratio;ratioSelect.dispatchEvent(new Event('change'));updateRatioButtons();});
  ratioSelect.addEventListener('change',()=>{const item=currentItem();if(item)item.ratio=ratioSelect.value;customRatio.classList.toggle('hidden',ratioSelect.value!=='custom'&&allRatio!=='custom');updateRatioButtons();if(naturalW){resetCrop();saveActiveCrop();}});
  ratioAllButtons.addEventListener('click',e=>{const b=e.target.closest('[data-ratio-all]');if(!b)return;saveActiveCrop();allRatio=b.dataset.ratioAll;items.forEach(item=>{item.ratio=allRatio;item.normalized=null;});ratioSelect.value=allRatio;customRatio.classList.toggle('hidden',allRatio!=='custom');updateRatioButtons();updateAllRatioButtons();if(naturalW){resetCrop();saveActiveCrop();}});
  function updateRatioButtons(){ratioButtons.querySelectorAll('[data-ratio]').forEach(b=>{const active=b.dataset.ratio===ratioSelect.value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
  function updateAllRatioButtons(){ratioAllButtons.querySelectorAll('[data-ratio-all]').forEach(b=>{const active=b.dataset.ratioAll===allRatio;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
  function customRatioChanged(){
    if(allRatio==='custom')items.forEach(item=>{if(item.ratio==='custom')item.normalized=null;});
    if(currentItem()?.ratio==='custom'&&naturalW){resetCrop();saveActiveCrop();}
  }
  ratioWidth.addEventListener('input',customRatioChanged);
  ratioHeight.addEventListener('input',customRatioChanged);
  $('reset').addEventListener('click',()=>{resetCrop();saveActiveCrop();});
  $('download').addEventListener('click',()=>exportItem(currentItem()));
  $('downloadAll').addEventListener('click',exportAll);
  $('clearAll').addEventListener('click',clearAllPhotos);
  window.addEventListener('resize',()=>{if(naturalW){saveActiveCrop();layoutCrop(true);}});
  function setInfo(t){$('cropInfo').textContent=t;}
  function currentItem(){return items.find(i=>i.id===activeId);}
  function getRatio(){const item=currentItem();const v=item?.ratio||ratioSelect.value;if(v==='free')return null;if(v==='custom'){const w=Number(ratioWidth.value),h=Number(ratioHeight.value);return Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0?w/h:NaN;}const p=v.split(':').map(Number);return p[0]/p[1];}
  function addFiles(files){
    const valid=files.filter(f=>accepted.test(f.type));
    if(!valid.length){setInfo('Scegli immagini JPEG, PNG, WebP, GIF o BMP.');return;}
    valid.forEach(file=>{const item={id:nextId++,file,url:URL.createObjectURL(file),normalized:null,ratio:allRatio};items.push(item);makeThumbnail(item);});
    updateGallery();drop.classList.add('hidden');editor.classList.remove('hidden');
    ratioAllButtons.closest('.field').classList.toggle('hidden',items.length<2);
    if(!activeId)selectItem(items[0].id);else setInfo(items.length+' immagini caricate.');
  }
  function makeThumbnail(item){
    const b=document.createElement('button');b.type='button';b.className='thumbnail';b.dataset.id=item.id;b.title=item.file.name;
    const img=document.createElement('img');img.src=item.url;img.alt='';
    const name=document.createElement('span');name.textContent=item.file.name;b.append(img,name);b.addEventListener('click',()=>selectItem(item.id));item.button=b;strip.appendChild(b);
  }
  function updateGallery(){
    $('galleryCount').textContent=items.length+(items.length===1?' immagine':' immagini');
    $('downloadAll').disabled=items.length<2;
    $('clearAll').disabled=items.length===0;
    strip.querySelectorAll('.thumbnail').forEach(b=>{const active=Number(b.dataset.id)===activeId;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  }
  function clearAllPhotos(){
    if(!items.length)return;
    if(!window.confirm('Vuoi davvero azzerare tutto? Verranno rimosse tutte le foto caricate e i ritagli impostati.'))return;
    items.forEach(item=>URL.revokeObjectURL(item.url));
    items=[];activeId=null;nextId=1;imageUrl=null;naturalW=0;naturalH=0;
    image.onload=null;image.onerror=null;image.removeAttribute('src');
    crop={x:0,y:0,w:0,h:0};bounds={x:0,y:0,w:0,h:0};drag=null;
    cropBox.style.left='0px';cropBox.style.top='0px';cropBox.style.width='0px';cropBox.style.height='0px';
    strip.replaceChildren();
    editor.classList.add('hidden');drop.classList.remove('hidden');
    ratioAllButtons.closest('.field').classList.add('hidden');
    ratioSelect.value=allRatio;updateRatioButtons();updateAllRatioButtons();
    customRatio.classList.toggle('hidden',allRatio!=='custom');
    updateGallery();setInfo('Seleziona le immagini da ritagliare.');
    $('droptext').textContent='Trascina qui più immagini oppure';
  }
  function selectItem(id){
    saveActiveCrop();activeId=id;const item=currentItem();if(!item)return;
    imageUrl=item.url;
    image.onload=()=>{naturalW=image.naturalWidth;naturalH=image.naturalHeight;ratioSelect.value=item.ratio||allRatio;customRatio.classList.toggle('hidden',ratioSelect.value!=='custom'&&allRatio!=='custom');updateRatioButtons();updateAllRatioButtons();layoutCrop(Boolean(item.normalized));updateGallery();setInfo(item.file.name+' · '+naturalW+' × '+naturalH+' px');};
    image.onerror=()=>setInfo('Impossibile aprire questa immagine.');image.src=item.url;updateGallery();
    item.button.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
  }
  function layoutCrop(restore=false){
    if(!naturalW||!naturalH)return;
    const sr=stage.getBoundingClientRect(),ir=image.getBoundingClientRect(),st=getComputedStyle(stage);
    bounds={x:ir.left-sr.left-parseFloat(st.borderLeftWidth||0),y:ir.top-sr.top-parseFloat(st.borderTopWidth||0),w:ir.width,h:ir.height};
    const item=currentItem();
    if(restore&&item&&item.normalized){const n=item.normalized;crop={x:bounds.x+n.x*bounds.w,y:bounds.y+n.y*bounds.h,w:n.w*bounds.w,h:n.h*bounds.h};drawCrop();return;}
    const ratio=getRatio();let w=bounds.w,h=bounds.h;
    if(ratio&&Number.isFinite(ratio)){if(w/h>ratio)w=h*ratio;else h=w/ratio;}
    crop={x:bounds.x+(bounds.w-w)/2,y:bounds.y+(bounds.h-h)/2,w,h};drawCrop();
  }
  function resetCrop(){if(naturalW)layoutCrop(false);}
  function saveActiveCrop(){const item=currentItem();if(!item||!bounds.w||!bounds.h||!crop.w||!crop.h)return;item.normalized={x:(crop.x-bounds.x)/bounds.w,y:(crop.y-bounds.y)/bounds.h,w:crop.w/bounds.w,h:crop.h/bounds.h};}
  function drawCrop(){cropBox.style.left=crop.x+'px';cropBox.style.top=crop.y+'px';cropBox.style.width=crop.w+'px';cropBox.style.height=crop.h+'px';if(bounds.w&&bounds.h)setInfo('Area selezionata: '+Math.max(1,Math.round(crop.w*naturalW/bounds.w))+' × '+Math.max(1,Math.round(crop.h*naturalH/bounds.h))+' px');}
  function clampCrop(){crop.x=Math.max(bounds.x,Math.min(crop.x,bounds.x+bounds.w-crop.w));crop.y=Math.max(bounds.y,Math.min(crop.y,bounds.y+bounds.h-crop.h));}
  cropBox.addEventListener('pointerdown',e=>{const h=e.target.closest('.handle'),type=h?[...h.classList].find(c=>['nw','ne','sw','se'].includes(c)):'move';drag={type,startX:e.clientX,startY:e.clientY,initial:{...crop}};cropBox.setPointerCapture(e.pointerId);e.preventDefault();});
  cropBox.addEventListener('pointermove',e=>{
    if(!drag)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY,c=drag.initial,min=16,aspect=getRatio();
    if(drag.type==='move'){crop.x=c.x+dx;crop.y=c.y+dy;clampCrop();}
    else{
      let l=c.x,t=c.y,r=c.x+c.w,b=c.y+c.h;
      if(drag.type.includes('w'))l+=dx;if(drag.type.includes('e'))r+=dx;if(drag.type.includes('n'))t+=dy;if(drag.type.includes('s'))b+=dy;
      l=Math.max(bounds.x,Math.min(l,r-min));r=Math.min(bounds.x+bounds.w,Math.max(r,l+min));t=Math.max(bounds.y,Math.min(t,b-min));b=Math.min(bounds.y+bounds.h,Math.max(b,t+min));
      if(aspect&&Number.isFinite(aspect)){let w=r-l,h=b-t;if(w/h>aspect)w=h*aspect;else h=w/aspect;if(drag.type.includes('w'))l=r-w;else r=l+w;if(drag.type.includes('n'))t=b-h;else b=t+h;
        if(l<bounds.x){l=bounds.x;r=Math.min(bounds.x+bounds.w,l+w);}if(r>bounds.x+bounds.w){r=bounds.x+bounds.w;l=Math.max(bounds.x,r-w);}if(t<bounds.y){t=bounds.y;b=Math.min(bounds.y+bounds.h,t+h);}if(b>bounds.y+bounds.h){b=bounds.y+bounds.h;t=Math.max(bounds.y,b-h);}}
      crop={x:l,y:t,w:r-l,h:b-t};
    }drawCrop();saveActiveCrop();
  });
  function endDrag(){drag=null;}cropBox.addEventListener('pointerup',endDrag);cropBox.addEventListener('pointercancel',endDrag);
  function cropBlob(item,n){
    return new Promise(resolve=>{const img=new Image();img.onload=()=>{const x=Math.max(0,Math.min(img.naturalWidth-1,Math.round(n.x*img.naturalWidth))),y=Math.max(0,Math.min(img.naturalHeight-1,Math.round(n.y*img.naturalHeight))),w=Math.max(1,Math.min(img.naturalWidth-x,Math.round(n.w*img.naturalWidth))),h=Math.max(1,Math.min(img.naturalHeight-y,Math.round(n.h*img.naturalHeight)));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx){resolve(null);return;}ctx.drawImage(img,x,y,w,h,0,0,w,h);
      const type=['image/jpeg','image/png','image/webp'].includes(item.file.type)?item.file.type:'image/png';canvas.toBlob(blob=>resolve(blob?{blob,type}:null),type,type==='image/jpeg'||type==='image/webp'?.92:undefined);
    };img.onerror=()=>resolve(null);img.src=item.url;});
  }
  async function downloadResult(item,n){const result=await cropBlob(item,n);if(!result)return false;const ext=result.type==='image/jpeg'?'jpg':result.type==='image/webp'?'webp':'png',base=item.file.name.replace(/\.[^.]+$/,'');const a=document.createElement('a'),url=URL.createObjectURL(result.blob);a.href=url;a.download=base+'-ritagliata.'+ext;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);return true;}
  async function exportItem(item){saveActiveCrop();if(!item)return;setInfo('Preparazione del ritaglio…');const ok=await downloadResult(item,item.normalized||{x:0,y:0,w:1,h:1});setInfo(ok?'Immagine ritagliata e scaricata.':'Esportazione non riuscita.');}
  async function exportAll(){saveActiveCrop();const b=$('downloadAll');b.disabled=true;b.textContent='Preparazione…';let done=0;for(const item of items){if(await downloadResult(item,item.normalized||{x:0,y:0,w:1,h:1}))done++;setInfo('Ritaglio immagini: '+done+' di '+items.length+'…');await new Promise(r=>setTimeout(r,250));}b.textContent='Ritaglia e scarica tutte';b.disabled=items.length<2;setInfo('Completato: '+done+' immagini scaricate. Se richiesto, consenti i download multipli nel browser.');}
})();