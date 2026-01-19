// Get DOM elements
const canvas = document.getElementById('memeCanvas');
const ctx = canvas.getContext('2d');
const imageUpload = document.getElementById('imageUpload');
const textInput = document.getElementById('textInput');
const fontSizeInput = document.getElementById('fontSize');
const fontSizeValue = document.getElementById('fontSizeValue');
const textColorInput = document.getElementById('textColor');
const textColorValue = document.getElementById('textColorValue');
const borderColorInput = document.getElementById('borderColor');
const borderColorValue = document.getElementById('borderColorValue');
const addTextBtn = document.getElementById('addTextBtn');
const downloadBtn = document.getElementById('downloadBtn');
const placeholder = document.getElementById('placeholder');
const textBoxesList = document.getElementById('textBoxesList');

// State
let currentImage = null;
let textBoxes = [];
let selectedTextBoxIndex = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Initialize
function init() {
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    imageUpload.addEventListener('change', handleImageUpload);
    addTextBtn.addEventListener('click', addTextBox);
    fontSizeInput.addEventListener('input', handleFontSizeChange);
    textColorInput.addEventListener('input', handleTextColorChange);
    borderColorInput.addEventListener('input', handleBorderColorChange);
    downloadBtn.addEventListener('click', downloadMeme);
    
    // Canvas mouse events for dragging text
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
}

// Handle image upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            currentImage = img;
            setupCanvas(img);
            updateCanvas();
            updateDownloadButton();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Setup canvas with image
function setupCanvas(img) {
    // Set canvas size to match image aspect ratio
    const maxWidth = 800;
    const maxHeight = 400;
    
    let width = img.width;
    let height = img.height;
    
    // Scale down if too large
    if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
    }
    
    if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Show canvas, hide placeholder
    canvas.classList.add('active');
    placeholder.classList.add('hidden');
}

// Add text box
function addTextBox() {
    const text = textInput.value.trim();
    if (!text) {
        alert('Please enter some text first!');
        return;
    }
    
    if (!currentImage) {
        alert('Please choose an image first!');
        return;
    }
    
    const fontSize = parseInt(fontSizeInput.value);
    const textColor = textColorInput.value;
    const borderColor = borderColorInput.value;
    
    // Create text box object
    const textBox = {
        id: Date.now(),
        text: text.toUpperCase(),
        x: canvas.width / 2,
        y: canvas.height / 2,
        fontSize: fontSize,
        color: textColor,
        borderColor: borderColor
    };
    
    textBoxes.push(textBox);
    
    // Clear input
    textInput.value = '';
    
    // Update UI
    updateTextBoxesList();
    updateCanvas();
    updateDownloadButton();
}

// Update text boxes list UI
function updateTextBoxesList() {
    textBoxesList.innerHTML = '';
    
    textBoxes.forEach((textBox, index) => {
        const item = document.createElement('div');
        item.className = 'text-box-item';
        if (index === selectedTextBoxIndex) {
            item.classList.add('selected');
        }
        
        const input = document.createElement('textarea');
        input.value = textBox.text;
        input.rows = 1;
        input.addEventListener('input', (e) => {
            textBox.text = e.target.value.toUpperCase();
            // Auto-resize textarea
            e.target.rows = e.target.value.split('\n').length;
            updateCanvas();
        });
        input.addEventListener('click', () => {
            selectedTextBoxIndex = index;
            updateTextBoxesList();
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            textBoxes.splice(index, 1);
            if (selectedTextBoxIndex === index) {
                selectedTextBoxIndex = null;
            }
            updateTextBoxesList();
            updateCanvas();
            updateDownloadButton();
        });
        
        item.appendChild(input);
        item.appendChild(deleteBtn);
        textBoxesList.appendChild(item);
    });
}

// Update canvas
function updateCanvas() {
    if (!currentImage) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    
    // Draw all text boxes
    textBoxes.forEach((textBox, index) => {
        drawText(textBox.text, textBox.x, textBox.y, textBox.fontSize, textBox.color, textBox.borderColor, index === selectedTextBoxIndex);
    });
}

