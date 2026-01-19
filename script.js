import db from './database.js';
import authManager from './auth.js';
import feedManager from './feed.js';

// Get DOM elements
const canvas = document.getElementById('memeCanvas');
const ctx = canvas.getContext('2d');
const imageUpload = document.getElementById('imageUpload');
const textInput = document.getElementById('textInput');
const fontSizeInput = document.getElementById('fontSize');
const fontSizeValue = document.getElementById('fontSizeValue');
const textColorInput = document.getElementById('textColor');
const borderColorInput = document.getElementById('borderColor');
const addTextBtn = document.getElementById('addTextBtn');
const postMemeBtn = document.getElementById('postMemeBtn');
const placeholder = document.getElementById('placeholder');
const textBoxesList = document.getElementById('textBoxesList');
const templateGallery = document.getElementById('templateGallery');
const memeTitleInput = document.getElementById('memeTitle');

// Available meme templates
const templates = [
    { name: 'Drake', path: 'templates/drake.jpg' },
    { name: 'Distracted Boyfriend', path: 'templates/distracted.jpg' },
    { name: 'Expanding Brain', path: 'templates/mind.jpg' },
    { name: 'Two Buttons', path: 'templates/buttons.jpg' }
];

// State
let currentImage = null;
let textBoxes = [];
let selectedTextBoxIndex = null;
let isDragging = false;
let isResizing = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let resizeStartSize = 0;
let resizeStartY = 0;
let selectedTemplateIndex = null;
let previewText = null; // For real-time preview

// App state
let currentView = 'feed'; // 'feed' or 'editor'

// Initialize
async function init() {
    // Setup auth
    await setupAuth();
    
    // Setup navigation
    setupNavigation();
    
    // Load templates and setup editor listeners
    loadTemplates();
    setupEventListeners();
}

// Setup authentication
async function setupAuth() {
    const authModal = document.getElementById('authModal');
    const emailForm = document.getElementById('emailForm');
    const codeForm = document.getElementById('codeForm');
    const emailInput = document.getElementById('emailInput');
    const usernameInput = document.getElementById('usernameInput');
    const codeInput = document.getElementById('codeInput');
    const sentEmailDisplay = document.getElementById('sentEmailDisplay');
    const backToEmail = document.getElementById('backToEmail');
    const authError = document.getElementById('authError');
    const logoutBtn = document.getElementById('logoutBtn');

    // Handle email submission (send magic code)
    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const username = usernameInput.value.trim() || null;

        authError.textContent = '';
        
        // Disable button and show loading
        const submitBtn = emailForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        const result = await authManager.sendMagicCode(email, username);
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Magic Code';

        if (result.success) {
            // Show code form
            emailForm.style.display = 'none';
            codeForm.style.display = 'block';
            sentEmailDisplay.textContent = email;
            codeInput.focus();
        } else {
            authError.textContent = result.error || 'Failed to send code. Please try again.';
        }
    });

    // Handle code verification
    codeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = codeInput.value.trim();

        authError.textContent = '';
        
        // Disable button and show loading
        const submitBtn = codeForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';

        const result = await authManager.verifyMagicCode(code);
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify Code';

        if (result.success) {
            authModal.style.display = 'none';
            showApp();
        } else {
            authError.textContent = result.error || 'Invalid code. Please try again.';
            codeInput.value = '';
            codeInput.focus();
        }
    });

    // Back to email form
    backToEmail.addEventListener('click', () => {
        codeForm.style.display = 'none';
        emailForm.style.display = 'block';
        codeInput.value = '';
        authError.textContent = '';
    });

    // Handle logout
    logoutBtn.addEventListener('click', async () => {
        await authManager.signOut();
        location.reload();
    });

    // Check auth state
    authManager.onAuthStateChange(async (user) => {
        if (user) {
            authModal.style.display = 'none';
            showApp();
        } else {
            authModal.style.display = 'flex';
            hideApp();
        }
    });

    // Initialize auth
    authManager.init();
}

