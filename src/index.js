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

    const previewButton = document.querySelector('.preview-btn');
    if (previewButton) {
        previewButton.removeEventListener('click', handlePreviewClick);
        previewButton.addEventListener('click', handlePreviewClick);
    }

    const mediaSelectButton = document.querySelector('.media-select');
    if (mediaSelectButton) {
        mediaSelectButton.addEventListener('click', resetMediabox);
    }

    const groupTitleInput = document.querySelector('.group-title input');
    if (groupTitleInput) {
        groupTitleInput.addEventListener('input', (e) => {
            validateInput(e.target, 50);
        });
    }

    const descriptionTextarea = document.querySelector('.description textarea');
    if (descriptionTextarea) {
        descriptionTextarea.addEventListener('input', (e) => {
            validateInput(e.target, 200);
            autoExpand(e.target);
            limitTextareaLines(e.target, 5);
        });
    }

    window.addEventListener('resize', updateLayout);

    updateLayout();

    // 빈 슬라이드에 .slide.selected 클래스 깜빡이게 하기
    const emptySlide = document.querySelector('.empty-slide');
    if (emptySlide) {
        emptySlide.classList.add('selected');
        
        // 깜빡거림 3회 완료 후 효과 제거
        setTimeout(() => {
            emptySlide.classList.remove('selected');
            emptySlide.querySelector('.outline-effect').style.animation = 'none';
        }, 4500); // 1.5s * 3번 깜빡인 후

        emptySlide.addEventListener('click', () => {
            emptySlide.classList.remove('selected');
            emptySlide.querySelector('.outline-effect').style.animation = 'none';
            document.querySelectorAll('.slide').forEach(slide => slide.classList.remove('selected'));
            emptySlide.classList.add('selected');
            resetMediabox();
        });
    }
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
