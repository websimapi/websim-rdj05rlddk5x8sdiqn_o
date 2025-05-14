document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('url-input');
    const loadSiteBtn = document.getElementById('load-site');
    const analyzeBtn = document.getElementById('analyze');
    const findPrivacyBtn = document.getElementById('find-privacy');
    const siteFrame = document.getElementById('site-frame');
    const overlay = document.getElementById('overlay');
    const logElement = document.getElementById('log');
    
    function logMessage(message) {
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
    }
    
    loadSiteBtn.addEventListener('click', function() {
        const url = urlInput.value.trim();
        if (!url) {
            logMessage('Error: Please enter a URL');
            return;
        }
        
        // Try to load the site in the iframe
        logMessage(`Attempting to load: ${url}`);
        siteFrame.src = url;
        
        // Show loading indicator
        overlay.innerHTML = '<h3>Loading site...</h3>';
        
        // Check if the site loaded or was blocked
        siteFrame.onload = function() {
            try {
                // This will fail for cross-origin sites
                const title = siteFrame.contentDocument.title;
                logMessage(`Successfully loaded: ${title}`);
                overlay.style.display = 'none';
            } catch (error) {
                logMessage('Error: Cross-Origin access blocked by browser');
                overlay.innerHTML = `
                    <h3>Cross-Origin Access Blocked</h3>
                    <p>Cannot access the content of ${url} due to browser security restrictions.</p>
                    <p>This demonstrates why the iframe approach won't work for a privacy agent.</p>
                `;
            }
        };
    });
    
    analyzeBtn.addEventListener('click', function() {
        try {
            // This will fail for cross-origin sites
            const links = siteFrame.contentDocument.querySelectorAll('a');
            logMessage(`Found ${links.length} links on the page`);
            
            // Look for privacy-related links
            let privacyLinks = [];
            links.forEach(link => {
                const text = link.textContent.toLowerCase();
                if (text.includes('privacy') || text.includes('data') || text.includes('account')) {
                    privacyLinks.push(link.href);
                }
            });
            
            if (privacyLinks.length > 0) {
                logMessage(`Found ${privacyLinks.length} privacy-related links`);
                privacyLinks.forEach(link => {
                    logMessage(`- ${link}`);
                });
            } else {
                logMessage('No privacy-related links found.');
            }
        } catch (error) {
            logMessage(`Analysis failed: ${error.message}`);
            logMessage('Cannot analyze cross-origin content due to browser security restrictions.');
        }
    });
    
    findPrivacyBtn.addEventListener('click', function() {
        logMessage('Searching for privacy options...');
        try {
            // This will fail for cross-origin sites
            const bodyText = siteFrame.contentDocument.body.textContent.toLowerCase();
            const privacyTerms = ['privacy', 'personal data', 'delete account', 'gdpr', 'ccpa', 'opt out'];
            
            let found = false;
            privacyTerms.forEach(term => {
                if (bodyText.includes(term)) {
                    logMessage(`Found reference to "${term}" on page`);
                    found = true;
                }
            });
            
            if (!found) {
                logMessage('No obvious privacy terms found on this page.');
            }
        } catch (error) {
            logMessage(`Privacy search failed: ${error.message}`);
            logMessage('This is why a desktop application with browser automation would be required.');
        }
    });
    
    // Initial log message
    logMessage('Privacy Agent Demo initialized.');
    logMessage('This demo shows why a browser-based solution has significant limitations.');
    logMessage('A Node.js desktop app with a browser automation tool like Puppeteer would be required.');
});