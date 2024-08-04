import { showDirectoryPicker } from 'https://cdn.jsdelivr.net/npm/file-system-access/lib/es2018.js';
import { settings } from './settings.js';

let allFiles = [];
let remainingFiles = [];
export let current = 0;
export let total = 100;

export async function showPicker() {
    return await showDirectoryPicker()
}

export async function loadFiles(folder) {
    remainingFiles = []
    allFiles = []
    let videoFiles = []
    await loadFolder(folder, videoFiles)
    const {shortVideos, longVideos} = await loadVideoMetadata(videoFiles)
    allFiles = allFiles.concat(shortVideos)
    allFiles = allFiles.concat(longVideos)
    console.log(allFiles)
    remainingFiles = [...allFiles]
    shuffle(remainingFiles)
}

export async function restartSlides() {
    remainingFiles = [...allFiles]
    shuffle(remainingFiles)
}

export async function nextFileSlides(remainingWidth, height) {
    await loadImageMetadata();
    let toAdd = [];
    let newRemainingWidth = remainingWidth;
    let indicesToRemove = [];
    for (let i = remainingFiles.length - 1; i >= remainingFiles.length - 10 && i >= 0; i--) {
        let scaledWidth = scaleWidth(height, remainingFiles[i].height, remainingFiles[i].width)
        remainingFiles[i].scaledWidth = scaledWidth
        if (scaledWidth < newRemainingWidth) {
            toAdd.push(remainingFiles[i])
            indicesToRemove.push(i)
            newRemainingWidth -= scaledWidth
        }
    }
    for (const i of indicesToRemove) {
        remainingFiles.splice(i, 1)
    }
    return toAdd
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
    total = videoFiles.length
    current = 0

    return new Promise(async(resolve) => {

        video.onloadedmetadata = async function() {
            window.URL.revokeObjectURL(video.src);
            let duration = video.duration;
            let width = video.videoWidth;
            let height = video.videoHeight;
            if (!width || !height) { // assume 19:9 ratio
                width = 19
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
                current++;
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
    for (let i = remainingFiles.length - 1; i >= remainingFiles.length - 10 && i >= 0; i--) {
        if (!remainingFiles[i].width && remainingFiles[i].format == 'image') {
            imageObjectsToLoad.push(remainingFiles[i])
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

function scaleWidth(fitHeight, height, width) {
    let scaleFactor = fitHeight/height
    return width * scaleFactor
}