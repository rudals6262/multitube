// 통합된 index.js 및 scripts.js

import './styles.css';

let player;
let slideQueue = [];
let currentZoomLevel = 1;
let currentEditingSlideIndex;
let videoDuration = 0;
let checkEndInterval;
let slideIdCounter = 0;

// 유일한 슬라이드 ID 생성
function createUniqueSlideId() {
    return `slide_${slideIdCounter++}`;
}

// 경고 처리 함수 통합
function handleSlideWarning() {
    const slidesContainer = document.querySelector('.slides');
    const slides = slidesContainer.querySelectorAll('.slide:not(.empty-slide)');
    if (slides.length === 0) {
        alert('추가된 슬라이드가 없습니다.');
    } else {
        console.log('슬라이드가 있습니다.');
    }
}

// DOMContentLoaded 이벤트 핸들러
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    hideMediabox();
    window.addEventListener('resize', updateLayout);
    addEmptySlide();
    setupEmptySlide();

    const previewButton = document.querySelector('.preview-btn');
    if (previewButton) {
        previewButton.removeEventListener('click', handleSlideWarning);
        previewButton.addEventListener('click', handleSlideWarning);
    }
});

// YouTube API 준비 함수
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

// 플레이어 준비시 호출
function onPlayerReady(event) {
    console.log("Player is ready");
    if (slideQueue[currentEditingSlideIndex]) {
        const startTime = slideQueue[currentEditingSlideIndex].startTime;
        event.target.seekTo(startTime);
    }
    setInterval(updateCurrentTimeIndicator, 100);
}

// 플레이어 상태 변경시 호출
function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        updateCurrentTimeIndicator();
    }
}

// 미디어박스 리셋 함수
function resetMediabox() {
    showMediaButtons();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    const buttons = document.querySelector('.buttons');
    if (buttons) {
        buttons.removeEventListener('click', handleButtonClick);
        buttons.addEventListener('click', handleButtonClick);
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
}

// 버튼 클릭 핸들러
function handleButtonClick(e) {
    if (e.target.textContent === '동영상') {
        addVideoInputFields();
    } else if (e.target.textContent === '이미지') {
        addImageInputFields();
    }
}

// 슬라이드 클릭 핸들러
function handleSlideClick(slideId) {
    console.log(`Slide clicked: ${slideId}`);
    selectSlide(slideId);
}

// 슬라이드 선택
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

// 슬라이드 추가
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
    const startTime = (parseFloat(startThumb.style.left) / 100) * videoDuration;
    const endTime = (parseFloat(endThumb.style.left) / 100) * videoDuration;

    const slideId = createUniqueSlideId();
    slideQueue.push({
        id: slideId,
        type: 'video',
        videoId,
        startTime,
        endTime,
        videoDuration,
        videoLink: updatedUrl
    });

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

    document.querySelectorAll('.slide').forEach(slide => slide.classList.remove('selected'));
    document.querySelector(`.slide[data-id="${slideId}"]`).classList.add('selected');
    document.querySelector('.empty-slide').classList.remove('selected');
}

// 슬라이드 삭제
function removeSlide(slideId) {
    const slidesContainer = document.querySelector('.slides');
    const slide = slidesContainer.querySelector(`.slide[data-id="${slideId}"]`);
    if (slide) {
        slidesContainer.removeChild(slide);
    }

    slideQueue = slideQueue.filter(slide => slide.id !== slideId);

    if (slidesContainer.querySelectorAll('.slide').length === 0) {
        addEmptySlide();
    }
}

// 슬라이드 수정
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

                    const startPercentage = (startTime / duration) * 100;
                    const endPercentage = (endTime / duration) * 100;

                    document.getElementById('startThumb').style.left = `${startPercentage}%`;
                    document.getElementById('endThumb').style.left = `${endPercentage}%`;

                    setupSlider(startPercentage, endPercentage);
                    updateSliderRange();
                    updateLayout();
                    playSegment(startTime, endTime);
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
}

// 슬라이드 업데이트
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
        startTime,
        endTime,
        videoDuration,
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

    document.querySelectorAll('.slide.selected').forEach(slide => {
        slide.classList.remove('selected');
    });
    document.querySelector('.empty-slide').classList.add('selected');
}

// 유튜브 API에서 동영상 길이를 가져오는 함수
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
                            adjustSliderTrackWidth(); 
                        }, 100);
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

// 슬라이더 설정 함수
function setupSlider(startPercentage = 0, endPercentage = 100) {
    const sliderTrack = document.querySelector('.slider-track');
    const sliderRange = document.querySelector('.slider-range');
    const currentTimeIndicator = document.getElementById('currentTimeIndicator');

    const startThumb = document.createElement('div');
    startThumb.className = 'slider-left-thumb';
    startThumb.id = 'startThumb';

    const endThumb = document.createElement('div');
    endThumb.className = 'slider-right-thumb';
    endThumb.id = 'endThumb';

    sliderTrack.appendChild(startThumb);
    sliderTrack.appendChild(endThumb);

    function setThumbPosition(thumb, percentage) {
        thumb.style.left = `${percentage}%`;
        updateSliderRange();
    }

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
        } else {
            if (percentage <= parseFloat(startThumb.style.left)) {
                percentage = parseFloat(startThumb.style.left) + (1 / videoDuration * 100);
            }
            thumb.style.left = `${percentage}%`;
            updateSliderRange();
        }
    }

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

    setThumbPosition(startThumb, startPercentage);
    setThumbPosition(endThumb, endPercentage);
    updateSliderRange();
    updateCurrentTimeIndicator();
}

// 슬라이더 범위 업데이트
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

// 현재 재생 시간 표시기 업데이트
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

// 레이아웃 업데이트 함수
function updateLayout() {
    const videoFrame = document.querySelector('.video-frame');
    const timeSliderWrapper = document.querySelector('.time-slider-wrapper');
    const sliderTrack = document.querySelector('.slider-track');

    if (videoFrame && timeSliderWrapper && sliderTrack) {
        const videoWidth = videoFrame.offsetWidth;
        timeSliderWrapper.style.width = `${videoWidth}px`;
        sliderTrack.style.width = `${videoWidth - 40}px`;
    }
}

// 동영상 ID 추출 함수
function extractVideoId(url) {
    let videoId = null;
    let updatedUrl = url;

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        videoId = match[2];
    }

    return { videoId, updatedUrl };
}

// 확대 및 축소 기능 추가
function zoomIn() {
    currentZoomLevel++;
    applyZoom();
}

function zoomOut() {
    if (currentZoomLevel > 1) {
        currentZoomLevel--;
        applyZoom();
    }
}

function applyZoom() {
    const sliderTrack = document.querySelector('.slider-track');
    const startThumb = document.getElementById('startThumb');
    const endThumb = document.getElementById('endThumb');
    const currentTimeIndicator = document.getElementById('currentTimeIndicator');

    const zoomFactor = 2 ** (currentZoomLevel - 1);

    sliderTrack.style.width = `${sliderTrack.offsetWidth * zoomFactor}px`;

    [startThumb, endThumb, currentTimeIndicator].forEach(element => {
        if (element) {
            element.style.transform = 'translateY(-50%)';
        }
    });

    updateSliderRange();
}
