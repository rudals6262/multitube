import './styles.css';

// Functions from scripts.js
let player;
let slideQueue = [];
let videoDuration = 0;
let currentZoomLevel = 1;
let originalTrackWidth = null;
let currentEditingSlideIndex;
let checkEndInterval;
let slideIdCounter = 0;
let isCheckingSlideQueue = false;

function createUniqueSlideId() {
    return `slide_${slideIdCounter++}`;
}

if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.slideQueue) {
        window.slideQueue = [];
    }
    
    setupEventListeners();
    hideMediabox();
    addEmptySlide();
    setupEmptySlide();
    
    // 페이지 로드 시 한 번만 체크
    setTimeout(() => {
        if (document.querySelectorAll('.slide:not(.empty-slide)').length === 0) {
            slideQueue = [];
        }
    }, 0);
});

window.onYouTubeIframeAPIReady = function() {
    console.log("YouTube IFrame API is ready");
    player = new YT.Player('videoPreview', {
        height: '300',
        width: '100%',
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
};

function resetMediabox() {
    showMediaButtons();
}

function addVideoInputFields() {
    const mediaboxContent = document.getElementById('mediabox-content');
    mediaboxContent.innerHTML = `
        <div class="video-container">
            <div class="video-frame" style="display: none;">
                <div id="videoPreview"></div>
            </div>
            <div class="time-slider-wrapper">
                <div class="time-slider-container" style="display: none; overflow-x: auto;">
                    <div class="slider-track" style="width: 100%;">
                        <div class="slider-range"></div>
                        <div class="slider-left-thumb" id="startThumb"></div>
                        <div class="slider-right-thumb" id="endThumb"></div>
                        <div class="current-time-indicator" id="currentTimeIndicator"></div>
                    </div>
                </div>
            </div>    
            <div class="input-group">
                <input type="text" id="videoLink" placeholder="YouTube 링크" onclick="this.value=''" oninput="handleVideoLinkInput()">
                <div class="plus-minus-buttons" style="display: none;">
                    <button onclick="zoomOut()">-</button>
                    <button onclick="zoomIn()">+</button>
                </div>
            </div>
            <div class="action-buttons">
                <button class="media-select" onclick="resetMediabox()">미디어 선택</button>
                <div class="confirm-buttons" style="display: none;">
                    <button class="confirm" onclick="addSlide()">확인</button>
                </div>
            </div>
        </div>
    `;
}

function extractVideoId(url) {
    let videoId = null;
    let updatedUrl = url;

    if (url.includes('youtube.com/shorts/')) {
        const shortsMatch = url.match(/youtube\.com\/shorts\/([^?]*)/);
        if (shortsMatch && shortsMatch[1]) {
            videoId = shortsMatch[1];
            updatedUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }
    } else if (url.includes('music.youtube.com/')) {
        const musicMatch = url.match(/music\.youtube\.com\/watch\?v=([^&]*)/);
        if (musicMatch && musicMatch[1]) {
            videoId = musicMatch[1];
            updatedUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }
    } else if (url.includes('youtube.com/live/')) {
        const liveMatch = url.match(/youtube\.com\/live\/([^?]*)/);
        if (liveMatch && liveMatch[1]) {
            videoId = liveMatch[1];
            updatedUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }
    } else {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            videoId = match[2];
        }
    }

    return { videoId, updatedUrl };
}

async function checkLiveBroadcastStatus(videoId) {
    try {
        const response = await fetch(`http://localhost:3000/api/youtube/${videoId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch video details');
        }
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const videoDetails = data.items[0];
            if (videoDetails.liveStreamingDetails && videoDetails.liveStreamingDetails.concurrentViewers) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error fetching video details:', error);
        return false;
    }
}

function handleVideoLinkInput() {
    const videoLinkInput = document.getElementById('videoLink');
    const { videoId, updatedUrl } = extractVideoId(videoLinkInput.value);

    if (videoId) {
        resetTrackDisplay(); // 링크가 입력되는 즉시 트랙 디스플레이를 리셋

        fetchVideoDuration(videoId).then((duration) => {
            videoDuration = duration;
            videoLinkInput.value = updatedUrl;
            document.querySelector('.video-frame').style.display = 'block';
            document.querySelector('.time-slider-wrapper').style.display = 'block';
            document.querySelector('.time-slider-container').style.display = 'block';
            document.querySelector('.action-buttons .confirm-buttons').style.display = 'flex';
            document.querySelector('.input-group .plus-minus-buttons').style.display = 'inline-block';
            setupSlider(0, 100); // 새로운 동영상의 전체 구간을 설정
            forceUpdateSliderLayout(); // 슬라이더 레이아웃 업데이트 강제
        }).catch(error => {
            console.error('Error fetching video duration:', error);
        });
    } else {
        // 동영상 링크가 비어 있을 경우에도 현재 로드된 동영상 정보를 유지
        const currentSlide = slideQueue[currentEditingSlideIndex];
        if (currentSlide) {
            videoDuration = currentSlide.videoDuration;
            videoLinkInput.value = currentSlide.videoLink;
            resetTrackDisplay();
            document.querySelector('.video-frame').style.display = 'block';
            document.querySelector('.time-slider-wrapper').style.display = 'block';
            document.querySelector('.time-slider-container').style.display = 'block';
            document.querySelector('.action-buttons .confirm-buttons').style.display = 'flex';
            document.querySelector('.input-group .plus-minus-buttons').style.display = 'inline-block';
            setupSlider(0, 100); // 현재 동영상의 전체 구간을 설정
            forceUpdateSliderLayout(); // 슬라이더 레이아웃 업데이트 강제
        }
    }
}

function resetTrackDisplay() {
    const sliderTrack = document.querySelector('.slider-track');
    const startThumb = document.getElementById('startThumb');
    const endThumb = document.getElementById('endThumb');
    const sliderRange = document.querySelector('.slider-range');
    const currentTimeIndicator = document.getElementById('currentTimeIndicator');

    if (!sliderTrack || !startThumb || !endThumb || !sliderRange || !currentTimeIndicator) {
        console.error('One or more slider elements are missing.');
        return;
    }

    sliderTrack.style.setProperty('--zoom-factor', 1);
    sliderTrack.style.setProperty('--tick-base', 60);

    startThumb.style.left = '0%';
    endThumb.style.left = '100%';
    updateSliderRange();

    currentTimeIndicator.style.left = '0%';
    currentZoomLevel = 1;
    adjustSliderTrackWidth();
}

function fetchVideoDuration(videoId) {
    return new Promise((resolve, reject) => {
        if (player) {
            player.destroy();
        }
        player = new YT.Player('videoPreview', {
            height: '300',
            width: '100%',
            videoId: videoId,
            events: {
                'onReady': (event) => {
                    const duration = event.target.getDuration();
                    if (duration) {
                        resolve(duration);
                        setTimeout(() => {
                            adjustSliderTrackWidth(); // 슬라이더 트랙 너비 조정
                        }, 100); // 레이아웃 업데이트 지연
                    } else {
                        reject(new Error('Failed to retrieve video duration'));
                    }
                },
                'onError': (event) => {
                    reject(event);
                }
            }
        });
    });
}

function adjustSliderTrackWidth() {
    const videoFrame = document.querySelector('.video-frame');
    const sliderTrack = document.querySelector('.slider-track');
    const timeSliderWrapper = document.querySelector('.time-slider-wrapper');
    const timeSliderContainer = document.querySelector('.time-slider-container');
    if (videoFrame && sliderTrack && timeSliderWrapper && timeSliderContainer) {
        const width = videoFrame.offsetWidth;
        sliderTrack.style.width = `${width - 40}px`; // 20px padding on each side
        timeSliderWrapper.style.width = `${width}px`;
        timeSliderContainer.style.width = `${width}px`;
    }
}

function resetVideoFrame() {
    if (player) {
        player.destroy();
        player = null;
    }
    document.getElementById('videoPreview').innerHTML = '';
    document.querySelector('.video-frame').style.display = 'none';
    document.querySelector('.time-slider-container').style.display = 'none';
    document.querySelector('.action-buttons').style.display = 'none';
    document.querySelector('.plus-minus-buttons').style.display = 'none';
}

function onPlayerReady(event) {
    console.log("Player is ready");
    if (slideQueue[currentEditingSlideIndex]) {
        const startTime = slideQueue[currentEditingSlideIndex].startTime;
        event.target.seekTo(startTime);
    }
    setInterval(updateCurrentTimeIndicator, 100);
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        updateCurrentTimeIndicator();
    }
}

function setupSlider(startPercentage = 0, endPercentage = 100) {
    const sliderTrack = document.querySelector('.slider-track');
    const sliderRange = document.querySelector('.slider-range');
    const currentTimeIndicator = document.getElementById('currentTimeIndicator');

    // 기존 thumb 요소들 제거
    const existingThumbs = sliderTrack.querySelectorAll('.slider-left-thumb, .slider-right-thumb');
    existingThumbs.forEach(thumb => thumb.remove());

    // 새로운 thumb 요소들 생성
    const startThumb = document.createElement('div');
    startThumb.className = 'slider-left-thumb';
    startThumb.id = 'startThumb';

    const endThumb = document.createElement('div');
    endThumb.className = 'slider-right-thumb';
    endThumb.id = 'endThumb';

    sliderTrack.appendChild(startThumb);
    sliderTrack.appendChild(endThumb);

    // thumb 위치 설정 함수
    function setThumbPosition(thumb, percentage) {
        thumb.style.left = `${percentage}%`;
        updateSliderRange();
    }

    // thumb 이동 함수
    function moveThumb(thumb, event, isStart) {
        const rect = sliderTrack.getBoundingClientRect();
        let percentage = ((event.clientX - rect.left) / rect.width) * 100;
        percentage = Math.max(0, Math.min(percentage, 100));
    
        if (isStart) {
            if (percentage >= parseFloat(endThumb.style.left)) {
                percentage = parseFloat(endThumb.style.left) - (1 / videoDuration * 100);
            }
            thumb.style.left = `${percentage}%`;
            updateSliderRange();
            const startTime = (parseFloat(startThumb.style.left) / 100) * videoDuration;
            const endTime = (parseFloat(endThumb.style.left) / 100) * videoDuration;
            playSegment(startTime, endTime); // 슬라이더 레인지 영역 재생
        } else {
            if (percentage <= parseFloat(startThumb.style.left)) {
                percentage = parseFloat(startThumb.style.left) + (1 / videoDuration * 100);
            }
            const endTime = (percentage / 100) * videoDuration;
            playSegment(endTime - 0.3, endTime).then(() => {
                const startTime = (parseFloat(startThumb.style.left) / 100) * videoDuration;
                playSegment(startTime, endTime);
            });
            thumb.style.left = `${percentage}%`;
            updateSliderRange();
        }
    }
   
    // 마우스 이벤트 처리 함수들
    function handleMoveStart(event) {
        moveThumb(startThumb, event, true);
    }

    function handleMoveEnd(event) {
        moveThumb(endThumb, event, false);
    }

    function stopMove() {
        document.removeEventListener('mousemove', handleMoveStart);
        document.removeEventListener('mousemove', handleMoveEnd);
    }

    // 이벤트 리스너 설정
    startThumb.addEventListener('mousedown', function(event) {
        event.preventDefault();
        document.addEventListener('mousemove', handleMoveStart);
        document.addEventListener('mouseup', stopMove);
    });

    endThumb.addEventListener('mousedown', function(event) {
        event.preventDefault();
        document.addEventListener('mousemove', handleMoveEnd);
        document.addEventListener('mouseup', stopMove);
    });

    // 슬라이더 레인지 클릭 이벤트 처리
    sliderRange.addEventListener('click', function() {
        const startTime = (parseFloat(startThumb.style.left) / 100) * videoDuration;
        const endTime = (parseFloat(endThumb.style.left) / 100) * videoDuration;
        playSegment(startTime, endTime);
    });

    // 초기 위치 설정
    setThumbPosition(startThumb, startPercentage);
    setThumbPosition(endThumb, endPercentage);
    updateSliderRange();
    updateCurrentTimeIndicator();
}

function moveStart(event) {
    const startThumb = document.getElementById('startThumb');
    moveThumb(startThumb, event, true);
}

function moveEnd(event) {
    const endThumb = document.getElementById('endThumb');
    moveThumb(endThumb, event, false);
}

function playSegment(startTime, endTime) {
    return new Promise((resolve) => {
        if (checkEndInterval) {
            clearInterval(checkEndInterval);
        }

        if (player && player.seekTo && typeof player.seekTo === 'function') {
            player.seekTo(startTime); // 초 단위로
            player.playVideo();

            checkEndInterval = setInterval(() => {
                if (player && player.getCurrentTime && typeof player.getCurrentTime === 'function') {
                    const currentTime = player.getCurrentTime();
                    updateCurrentTimeIndicator();
                    if (currentTime >= endTime) {
                        player.pauseVideo();
                        player.seekTo(startTime);
                        clearInsterval(checkEndInterval);
                        resolve();
                    }
                }
            }, 100);
        }
    });
}

function updateCurrentTimeIndicator() {
    if (player && player.getCurrentTime) {
        const currentTime = player.getCurrentTime();
        const startThumb = document.getElementById('startThumb');
        const endThumb = document.getElementById('endThumb');
        const currentTimeIndicator = document.getElementById('currentTimeIndicator');

        if (!startThumb || !endThumb || !currentTimeIndicator) {
            return;
        }

        const startTime = (parseFloat(startThumb.style.left) / 100) * videoDuration;
        const endTime = (parseFloat(endThumb.style.left) / 100) * videoDuration;

        if (currentTime >= startTime && currentTime <= endTime) {
            const percentage = ((currentTime - startTime) / (endTime - startTime)) * 100;
            const rangeStart = parseFloat(startThumb.style.left);
            const rangeWidth = parseFloat(endThumb.style.left) - rangeStart;
            const indicatorPosition = rangeStart + (percentage / 100 * rangeWidth);
            currentTimeIndicator.style.left = `${indicatorPosition}%`;
        }
    }
}

function applyZoom() {
    const sliderTrack = document.querySelector('.slider-track');
    const container = document.querySelector('.time-slider-container');
    const startThumb = document.getElementById('startThumb');
    const endThumb = document.getElementById('endThumb');
    const currentTimeIndicator = document.getElementById('currentTimeIndicator');
    if (!originalTrackWidth) {
        originalTrackWidth = sliderTrack.offsetWidth;
    }

    const zoomFactor = 2 ** (currentZoomLevel - 1);

    sliderTrack.style.width = `${originalTrackWidth * zoomFactor}px`;
    sliderTrack.style.transformOrigin = 'left';

    const rangeStart = parseFloat(startThumb.style.left) || 0;
    const rangeEnd = parseFloat(endThumb.style.left) || 100;
    const centerPosition = (rangeStart + rangeEnd) / 2;
    const scrollPosition = (centerPosition / 100) * sliderTrack.offsetWidth - container.offsetWidth / 2;
    container.scrollLeft = Math.max(0, scrollPosition);

    updateSliderRange();

    [startThumb, endThumb, currentTimeIndicator].forEach(element => {
        if (element) {
            element.style.transform = 'translateY(-50%)';
        }
    });

    updateTicks(zoomFactor);
    container.style.overflowX = 'auto';
}

function updateSliderRange() {
    const startThumb = document.getElementById('startThumb');
    const endThumb = document.getElementById('endThumb');
    const sliderRange = document.querySelector('.slider-range');

    if (startThumb && endThumb && sliderRange) {
        const start = parseFloat(startThumb.style.left) || 0;
        const end = parseFloat(endThumb.style.left) || 100;

        sliderRange.style.left = `${start}%`;
        sliderRange.style.width = `${end - start}%`;
    }
}

function zoomIn() {
    const startThumb = document.getElementById('startThumb');
    const endThumb = document.getElementById('endThumb');
    const start = parseFloat(startThumb.style.left) || 0;
    const end = parseFloat(endThumb.style.left) || 100;
    const currentRangePercentage = end - start;

    const currentTrackWidth = document.querySelector('.slider-track').offsetWidth;
    const containerWidth = document.querySelector('.time-slider-container').offsetWidth;

    const currentVisibleDuration = (containerWidth / currentTrackWidth) * videoDuration;

    const nextZoomLevel = currentZoomLevel + 1;
    const nextZoomFactor = 2 ** (nextZoomLevel - 1);
    const nextRangeWidth = (currentRangePercentage / 100) * originalTrackWidth * nextZoomFactor;
    const nextRangePercentage = (nextRangeWidth / containerWidth) * 100;
    const nextVisibleDuration = currentVisibleDuration / 2;

    if (nextVisibleDuration >= 30) {
        currentZoomLevel = nextZoomLevel;
        applyZoom();
    }
}

function zoomOut() {
    if (currentZoomLevel > 1) {
        currentZoomLevel--;
        applyZoom();
        if (currentZoomLevel === 1) {
            const sliderTrack = document.querySelector('.slider-track');
            sliderTrack.style.width = `${originalTrackWidth}px`;
            document.querySelector('.time-slider-container').style.overflowX = 'hidden';
        }
    }
}

function setupEventListeners() {
    // 기존 이벤트 리스너 제거를 위한 함수
    function removeExistingListeners(element, eventType) {
        const clone = element.cloneNode(true);
        element.parentNode.replaceChild(clone, element);
        return clone;
    }
    
    const buttons = document.querySelector('.buttons');
    if (buttons) {
        buttons.removeEventListener('click', handleButtonClick);
        buttons.addEventListener('click', handleButtonClick);
    }

    const previewBtn = document.querySelector('.preview-btn');
    if (previewBtn) {
        const newPreviewBtn = removeExistingListeners(previewBtn, 'click');
        newPreviewBtn.addEventListener('click', handlePreviewClick);
    }

    const slides = document.querySelectorAll('.slide');
    slides.forEach(slide => {
        slide.removeEventListener('click', handleSlideClick);
        slide.addEventListener('click', () => handleSlideClick(slide.dataset.id));
    });

    const groupTitleInput = document.querySelector('.group-title input');
    if (groupTitleInput) {
        groupTitleInput.removeEventListener('input', handleGroupTitleInput);
        groupTitleInput.addEventListener('input', handleGroupTitleInput);
    }

    const descriptionTextarea = document.querySelector('.description textarea');
    if (descriptionTextarea) {
        descriptionTextarea.removeEventListener('input', handleDescriptionTextareaInput);
        descriptionTextarea.addEventListener('input', handleDescriptionTextareaInput);
    }
    
        // 슬라이드 체크가 필요한 버튼이나 요소에 대한 이벤트 리스너
        const checkButtons = document.querySelectorAll('.check-slides-button');
        checkButtons.forEach(button => {
            const newButton = removeExistingListeners(button, 'click');
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                checkSlideQueueEmpty();
            });
        });
}

function handleButtonClick(e) {
    if (e.target.textContent === '동영상') {
        addVideoInputFields();
    } else if (e.target.textContent === '이미지') {
        addImageInputFields();
    }
}

function checkSlideQueueEmpty() {
    const slideElements = document.querySelectorAll('.slide:not(.empty-slide)');
    
    // 슬라이드가 없는 경우
    if ((!slideQueue || slideQueue.length === 0) && slideElements.length === 0) {
        // 매번 경고창을 표시
        alert('추가된 슬라이드가 없습니다.');
        return true;
    }
    
    return false;
}

function syncSlideQueueWithDOM() {
    const slideElements = document.querySelectorAll('.slide:not(.empty-slide)');
    const newQueue = Array.from(slideElements).map(slideElement => {
        const slideId = slideElement.dataset.id;
        const existingSlide = slideQueue.find(slide => slide.id === slideId);
        if (!existingSlide) {
            // 만약 큐에 없는 슬라이드라면 기본 데이터로 생성
            return {
                id: slideId,
                type: 'video',
                videoId: slideElement.querySelector('img').src.split('/').pop(),
                startTime: 0,
                endTime: 0,
                videoDuration: 0,
                videoLink: `https://www.youtube.com/watch?v=${slideElement.querySelector('img').src.split('/').pop()}`
            };
        }
        return existingSlide;
    });
    
    slideQueue = newQueue;
    console.log("Synchronized slideQueue:", slideQueue);
}

