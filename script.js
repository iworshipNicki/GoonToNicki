import { showDirectoryPicker } from 'https://cdn.jsdelivr.net/npm/file-system-access/lib/es2018.js';
import { initSettings, settings } from './settings.js';

let allFiles = [];
let inProgress = false;

function animateBucket() {
    let path = document.getElementById("path")
    let paths = [
        'm0,20 v150 C0 180 90 180 90 170 v-150 C80 40 0 40 0 20 z',
        'm0,40 v130 C0 180 90 180 90 170 v-170 C60 0 30 40 0 40 z',
        'm0,20 v150 C0 180 90 180 90 170 v-150 C80 0 0 0 0 20 z',
        'm0,0 v170 C0 180 90 180 90 170 v-130 C60 40 30 0 0 0 z'
    ]
    let i = 0
    path.ontransitionend = () => {
        setTimeout(() => path.setAttribute('d', paths[i++ % 4]), 1)
    }
    path.setAttribute('d', paths[i++])
}

async function openDir2() {
    try {
        const folder = await showDirectoryPicker()
        for (const e of document.getElementsByClassName("titleContent")) {
            e.style.opacity = '0'
        }
        document.getElementById("load-container").style.display = 'block'
        document.getElementById("bucket").style.display = 'inline-block'
        setTimeout(() => animateBucket(), 10)
        await loadFiles(folder)
        inProgress = true
        for (const e of document.getElementsByClassName("slideshow-row")) {
            await startSlideShow(e)
        }
    } catch(e) {
        console.log(e)
    }
}

async function loadFiles(folder) {
    allFiles = []
    let videoFiles = []
    await loadFolder(folder, videoFiles)
    const {shortVideos, longVideos} = await loadVideoMetadata(videoFiles)
    allFiles = allFiles.concat(shortVideos)
    allFiles = allFiles.concat(longVideos)
    shuffle(allFiles)
    console.log(allFiles)
}

async function loadFolder(folder, videoFiles) {
    let files = await folder.values()
    for await (const file of files) {
        if (file.kind == 'directory') {
            await loadFolder(file, videoFiles)
        } else if (/\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)$/i.test(file.name)) {
            allFiles.push({type: 'short', file: file, format: 'image'})
        } else if (/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|3gp)$/i.test(file.name)) {
            videoFiles.push(file)
        }
    }
}

async function loadVideoMetadata(videoFiles) {
    if (videoFiles.length == 0) {
        return {shortVideos: [], longVideos: []}
    }
    const longVideos = []
    const shortVideos = []
    const video = document.createElement('video');
    video.preload = 'metadata';
    let loaded = 0

    return new Promise(async(resolve) => {

        video.onloadedmetadata = async function() {
            window.URL.revokeObjectURL(video.src);
            let duration = video.duration;
            let width = video.videoWidth;
            let height = video.videoHeight;
            if (!width || !height) { // assume 16:9 ratio
                width = 16
                height = 9
            }
            if (duration > settings.videoSplittingTime) {
                const videoFile = videoFiles.pop()
                for (let i = 0; i < Math.ceil(duration/settings.videoSplittingTime); i++) {
                    longVideos.push({type: 'long', file: videoFile, start: i*settings.videoSplittingTime, format: 'video', width: width, height: height})
                }
            } else {
                shortVideos.push({type: 'short', file: videoFiles.pop(), format: 'video', width: width, height: height})
            }
            if (videoFiles.length > 0) {
                video.src = URL.createObjectURL(await videoFiles[videoFiles.length - 1].getFile())
            } else {
                resolve({shortVideos, longVideos})
            }
        }

        video.src = URL.createObjectURL(await videoFiles[videoFiles.length - 1].getFile());
    })
}

async function loadImageMetadata() {
    let img = new Image();
    let imageObjectsToLoad = []
    for (let i = allFiles.length - 1; i >= allFiles.length - 10 && i >= 0; i--) {
        if (!allFiles[i].width && allFiles[i].format == 'image') {
            imageObjectsToLoad.push(allFiles[i])
        }
    }
    if (imageObjectsToLoad.length > 0) {
        return new Promise(async(resolve) => {
            let currentImageObject;
            let attempts = 0;

            img.onload = async function() {
                attempts = 0
                currentImageObject.width = img.width
                currentImageObject.height = img.height
                URL.revokeObjectURL(img.src);
                if (imageObjectsToLoad.length > 0) {
                    currentImageObject = imageObjectsToLoad.pop()
                    img.src = URL.createObjectURL(await currentImageObject.file.getFile())
                } else {
                    resolve()
                }
            };
            img.onerror = async function(e) {
                console.error(e, attempts)
                if (attempts++ < 3) {
                    img.src = URL.createObjectURL(await currentImageObject.file.getFile())
                }
            }

            currentImageObject = imageObjectsToLoad.pop()
            img.src = URL.createObjectURL(await currentImageObject.file.getFile());
        })

    }
}

function scaleWidth(fitHeight, height, width) {
    let scaleFactor = fitHeight/height
    return width * scaleFactor
}

