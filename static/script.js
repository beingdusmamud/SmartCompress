class ImageCompressor {
  constructor() {
    this.initialize();
    this.bindEvents();
  }

  initialize() {
    // DOM Elements
    this.dropZone = document.getElementById("dropZone");
    this.fileInput = document.getElementById("fileInput");
    this.compressionPanel = document.getElementById("compressionPanel");
    this.originalPreview = document.getElementById("originalPreview");
    this.compressedPreview = document.getElementById("compressedPreview");
    this.originalSize = document.getElementById("originalSize");
    this.compressedSize = document.getElementById("compressedSize");
    this.originalDimensions = document.getElementById("originalDimensions");
    this.compressedDimensions = document.getElementById("compressedDimensions");
    this.targetSizeInput = document.getElementById("targetSize");
    this.maxWidthInput = document.getElementById("maxWidth");
    this.maxHeightInput = document.getElementById("maxHeight");
    this.qualityBtns = document.querySelectorAll(".quality-btn");
    this.compressBtn = document.getElementById("compressBtn");
    this.downloadBtn = document.getElementById("downloadBtn");
    this.uploadBtn = document.getElementById("uploadBtn");
    this.themeToggle = document.querySelector(".theme-toggle");

    // State
    this.currentFile = null;
    this.currentQuality = 0.6;
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.supportedFormats = ["image/jpeg", "image/png", "image/webp"];
  }

  bindEvents() {
    this.dropZone.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", (e) => this.handleFileSelect(e));
    this.dropZone.addEventListener("dragover", (e) => this.handleDragOver(e));
    this.dropZone.addEventListener("dragleave", () => this.handleDragLeave());
    this.dropZone.addEventListener("drop", (e) => this.handleDrop(e));
    this.compressBtn.addEventListener("click", () => this.compressImage());
    this.downloadBtn.addEventListener("click", () => this.downloadImage());
    this.uploadBtn.addEventListener("click", () => this.uploadImage());
    this.themeToggle.addEventListener("click", () => this.toggleTheme());

    this.qualityBtns.forEach((btn) => {
      btn.addEventListener("click", () => this.setQuality(btn));
    });
  }

  async handleFileSelect(e) {
    const file = e.target.files[0];
    await this.processFile(file);
  }

  handleDragOver(e) {
    e.preventDefault();
    this.dropZone.classList.add("dragover");
  }

  handleDragLeave() {
    this.dropZone.classList.remove("dragover");
  }

  async handleDrop(e) {
    e.preventDefault();
    this.dropZone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    await this.processFile(file);
  }

  async processFile(file) {
    if (!this.validateFile(file)) return;

    this.currentFile = file;
    this.showToast("Processing image...", "success");
    this.compressionPanel.style.display = "block";

    // Display original image
    const originalUrl = URL.createObjectURL(file);
    this.originalPreview.src = originalUrl;
    this.originalSize.textContent = this.formatFileSize(file.size);

    // Get original dimensions
    const dimensions = await this.getImageDimensions(originalUrl);
    this.originalDimensions.textContent = `${dimensions.width} x ${dimensions.height}`;

    // Initial compression
    await this.compressImage();
  }

  validateFile(file) {
    if (!file) {
      this.showToast("Please select a file", "error");
      return false;
    }

    if (!this.supportedFormats.includes(file.type)) {
      this.showToast("Unsupported file format", "error");
      return false;
    }

    if (file.size > this.maxFileSize) {
      this.showToast("File size exceeds 5MB limit", "error");
      return false;
    }

    return true;
  }

  async compressImage() {
    if (!this.currentFile) return;

    const targetSize = this.targetSizeInput.value
      ? parseInt(this.targetSizeInput.value) * 1024
      : null;
    const maxWidth = this.maxWidthInput.value
      ? parseInt(this.maxWidthInput.value)
      : null;
    const maxHeight = this.maxHeightInput.value
      ? parseInt(this.maxHeightInput.value)
      : null;

    const img = new Image();
    img.src = URL.createObjectURL(this.currentFile);

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      let width = img.width;
      let height = img.height;

      // Handle max dimensions
      if (maxWidth && width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (maxHeight && height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      let quality = this.currentQuality;
      let compressed = canvas.toDataURL("image/jpeg", quality);

      // Binary search for target size
      if (targetSize) {
        let min = 0.1;
        let max = 1.0;
        let iterations = 0;
        const maxIterations = 10;

        while (iterations < maxIterations) {
          const size = Math.round(((compressed.length - 22) * 3) / 4);

          if (Math.abs(size - targetSize) < targetSize * 0.05) break;

          if (size > targetSize) {
            max = quality;
          } else {
            min = quality;
          }

          quality = (min + max) / 2;
          compressed = canvas.toDataURL("image/jpeg", quality);
          iterations++;
        }
      }

      this.compressedPreview.src = compressed;
      const compressedSize = Math.round(((compressed.length - 22) * 3) / 4);
      this.compressedSize.textContent = this.formatFileSize(compressedSize);
      this.compressedDimensions.textContent = `${width} x ${height}`;
    };
  }

  async getImageDimensions(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = url;
    });
  }

  setQuality(btn) {
    this.qualityBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    switch (btn.dataset.quality) {
      case "low":
        this.currentQuality = 0.4;
        break;
      case "medium":
        this.currentQuality = 0.6;
        break;
      case "high":
        this.currentQuality = 0.8;
        break;
    }

    this.compressImage();
  }

  downloadImage() {
    if (!this.compressedPreview.src) return;

    const link = document.createElement("a");
    link.download = `compressed_${this.currentFile.name}`;
    link.href = this.compressedPreview.src;
    link.click();
    this.showToast("Image downloaded successfully!", "success");
  }

  async uploadImage() {
    try {
      const response = await fetch("/upload", {
        method: "POST",
        body: JSON.stringify({
          image: this.compressedPreview.src,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        this.showToast("Image uploaded successfully!", "success");
      } else {
        this.showToast("Upload failed!", "error");
      }
    } catch (error) {
      this.showToast("Upload failed!", "error");
    }
  }

  toggleTheme() {
    const isDark = document.body.getAttribute("data-theme") === "dark";
    document.body.setAttribute("data-theme", isDark ? "light" : "dark");
    this.themeToggle.innerHTML = isDark
      ? '<i class="fas fa-moon"></i>'
      : '<i class="fas fa-sun"></i>';
  }

  showToast(message, type) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = "block";

    setTimeout(() => {
      toast.style.display = "none";
    }, 3000);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  new ImageCompressor();
});
