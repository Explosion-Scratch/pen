from browser import document, window, bind, html, timer
import math

# --- Audio Setup ---
AudioContext = window.AudioContext or window.webkitAudioContext
audio_ctx = AudioContext.new()
master_gain = audio_ctx.createGain()
master_gain.gain.value = 0.5
master_gain.connect(audio_ctx.destination)

# --- State ---
NUM_HARMONICS = 16
harmonics = [0.0] * NUM_HARMONICS
harmonics[0] = 1.0  # Default Root
active_notes = {}

# Drawing State
is_drawing = False

# --- Labels for traditional guidelines ---
harmonic_labels = {
    0: "Root",
    1: "8va",   # Octave
    2: "P5",    # Perfect 5th
    3: "15ma",  # 2nd Octave
    4: "M3",    # Major 3rd
    5: "P5",    # Octave + 5th
    6: "m7",    # Harmonic 7th
    7: "22ma"   # 3rd Octave
}

# --- Canvas Logic ---
canvas = document['spectrograph']
ctx = canvas.getContext('2d')
W, H = canvas.width, canvas.height

# Store layout constants
LABEL_WIDTH = 45
PLOT_W = W - LABEL_WIDTH - 15
BAR_H = H / NUM_HARMONICS

def draw_spectrograph():
    ctx.clearRect(0, 0, W, H)

    for i in range(NUM_HARMONICS):
        amp = harmonics[i]

        # y represents the top of the bar (i=0 is bottom)
        y = H - (i + 1) * BAR_H

        # 1) Draw Label & Guidelines
        ctx.fillStyle = "#6b7c93"
        ctx.font = "500 12px Inter, -apple-system, sans-serif"
        ctx.textAlign = "right"
        ctx.textBaseline = "middle"

        lbl = harmonic_labels.get(i, str(i+1))
        ctx.fillText(lbl, LABEL_WIDTH - 5, y + BAR_H/2)

        # Guideline line
        if i in harmonic_labels:
            ctx.fillStyle = "rgba(107, 140, 206, 0.2)" if i == 0 else "rgba(163, 177, 198, 0.2)"
            ctx.fillRect(LABEL_WIDTH, y + BAR_H/2, PLOT_W, 1)

        # 2) Draw Background Track
        ctx.fillStyle = "rgba(163, 177, 198, 0.15)"
        ctx.beginPath()
        ctx.roundRect(LABEL_WIDTH, y + 2, PLOT_W, BAR_H - 4, 4)
        ctx.fill()

        # 3) Draw Amplitude Bar
        if amp > 0.01:
            grad = ctx.createLinearGradient(LABEL_WIDTH, 0, LABEL_WIDTH + PLOT_W, 0)
            grad.addColorStop(0, "#8fa9df")
            grad.addColorStop(1, "#5b7cbe")
            ctx.fillStyle = grad

            fill_w = amp * PLOT_W
            ctx.beginPath()
            ctx.roundRect(LABEL_WIDTH, y + 2, fill_w, BAR_H - 4, 4)
            ctx.fill()

def update_active_waves():
    wave = create_wave()
    for key, node in active_notes.items():
        node['osc'].setPeriodicWave(wave)

def get_bar_index_and_strength(evt):
    """Returns (bar_index, strength) based on mouse position"""
    rect = canvas.getBoundingClientRect()
    scaleX = canvas.width / rect.width
    scaleY = canvas.height / rect.height

    x = (evt.clientX - rect.left) * scaleX
    y = (evt.clientY - rect.top) * scaleY

    # Calculate bar index (0 is bottom, NUM_HARMONICS-1 is top)
    bar_idx = (NUM_HARMONICS - 1) - int(y / BAR_H)

    # Calculate strength from X position within the plot area
    x_in_plot = x - LABEL_WIDTH
    strength = max(0.0, min(1.0, x_in_plot / PLOT_W))

    return bar_idx, strength

def apply_drawing(evt):
    """Apply the drawing action based on mouse position"""
    global harmonics
    bar_idx, strength = get_bar_index_and_strength(evt)

    if 0 <= bar_idx < NUM_HARMONICS:
        harmonics[bar_idx] = strength
        draw_spectrograph()
        update_active_waves()

@bind(canvas, "mousedown")
def md(evt):
    global is_drawing
    if audio_ctx.state == 'suspended':
        audio_ctx.resume()

    is_drawing = True
    apply_drawing(evt)

@bind(window, "mouseup")
def mu(evt):
    global is_drawing
    is_drawing = False

@bind(canvas, "mousemove")
def mm(evt):
    if is_drawing:
        apply_drawing(evt)

@bind(canvas, "mouseleave")
def ml(evt):
    # Continue drawing even if mouse leaves, handled by window mouseup
    pass

# --- Synthesis ---
def create_wave():
    real = window.Float32Array.new(NUM_HARMONICS + 1)
    imag = window.Float32Array.new(NUM_HARMONICS + 1)
    for i in range(NUM_HARMONICS):
        imag[i+1] = harmonics[i]
    return audio_ctx.createPeriodicWave(real, imag, {'disableNormalization': False})

