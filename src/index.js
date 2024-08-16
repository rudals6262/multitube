import './styles.css';
import {
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
    handleSlideClick, // 추가
    editSlide // 추가
} from './scripts.js';

let player;

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    if (window.YT) {
        onYouTubeIframeAPIReady();
    } else {
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // 빈 슬라이드에 .empty-slide.selected 클래스 깜빡이게 하기
    const emptySlide = document.querySelector('.empty-slide');
    if (emptySlide) {
        emptySlide.classList.add('selected');
        emptySlide.classList.add('blink-effect');

        setTimeout(() => {
            emptySlide.classList.remove('blink-effect');
        }, 4500); // 1.5초(깜빡거림 1회) * 3회 = 4.5초 후에 효과 제거
    }
    
    // 기존 코드 유지
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

    // 기타 이벤트 리스너 설정 코드 (기존 코드 유지)
});

function handlePreviewClick() {
    const slidesContainer = document.querySelector('.slides');
    const slides = slidesContainer.querySelectorAll('.slide:not(.empty-slide)');
    if (slides.length === 0) {
        alert('추가된 슬라이드가 없습니다.');
        return;
    }
    openPreviewWindow();
}

function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API is ready');
    player = new YT.Player('videoPreview', {
        height: '300',
        width: '100%',
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
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