// Show app after authentication
function showApp() {
    console.log('showApp called');
    
    const appHeader = document.getElementById('appHeader');
    appHeader.style.display = 'flex';
    
    // Get user info and display
    const user = authManager.getCurrentUser();
    console.log('Current user:', user);
    
    if (user) {
        // Query user data to get username
        db.subscribeQuery(
            {
                users: {
                    $: {
                        where: {
                            id: user.id
                        }
                    }
                }
            },
            (resp) => {
                if (resp.data?.users?.[0]) {
                    document.getElementById('usernameDisplay').textContent = 
                        resp.data.users[0].username || user.email;
                } else {
                    document.getElementById('usernameDisplay').textContent = user.email;
                }
            }
        );
    }
    
    // Show feed view by default
    showFeedView();
    feedManager.init();
}

// Hide app
function hideApp() {
    document.getElementById('appHeader').style.display = 'none';
    document.getElementById('feedView').style.display = 'none';
    document.getElementById('editorView').style.display = 'none';
}

// Setup navigation
function setupNavigation() {
    const createMemeBtn = document.getElementById('createMemeBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    createMemeBtn.addEventListener('click', () => {
        showEditorView();
    });

    cancelEditBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel? Your meme will not be saved.')) {
            showFeedView();
            resetEditor();
        }
    });
}

// Show feed view
function showFeedView() {
    currentView = 'feed';
    document.getElementById('feedView').style.display = 'block';
    document.getElementById('editorView').style.display = 'none';
}

// Show editor view
function showEditorView() {
    currentView = 'editor';
    document.getElementById('feedView').style.display = 'none';
    document.getElementById('editorView').style.display = 'flex';
}

// Reset editor
function resetEditor() {
    currentImage = null;
    textBoxes = [];
    selectedTextBoxIndex = null;
    previewText = null;
    textInput.value = '';
    memeTitleInput.value = '';
    canvas.classList.remove('active');
    placeholder.classList.remove('hidden');
    updateTextBoxesList();
    updatePostButton();
    
    // Deselect templates
    document.querySelectorAll('.template-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// Load template gallery
function loadTemplates() {
    templates.forEach((template, index) => {
        const item = document.createElement('div');
        item.className = 'template-item';
        item.dataset.index = index;
        
        const img = document.createElement('img');
        img.src = template.path;
        img.alt = template.name;
        img.title = template.name;
        
        item.appendChild(img);
        item.addEventListener('click', () => selectTemplate(index));
        
        templateGallery.appendChild(item);
    });
}

// Select a template
function selectTemplate(index) {
    selectedTemplateIndex = index;
    
    // Update UI
    document.querySelectorAll('.template-item').forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });
    
    // Load the template image
    const template = templates[index];
    const img = new Image();
    img.onload = function() {
        currentImage = img;
        setupCanvas(img);
        updateCanvas();
        updatePostButton();
    };
    img.src = template.path;
}

// Setup event listeners
function setupEventListeners() {
    imageUpload.addEventListener('change', handleImageUpload);
    addTextBtn.addEventListener('click', addTextBox);
    fontSizeInput.addEventListener('input', handleFontSizeChange);
    textColorInput.addEventListener('input', handleTextColorChange);
    borderColorInput.addEventListener('input', handleBorderColorChange);
    textInput.addEventListener('input', handleTextInputChange);
    postMemeBtn.addEventListener('click', postMeme);
    
    // Canvas mouse events for dragging text
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('dblclick', handleDoubleClick);
    
    // Enter key to add text
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addTextBox();
        }
    });
}

// Handle double click to create text at location
function handleDoubleClick(e) {
    if (!currentImage) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if double-clicking on existing text box
    for (let i = textBoxes.length - 1; i >= 0; i--) {
        const box = getTextBoundingBox(textBoxes[i]);
        if (
            mouseX >= box.x &&
            mouseX <= box.x + box.width &&
            mouseY >= box.y &&
            mouseY <= box.y + box.height
        ) {
            // Double-clicked on existing text, enable editing
            enableTextEditing(i, mouseX, mouseY);
            return;
        }
    }
    
    // Double-clicked on empty space, create new text box
    const fontSize = parseInt(fontSizeInput.value);
    const textColor = textColorInput.value;
    const borderColor = borderColorInput.value;
    
    const textBox = {
        id: Date.now(),
        text: 'NEW TEXT',
        x: mouseX,
        y: mouseY,
        fontSize: fontSize,
        color: textColor,
        borderColor: borderColor
    };
    
    textBoxes.push(textBox);
    selectedTextBoxIndex = textBoxes.length - 1;
    
    updateTextBoxesList();
    updateCanvas();
    updatePostButton();
    
    // Focus the text input and select all
    textInput.value = 'New Text';
    textInput.focus();
    textInput.select();
}

