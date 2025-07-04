console.log('🎬 YouTube Caption Generator content script loaded!');

// Function to extract video data from the current page
function extractVideoData() {
    console.log('=== EXTRACTING VIDEO DATA ===');
    console.log('URL:', window.location.href);
    console.log('Page title:', document.title);
    
    let title = document.title;
    if (title && title.includes(' - YouTube')) {
        title = title.replace(' - YouTube', '').trim();
    }
    
    const result = {
        title: title || 'No title found',
        description: 'Extracted from YouTube page',
        url: window.location.href,
        timestamp: new Date().toISOString(),
        isShort: window.location.href.includes('/shorts/'),
        success: true
    };
    
    console.log('✅ Video data extracted:', result);
    return result;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Content script received message:', request);
    
    if (request.action === 'getVideoData') {
        try {
            const videoData = extractVideoData();
            console.log('📤 Sending video data back:', videoData);
            sendResponse({ success: true, data: videoData });
        } catch (error) {
            console.error('❌ Error extracting video data:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    return true; // Keep the message channel open for async response
});

// Also try to extract data when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, extracting video data...');
    extractVideoData();
});

// And when the page is fully loaded
window.addEventListener('load', () => {
    console.log('🔄 Page fully loaded, extracting video data...');
    extractVideoData();
});