console.log('🎬 YouTube Caption Generator content script loaded!');

// Function to extract comprehensive video data
function extractVideoData() {
    console.log('=== EXTRACTING ENHANCED VIDEO DATA ===');
    
    // Basic info
    let title = document.title;
    if (title && title.includes(' - YouTube')) {
        title = title.replace(' - YouTube', '').trim();
    }
    
    // Try to get video description
    let description = '';
    const descriptionElements = [
        '#description-inner',
        'ytd-video-secondary-info-renderer #description',
        '.ytd-expander #description',
        'yt-formatted-string.content'
    ];
    
    for (const selector of descriptionElements) {
        const element = document.querySelector(selector);
        if (element) {
            description = element.innerText || element.textContent || '';
            if (description) break;
        }
    }
    
    // Get video duration
    let duration = '';
    const durationElement = document.querySelector('.ytp-time-duration') || 
                           document.querySelector('span.ytp-time-duration');
    if (durationElement) {
        duration = durationElement.textContent;
    }
    
    // Get view count
    let viewCount = '';
    const viewElements = [
        '.ytd-video-view-count-renderer .view-count',
        'ytd-video-view-count-renderer',
        'span.view-count'
    ];
    
    for (const selector of viewElements) {
        const element = document.querySelector(selector);
        if (element) {
            viewCount = element.innerText || element.textContent || '';
            if (viewCount) break;
        }
    }
    
    // Get upload date
    let uploadDate = '';
    const dateElement = document.querySelector('#info-strings yt-formatted-string') ||
                       document.querySelector('.ytd-video-primary-info-renderer #info-text');
    if (dateElement) {
        uploadDate = dateElement.textContent || '';
    }
    
    // Get hashtags if present
    const hashtags = [];
    document.querySelectorAll('a.yt-simple-endpoint[href^="/hashtag/"]').forEach(tag => {
        const hashtag = tag.textContent.trim();
        if (hashtag && !hashtags.includes(hashtag)) {
            hashtags.push(hashtag);
        }
    });
    
    // Check if comments are enabled
    const commentsEnabled = !document.querySelector('ytd-message-renderer');
    
    // Get thumbnail URL
    let thumbnailUrl = '';
    const metaThumbnail = document.querySelector('meta[property="og:image"]');
    if (metaThumbnail) {
        thumbnailUrl = metaThumbnail.content;
    }
    
    const result = {
        title: title || 'No title found',
        description: description.slice(0, 500) || 'No description available', // First 500 chars
        url: window.location.href,
        timestamp: new Date().toISOString(),
        isShort: window.location.href.includes('/shorts/'),
        duration: duration,
        viewCount: viewCount,
        uploadDate: uploadDate,
        hashtags: hashtags,
        commentsEnabled: commentsEnabled,
        thumbnailUrl: thumbnailUrl,
        success: true
    };
    
    console.log('✅ Enhanced video data extracted:', result);
    return result;
}

// Function to check if captions/transcript is available
async function checkTranscriptAvailability() {
    try {
        // Look for the caption button
        const captionButton = document.querySelector('.ytp-subtitles-button');
        if (captionButton) {
            const ariaPressed = captionButton.getAttribute('aria-pressed');
            return ariaPressed !== null;
        }
        return false;
    } catch (error) {
        console.error('Error checking transcript availability:', error);
        return false;
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Content script received message:', request);
    
    if (request.action === 'getVideoData') {
        try {
            const videoData = extractVideoData();
            checkTranscriptAvailability().then(hasTranscript => {
                videoData.hasTranscript = hasTranscript;
                console.log('📤 Sending enhanced video data back:', videoData);
                sendResponse({ success: true, data: videoData });
            });
        } catch (error) {
            console.error('❌ Error extracting video data:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true; // Keep message channel open for async response
    }
});

// Observe for dynamic content changes (YouTube is a SPA)
const observer = new MutationObserver((mutations) => {
    // Check if URL changed
    if (window.location.href.includes('youtube.com/watch') || 
        window.location.href.includes('youtube.com/shorts')) {
        console.log('📍 YouTube navigation detected');
    }
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Initial extraction when script loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, extracting video data...');
    extractVideoData();
});

// Extract when page is fully loaded
window.addEventListener('load', () => {
    console.log('🔄 Page fully loaded, extracting video data...');
    extractVideoData();
});