// DOM Elements
let voices = [];
const voiceSelect = document.querySelector("#voiceSelect");
const speedControl = document.querySelector("#speedControl");
const listenBtn = document.querySelector("#listenBtn");
const textarea = document.querySelector("textarea");
const charCount = document.querySelector("#charCount");
const fileInput = document.querySelector("#fileInput");
const uploadBtn = document.querySelector("#uploadBtn");
const fileNameDisplay = document.querySelector("#fileName");
const clearBtn = document.querySelector("#clearBtn");

// Speech State Variables
let isSpeaking = false;
let currentUtterance = null;
let currentWordIndex = 0;
let words = [];
let tempDiv = null;

// Initialize voices with default fallback
function populateVoices() {
    voices = window.speechSynthesis.getVoices();
    console.log('Voices loaded:', voices); // Debug log

    voiceSelect.innerHTML = ''; // Clear existing options

    if (voices.length > 0) {
        // Populate available voices
        voices.forEach((voice, i) => {
            const option = new Option(`${voice.name} (${voice.lang})`, i);
            voiceSelect.appendChild(option);
        });
    } else {
        // Fallback: Add a default voice option with clear messaging
        console.warn('No voices detected, falling back to system default');
        const defaultOption = new Option('System Default Voice (Limited)', 'default');
        voiceSelect.appendChild(defaultOption);
        voices = [{ name: 'System Default Voice', lang: 'en-US' }]; // Mock voice for consistency
        alert('No voices detected. Using your system’s default voice. For more options, check your browser/OS settings.');
    }

    voiceSelect.disabled = false; // Enable dropdown
}

// File Handling Functions (unchanged)
async function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        if (file.name.endsWith('.txt')) {
            reader.readAsText(file);
        } else if (file.name.endsWith('.docx')) {
            extractTextFromDocx(file).then(resolve).catch(reject);
        } else {
            reject(new Error('Unsupported file type'));
        }
    });
}

async function extractTextFromDocx(file) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.0/mammoth.browser.min.js');
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                .then(result => resolve(result.value))
                .catch(error => reject(error));
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Text-to-Speech Functions
function updateSpeakingWord() {
    const text = textarea.value;
    words = text.split(/\s+/);
    let highlightedText = words.map((word, index) => {
        return `<span class="word-${index}">${word}</span>`;
    }).join(' ');
    tempDiv = document.createElement('div');
    tempDiv.innerHTML = highlightedText;
    tempDiv.style.cssText = getComputedStyle(textarea).cssText;
    tempDiv.className = 'textarea-temp';
    textarea.style.display = 'none';
    textarea.parentNode.insertBefore(tempDiv, textarea);
    return { words, tempDiv };
}

function scrollToElement(element, container) {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const scrollOffset = element.offsetTop - container.offsetTop - (containerRect.height / 2) + (elementRect.height / 2);
    container.scrollTo({ top: scrollOffset, behavior: 'smooth' });
}

function highlightCurrentWord(index) {
    const allSpans = tempDiv.querySelectorAll('[class^="word-"]');
    allSpans.forEach(span => span.classList.remove('speaking-word'));
    if (index >= 0 && index < words.length) {
        const currentSpan = tempDiv.querySelector(`.word-${index}`);
        if (currentSpan) {
            currentSpan.classList.add('speaking-word');
            scrollToElement(currentSpan, tempDiv);
        }
    }
}

function speakFromPosition(position = 0) {
    const text = textarea.value.substring(position);
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    // Use selected voice or system default
    const selectedVoiceIndex = voiceSelect.value === 'default' ? 0 : parseInt(voiceSelect.value);
    currentUtterance.voice = voices[selectedVoiceIndex] || null; // Null triggers system default
    currentUtterance.rate = parseFloat(speedControl.value);

    let utteranceCharIndex = position;
    let lastHighlightedIndex = -1;

    currentUtterance.onboundary = (event) => {
        if (event.name === 'word') {
            const globalCharIndex = utteranceCharIndex + event.charIndex;
            currentWordIndex = getWordIndexAtChar(globalCharIndex, words);
            if (currentWordIndex !== lastHighlightedIndex) {
                highlightCurrentWord(currentWordIndex);
                lastHighlightedIndex = currentWordIndex;
            }
        }
    };

    currentUtterance.onend = () => {
        listenBtn.textContent = "Listen";
        isSpeaking = false;
        if (tempDiv) {
            tempDiv.remove();
            tempDiv = null;
        }
        textarea.style.display = 'block';
        currentUtterance = null;
    };

    window.speechSynthesis.speak(currentUtterance);
    listenBtn.textContent = "Pause";
    isSpeaking = true;
}

function getWordIndexAtChar(charIndex, words) {
    let currentCharCount = 0;
    for (let i = 0; i < words.length; i++) {
        currentCharCount += words[i].length + 1;
        if (charIndex < currentCharCount) return i;
    }
    return words.length - 1;
}

function getCurrentPosition() {
    if (!currentUtterance || !words.length) return 0;
    let position = 0;
    for (let i = 0; i < currentWordIndex; i++) {
        position += words[i].length + 1;
    }
    return Math.min(position, textarea.value.length);
}

// Event Listeners
listenBtn.addEventListener("click", () => {
    const text = textarea.value;
    if (!text.trim()) {
        alert("Please enter some text to convert!");
        return;
    }
    if (!isSpeaking) {
        window.speechSynthesis.cancel();
        updateSpeakingWord();
        currentWordIndex = 0;
        speakFromPosition(0);
    } else {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            listenBtn.textContent = "Resume";
        } else if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            listenBtn.textContent = "Pause";
        }
    }
});

speedControl.addEventListener("change", () => {
    if (isSpeaking && currentUtterance) {
        const wasPaused = window.speechSynthesis.paused;
        const currentPosition = getCurrentPosition();
        window.speechSynthesis.cancel();
        speakFromPosition(currentPosition);
        if (wasPaused) {
            window.speechSynthesis.pause();
            listenBtn.textContent = "Resume";
        }
    }
});

textarea.addEventListener("input", () => {
    const text = textarea.value;
    const charLength = text.length;
    const wordLength = text.trim().split(/\s+/).length;
    charCount.textContent = `Characters: ${charLength} | Words: ${wordLength}`;
});

uploadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
});

fileInput.addEventListener('change', async () => {
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileNameDisplay.textContent = file.name;
        try {
            const fileContent = await readFile(file);
            textarea.value = fileContent;
            textarea.dispatchEvent(new Event('input'));
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Error reading file. Please try again.');
        }
    }
});

clearBtn.addEventListener("click", () => {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        listenBtn.textContent = "Listen";
    }
    textarea.value = "";
    charCount.textContent = "Characters: 0 | Words: 0";
    fileNameDisplay.textContent = "";
    fileInput.value = "";
    if (tempDiv) {
        tempDiv.remove();
        tempDiv = null;
    }
    textarea.style.display = "block";
});

// Initialize voices
window.speechSynthesis.onvoiceschanged = () => {
    console.log('onvoiceschanged triggered');
    populateVoices();
};

// Initial call
populateVoices();