import { showDirectoryPicker } from 'https://cdn.jsdelivr.net/npm/file-system-access/lib/es2018.js';
import { initSettings, settings } from './settings.js';

let allFiles = [];
let inProgress = false;

async function openDir2() {
    try {
        const folder = await showDirectoryPicker()
        await loadFiles(folder)
        inProgress = true
        for (const e of document.getElementsByClassName("slideshow")) {
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
    document.getElementById("vidTotal").innerText = videoFiles.length + ""
    const cur = document.getElementById("vidCurrent")
    const video = document.createElement('video');
    video.preload = 'metadata';
    let loaded = 0

    return new Promise(async(resolve) => {

        video.onloadedmetadata = async function() {
            window.URL.revokeObjectURL(video.src);
            var duration = video.duration;
            if (duration > settings.videoSplittingTime) {
                const video = videoFiles.pop()
                for (let i = 0; i < Math.ceil(duration/settings.videoSplittingTime); i++) {
                    longVideos.push({type: 'long', file: video, start: i*settings.videoSplittingTime, format: 'video'})
                }
            } else {
                shortVideos.push({type: 'short', file: videoFiles.pop(), format: 'video'})
            }
            cur.innerText = ++loaded
            if (videoFiles.length > 0) {
                video.src = URL.createObjectURL(await videoFiles[videoFiles.length - 1].getFile())
            } else {
                resolve({shortVideos, longVideos})
            }
        }

        video.src = URL.createObjectURL(await videoFiles[videoFiles.length - 1].getFile());
    })
}

async function startSlideShow(root) {
    let videoPlayer = root.querySelector(".videoSlide")
    let imgViewer = root.querySelector(".imgSlide")
    let timeout = null
    let prevObjects = []
    
    document.getElementById("welcome").style.display = 'none';
    document.getElementById("slideshow-grid").style.display = 'flex';
    for(const elem of document.getElementsByClassName("slideshow-row")) {
        elem.style.display = 'flex';
    }
    for(const elem of document.getElementsByClassName("slideshow")) {
        elem.style.display = 'block';
    }

    async function nextSlide() {
        if (!root.isConnected) {
            console.log("removed")
            return
        }
        let file = allFiles.pop()
        if (file.format === 'video') {
            timeout = null
            videoPlayer.src = URL.createObjectURL(await file.file.getFile())
            prevObjects.push(videoPlayer.src)
            videoPlayer.play()
            videoPlayer.volume = settings.volume
            videoPlayer.style.display = 'block';
            imgViewer.style.display = 'none';
            if (file.type === 'long') {
                videoPlayer.currentTime = file.start
                timeout = setTimeout(() => nextSlide(), settings.videoSplittingTime*1000)
            }
        } else {
            videoPlayer.pause()
            imgViewer.src = URL.createObjectURL(await file.file.getFile())
            prevObjects.push(imgViewer.src)
            videoPlayer.style.display = 'none';
            imgViewer.style.display = 'block';
            timeout = setTimeout(() => nextSlide(), settings.imageInterval*1000)
        }
        if (prevObjects.length > 2) {
            URL.revokeObjectURL(prevObjects.shift())
        }
    }

    videoPlayer.addEventListener("ended", nextSlide, false)

    nextSlide()

    root.onclick = () => {
        if (timeout) {
            clearTimeout(timeout)
        }
        nextSlide()
    }
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
    while (slideshowGrid.children.length > settings.verticalSlides) {
        slideshowGrid.removeChild(slideshowGrid.children[slideshowGrid.children.length - 1])
    }
    while (slideshowGrid.children[0].children.length > settings.horizontalSlides) {
        for (let i = 0; i < slideshowGrid.children.length; i++) {
            let removeFrom = slideshowGrid.children[i].children
            slideshowGrid.children[i].removeChild(removeFrom[removeFrom.length - 1])
        }
    }
    while (slideshowGrid.children[0].children.length < settings.horizontalSlides) {
        for (let i = 0; i < slideshowGrid.children.length; i++) {
            let ssDiv = document.createElement("div")
            ssDiv.className = "slideshow"
            let imgDiv = document.createElement("img")
            imgDiv.className = "imgSlide"
            let vidDiv = document.createElement("video")
            vidDiv.className = "videoSlide"
            vidDiv.setAttribute("controls", "true")
            vidDiv.volume = settings.volume
            ssDiv.append(imgDiv)
            ssDiv.append(vidDiv)
            slideshowGrid.children[i].append(ssDiv)
            if (inProgress) {
                startSlideShow(ssDiv)
            }
        }
    }
    while (slideshowGrid.children.length < settings.verticalSlides) {
        slideshowGrid.append(slideshowGrid.children[0].cloneNode(true))
        if (inProgress) {
            for (let child of slideshowGrid.children[slideshowGrid.children.length - 1].children) {
                startSlideShow(child)
            }
        }
    }
    let rowHeight = 100/settings.verticalSlides
    for (let child of document.getElementsByClassName("slideshow-row")) {
        child.style.height = rowHeight + "%"
    }
}

window.onload = () => {
    document.getElementById("browse").onclick = openDir2
    slideshowGrid = document.getElementById("slideshow-grid")
    initSettings(changeGrid)
}