function handlePreviewClick() {
    // 슬라이드가 없을 경우 경고창을 표시하고 종료
    if (checkSlideQueueEmpty()) {
        return;
    }
    
    // 슬라이드가 있는 경우 미리보기 창 열기
    openPreviewWindow();
}

function handleSlideClick(slideId) {
    console.log(`Slide clicked: ${slideId}`);
    selectSlide(slideId);
}

function handleGroupTitleInput(event) {
    validateInput(event.target, 50);
}

function handleDescriptionTextareaInput(event) {
    validateInput(event.target, 200);
    autoExpand(event.target);
    limitTextareaLines(event.target, 5);
}

function limitTextareaLines(textarea, maxLines) {
    const lines = textarea.value.split('\n');
    if (lines.length > maxLines) {
        textarea.value = lines.slice(0, maxLines).join('\n');
    }
}

function editSlide(slideId) {
    const slideIndex = slideQueue.findIndex(slide => slide.id === slideId);
    if (slideIndex === -1) {
        console.error(`Slide with id ${slideId} not found.`);
        return;
    }

    const slide = slideQueue[slideIndex];
    currentEditingSlideIndex = slideIndex;
    const { videoId, startTime, endTime, videoLink } = slide;

    const mediaboxContent = document.getElementById('mediabox-content');
    mediaboxContent.innerHTML = `
        <div class="video-frame" style="display: block;">
            <div id="videoPreview"></div>
        </div>
        <div class="time-slider-wrapper" style="display: block;">
            <div class="time-slider-container" style="display: block; overflow-x: auto;">
                <div class="slider-track" style="width: 100%;">
                    <div class="slider-range"></div>
                    <div class="slider-left-thumb" id="startThumb"></div>
                    <div class="slider-right-thumb" id="endThumb"></div>
                    <div class="current-time-indicator" id="currentTimeIndicator"></div>
                </div>
            </div>
        </div>
        <div class="input-group">
            <input type="text" id="videoLink" placeholder="YouTube 링크" value="${videoLink}" onclick="this.value=''" oninput="handleVideoLinkInput()">
            <div class="plus-minus-buttons">
                <button onclick="zoomOut()">-</button>
                <button onclick="zoomIn()">+</button>
            </div>
        </div>
        <div class="action-buttons" style="display: flex;">
            <button class="media-select" style="float: left;" onclick="resetMediabox()">미디어 선택</button>
            <div style="float: right;">
                <button class="confirm" onclick="updateSlide('${slideId}')">수정</button>
            </div>
        </div>
    `;

    if (player) {
        player.destroy();
    }
    player = new YT.Player('videoPreview', {
        height: '300',
        width: '100%',
        videoId: videoId,
        events: {
            'onReady': function (event) {
                fetchVideoDuration(videoId).then((duration) => {
                    slide.videoDuration = duration;
                    videoDuration = duration;

                    // 초 단위로 변환
                    const startPercentage = (startTime / 1000 / duration) * 100;
                    const endPercentage = (endTime / 1000 / duration) * 100;

                    document.getElementById('startThumb').style.left = `${startPercentage}%`;
                    document.getElementById('endThumb').style.left = `${endPercentage}%`;

                    setupSlider(startPercentage, endPercentage);
                    updateSliderRange();
                    updateLayout();
                    playSegment(startTime / 1000, endTime / 1000); // 밀리초 -> 초로 변환
                }).catch(error => {
                    console.error('Error fetching video duration:', error);
                });
            },
            'onStateChange': onPlayerStateChange
        }
    });

    document.querySelectorAll('.slide').forEach(slide => slide.classList.remove('selected'));
    document.querySelector(`.slide[data-id="${slideId}"]`).classList.add('selected');
    document.querySelector('.empty-slide').classList.remove('selected');
    showMediabox();
}