// Enable editing of existing text
function enableTextEditing(index, mouseX, mouseY) {
    selectedTextBoxIndex = index;
    const textBox = textBoxes[index];
    
    // Update controls
    fontSizeInput.value = textBox.fontSize;
    fontSizeValue.textContent = textBox.fontSize;
    textColorInput.value = textBox.color || '#ffffff';
    borderColorInput.value = textBox.borderColor || '#000000';
    
    // Set text input to current text and focus
    textInput.value = textBox.text;
    textInput.focus();
    textInput.select();
    
    updateTextBoxesList();
    updateCanvas();
}

// Handle text input change for real-time preview
function handleTextInputChange(e) {
    const text = e.target.value;
    
    // If a text box is selected, update it directly
    if (selectedTextBoxIndex !== null && textBoxes[selectedTextBoxIndex]) {
        textBoxes[selectedTextBoxIndex].text = text.toUpperCase();
        updateCanvas();
        return;
    }
    
    // Otherwise show preview for new text
    if (text.trim() && currentImage) {
        // Create or update preview text
        previewText = {
            text: text.toUpperCase(),
            x: canvas.width / 2,
            y: canvas.height / 2,
            fontSize: parseInt(fontSizeInput.value),
            color: textColorInput.value,
            borderColor: borderColorInput.value
        };
    } else {
        previewText = null;
    }
    
    updateCanvas();
}

