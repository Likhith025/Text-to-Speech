let speech = new SpeechSynthesisUtterance();
let voices = [];
let voiceSelect = document.querySelector("select");
const button = document.querySelector("button");
const textarea = document.querySelector("textarea");
const charCount = document.querySelector("#charCount");
let isSpeaking = false;

window.speechSynthesis.onvoiceschanged = () => {
    voices = window.speechSynthesis.getVoices();
    speech.voice = voices[0];
    voices.forEach((voice, i) => {
        voiceSelect.options[i] = new Option(`${voice.name} (${voice.lang})`, i);
    });
};

voiceSelect.addEventListener("change", () => {
    speech.voice = voices[voiceSelect.value];
});

button.addEventListener("click", () => {
    const text = textarea.value;
    if (!text.trim()) {
        alert("Please enter some text to convert!");
        return;
    }
    if (!isSpeaking) {
        speech.text = text;
        window.speechSynthesis.speak(speech);
        button.textContent = "Pause";
        isSpeaking = true;
    } else {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            button.textContent = "Resume";
        } else if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            button.textContent = "Pause";
        }
    }
});

speech.onend = () => {
    button.textContent = "Listen";
    isSpeaking = false;
};

textarea.addEventListener("input", () => {
    const text = textarea.value;
    const charLength = text.length;
    const wordLength = text.trim().split(/\s+/).length;
    charCount.textContent = `Characters: ${charLength} | Words: ${wordLength}`;
});