function updateSlide(slideId) {
    const videoLinkInput = document.getElementById('videoLink');
    const videoLink = videoLinkInput.value.trim();
    let videoId, updatedUrl;

    if (videoLink) {
        ({ videoId, updatedUrl } = extractVideoId(videoLink));
    } else {
        if (player && player.getVideoData && player.getVideoData().video_id) {
            videoId = player.getVideoData().video_id;
            updatedUrl = `https://www.youtube.com/watch?v=${videoId}`;
        } else {
            return;
        }
    }

    const startThumb = document.getElementById('startThumb');
    const endThumb = document.getElementById('endThumb');
    const startTime = (parseFloat(startThumb.style.left) / 100) * videoDuration;
    const endTime = (parseFloat(endThumb.style.left) / 100) * videoDuration;

    const slideIndex = slideQueue.findIndex(slide => slide.id === slideId);
    if (slideIndex === -1) return;

    slideQueue[slideIndex] = {
        id: slideId,
        type: 'video',
        videoId,
        startTime: startTime * 1000,  // 초 -> 밀리초로 변환
        endTime: endTime * 1000,      // 초 -> 밀리초로 변환
        videoDuration: videoDuration * 1000,
        videoLink: updatedUrl
    };

    const slide = document.querySelector(`.slide[data-id="${slideId}"]`);
    slide.innerHTML = `
        <img src="https://img.youtube.com/vi/${videoId}/0.jpg" alt="Video Thumbnail" style="aspect-ratio: 16/9;">
        <div class="slide-close">&times;</div>
    `;
    slide.querySelector('.slide-close').addEventListener('click', () => {
        removeSlide(slideId);
    });

    makeSlidesSortable();

    const confirmButton = document.querySelector('.confirm');
    confirmButton.textContent = '확인';
    confirmButton.onclick = () => addSlide();

    document.querySelectorAll('.slide.selected').forEach(slide => {
        slide.classList.remove('selected');
    });
    document.querySelector('.empty-slide').classList.add('selected');

    forceUpdateSliderLayout();
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}분 ${remainingSeconds}초`;
}

function forceUpdateSliderLayout() {
    setTimeout(() => {
        const event = new Event('resize');
        window.dispatchEvent(event);
    }, 0);
}

function addEmptySlide() {
    const slidesContainer = document.querySelector('.slides');
    if (slidesContainer.querySelector('.empty-slide')) {
        return;
    }
    const emptySlide = document.createElement('div');
    emptySlide.className = 'empty-slide';
    emptySlide.innerHTML = '<div class="plus-sign">+</div>';
    emptySlide.addEventListener('click', () => {
        document.querySelectorAll('.slide, .empty-slide').forEach(slide => {
            slide.classList.remove('selected');
        });
        emptySlide.classList.add('selected');
        resetMediabox();
    });
    slidesContainer.appendChild(emptySlide);
}

function setupEmptySlide() {
    const emptySlide = document.querySelector('.empty-slide');
    if (emptySlide) {
        // 초기 로드 시 깜빡거림 적용
        emptySlide.classList.add('selected');

        // 깜빡거림이 끝나면 'selected' 클래스 제거 (1.5초 후)
        setTimeout(() => {
            emptySlide.classList.remove('selected');
        }, 4500);  // 깜빡거림 3번 (1.5초 * 3 = 4500ms)

        // 클릭 시에는 다시 깜빡거리지 않게 설정
        emptySlide.addEventListener('click', () => {
            document.querySelectorAll('.slide, .empty-slide').forEach(slide => {
                slide.classList.remove('selected');  // 다른 슬라이드의 선택 상태 해제
            });
            emptySlide.classList.add('selected');  // 빈 슬라이드를 선택, 하지만 깜빡거림 없음
            resetMediabox();
        });
    }
}

function showMediabox() {
    const mediabox = document.querySelector('.mediabox');
    if (mediabox) {
        mediabox.style.display = 'block';
    } else {
        console.error('Mediabox element not found');
    }
}

function hideMediabox() {
    const mediabox = document.querySelector('.mediabox');
    mediabox.style.display = 'none';
}

function showMediaButtons() {
    const mediaboxContent = document.getElementById('mediabox-content');
    mediaboxContent.innerHTML = `
        <div class="buttons">
            <button onclick="addVideoInputFields()">동영상</button>
            <button onclick="addImageInputFields()">이미지</button>
        </div>
    `;
    showMediabox();
}

function addSlide() {
    const videoLinkInput = document.getElementById('videoLink');
    const videoLink = videoLinkInput.value.trim();
    let videoId, updatedUrl;

    if (videoLink) {
        ({ videoId, updatedUrl } = extractVideoId(videoLink));
    } else {
        if (player && player.getVideoData && player.getVideoData().video_id) {
            videoId = player.getVideoData().video_id;
            updatedUrl = `https://www.youtube.com/watch?v=${videoId}`;
        } else {
            return;
        }
    }

    const startThumb = document.getElementById('startThumb');
    const endThumb = document.getElementById('endThumb');
    const startTime = (parseFloat(startThumb.style.left) / 100) * videoDuration * 1000;
    const endTime = (parseFloat(endThumb.style.left) / 100) * videoDuration * 1000;

    const slideId = createUniqueSlideId();
    
    // 슬라이드 큐에 새로운 슬라이드 추가
    slideQueue.push({
        id: slideId,
        type: 'video',
        videoId,
        startTime,
        endTime,
        videoDuration: videoDuration * 1000,
        videoLink: updatedUrl
    });

    console.log("Slide added. Current slideQueue:", slideQueue);
    
    // 슬라이드 요소를 DOM에 추가
    const slidesContainer = document.querySelector('.slides');
    const newSlide = document.createElement('div');
    newSlide.className = 'slide';
    newSlide.dataset.id = slideId;

    newSlide.innerHTML = `
        <img src="https://img.youtube.com/vi/${videoId}/0.jpg" alt="Video Thumbnail" style="aspect-ratio: 16/9;">
        <div class="slide-close">&times;</div>
    `;

    newSlide.addEventListener('click', () => handleSlideClick(slideId));

    const emptySlide = slidesContainer.querySelector('.empty-slide');
    if (emptySlide) {
        slidesContainer.insertBefore(newSlide, emptySlide);
    } else {
        slidesContainer.appendChild(newSlide);
    }

    newSlide.querySelector('.slide-close').addEventListener('click', (event) => {
        event.stopPropagation();
        removeSlide(slideId);
    });

    // 슬라이드가 추가된 후 DOM과 동기화
    syncSlideQueueWithDOM();
}

