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
    getSlideQueue
} from './scripts.js';

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    if (window.YT) {
        onYouTubeIframeAPIReady();
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
        getSlideQueue
    });

    const previewButton = document.querySelector('.preview-btn');
    previewButton.removeEventListener('click', handlePreviewClick);
    previewButton.addEventListener('click', handlePreviewClick);

    document.querySelector('.media-select').addEventListener('click', resetMediabox);

    document.querySelector('.group-title input').addEventListener('input', (e) => {
        validateInput(e.target, 50);
    });

    document.querySelector('.description textarea').addEventListener('input', (e) => {
        validateInput(e.target, 200);
        autoExpand(e.target);
        limitTextareaLines(e.target, 5);
    });

    window.addEventListener('resize', updateLayout);

    updateLayout();
});

function handlePreviewClick() {
    const slidesContainer = document.querySelector('.slides');
    const slides = slidesContainer.querySelectorAll('.slide[data-slide]');
    if (slides.length === 0) {
        alert('추가된 슬라이드가 없습니다.');
        return;
    }
    openPreviewWindow();
}

function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API is ready');
}
