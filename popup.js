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

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshVideoData();
        });

        // Save API key
        document.getElementById('apiKey').addEventListener('input', (e) => {
            this.saveApiKey(e.target.value);
        });
    }

    async refreshVideoData() {
        const refreshBtn = document.getElementById('refreshBtn');
        
        // Add spinning animation
        refreshBtn.classList.add('spinning');
        refreshBtn.disabled = true;
        
        // Clear current data
        this.videoData = null;
        document.getElementById('result').style.display = 'none';
        document.getElementById('captionText').value = '';
        this.hideError();
        
        // Show loading state
        document.getElementById('videoTitle').innerHTML = '🔄 Checking for video...';
        document.getElementById('videoUrl').textContent = 'Please wait...';
        
        try {
            // Reload video data
            await this.loadVideoData();
            
            // Show success feedback
            const toast = document.createElement('div');
            toast.textContent = '✅ Video info refreshed!';
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(76, 175, 80, 0.9);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-size: 14px;
                z-index: 1000;
            `;
            document.body.appendChild(toast);
            
            setTimeout(() => toast.remove(), 2000);
            
        } catch (error) {
            console.error('Error refreshing:', error);
            this.showError('Failed to refresh video data');
        } finally {
            // Remove spinning animation
            setTimeout(() => {
                refreshBtn.classList.remove('spinning');
                refreshBtn.disabled = false;
            }, 500);
        }
    }

    async loadVideoData() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url && (tab.url.includes('youtube.com/watch') || tab.url.includes('youtube.com/shorts'))) {
                // Get basic video data first
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoData' });
                
                if (response && response.success && response.data) {
                    this.videoData = response.data;
                    
                    // Extract video ID
                    const videoIdMatch = tab.url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/))([^&\n?#]+)/);
                    this.videoData.videoId = videoIdMatch ? videoIdMatch[1] : null;
                    
                    // Try to get channel name with injected script
                    try {
                        const channelResult = await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: () => {
                                // Multiple selectors to find channel name
                                const selectors = [
                                    'ytd-channel-name a',
                                    '#channel-name a',
                                    '.ytd-channel-name a',
                                    '#upload-info #channel-name a',
                                    '#owner #channel-name a',
                                    'ytd-video-owner-renderer #channel-name a'
                                ];
                                
                                for (const selector of selectors) {
                                    const element = document.querySelector(selector);
                                    if (element && element.textContent) {
                                        return element.textContent.trim();
                                    }
                                }
                                return null;
                            }
                        });
                        
                        if (channelResult && channelResult[0] && channelResult[0].result) {
                            this.videoData.channelName = channelResult[0].result;
                        }
                    } catch (e) {
                        console.log('Could not get channel name:', e);
                    }
                    
                    this.updateVideoInfo();
                }
            } else {
                document.getElementById('videoTitle').innerHTML = '🚫 Please navigate to a YouTube video or Short';
                document.getElementById('videoUrl').textContent = 'Extension works on youtube.com/watch or youtube.com/shorts pages';
            }
        } catch (error) {
            console.error('Error loading video data:', error);
            this.showError(`Error loading video data: ${error.message}`);
        }
    }

    updateVideoInfo() {
        if (this.videoData) {
            const videoType = this.videoData.isShort ? '🩳 Short' : '🎬 Video';
            const channelInfo = this.videoData.channelName ? `<small style="opacity: 0.8">by ${this.videoData.channelName}</small>` : '';
            
            document.getElementById('videoTitle').innerHTML = `
                ${videoType}: <strong>${this.videoData.title}</strong><br>
                ${channelInfo}
            `;
            document.getElementById('videoUrl').textContent = this.videoData.url;
        }
    }

    createSimplePrompt() {
        const platformInstructions = {
            instagram: {
                instruction: `Write an Instagram caption for this video. Make it engaging, use emojis strategically, and include 15-20 relevant hashtags at the end. Keep it conversational and authentic. No explanations, just the caption.`,
                example: `Just learned this life-changing hip recovery technique! 🤯 

If you're dealing with hip pain or just had an injection, save this for later 📌

The key is gentle movement - not complete rest like I thought! Walking actually helps distribute the medication better 🚶‍♀️

Drop a ❤️ if this helped you!

#hiprecovery #healthtips #physiotherapy #jointpain #hippain #wellness #healthylifestyle #painrelief #recovery #physiotherapist #movement #healingjourney #healthadvice #selfcare #injectionrecovery #mobilitywork #painmanagement #healthyliving #fitnessmotivation #wellnessjourney`
            },
            
            youtube: {
                instruction: `Write a YouTube title and description. Title should be catchy and under 100 characters. Description should be engaging, include key points, and have natural keywords. Format as:
TITLE: [your title]
DESCRIPTION: [your description]`,
                example: `TITLE: 5 Hip Injection Aftercare Tips Most People Miss! 

DESCRIPTION: Getting a hip injection? Don't make these common recovery mistakes! In this video, I share the essential aftercare tips that can make or break your recovery. From the surprising truth about movement to what you should avoid in the first 48 hours - this guide covers everything you need for a smooth recovery. Whether it's your first injection or you're looking to improve your aftercare routine, these evidence-based tips will help you heal faster and more effectively. Remember to always consult with your healthcare provider for personalized advice!`
            },
            
            tiktok: {
                instruction: `Write a TikTok caption. Make it trendy, punchy, and under 150 characters with 5-7 hashtags. Use Gen-Z language naturally. No explanations, just the caption.`,
                example: `POV: you finally find aftercare tips that actually work 😭✨ #hipinjection #recoverymode #healthtok #injectiontips #painrelief #fypシ`
            },
            
            linkedin: {
                instruction: `Write a LinkedIn post. Professional but personable tone. Share insights, add value, and end with a thought-provoking question. No explanations, just the post.`,
                example: `Had an interesting conversation with a patient today about hip injection aftercare.

It's surprising how many people think complete rest is the answer. In reality, gentle movement is often more beneficial for recovery - it helps distribute the medication and prevents stiffness.

Here are the top 5 things I recommend:
→ Light walking within 24 hours
→ Ice for 20 minutes every few hours
→ Avoid high-impact activities for 48-72 hours
→ Stay hydrated to help your body process the medication
→ Listen to your body - some discomfort is normal, severe pain isn't

The medical field is constantly evolving, and patient education remains one of our most powerful tools.

What's one piece of medical advice that surprised you when you first learned it?

#Healthcare #PatientCare #MedicalEducation #Physiotherapy #HealthAndWellness`
            }
        };

        const platform = platformInstructions[this.selectedPlatform];
        
        return `${platform.instruction}

Video Title: ${this.videoData.title}
Channel: ${this.videoData.channelName || 'YouTube Channel'}
Type: ${this.videoData.isShort ? 'YouTube Short' : 'YouTube Video'}

Example of the style I want:
${platform.example}

Now write a caption for this video:`;
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
            const prompt = this.createSimplePrompt();
            const caption = await this.callOpenAI(apiKey, prompt);
            this.showResult(caption);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async callOpenAI(apiKey, prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo', // Back to 3.5 for speed and cost
                messages: [
                    {
                        role: 'system',
                        content: 'You are a social media expert who writes engaging, platform-specific captions. You only output the caption itself, no explanations or meta-commentary.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.8,
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    showResult(caption) {
        document.getElementById('captionText').value = caption;
        document.getElementById('result').style.display = 'block';
        
        // Auto-select for easy copying
        document.getElementById('captionText').select();
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
        document.getElementById('generateBtn').disabled = show;
        if (show) {
            document.getElementById('generateBtn').innerHTML = '⏳ Generating...';
        } else {
            document.getElementById('generateBtn').innerHTML = '✨ Generate Caption';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = `❌ ${message}`;
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
        
        // Also show a quick toast
        const toast = document.createElement('div');
        toast.textContent = 'Caption copied to clipboard!';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            toast.remove();
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