function openPreviewWindow() {
    const groupTitle = document.querySelector('.group-title input').value;
    const description = document.querySelector('.description textarea').value;

    console.log("Opening preview. Current slideQueue:", slideQueue);

    const slideQueueParam = encodeURIComponent(JSON.stringify(slideQueue));
    const groupTitleParam = encodeURIComponent(groupTitle);
    const descriptionParam = encodeURIComponent(description);

    const url = `preview.html?slideQueue=${slideQueueParam}&groupTitle=${groupTitleParam}&description=${descriptionParam}`;

    console.log("Opening preview window with URL:", url);

    window.open(url, 'previewWindow', 'width=800,height=860');
}

function addImageInputFields() {
    const mediaboxContent = document.getElementById('mediabox-content');
    mediaboxContent.innerHTML = `
        <div class="input-group">
            <input type="file" id="imageInput" accept="image/*">
            <input type="number" id="imageDuration" placeholder="Duration (seconds)" min="1" value="5">
        </div>
        <div class="action-buttons">
            <button class="media-select" onclick="resetMediabox()">미디어 선택</button>
            <div class="confirm-buttons">
                <button class="confirm" onclick="addImageSlide()">확인</button>
            </div>
        </div>
    `;
}

function addImageSlide() {
    const fileInput = document.getElementById('imageInput');
    const duration = parseInt(document.getElementById('imageDuration').value) || 5;

    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const imageUrl = e.target.result;
            const slideId = createUniqueSlideId();

            slideQueue.push({
                id: slideId,
                type: 'image',
                imageUrl,
                duration
            });

            const slidesContainer = document.querySelector('.slides');
            const newSlide = document.createElement('div');
            newSlide.className = 'slide';
            newSlide.dataset.id = slideId;
            newSlide.innerHTML = `
                <img src="${imageUrl}" alt="Uploaded Image" style="aspect-ratio: 16/9;">
                <div class="slide-close">&times;</div>
            `;

            newSlide.addEventListener('click', () => handleSlideClick(slideId));

            const emptySlide = slidesContainer.querySelector('.empty-slide');
            if (emptySlide) {
                slidesContainer.insertBefore(newSlide, emptySlide);
            } else {
                slidesContainer.appendChild(newSlide);
            }

            newSlide.querySelector('.slide-close').addEventListener('click', (event) => {
                event.stopPropagation();
                removeSlide(slideId);
            });

            makeSlidesSortable();

            if (!document.querySelector('.empty-slide')) {
                addEmptySlide();
            }
        };

        reader.readAsDataURL(file);
    } else {
        alert('이미지를 선택해주세요.');
    }
}

