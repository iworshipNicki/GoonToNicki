let defaultSettings = {
    imageInterval: 20,
    horizontalSlides: 1,
    verticalSlides: 1,
    volume: 1.0,
    videoSplittingTime: 60,
    bgColor: "ffc0cb"
}

export const settings = localStorage.getItem("settings") != null ? {...defaultSettings, ...JSON.parse(localStorage.getItem("settings"))} : defaultSettings;

export function saveSettings() {
    localStorage.setItem("settings", JSON.stringify(settings))
}

let gridChanged;

let settingsBarHeight = 0;
let draggingVolume = false;
let volumeSlider = null;
let volumeControl = null;
let volumeControlOpen = false;

function volumeHold() {
    draggingVolume = true;
}

function volumeRelease() {
    if (draggingVolume) {
        saveSettings()
    }
    draggingVolume = false;
}

function volumeDrag(event) {
    if (draggingVolume) {
        let y = event.clientY - settingsBarHeight
        if (y < 16) {
            y = 16
        }
        if (y > (150 - 16)) {
            y = 150 - 16
        }
        volumeSlider.setAttribute('cy', y)
        settings.volume = 1 - (y - 16)/(150 - 32)
        for (let e of document.getElementsByClassName("videoSlide")) {
            e.volume = settings.volume
        }
    }
}

function toggleVolume() {
    volumeControlOpen = !volumeControlOpen
    volumeControl.style.display = volumeControlOpen ? 'block' : 'none';
}

function setVolumeOnSlider() {
    let y = (1 - settings.volume)*(150-32) + 16
    volumeSlider.setAttribute('cy', y)
}

function getPositiveValue(target) {
    let value = parseInt(target.value)
    if (value < 1) {
        value = 1
        target.value = 1
    }
    return value
}

function setHorizontalSplits(event) {
    settings.horizontalSlides = getPositiveValue(event.target)
    saveSettings()
    gridChanged()
}

function setVerticalSplits(event) {
    settings.verticalSlides = getPositiveValue(event.target)
    saveSettings()
    gridChanged()
}

function bgColorChanged(event) {
    let color = event.target.value.trim()
    if (/^[0-9a-f]{6}$/i.test(color)) {
        document.body.style.backgroundColor = "#" + color
        settings.bgColor = color
        saveSettings()
    }
}

async function bgImageChanged(event) {
    var files = !!this.files ? this.files : [];

    // If no files were selected, or no FileReader support, return
    if ( !files.length || !window.FileReader ) return;

    if ( /^image/.test( files[0].type ) ) {
        var reader = new FileReader();
        reader.readAsDataURL( files[0] );
        reader.onloadend = function() {
            document.body.style.backgroundImage = "url(" + this.result + ")";
        }

    }
}

function clearBgImage() {
    document.body.style.backgroundImage = ""
}

function setImageInterval(event) {
    settings.imageInterval = getPositiveValue(event.target)
    saveSettings()
}

function applySettings() {
    settings.videoSplittingTime = getPositiveValue(document.getElementById("videoSplitLength"))
    saveSettings()
    document.location.reload()
}

export function initSettings(onGridChanged) {
    gridChanged = onGridChanged

    settingsBarHeight = document.getElementById("bar").offsetHeight
    volumeSlider = document.getElementById("volumeSlider")
    volumeSlider.onmousedown = volumeHold
    document.onmouseup = volumeRelease
    document.onmousemove = volumeDrag
    volumeControl = document.getElementById("volumeControl")
    document.getElementById("volume").onclick = toggleVolume
    setVolumeOnSlider()
    
    document.getElementById("settings").onclick = (event) => { document.getElementById("settingsDialog").style.display = 'block' }
    document.getElementById("settingsClose").onclick = (event) => { document.getElementById("settingsDialog").style.display = 'none' }

    document.getElementById("horizontalSplits").value = settings.horizontalSlides
    document.getElementById("horizontalSplits").onchange = setHorizontalSplits

    document.getElementById("verticalSplits").value = settings.verticalSlides
    document.getElementById("verticalSplits").onchange = setVerticalSplits
    onGridChanged()

    document.getElementById("nextImageSec").value = settings.imageInterval
    document.getElementById("nextImageSec").onchange = setImageInterval

    document.getElementById("backgroundColor").value = settings.bgColor
    document.body.style.backgroundColor = "#" + settings.bgColor
    document.getElementById("backgroundColor").onchange = bgColorChanged

    document.getElementById("backgroundImage").onchange = bgImageChanged
    document.getElementById("clearBackgroundImage").onclick = clearBgImage
    document.getElementById("fill").onclick = (event) => { document.body.style.backgroundSize = "cover" }
    document.getElementById("fit").onclick = (event) => { document.body.style.backgroundSize = "contain" }

    document.getElementById("videoSplitLength").value = settings.videoSplittingTime
    document.getElementById("settingsApply").onclick = applySettings
}