def note_on(key_code, freq):
    if key_code in active_notes:
        return

    if audio_ctx.state == 'suspended':
        audio_ctx.resume()

    osc = audio_ctx.createOscillator()
    gain = audio_ctx.createGain()

    osc.setPeriodicWave(create_wave())
    osc.frequency.value = freq

    # ADSR Envelope
    now = audio_ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(1.0, now + 0.03)   # Attack
    gain.gain.exponentialRampToValueAtTime(0.7, now + 0.15) # Decay/Sustain

    osc.connect(gain)
    gain.connect(master_gain)
    osc.start()

    active_notes[key_code] = {'osc': osc, 'gain': gain}

    # UI
    el = document.getElementById(f"key-{key_code}")
    if el:
        el.classList.add("active")

def note_off(key_code):
    if key_code in active_notes:
        node = active_notes[key_code]
        now = audio_ctx.currentTime
        # Release Phase
        node['gain'].gain.cancelScheduledValues(now)
        node['gain'].gain.setValueAtTime(node['gain'].gain.value, now)
        node['gain'].gain.exponentialRampToValueAtTime(0.001, now + 0.3)
        node['osc'].stop(now + 0.3)

        del active_notes[key_code]

    # UI
    el = document.getElementById(f"key-{key_code}")
    if el:
        el.classList.remove("active")


# --- Keyboard Layout & UI Generation ---
# Note format: (Note Name, Freq, is_black, key_code, visual_bind_label)
keys = [
    ("C4", 261.63, False, 'KeyA', 'A'),
    ("C#4", 277.18, True,  'KeyW', 'W'),
    ("D4", 293.66, False, 'KeyS', 'S'),
    ("D#4", 311.13, True,  'KeyE', 'E'),
    ("E4", 329.63, False, 'KeyD', 'D'),
    ("F4", 349.23, False, 'KeyF', 'F'),
    ("F#4", 369.99, True,  'KeyT', 'T'),
    ("G4", 392.00, False, 'KeyG', 'G'),
    ("G#4", 415.30, True,  'KeyY', 'Y'),
    ("A4", 440.00, False, 'KeyH', 'H'),
    ("A#4", 466.16, True,  'KeyU', 'U'),
    ("B4", 493.88, False, 'KeyJ', 'J'),
    ("C5", 523.25, False, 'KeyK', 'K'),
    ("C#5", 554.37, True,  'KeyO', 'O'),
    ("D5", 587.33, False, 'KeyL', 'L'),
    ("D#5", 622.25, True,  'KeyP', 'P'),
    ("E5", 659.25, False, 'Semicolon', ';'),
]

# Map lookup for fast typing
key_map = {k[3]: k for k in keys}

# Build Piano UI
piano_container = document['piano-container']
white_key_count = 0
white_width = 54 # 50px width + 4px margin total

for note, freq, is_black, code, lbl in keys:
    btn = html.DIV(id=f"key-{code}")

    if not is_black:
        btn.classList.add("white-key")
        btn <= html.SPAN(note, Class="note")
        btn <= html.SPAN(lbl, Class="bind")
        piano_container <= btn
        white_key_count += 1
    else:
        btn.classList.add("black-key")
        btn <= html.SPAN(lbl, Class="bind")
        # Position black key overlapping between current and previous white key
        # +10 is container padding
        left_pos = 10 + (white_key_count * white_width) - 16
        btn.style.left = f"{left_pos}px"
        piano_container <= btn

    # Mouse Events
    btn.bind("mousedown", lambda ev, c=code, f=freq: note_on(c, f))
    btn.bind("mouseup", lambda ev, c=code: note_off(c))
    btn.bind("mouseleave", lambda ev, c=code: note_off(c))


# --- Event Listeners ---
@bind(window, "keydown")
def on_keydown(evt):
    if not evt.repeat and evt.code in key_map:
        k = key_map[evt.code]
        note_on(k[3], k[1])

@bind(window, "keyup")
def on_keyup(evt):
    if evt.code in key_map:
        note_off(evt.code)

@bind(document['clear-btn'], "click")
def clear_canvas(evt):
    global harmonics
    harmonics = [0.0] * NUM_HARMONICS
    draw_spectrograph()
    update_active_waves()

@bind(document['preset-select'], "change")
def load_preset(evt):
    global harmonics
    val = evt.target.value
    harmonics = [0.0] * NUM_HARMONICS

    if val == "sine":
        harmonics[0] = 1.0
    elif val == "sawtooth":
        for i in range(NUM_HARMONICS):
            harmonics[i] = 1.0 / (i + 1)
    elif val == "square":
        for i in range(0, NUM_HARMONICS, 2):
            harmonics[i] = 1.0 / (i + 1)
    elif val == "clarinet":
        for i in range(NUM_HARMONICS):
            if i % 2 == 0:
                harmonics[i] = 1.0 / (i + 1)
            else:
                harmonics[i] = 0.1 / (i + 1)
    elif val == "organ":
        for idx, amp in [(0, 1.0), (1, 0.8), (2, 0.4), (3, 0.6), (5, 0.5), (7, 0.3)]:
            if idx < NUM_HARMONICS: harmonics[idx] = amp
    elif val == "bell":
        for idx, amp in [(0, 1.0), (3, 0.7), (6, 0.4), (10, 0.3), (14, 0.15)]:
            if idx < NUM_HARMONICS: harmonics[idx] = amp

    draw_spectrograph()
    update_active_waves()

# Setup initial canvas
draw_spectrograph()