function removeSlide(slideId) {
    const slidesContainer = document.querySelector('.slides');
    const slide = slidesContainer.querySelector(`.slide[data-id="${slideId}"]`);
    if (slide) {
        slidesContainer.removeChild(slide);
    }

    slideQueue = slideQueue.filter(slide => slide.id !== slideId);

    makeSlidesSortable();

    if (slidesContainer.querySelectorAll('.slide').length === 0) {
        addEmptySlide();
    }
    
    console.log("Slide removed. Current slideQueue:", slideQueue); // 슬라이드 삭제 후 상태 출력
}

function makeSlidesSortable() {
    const slidesContainer = document.querySelector('.slides');
    const draggables = slidesContainer.querySelectorAll('.slide:not(.empty-slide)');

    draggables.forEach(draggable => {
        draggable.setAttribute('draggable', true);

        draggable.addEventListener('dragstart', () => {
            draggable.classList.add('dragging');
        });

        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
            updateSlideQueue();
        });
    });

    slidesContainer.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(slidesContainer, e.clientX);
        const draggable = document.querySelector('.dragging');
        if (afterElement == null || afterElement.classList.contains('empty-slide')) {
            slidesContainer.insertBefore(draggable, slidesContainer.querySelector('.empty-slide'));
        } else {
            slidesContainer.insertBefore(draggable, afterElement);
        }
    });
}