async function getNextSlides(remainingWidth, height) {
    await loadImageMetadata();
    let toAdd = [];
    let newRemainingWidth = remainingWidth;
    let indicesToRemove = [];
    for (let i = allFiles.length - 1; i >= allFiles.length - 10 && i >= 0; i--) {
        let scaledWidth = scaleWidth(height, allFiles[i].height, allFiles[i].width)
        allFiles[i].scaledWidth = scaledWidth
        if (scaledWidth < newRemainingWidth) {
            toAdd.push(allFiles[i])
            indicesToRemove.push(i)
            newRemainingWidth -= scaledWidth
        }
    }
    for (const i of indicesToRemove) {
        allFiles.splice(i, 1)
    }
    return toAdd
}

function jitter(num) {
    let amount = Math.random()*(num*0.4) - num*0.2
    return num + amount
}

function replaceSlide(parent, newElem, oldElem, newWidth){
    let oldWidth;
    if (oldElem && Array.prototype.indexOf.call(parent.children, oldElem) >= 0) {
        oldWidth = oldElem.offsetWidth
        newElem.style.width = oldWidth
        parent.replaceChild(newElem, oldElem)
        URL.revokeObjectURL(oldElem.src)
    } else {
        oldWidth = 0
        parent.appendChild(newElem)
    }
    newElem.setAttribute("data-real-width", newWidth)
    newElem.animate([
        { width: oldWidth + "px" },
        { width: newWidth + "px" }
    ], 500)
}

async function startSlideShow(root) {
    
    document.getElementById("welcome").style.display = 'none';
    document.getElementById("slideshow-grid").style.display = 'flex';
    for(const elem of document.getElementsByClassName("slideshow-row")) {
        elem.style.display = 'flex';
    }
    let debounceTimer;
    let toRemove = [];

    async function loadMoreSlides() {
        let removedWidth = 0;
        for(const e of toRemove) {
            removedWidth += e.offsetWidth
        }
        let childrenWidth = 0;
        for (const child of root.children) {
            childrenWidth += parseInt(child.dataset.realWidth)
        }
        let slides = await getNextSlides(root.offsetWidth - (childrenWidth - removedWidth), root.offsetHeight)
        for (const slide of slides) {
            if (slide.format == 'video') {
                let vidDiv = document.createElement("video")
                vidDiv.className = "videoSlide"
                vidDiv.setAttribute("controls", "true")
                vidDiv.volume = settings.volume
                vidDiv.src = URL.createObjectURL(await slide.file.getFile())
                replaceSlide(root, vidDiv, toRemove.pop(), slide.scaledWidth)
                vidDiv.play()
                let timeout; 
                if (slide.type === 'long') {
                    vidDiv.currentTime = slide.start
                    timeout = setTimeout(() => nextSlide(vidDiv), settings.videoSplittingTime*1000)
                }
                vidDiv.addEventListener("ended", () => {
                    if (timeout) {
                        clearTimeout(timeout)
                    }
                    nextSlide(vidDiv)
                }, false)
                vidDiv.onclick = () => {
                    if (timeout) {
                        clearTimeout(timeout)
                    }
                    nextSlide(vidDiv)
                }
            } else {
                let imgDiv = document.createElement("img")
                imgDiv.className = "imgSlide"
                imgDiv.src = URL.createObjectURL(await slide.file.getFile())
                replaceSlide(root, imgDiv, toRemove.pop(), slide.scaledWidth)
                const timeout = setTimeout(() => nextSlide(imgDiv), jitter(settings.imageInterval*1000))
                imgDiv.onclick = () => {
                    clearTimeout(timeout)
                    nextSlide(imgDiv)
                }
            }
        }
        for(const e of toRemove) {
            if (Array.prototype.indexOf.call(root.children, e) >= 0) {
                const animation = e.animate([
                    { width: e.offsetWidth + "px" },
                    { width: 0 + "px" }
                ], 500)
                animation.onfinish = function() {
                    this.effect.target.parentNode.removeChild(this.effect.target);
                    URL.revokeObjectURL(this.effect.target.src)
                }
            }
        }
        toRemove = []
    }

    async function nextSlide(elemRemoved) {
        if (!root.isConnected) {
            return
        }
        if (elemRemoved) {
            URL.revokeObjectURL(elemRemoved.src)
            toRemove.push(elemRemoved)
        }
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }
        debounceTimer = setTimeout(loadMoreSlides, 100)
    }

    await loadMoreSlides()
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex > 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    return array;
}

let slideshowGrid;

async function changeGrid() {
    while (slideshowGrid.children.length > settings.rows) {
        slideshowGrid.removeChild(slideshowGrid.children[slideshowGrid.children.length - 1])
    }
    while (slideshowGrid.children.length < settings.rows) {
        let ssRow = document.createElement("div")
        ssRow.className = "slideshow-row"
        ssRow.style.display = "flex"
        slideshowGrid.append(ssRow)
        if (inProgress) {
            startSlideShow(slideshowGrid.children[slideshowGrid.children.length - 1])
        }
    }
    let rowHeight = 100/settings.rows
    for (let child of document.getElementsByClassName("slideshow-row")) {
        child.style.height = rowHeight + "%"
    }
}

window.onload = () => {
    document.getElementById("browse").onclick = openDir2
    slideshowGrid = document.getElementById("slideshow-grid")
    initSettings(changeGrid)
}
