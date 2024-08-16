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

    // 빈 슬라이드에 .empty-slide.selected 아웃라인 3번만 blink 애니메이션 적용
    const emptySlide = document.querySelector('.empty-slide');

    if (emptySlide) {
        emptySlide.classList.add('selected'); // empty-slide에 selected 추가

        let blinkCount = 0;
        const blinkInterval = setInterval(() => {
            blinkCount++;
            if (blinkCount >= 3) {
                clearInterval(blinkInterval);
                emptySlide.classList.remove('selected');
                emptySlide.classList.add('blink-stop');
            }
        }, 1500); // 1.5초마다 blink 애니메이션

        emptySlide.addEventListener('click', () => {
            clearInterval(blinkInterval); // 클릭하면 즉시 애니메이션 멈추기
            emptySlide.classList.remove('selected');
            emptySlide.classList.add('blink-stop');
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
