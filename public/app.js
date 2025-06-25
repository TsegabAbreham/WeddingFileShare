(async () => {
  // Fetch helper
  async function api(path, opts = {}) {
    try {
      const res = await fetch(path, opts);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw json.error || res.statusText;
      return json;
    } catch (err) {
      console.error(err);
      return { success: false, error: err };
    }
  }

  // Elements
  const navUpload   = document.getElementById('btn-upload');
  const navGallery  = document.getElementById('btn-gallery');
  const panels      = {
    upload:  document.getElementById('section-upload'),
    gallery: document.getElementById('section-gallery')
  };
  const fileInput     = document.getElementById('file-input');
  const uploadBtn     = document.getElementById('upload-btn');
  const msgEl         = document.getElementById('message');
  const galleryEl     = document.getElementById('gallery');
  const loading       = document.getElementById('loading-overlay');
  const modal         = document.getElementById('preview-modal');
  const mediaContainer= document.getElementById('media-container');
  const downloadLink  = document.getElementById('download-link');
  const removeBtn     = document.getElementById('remove-btn');
  const closeModal    = document.getElementById('close-modal');

  let currentFile = null;

  function showLoading(on) {
    loading.classList.toggle('hidden', !on);
  }
  function showMessage(text, type = '') {
    msgEl.textContent = text;
    msgEl.className = type;  // '' or 'error'/'success'
    setTimeout(() => msgEl.textContent = '', 3000);
  }

  // Navigation
  navUpload.addEventListener('click',  () => switchPanel('upload'));
  navGallery.addEventListener('click', () => switchPanel('gallery'));
  function switchPanel(name) {
    [navUpload, navGallery].forEach(b => b.classList.remove('active'));
    (name === 'upload' ? navUpload : navGallery).classList.add('active');
    Object.entries(panels).forEach(([k,p]) =>
      p.classList.toggle('active', k === name)
    );
    if (name === 'gallery') loadGallery();
  }
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });



  // Upload
  uploadBtn.addEventListener('click', async () => {
    if (!fileInput.files.length) return showMessage('Select a file', 'error');
    const form = new FormData();
    form.append('file', fileInput.files[0]);
    showLoading(true);
    const res = await api('/api/upload', { method:'POST', body:form });
    showLoading(false);
    if (res.success) {
      showMessage('Upload successful','success');
      fileInput.value = '';
    } else {
      showMessage(res.error,'error');
    }
  });

  // Load gallery with Drive thumbnails
  async function loadGallery() {
    galleryEl.innerHTML = '';
    showLoading(true);
    const res = await api('/api/files');
    showLoading(false);
    if (!res.success) {
      galleryEl.textContent = 'Error loading files';
      return;
    }
    res.files.forEach(f => {
      const thumb = document.createElement('div');
      thumb.className = 'thumb';

      // thumbnail image
      const img = document.createElement('img');
      img.src = `https://drive.google.com/thumbnail?sz=200&id=${f.id}`;
      img.alt = f.name;

      // **NEW**: ensure the img actually occupies space
      img.style.width  = '100%';
      img.style.height = 'auto';

      img.onerror = () => {
        // fallback to full view if thumbnail not available
        img.src = `https://drive.google.com/thumbnail?sz=200&id=${f.id}&_=${Date.now()}`;
      };

      const caption = document.createElement('div');
      caption.className = 'caption';
      caption.textContent = f.name;

      thumb.append(img, caption);
      thumb.onclick = () => previewFile(f);
      galleryEl.append(thumb);
    });
  }

  // Preview in modal (unchanged)
  function previewFile(f) {
    currentFile = f;
    mediaContainer.innerHTML = '';
    const previewUrl = `https://drive.google.com/file/d/${f.id}/preview`;
    let frame = document.createElement('iframe');
    frame.src = previewUrl;
    frame.style.width  = '100%';
    frame.style.height = '75vh';
    frame.frameBorder = '0';
    if (f.mimeType.startsWith('video/')) frame.allow = 'autoplay; encrypted-media';
    mediaContainer.append(frame);

    downloadLink.href = `https://drive.google.com/uc?export=download&id=${f.id}`;
    modal.classList.remove('hidden');
  }

  closeModal.onclick = () => modal.classList.add('hidden');
  

  removeBtn.onclick = async () => {
    if (!currentFile) return;
    const pwd = prompt('Password to delete:');
    if (pwd == null) return;
    showLoading(true);
    const res = await api(`/api/files/${currentFile.id}`, {
      method: 'DELETE',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ password: pwd })
    });
    showLoading(false);
    if (res.success) {
      showMessage('Deleted','success');
      modal.classList.add('hidden');
      loadGallery();
    } else {
      showMessage(res.error,'error');
    }
  };

  // Initialize
  switchPanel('upload');
})();
