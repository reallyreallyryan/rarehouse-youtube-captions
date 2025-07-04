class YouTubeCaptionGenerator {
    constructor() {
        this.selectedPlatform = 'instagram';
        this.videoData = null;
        this.initializeEventListeners();
        this.loadVideoData();
        this.loadApiKey();
    }

    initializeEventListeners() {
        // Platform selection
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedPlatform = e.target.dataset.platform;
            });
        });

        // Generate button
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateCaption();
        });

        // Copy button
        document.getElementById('copyBtn').addEventListener('click', () => {
            this.copyToClipboard();
        });

        // Save API key
        document.getElementById('apiKey').addEventListener('input', (e) => {
            this.saveApiKey(e.target.value);
        });
    }

    async loadVideoData() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Debug info
            this.updateDebugInfo(`Current tab: ${tab?.url}`);
            console.log('=== LOAD VIDEO DATA DEBUG ===');
            console.log('Tab:', tab);
            console.log('Tab URL:', tab?.url);
            console.log('Tab ID:', tab?.id);
            
            if (tab && tab.url && (tab.url.includes('youtube.com/watch') || tab.url.includes('youtube.com/shorts'))) {
                console.log('YouTube page detected:', tab.url);
                this.updateDebugInfo('YouTube page detected, sending message to content script...');
                
                try {
                    // Send message to content script
                    console.log('Sending message to content script...');
                    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoData' });
                    
                    console.log('Response from content script:', response);
                    
                    if (response && response.success && response.data) {
                        this.videoData = response.data;
                        console.log('Video data loaded:', this.videoData);
                        this.updateVideoInfo();
                        this.updateDebugInfo('Video data extracted successfully via content script');
                    } else {
                        console.log('No data from content script:', response);
                        this.updateDebugInfo('Content script returned no data');
                        // Try again after a delay
                        setTimeout(() => this.loadVideoData(), 2000);
                    }
                    
                } catch (messageError) {
                    console.error('Message sending error:', messageError);
                    this.updateDebugInfo(`Message error: ${messageError.message}`);
                    this.showError(`Failed to communicate with content script: ${messageError.message}`);
                }
                
            } else {
                console.log('Not a YouTube video page:', tab?.url);
                this.updateDebugInfo('Not on a YouTube video page');
                document.getElementById('videoTitle').textContent = 'Please navigate to a YouTube video or Short';
                document.getElementById('videoUrl').textContent = 'Extension works on youtube.com/watch or youtube.com/shorts pages';
            }
        } catch (error) {
            console.error('Error loading video data:', error);
            this.updateDebugInfo(`Error: ${error.message}`);
            this.showError(`Error loading video data: ${error.message}`);
        }
    }

    updateVideoInfo() {
        if (this.videoData) {
            const videoType = this.videoData.isShort ? '🩳 YouTube Short' : '🎬 YouTube Video';
            document.getElementById('videoTitle').innerHTML = `${videoType}<br><strong>${this.videoData.title}</strong>`;
            document.getElementById('videoUrl').textContent = this.videoData.url;
        } else {
            document.getElementById('videoTitle').textContent = 'No video detected';
            document.getElementById('videoUrl').textContent = 'Please navigate to a YouTube video or Short';
        }
    }

    updateDebugInfo(message) {
        const debugDiv = document.getElementById('debugInfo');
        debugDiv.textContent = message;
    }

    async generateCaption() {
        const apiKey = document.getElementById('apiKey').value;
        if (!apiKey) {
            this.showError('Please enter your OpenAI API key');
            return;
        }

        if (!this.videoData) {
            this.showError('Please navigate to a YouTube video first');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const prompt = this.createPrompt();
            const caption = await this.callOpenAI(apiKey, prompt);
            this.showResult(caption);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    createPrompt() {
        const platformPrompts = {
            instagram: `Create an engaging Instagram caption for this video. Include relevant hashtags and make it visually appealing with emojis. Keep it under 2200 characters.`,
            twitter: `Create a Twitter thread (2-3 tweets) about this video. Make it engaging and shareable. Include relevant hashtags.`,
            linkedin: `Create a professional LinkedIn post about this video. Make it thought-provoking and industry-relevant. Include relevant hashtags.`,
            tiktok: `Create a TikTok description for this video. Make it trendy, fun, and include popular hashtags. Keep it under 150 characters.`
        };

        return `${platformPrompts[this.selectedPlatform]}

Video Title: ${this.videoData.title}
Video Description: ${this.videoData.description}
Video URL: ${this.videoData.url}

Please create an engaging, platform-specific caption that would help this content get maximum engagement.`;
    }

    async callOpenAI(apiKey, prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    showResult(caption) {
        document.getElementById('captionText').value = caption;
        document.getElementById('result').style.display = 'block';
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
        document.getElementById('generateBtn').disabled = show;
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    hideError() {
        document.getElementById('error').style.display = 'none';
    }

    copyToClipboard() {
        const textarea = document.getElementById('captionText');
        textarea.select();
        document.execCommand('copy');
        
        const copyBtn = document.getElementById('copyBtn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }

    saveApiKey(key) {
        chrome.storage.sync.set({ openaiApiKey: key });
    }

    loadApiKey() {
        chrome.storage.sync.get(['openaiApiKey'], (result) => {
            if (result.openaiApiKey) {
                document.getElementById('apiKey').value = result.openaiApiKey;
            }
        });
    }
}

// Initialize the extension when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeCaptionGenerator();
});