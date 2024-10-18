import './preview.css';

let player;
let slideQueue = [];
let currentSlideIndex = 0;
let isPlaying = false;
let currentSlideTimeout;
let slideshowFinished = false;

async function loadYouTubeAPI() {
    return new Promise((resolve) => {
        if (window.YT) {
            resolve();
        } else {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            window.onYouTubeIframeAPIReady = () => {
                resolve();
            };
        }
    });
}

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
    slideshowFinished = false; // 슬라이드쇼가 시작될 때 false로 설정
    currentSlideIndex = 0; // 첫 번째 슬라이드부터 시작
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
        'startSeconds': startTime / 1000,  // 밀리초를 초 단위로 변환
        'endSeconds': endTime / 1000       // 밀리초를 초 단위로 변환
    });

    player.playVideo();

    const checkInterval = setInterval(() => {
        const currentTime = player.getCurrentTime() * 1000;  // 초를 밀리초로 변환

        // 현재 시간이 endTime을 넘어가면 비디오를 중지하고 다음 슬라이드로 넘어감
        if (currentTime >= endTime) {
            clearInterval(checkInterval);
            player.pauseVideo();
            if (isPlaying && currentSlideIndex < slideQueue.length - 1) {
                playSlideAtIndex(currentSlideIndex + 1);
            } else {
                finishSlideshow();
            }
        }
    }, 100);  // 100ms마다 현재 시간을 체크
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
    } else if (slideshowFinished) {
        // 슬라이드쇼가 끝나고 재생 버튼이 등장한 상태에서 < 버튼을 누르면 마지막 슬라이드 재생
        isPlaying = true;
        slideshowFinished = false;
        document.getElementById('overlayPlayButton').style.display = 'none';
        playSlideAtIndex(slideQueue.length - 1); // 마지막 슬라이드 재생
    } else {
        // 슬라이드쇼 도중에 처음 슬라이드에서 < 버튼을 누른 경우
        playSlideAtIndex(currentSlideIndex);
    }
}

function nextSlide() {
    if (currentSlideIndex < slideQueue.length - 1) {
        isPlaying = true;
        slideshowFinished = false;
        document.getElementById('overlayPlayButton').style.display = 'none';
        playSlideAtIndex(currentSlideIndex + 1);
    } else {
        finishSlideshow();
    }
}

function finishSlideshow() {
    isPlaying = false;
    slideshowFinished = true;
    currentSlideIndex = slideQueue.length - 1; // 마지막 슬라이드로 인덱스 설정
    player.pauseVideo();
    document.getElementById('overlayPlayButton').style.display = 'flex';
    updateButtonStates();
}

function updateButtonStates() {
    const prevButton = document.getElementById('prevSlideButton');
    const nextButton = document.getElementById('nextSlideButton');

    if (prevButton) {
        prevButton.disabled = !slideshowFinished && currentSlideIndex === 0;
    }

    if (nextButton) {
        nextButton.disabled = currentSlideIndex === slideQueue.length - 1;
    }
}

function closePreview() {
    window.close();
}

function uploadContent() {
    alert('업로드 기능은 구현되지 않았습니다.');
}

window.addEventListener('load', async function() {
    await loadYouTubeAPI();

    const urlParams = new URLSearchParams(window.location.search);
    const slideQueueParam = urlParams.get('slideQueue');
    console.log("Received slideQueue param:", slideQueueParam);
    
    if (slideQueueParam) {
        try {
            const decodedSlideQueue = JSON.parse(decodeURIComponent(slideQueueParam));
            console.log("Decoded slideQueue:", decodedSlideQueue);
            if (Array.isArray(decodedSlideQueue) && decodedSlideQueue.length > 0) {
                slideQueue = decodedSlideQueue;
                console.log("Loaded slideQueue:", slideQueue);
            } else {
                console.error("Decoded slideQueue is empty or not an array");
            }
        } catch (error) {
            console.error("Error parsing slideQueue:", error);
        }
    } else {
        console.error("No slideQueue parameter found in URL");
    }

    document.querySelector('.preview-group-title').innerText = decodeURIComponent(urlParams.get('groupTitle') || '');
    document.querySelector('.preview-description').innerText = decodeURIComponent(urlParams.get('description') || '');

    await initializeYouTubePlayer();
    updateButtonStates();
    startSlideshow(); // 페이지 로드 시 슬라이드쇼 자동 시작
});

window.startSlideshow = startSlideshow;
window.prevSlide = prevSlide;
window.nextSlide = nextSlide;
window.closePreview = closePreview;
window.uploadContent = uploadContent;
