let defaultSettings = {
    imageInterval: 20,
    rows: 2,
    volume: 1.0,
    videoSplittingTime: 60,
    bgColor: "ffc0cb"
}

const storedSettings = localStorage.getItem("settings")

export const settings = storedSettings != null ? {...defaultSettings, ...JSON.parse(storedSettings)} : defaultSettings;

export function saveSettings() {
    localStorage.setItem("settings", JSON.stringify(settings))
}

let gridChanged;

let settingsBarHeight = 0;
let draggingVolume = false;
let volumeSlider = null;
let volumeControl = null;
let volumeControlOpen = true;
let volumeIsScaled = matchMedia("(orientation: portrait) and (max-width: 1000px)").matches 

function volumeHold(event) {
    event.preventDefault()
    volumeIsScaled = matchMedia("(orientation: portrait) and (max-width: 1000px)").matches 
    settingsBarHeight = document.getElementById("bar").offsetHeight
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
        event.preventDefault()
        let y = (event.clientY || event.touches[0].clientY) - settingsBarHeight - 16
        if (volumeIsScaled) {
            y = y/2
        }
        if (y < 0) {
            y = 0
        }
        if (y > (150 - 32)) {
            y = 150 - 32
        }
        volumeSlider.setAttribute('cy', y + 16)
        settings.volume = 1 - y/(150 - 32)
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

function setRows(event) {
    settings.rows = getPositiveValue(event.target)
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

    volumeSlider = document.getElementById("volumeSlider")
    volumeSlider.onmousedown = volumeHold
    volumeSlider.ontouchstart = volumeHold
    document.onmouseup = volumeRelease
    document.onmousemove = volumeDrag
    document.ontouchmove = volumeDrag
    volumeControl = document.getElementById("volumeControl")
    document.getElementById("volume").onclick = toggleVolume
    setVolumeOnSlider()
    
    document.getElementById("settings").onclick = (event) => { document.getElementById("settingsDialog").style.display = 'block' }
    document.getElementById("settingsClose").onclick = (event) => { document.getElementById("settingsDialog").style.display = 'none' }

    document.getElementById("rows").value = settings.rows
    document.getElementById("rows").onchange = setRows
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

    document.getElementById("menu-hover").onmouseenter = () => { document.getElementById("menu").style.display = "block" }
    document.getElementById("menu-hover").onmouseleave = () => { document.getElementById("menu").style.display = "none" }
    document.getElementById("menu-hover").ontouchstart = (event) => {
        event.stopPropagation()
        let menuElem = document.getElementById("menu")
        menuElem.style.display = "block";
    }
    document.ontouchstart = () => {
        let menuElem = document.getElementById("menu")
        if (menuElem.style.display == "block") {
            menuElem.style.display = "none"
        }
    }
}