// Handle image upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Deselect any template
    selectedTemplateIndex = null;
    document.querySelectorAll('.template-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            currentImage = img;
            setupCanvas(img);
            updateCanvas();
            updatePostButton();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Setup canvas with image
function setupCanvas(img) {
    // Set canvas size to match image aspect ratio
    const maxWidth = 1000;
    const maxHeight = 700;
    
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
        return;
    }
    
    if (!currentImage) {
        alert('Please select a template or upload an image first!');
        return;
    }
    
    // If editing existing text, just deselect
    if (selectedTextBoxIndex !== null) {
        selectedTextBoxIndex = null;
        textInput.value = '';
        updateTextBoxesList();
        updateCanvas();
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
    
    // Clear input and preview
    textInput.value = '';
    previewText = null;
    
    // Update UI
    updateTextBoxesList();
    updateCanvas();
    updatePostButton();
}

// Update text boxes list UI (inline chips)
function updateTextBoxesList() {
    textBoxesList.innerHTML = '';
    
    if (textBoxes.length === 0) {
        return;
    }
    
    textBoxes.forEach((textBox, index) => {
        const chip = document.createElement('div');
        chip.className = 'text-box-chip';
        if (index === selectedTextBoxIndex) {
            chip.classList.add('selected');
        }
        
        const textSpan = document.createElement('span');
        textSpan.textContent = textBox.text.substring(0, 15) + (textBox.text.length > 15 ? '...' : '');
        textSpan.style.cursor = 'pointer';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            textBoxes.splice(index, 1);
            if (selectedTextBoxIndex === index) {
                selectedTextBoxIndex = null;
            }
            updateTextBoxesList();
            updateCanvas();
            updatePostButton();
        });
        
        chip.addEventListener('click', () => {
            selectedTextBoxIndex = index;
            fontSizeInput.value = textBox.fontSize;
            fontSizeValue.textContent = textBox.fontSize;
            textColorInput.value = textBox.color || '#ffffff';
            borderColorInput.value = textBox.borderColor || '#000000';
            updateTextBoxesList();
            updateCanvas();
        });
        
        chip.appendChild(textSpan);
        chip.appendChild(deleteBtn);
        textBoxesList.appendChild(chip);
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
    
    // Draw preview text if it exists
    if (previewText) {
        drawText(previewText.text, previewText.x, previewText.y, previewText.fontSize, previewText.color, previewText.borderColor, false, true);
    }
}

// Draw text with custom color fill and border
function drawText(text, x, y, fontSize, color, borderColor, isSelected, isPreview = false) {
    if (!text) return;
    
    // Set font
    ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Split text into lines
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;
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
    
    // Draw selection indicator or preview indicator
    if (isSelected || isPreview) {
        // Calculate bounding box for all lines
        let maxWidth = 0;
        lines.forEach(line => {
            const metrics = ctx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        });
        
        const boxX = x - maxWidth / 2 - 10;
        const boxY = startY - lineHeight / 2 - 10;
        const boxWidth = maxWidth + 20;
        const boxHeight = totalHeight + 20;
        
        ctx.strokeStyle = isPreview ? '#4CAF50' : '#ff9966';
        ctx.lineWidth = 2;
        ctx.setLineDash(isPreview ? [5, 5] : []); // Dashed line for preview
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        ctx.setLineDash([]); // Reset line dash
        
        // Draw resize handles for selected text (not preview)
        if (isSelected && !isPreview) {
            const handleSize = 8;
            ctx.fillStyle = '#ff9966';
            
            // Bottom-right resize handle
            ctx.fillRect(
                boxX + boxWidth - handleSize / 2,
                boxY + boxHeight - handleSize / 2,
                handleSize,
                handleSize
            );
            
            // Bottom-left resize handle
            ctx.fillRect(
                boxX - handleSize / 2,
                boxY + boxHeight - handleSize / 2,
                handleSize,
                handleSize
            );
            
            // Top-right resize handle
            ctx.fillRect(
                boxX + boxWidth - handleSize / 2,
                boxY - handleSize / 2,
                handleSize,
                handleSize
            );
            
            // Top-left resize handle
            ctx.fillRect(
                boxX - handleSize / 2,
                boxY - handleSize / 2,
                handleSize,
                handleSize
            );
            
            // Draw delete button (top-right corner, outside the box)
            const deleteSize = 20;
            const deleteX = boxX + boxWidth - deleteSize / 2;
            const deleteY = boxY - deleteSize / 2;
            
            // Delete button background (circle)
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(deleteX + deleteSize / 2, deleteY + deleteSize / 2, deleteSize / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Delete button X
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            const xOffset = 6;
            ctx.beginPath();
            ctx.moveTo(deleteX + deleteSize / 2 - xOffset / 2, deleteY + deleteSize / 2 - xOffset / 2);
            ctx.lineTo(deleteX + deleteSize / 2 + xOffset / 2, deleteY + deleteSize / 2 + xOffset / 2);
            ctx.moveTo(deleteX + deleteSize / 2 + xOffset / 2, deleteY + deleteSize / 2 - xOffset / 2);
            ctx.lineTo(deleteX + deleteSize / 2 - xOffset / 2, deleteY + deleteSize / 2 + xOffset / 2);
            ctx.stroke();
        }
    }
}

// Get text bounding box
function getTextBoundingBox(textBox) {
    ctx.font = `bold ${textBox.fontSize}px Impact, Arial Black, sans-serif`;
    const lines = textBox.text.split('\n');
    const lineHeight = textBox.fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    
    let maxWidth = 0;
    lines.forEach(line => {
        const metrics = ctx.measureText(line);
        maxWidth = Math.max(maxWidth, metrics.width);
    });
    
    const startY = textBox.y - (totalHeight / 2) + (lineHeight / 2);
    
    return {
        x: textBox.x - maxWidth / 2 - 10,
        y: startY - lineHeight / 2 - 10,
        width: maxWidth + 20,
        height: totalHeight + 20
    };
}

// Check if mouse is over resize handle
function isOverResizeHandle(mouseX, mouseY, textBox) {
    const box = getTextBoundingBox(textBox);
    const handleSize = 8;
    const handles = [
        { x: box.x + box.width, y: box.y + box.height }, // bottom-right
        { x: box.x, y: box.y + box.height }, // bottom-left
        { x: box.x + box.width, y: box.y }, // top-right
        { x: box.x, y: box.y } // top-left
    ];
    
    for (const handle of handles) {
        if (
            mouseX >= handle.x - handleSize / 2 &&
            mouseX <= handle.x + handleSize / 2 &&
            mouseY >= handle.y - handleSize / 2 &&
            mouseY <= handle.y + handleSize / 2
        ) {
            return true;
        }
    }
    return false;
}

// Check if mouse is over delete button
function isOverDeleteButton(mouseX, mouseY, textBox) {
    const box = getTextBoundingBox(textBox);
    const deleteSize = 20;
    const deleteX = box.x + box.width - deleteSize / 2;
    const deleteY = box.y - deleteSize / 2;
    const centerX = deleteX + deleteSize / 2;
    const centerY = deleteY + deleteSize / 2;
    
    // Check if mouse is within the circle
    const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
    return distance <= deleteSize / 2;
}

// Handle font size change
function handleFontSizeChange(e) {
    const size = e.target.value;
    fontSizeValue.textContent = size;
    
    // Update selected text box font size
    if (selectedTextBoxIndex !== null && textBoxes[selectedTextBoxIndex]) {
        textBoxes[selectedTextBoxIndex].fontSize = parseInt(size);
    }
    
    // Update preview text font size
    if (previewText) {
        previewText.fontSize = parseInt(size);
    }
    
    updateCanvas();
}

// Handle text color change
function handleTextColorChange(e) {
    const color = e.target.value;
    
    // Update selected text box color
    if (selectedTextBoxIndex !== null && textBoxes[selectedTextBoxIndex]) {
        textBoxes[selectedTextBoxIndex].color = color;
    }
    
    // Update preview text color
    if (previewText) {
        previewText.color = color;
    }
    
    updateCanvas();
}

// Handle border color change
function handleBorderColorChange(e) {
    const color = e.target.value;
    
    // Update selected text box border color
    if (selectedTextBoxIndex !== null && textBoxes[selectedTextBoxIndex]) {
        textBoxes[selectedTextBoxIndex].borderColor = color;
    }
    
    // Update preview text border color
    if (previewText) {
        previewText.borderColor = color;
    }
    
    updateCanvas();
}

// Mouse event handlers for dragging and resizing
function handleMouseDown(e) {
    if (!currentImage || textBoxes.length === 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if clicking on any text box (in reverse order to prioritize top boxes)
    for (let i = textBoxes.length - 1; i >= 0; i--) {
        const textBox = textBoxes[i];
        
        // Check if clicking on delete button first (if this text is selected)
        if (i === selectedTextBoxIndex && isOverDeleteButton(mouseX, mouseY, textBox)) {
            textBoxes.splice(i, 1);
            selectedTextBoxIndex = null;
            updateTextBoxesList();
            updateCanvas();
            updatePostButton();
            return;
        }
        
        // Check if clicking on resize handle (if this text is selected)
        if (i === selectedTextBoxIndex && isOverResizeHandle(mouseX, mouseY, textBox)) {
            isResizing = true;
            resizeStartSize = textBox.fontSize;
            resizeStartY = mouseY;
            return;
        }
        
        // Check if clicking on text box
        const box = getTextBoundingBox(textBox);
        
        if (
            mouseX >= box.x &&
            mouseX <= box.x + box.width &&
            mouseY >= box.y &&
            mouseY <= box.y + box.height
        ) {
            selectedTextBoxIndex = i;
            isDragging = true;
            dragOffsetX = mouseX - textBox.x;
            dragOffsetY = mouseY - textBox.y;
            fontSizeInput.value = textBox.fontSize;
            fontSizeValue.textContent = textBox.fontSize;
            textColorInput.value = textBox.color || '#ffffff';
            borderColorInput.value = textBox.borderColor || '#000000';
            
            // Clear text input when selecting via click (not double-click)
            textInput.value = '';
            
            updateTextBoxesList();
            updateCanvas();
            break;
        }
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Handle resizing
    if (isResizing && selectedTextBoxIndex !== null) {
        const textBox = textBoxes[selectedTextBoxIndex];
        const deltaY = mouseY - resizeStartY;
        const newSize = Math.max(20, Math.min(150, resizeStartSize + deltaY * 0.5));
        textBox.fontSize = Math.round(newSize);
        
        // Update UI
        fontSizeInput.value = textBox.fontSize;
        fontSizeValue.textContent = textBox.fontSize;
        
        updateCanvas();
        return;
    }
    
    // Handle dragging
    if (isDragging && selectedTextBoxIndex !== null) {
        textBoxes[selectedTextBoxIndex].x = mouseX - dragOffsetX;
        textBoxes[selectedTextBoxIndex].y = mouseY - dragOffsetY;
        updateCanvas();
        return;
    }
    
    // Update cursor based on hover state
    if (selectedTextBoxIndex !== null && textBoxes[selectedTextBoxIndex]) {
        const textBox = textBoxes[selectedTextBoxIndex];
        if (isOverDeleteButton(mouseX, mouseY, textBox)) {
            canvas.style.cursor = 'pointer';
        } else if (isOverResizeHandle(mouseX, mouseY, textBox)) {
            canvas.style.cursor = 'nwse-resize';
        } else {
            const box = getTextBoundingBox(textBox);
            if (
                mouseX >= box.x &&
                mouseX <= box.x + box.width &&
                mouseY >= box.y &&
                mouseY <= box.y + box.height
            ) {
                canvas.style.cursor = 'move';
            } else {
                canvas.style.cursor = 'default';
            }
        }
    } else {
        canvas.style.cursor = 'default';
    }
}

function handleMouseUp() {
    isDragging = false;
    isResizing = false;
}

// Update post button state
function updatePostButton() {
    if (currentImage && textBoxes.length > 0) {
        postMemeBtn.classList.add('active');
        postMemeBtn.disabled = false;
    } else {
        postMemeBtn.classList.remove('active');
        postMemeBtn.disabled = true;
    }
}

// Post meme to InstantDB
async function postMeme() {
    if (!currentImage || textBoxes.length === 0) return;
    
    const user = authManager.getCurrentUser();
    if (!user) {
        showToast('You must be logged in to post', 'error');
        return;
    }

    // Show loading state
    postMemeBtn.disabled = true;
    postMemeBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
        Posting...
    `;

    try {
        console.log('Starting meme post process...');
        
        // Temporarily remove selection indicator
        const tempSelectedIndex = selectedTextBoxIndex;
        selectedTextBoxIndex = null;
        updateCanvas();

        // Convert canvas to base64
        console.log('Converting canvas to base64...');
        const imageData = canvas.toDataURL('image/png', 0.8); // 0.8 quality for compression
        console.log('Image data length:', imageData.length);

        // Restore selection
        selectedTextBoxIndex = tempSelectedIndex;
        updateCanvas();

        // Get title
        const title = memeTitleInput.value.trim();
        console.log('Meme title:', title);

        // Get username
        console.log('Querying user data...');
        const userQuery = await db.queryOnce({
            users: {
                $: {
                    where: {
                        id: user.id
                    }
                }
            }
        });
        console.log('User query result:', userQuery);

        const username = userQuery.data?.users?.[0]?.username || user.email;
        console.log('Username:', username);

        // Create meme in database
        // Use crypto.randomUUID() to generate a valid UUID
        const memeId = crypto.randomUUID();
        console.log('Creating meme with ID:', memeId);
        
        const transactResult = await db.transact([
            db.tx.memes[memeId].update({
                imageData: imageData,
                title: title,
                userId: user.id,
                username: username,
                createdAt: Date.now(),
                upvoteCount: 0
            })
        ]);
        
        console.log('Transact result:', transactResult);
        console.log('Meme posted successfully!');

        // Reset editor and go to feed first
        resetEditor();
        showFeedView();
        
        // Show success message after navigation
        setTimeout(() => {
            showToast('Meme posted successfully!', 'success');
        }, 300);

    } catch (error) {
        console.error('Error posting meme:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            body: error.body
        });
        showToast(`Failed to post meme: ${error.message || 'Unknown error'}`, 'error');
        
        // Restore button
        postMemeBtn.disabled = false;
        postMemeBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13"></path>
                <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
            </svg>
            Post Meme
        `;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize app
init();