// Draw text with custom color fill and border
function drawText(text, x, y, fontSize, color, borderColor, isSelected) {
    if (!text) return;
    
    // Set font
    ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Split text into lines
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2; // 1.2x line spacing
    const totalHeight = lines.length * lineHeight;
    
    // Calculate starting Y position to center all lines
    const startY = y - (totalHeight / 2) + (lineHeight / 2);
    
    // Draw each line
    lines.forEach((line, index) => {
        const lineY = startY + (index * lineHeight);
        
        // Draw border (stroke)
        ctx.strokeStyle = borderColor || '#000000';
        ctx.lineWidth = Math.max(fontSize / 15, 3);
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(line, x, lineY);
        
        // Draw colored text (fill)
        ctx.fillStyle = color || '#FFFFFF';
        ctx.fillText(line, x, lineY);
    });
    
    // Draw selection indicator
    if (isSelected) {
        // Calculate bounding box for all lines
        let maxWidth = 0;
        lines.forEach(line => {
            const metrics = ctx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        });
        
        ctx.strokeStyle = '#ff9966';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            x - maxWidth / 2 - 10,
            startY - lineHeight / 2 - 10,
            maxWidth + 20,
            totalHeight + 20
        );
    }
}

// Handle font size change
function handleFontSizeChange(e) {
    const size = e.target.value;
    fontSizeValue.textContent = size;
    
    // Update selected text box font size
    if (selectedTextBoxIndex !== null && textBoxes[selectedTextBoxIndex]) {
        textBoxes[selectedTextBoxIndex].fontSize = parseInt(size);
        updateCanvas();
    }
}

// Handle text color change
function handleTextColorChange(e) {
    const color = e.target.value;
    textColorValue.textContent = color.toUpperCase();
    
    // Update selected text box color
    if (selectedTextBoxIndex !== null && textBoxes[selectedTextBoxIndex]) {
        textBoxes[selectedTextBoxIndex].color = color;
        updateCanvas();
    }
}

// Handle border color change
function handleBorderColorChange(e) {
    const color = e.target.value;
    borderColorValue.textContent = color.toUpperCase();
    
    // Update selected text box border color
    if (selectedTextBoxIndex !== null && textBoxes[selectedTextBoxIndex]) {
        textBoxes[selectedTextBoxIndex].borderColor = color;
        updateCanvas();
    }
}

// Mouse event handlers for dragging
function handleMouseDown(e) {
    if (!currentImage || textBoxes.length === 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if clicking on any text box (in reverse order to prioritize top boxes)
    for (let i = textBoxes.length - 1; i >= 0; i--) {
        const textBox = textBoxes[i];
        ctx.font = `bold ${textBox.fontSize}px Impact, Arial Black, sans-serif`;
        
        // Calculate bounding box for multi-line text
        const lines = textBox.text.split('\n');
        const lineHeight = textBox.fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        
        let maxWidth = 0;
        lines.forEach(line => {
            const metrics = ctx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        });
        
        const textWidth = maxWidth;
        const textHeight = totalHeight;
        
        if (
            mouseX >= textBox.x - textWidth / 2 - 10 &&
            mouseX <= textBox.x + textWidth / 2 + 10 &&
            mouseY >= textBox.y - textHeight / 2 - 10 &&
            mouseY <= textBox.y + textHeight / 2 + 10
        ) {
            selectedTextBoxIndex = i;
            isDragging = true;
            dragOffsetX = mouseX - textBox.x;
            dragOffsetY = mouseY - textBox.y;
            fontSizeInput.value = textBox.fontSize;
            fontSizeValue.textContent = textBox.fontSize;
            textColorInput.value = textBox.color || '#ffffff';
            textColorValue.textContent = (textBox.color || '#ffffff').toUpperCase();
            borderColorInput.value = textBox.borderColor || '#000000';
            borderColorValue.textContent = (textBox.borderColor || '#000000').toUpperCase();
            updateTextBoxesList();
            updateCanvas();
            break;
        }
    }
}

function handleMouseMove(e) {
    if (!isDragging || selectedTextBoxIndex === null) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    textBoxes[selectedTextBoxIndex].x = mouseX - dragOffsetX;
    textBoxes[selectedTextBoxIndex].y = mouseY - dragOffsetY;
    
    updateCanvas();
}

function handleMouseUp() {
    isDragging = false;
}

// Update download button state
function updateDownloadButton() {
    if (currentImage && textBoxes.length > 0) {
        downloadBtn.classList.add('active');
        downloadBtn.disabled = false;
    } else {
        downloadBtn.classList.remove('active');
        downloadBtn.disabled = true;
    }
}

// Download meme
function downloadMeme() {
    if (!currentImage || textBoxes.length === 0) return;
    
    // Temporarily remove selection indicator
    const tempSelectedIndex = selectedTextBoxIndex;
    selectedTextBoxIndex = null;
    updateCanvas();
    
    // Create download link
    const link = document.createElement('a');
    const timestamp = new Date().getTime();
    link.download = `meme_${timestamp}.png`;
    
    // Convert canvas to blob and download
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        // Restore selection
        selectedTextBoxIndex = tempSelectedIndex;
        updateCanvas();
    });
}

// Initialize app
init();