function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.slide:not(.dragging):not(.empty-slide)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateSlideQueue() {
    const slides = document.querySelectorAll('.slide:not(.empty-slide)');
    const newQueue = Array.from(slides).map(slide => {
        const slideId = slide.dataset.id;
        return slideQueue.find(item => item.id === slideId);
    }).filter(Boolean); // null/undefined 항목 제거
    
    slideQueue = newQueue;
    
    // 슬라이드 개수가 변경된 후에도 중복 체크 방지
    if (!isCheckingSlideQueue && slideQueue.length === 0) {
        checkSlideQueueEmpty();
    }
}

function updateSlideIndices() {
    const slides = document.querySelectorAll('.slide:not(.empty-slide)');
    slides.forEach((slide, index) => {
        slide.dataset.index = index;
    });
}

function selectSlide(slideId) {
    console.log("Selecting slide with id:", slideId);
    const slide = slideQueue.find(slide => slide.id === slideId);
    if (!slide) {
        console.error(`Slide with id ${slideId} not found.`);
        return;
    }
    document.querySelectorAll('.slide').forEach(slide => slide.classList.remove('selected'));
    document.querySelector(`.slide[data-id="${slideId}"]`).classList.add('selected');
    document.querySelector('.empty-slide').classList.remove('selected');
    editSlide(slideId);
}

