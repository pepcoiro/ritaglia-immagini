(() => {
  const $ = id => document.getElementById(id);
  const drop = $('drop'), picker = $('picker'), editor = $('editor');
  const image = $('sourceImage'), stage = $('stage'), cropBox = $('cropBox');
  const ratioSelect = $('ratio'), customRatio = $('customRatio');
  const ratioWidth = $('ratioWidth'), ratioHeight = $('ratioHeight');
  let sourceFile = null, imageUrl = null, naturalW = 0, naturalH = 0;
  let crop = {x:0,y:0,w:0,h:0}, bounds = {x:0,y:0,w:0,h:0};
  let drag = null;

  $('chooseFile').addEventListener('click', () => picker.click());
  $('chooseAnother').addEventListener('click', () => picker.click());
  picker.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (file) loadFile(file);
    picker.value = '';
  });
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag');
    const file = [...e.dataTransfer.files].find(f => /^image\/(jpeg|png|webp|gif|bmp)$/.test(f.type));
    if (file) loadFile(file);
    else if (e.dataTransfer.files.length) setInfo('Formato non supportato. Usa JPEG, PNG, WebP, GIF o BMP.');
  });
  ratioSelect.addEventListener('change', () => {
    customRatio.classList.toggle('hidden', ratioSelect.value !== 'custom');
    if (naturalW) resetCrop();
  });
  ratioWidth.addEventListener('input', () => { if (ratioSelect.value === 'custom' && naturalW) resetCrop(); });
  ratioHeight.addEventListener('input', () => { if (ratioSelect.value === 'custom' && naturalW) resetCrop(); });
  $('reset').addEventListener('click', resetCrop);
  $('download').addEventListener('click', exportCrop);
  window.addEventListener('resize', () => { if (naturalW) layoutCrop(); });

  function setInfo(text) { $('cropInfo').textContent = text; }
  function getRatio() {
    const value = ratioSelect.value;
    if (value === 'free') return null;
    if (value === 'custom') {
      const w = Number(ratioWidth.value), h = Number(ratioHeight.value);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return NaN;
      return w / h;
    }
    const parts = value.split(':').map(Number);
    return parts[0] / parts[1];
  }
  function loadFile(file) {
    if (!/^image\/(jpeg|png|webp|gif|bmp)$/.test(file.type)) {
      setInfo('Formato non supportato. Usa JPEG, PNG, WebP, GIF o BMP.'); return;
    }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    sourceFile = file; imageUrl = URL.createObjectURL(file);
    image.onload = () => {
      naturalW = image.naturalWidth; naturalH = image.naturalHeight;
      editor.classList.remove('hidden');
      drop.classList.add('hidden');
      layoutCrop();
    };
    image.onerror = () => setInfo('Impossibile aprire questa immagine.');
    image.src = imageUrl;
  }
  function layoutCrop() {
    if (!naturalW || !naturalH) return;
    const stageRect = stage.getBoundingClientRect();
    const imgRect = image.getBoundingClientRect();
    const stageStyles = getComputedStyle(stage);
    const stageContentLeft = stageRect.left + parseFloat(stageStyles.borderLeftWidth || 0);
    const stageContentTop = stageRect.top + parseFloat(stageStyles.borderTopWidth || 0);
    const offsetX = imgRect.left - stageContentLeft;
    const offsetY = imgRect.top - stageContentTop;
    const displayW = imgRect.width, displayH = imgRect.height;
    bounds = {x:offsetX, y:offsetY, w:displayW, h:displayH};
    const ratio = getRatio();
    let w = displayW * .8, h = displayH * .8;
    if (ratio && Number.isFinite(ratio)) {
      if (w / h > ratio) w = h * ratio; else h = w / ratio;
    }
    crop = {x:offsetX+(displayW-w)/2,y:offsetY+(displayH-h)/2,w,h};
    drawCrop();
  }
  function resetCrop() {
    if (!naturalW) return;
    layoutCrop();
  }
  function drawCrop() {
    cropBox.style.left = crop.x + 'px';
    cropBox.style.top = crop.y + 'px';
    cropBox.style.width = crop.w + 'px';
    cropBox.style.height = crop.h + 'px';
    setInfo('Area selezionata: ' + Math.max(1, Math.round(crop.w * naturalW / bounds.w)) +
      ' × ' + Math.max(1, Math.round(crop.h * naturalH / bounds.h)) + ' px');
  }
  function clampCrop() {
    crop.w = Math.max(16, Math.min(crop.w, bounds.x + bounds.w - crop.x));
    crop.h = Math.max(16, Math.min(crop.h, bounds.y + bounds.h - crop.y));
    crop.x = Math.max(bounds.x, Math.min(crop.x, bounds.x + bounds.w - crop.w));
    crop.y = Math.max(bounds.y, Math.min(crop.y, bounds.y + bounds.h - crop.h));
  }
  cropBox.addEventListener('pointerdown', e => {
    const handle = e.target.closest('.handle');
    const type = handle ? [...handle.classList].find(c => ['nw','ne','sw','se'].includes(c)) : 'move';
    drag = {type,startX:e.clientX,startY:e.clientY,initial:{...crop}};
    cropBox.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  cropBox.addEventListener('pointermove', e => {
    if (!drag) return;
    const scaleX = bounds.w / (image.getBoundingClientRect().width || 1);
    const scaleY = bounds.h / (image.getBoundingClientRect().height || 1);
    const dx = (e.clientX - drag.startX) / scaleX;
    const dy = (e.clientY - drag.startY) / scaleY;
    const c = drag.initial, minSize = 16;
    const aspect = getRatio();
    if (drag.type === 'move') {
      crop.x = c.x + dx; crop.y = c.y + dy; clampCrop();
    } else {
      let left = c.x, top = c.y, right = c.x + c.w, bottom = c.y + c.h;
      if (drag.type.includes('w')) left += dx;
      if (drag.type.includes('e')) right += dx;
      if (drag.type.includes('n')) top += dy;
      if (drag.type.includes('s')) bottom += dy;
      left = Math.max(bounds.x, Math.min(left, right-minSize));
      right = Math.min(bounds.x+bounds.w, Math.max(right, left+minSize));
      top = Math.max(bounds.y, Math.min(top, bottom-minSize));
      bottom = Math.min(bounds.y+bounds.h, Math.max(bottom, top+minSize));
      if (aspect && Number.isFinite(aspect)) {
        let w = right-left, h = bottom-top;
        if (w / h > aspect) w = h * aspect; else h = w / aspect;
        if (drag.type.includes('w')) left = right - w; else right = left + w;
        if (drag.type.includes('n')) top = bottom - h; else bottom = top + h;
        if (left < bounds.x) { left=bounds.x; right=Math.min(bounds.x+bounds.w,left+w); }
        if (right > bounds.x+bounds.w) { right=bounds.x+bounds.w; left=Math.max(bounds.x,right-w); }
        if (top < bounds.y) { top=bounds.y; bottom=Math.min(bounds.y+bounds.h,top+h); }
        if (bottom > bounds.y+bounds.h) { bottom=bounds.y+bounds.h; top=Math.max(bounds.y,bottom-h); }
      }
      crop = {x:left,y:top,w:right-left,h:bottom-top};
    }
    drawCrop();
  });
  function endDrag() { drag = null; }
  cropBox.addEventListener('pointerup', endDrag);
  cropBox.addEventListener('pointercancel', endDrag);

  async function exportCrop() {
    if (!sourceFile || !naturalW || !bounds.w || !bounds.h) return;
    const scaleX = naturalW / bounds.w, scaleY = naturalH / bounds.h;
    const sx = Math.max(0, Math.round((crop.x - bounds.x) * scaleX));
    const sy = Math.max(0, Math.round((crop.y - bounds.y) * scaleY));
    const sw = Math.min(naturalW - sx, Math.max(1, Math.round(crop.w * scaleX)));
    const sh = Math.min(naturalH - sy, Math.max(1, Math.round(crop.h * scaleY)));
    if (!sw || !sh) { setInfo('Seleziona un’area valida.'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = sw; canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setInfo('Canvas non disponibile in questo browser.'); return; }
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    const originalType = sourceFile.type;
    const type = ['image/jpeg','image/png','image/webp'].includes(originalType) ? originalType : 'image/png';
    canvas.toBlob(blob => {
      if (!blob) { setInfo('Esportazione non riuscita.'); return; }
      const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
      const base = sourceFile.name.replace(/\.[^.]+$/, '');
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url; link.download = base + '-ritagliata.' + extension;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setInfo('Immagine ritagliata: ' + sw + ' × ' + sh + ' px.');
    }, type, type === 'image/jpeg' || type === 'image/webp' ? .92 : undefined);
  }
})();