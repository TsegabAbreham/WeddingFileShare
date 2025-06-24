(async () => {
  // helper to call your API and surface HTTP errors
  const api = async (path, opts = {}) => {
    try {
      const res = await fetch(path, {
        ...opts
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        console.error(`API ${path} returned HTTP ${res.status}:`, payload);
        return { success: false, error: payload?.error || res.statusText };
      }
      return payload;
    } catch (e) {
      console.error('Network/API error', e);
      return { success: false, error: 'Network error' };
    }
  };

  const showMessage = (text, type = 'success') => {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = '';
    msg.classList.add(type, 'visible');
    setTimeout(() => msg.classList.remove('visible'), 3000);
  };

  const fileListEl    = document.getElementById('file-list');
  const fileInput     = document.getElementById('file-input');
  const uploadBtn     = document.getElementById('upload-btn');
  const previewModal  = document.getElementById('preview-modal');
  const closePreview  = document.getElementById('close-preview');
  const mediaContainer= document.getElementById('media-container');
  const downloadBtn   = document.getElementById('download-btn');

  // Fetch and render file-list
  const loadFiles = async () => {
    fileListEl.innerHTML = '<li>Loading…</li>';
    const res = await api('/api/files');
    if (!res.success) {
      fileListEl.innerHTML = '';
      return showMessage(res.error || 'Failed to fetch files', 'error');
    }

    if (!res.files.length) {
      fileListEl.innerHTML = '<li>No files available</li>';
      return;
    }

    fileListEl.innerHTML = '';
    res.files.forEach(f => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = f.name;
      name.className = 'file-name';
      name.onclick = () => preview(f);

      const actions = document.createElement('div');
      actions.className = 'file-actions';
      // download link
      const a = document.createElement('a');
      a.href   = `https://drive.google.com/uc?id=${f.id}&export=download`;
      a.textContent = 'Download';
      a.target = '_blank';
      actions.append(a);

      // remove button
      const btn = document.createElement('button');
      btn.textContent = 'Remove';
      btn.onclick = () => removeFile(f.id);
      actions.append(btn);

      li.append(name, actions);
      fileListEl.append(li);
    });
  };

  uploadBtn.addEventListener('click', async () => {
    if (!fileInput.files.length) {
      return showMessage('Select a file first', 'error');
    }
    const form = new FormData();
    form.append('file', fileInput.files[0]);

    const res = await api('/api/upload', {
      method: 'POST',
      body: form
    });

    if (res.success) {
      showMessage('Upload successful');
      loadFiles();
    } else {
      showMessage(res.error, 'error');
    }
  });

  // Preview logic using iframe/image based on MIME type
  const preview = f => {
    mediaContainer.innerHTML = '';
    const previewUrl = `https://drive.google.com/file/d/${f.id}/preview`;
    const downloadUrl = `https://drive.google.com/uc?id=${f.id}&export=download`;

    if (f.mimeType.startsWith('image/')) {
      const iframe = document.createElement('iframe');
      iframe.src = previewUrl;
      iframe.width = '100%';
      iframe.height = '500';
      iframe.frameBorder = '0';
      mediaContainer.append(iframe);
    }
    else if (f.mimeType.startsWith('video/')) {
      const iframe = document.createElement('iframe');
      iframe.src = previewUrl;
      iframe.width = '100%';
      iframe.height = '360';
      iframe.allow = 'autoplay';
      iframe.frameBorder = '0';
      mediaContainer.append(iframe);
    } else {
      const iframe = document.createElement('iframe');
      iframe.src = previewUrl;
      iframe.width = '100%';
      iframe.height = '400';
      iframe.frameBorder = '0';
      mediaContainer.append(iframe);
    }

    downloadBtn.onclick = () => window.open(downloadUrl, '_blank');
    previewModal.classList.remove('hidden');
  };

  closePreview.addEventListener('click', () => {
    previewModal.classList.add('hidden');
  });

  const removeFile = async id => {
    const pwd = prompt('Password to delete:');
    if (pwd === null) return;

    const res = await api(`/api/files/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });

    if (res.success) {
      showMessage('Deleted');
      loadFiles();
    } else {
      showMessage(res.error, 'error');
    }
  };

  await loadFiles();
})();