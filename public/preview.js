var player;
var slideQueue = [];
var currentSlideIndex = 0;
var isPlaying = false;
var currentSlideTimeout;
var slideshowFinished = false;

async function initializeYouTubePlayer() {
    return new Promise((resolve) => {
        player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            playerVars: {
                'autoplay': 0,
                'controls': 0
            },
            events: {
                'onReady': resolve
            }
        });
    });
}

async function startSlideshow() {
    isPlaying = true;
    document.getElementById('overlayPlayButton').style.display = 'none';
    playSlideAtIndex(currentSlideIndex);
}

function playSlideAtIndex(index) {
    clearTimeout(currentSlideTimeout);
    if (index < 0 || index >= slideQueue.length) {
        finishSlideshow();
        return;
    }

    currentSlideIndex = index;
    const slide = slideQueue[currentSlideIndex];
    console.log("Playing slide:", slide);

    slideshowFinished = false;
    document.getElementById('overlayPlayButton').style.display = 'none';
    updateButtonStates();

    if (slide.type === 'video') {
        playVideoSlide(slide);
    } else if (slide.type === 'image') {
        playImageSlide(slide);
    }
}

function playVideoSlide(slide) {
    const { videoId, startTime, endTime } = slide;
    document.querySelector('.video-container').style.display = 'block';
    document.getElementById('imageContainer').style.display = 'none';

    player.loadVideoById({
        'videoId': videoId,
        'startSeconds': startTime,
        'endSeconds': endTime
    });

    player.playVideo();

    currentSlideTimeout = setTimeout(() => {
        if (isPlaying && currentSlideIndex < slideQueue.length - 1) {
            playSlideAtIndex(currentSlideIndex + 1);
        } else {
            finishSlideshow();
        }
    }, (endTime - startTime) * 1000);
}

function playImageSlide(slide) {
    const { imageUrl, duration } = slide;
    document.querySelector('.video-container').style.display = 'none';
    document.getElementById('imageContainer').style.display = 'flex';

    const previewImage = document.getElementById('previewImage');
    previewImage.src = imageUrl;

    currentSlideTimeout = setTimeout(() => {
        if (isPlaying && currentSlideIndex < slideQueue.length - 1) {
            playSlideAtIndex(currentSlideIndex + 1);
        } else {
            finishSlideshow();
        }
    }, duration * 1000);
}

function prevSlide() {
    if (currentSlideIndex > 0) {
        isPlaying = true;
        slideshowFinished = false;
        document.getElementById('overlayPlayButton').style.display = 'none';
        playSlideAtIndex(currentSlideIndex - 1);
    }
}

function nextSlide() {
    if (currentSlideIndex < slideQueue.length - 1) {
        isPlaying = true;
        slideshowFinished = false;
        document.getElementById('overlayPlayButton').style.display = 'none';
        playSlideAtIndex(currentSlideIndex + 1);
    }
}

function finishSlideshow() {
    isPlaying = false;
    slideshowFinished = true;
    player.pauseVideo();
    document.getElementById('overlayPlayButton').style.display = 'flex';
    updateButtonStates();
}

function updateButtonStates() {
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    if (prevButton) {
        prevButton.disabled = currentSlideIndex === 0;
    }

    if (nextButton) {
        nextButton.disabled = currentSlideIndex === slideQueue.length - 1 || slideshowFinished;
    }
}

window.addEventListener('load', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const slideQueueParam = urlParams.get('slideQueue');
    if (slideQueueParam) {
        try {
            slideQueue = JSON.parse(decodeURIComponent(slideQueueParam));
            console.log("Loaded slideQueue:", slideQueue);
        } catch (error) {
            console.error('Error parsing slideQueue:', error);
        }
    }
    document.querySelector('.preview-group-title').innerText = decodeURIComponent(urlParams.get('groupTitle') || '');
    document.querySelector('.preview-description').innerText = decodeURIComponent(urlParams.get('description') || '');

    await initializeYouTubePlayer();
    updateButtonStates();
    startSlideshow();
});