function updateLayout() {
    const mediaboxContent = document.getElementById('mediabox-content');
    const videoFrame = document.querySelector('.video-frame');
    const timeSliderWrapper = document.querySelector('.time-slider-wrapper');
    const timeSliderContainer = document.querySelector('.time-slider-container');
    const sliderTrack = document.querySelector('.slider-track');

    if (videoFrame && timeSliderWrapper && timeSliderContainer && sliderTrack) {
        const videoWidth = videoFrame.offsetWidth;
        timeSliderWrapper.style.width = `${videoWidth}px`;
        timeSliderContainer.style.width = `${videoWidth}px`;
        sliderTrack.style.width = `${videoWidth - 40}px`; // 20px padding on each side
    }

    adjustSliderTrackWidth();
}

function validateInput(input, maxLength) {
    if (input.value.length > maxLength) {
        input.value = input.value.slice(0, maxLength);
    }
}

function autoExpand(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function updateTicks(zoomFactor) {
    const sliderTrack = document.querySelector('.slider-track');
    sliderTrack.style.setProperty('--zoom-factor', zoomFactor);
}

function playSlides() {
    // 슬라이드가 없을 경우 함수 종료
    if (checkSlideQueueEmpty()) return;

    let currentSlideIndex = 0;

    function playNextSlide() {
        if (currentSlideIndex < slideQueue.length) {
            const slide = slideQueue[currentSlideIndex];

            if (slide.type === 'video') {
                playVideoSlide(slide).then(() => {
                    currentSlideIndex++;
                    playNextSlide();
                });
            } else if (slide.type === 'image') {
                playImageSlide(slide).then(() => {
                    currentSlideIndex++;
                    playNextSlide();
                });
            }
        }
    }

    playNextSlide();
}

function playVideoSlide(slide) {
    return new Promise((resolve) => {
        if (player && player.getPlayerState() !== YT.PlayerState.CUED) {
            player.cueVideoById({
                videoId: slide.videoId,
                startSeconds: slide.startTime,
                endSeconds: slide.endTime
            });
        } else {
            player.loadVideoById({
                videoId: slide.videoId,
                startSeconds: slide.startTime,
                endSeconds: slide.endTime
            });
        }

        player.playVideo();

        const checkEndInterval = setInterval(() => {
            if (player.getCurrentTime() >= slide.endTime) {
                clearInterval(checkEndInterval);
                player.pauseVideo();
                resolve();
            }
        }, 1000);
    });
}

function playImageSlide(slide) {
    return new Promise((resolve) => {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-slide';
        imageContainer.innerHTML = `<img src="${slide.imageUrl}" alt="Image Slide" style="width: 100%;">`;
        document.body.appendChild(imageContainer);

        setTimeout(() => {
            document.body.removeChild(imageContainer);
            resolve();
        }, slide.duration * 1000);
    });
}

function getSlideQueue() {
    console.log("Current slideQueue:", slideQueue);
    return slideQueue;
}

// Functions imported in index.js
Object.assign(window, {
    addVideoInputFields,
    addImageInputFields,
    handleVideoLinkInput,
    zoomIn,
    zoomOut,
    addSlide,
    resetMediabox,
    setupEventListeners,
    setupSlider,
    playSegment,
    moveStart,
    moveEnd,
    resetTrackDisplay,
    fetchVideoDuration,
    adjustSliderTrackWidth,
    resetVideoFrame,
    checkLiveBroadcastStatus,
    makeSlidesSortable,
    updateSlideIndices,
    updateSlideQueue,
    selectSlide,
    addImageSlide,
    updateLayout,
    openPreviewWindow,
    validateInput,
    autoExpand,
    limitTextareaLines,
    updateSlide,
    formatDuration,
    playSlides,
    getSlideQueue,
    handleSlideClick,
    editSlide
});

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    if (window.YT) {
        onYouTubeIframeAPIReady();
    } else {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    window.addEventListener('load', () => {
        console.log("Page loaded. Current slideQueue:", slideQueue);
    
        if (!slideQueue || slideQueue.length === 0) {
            slideQueue = [];  // 슬라이드 큐가 없으면 빈 배열로 초기화
            console.log("Slide queue initialized as an empty array");
        }
    
        updateLayout();
    });

    window.addEventListener('resize', updateLayout);
});