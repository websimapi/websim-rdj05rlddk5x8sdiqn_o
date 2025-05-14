document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('url-input');
    const loadSiteBtn = document.getElementById('load-site');
    const analyzeBtn = document.getElementById('analyze');
    const findPrivacyBtn = document.getElementById('find-privacy');
    const siteFrame = document.getElementById('site-frame');
    const overlay = document.getElementById('overlay');
    const logElement = document.getElementById('log');
    
    // List of CORS proxies to try
    const corsProxies = [
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/',
        'https://api.allorigins.win/raw?url=',
        'https://api.codetabs.com/v1/proxy/?quest=',
        'https://cors-proxy.htmldriven.com/?url=',
        'https://crossorigin.me/',
        'https://thingproxy.freeboard.io/fetch/',
        'https://yacdn.org/proxy/',
        'https://cors.bridged.cc/',
        'https://proxy.cors.sh/'
    ];
    
    let currentProxyIndex = 0;
    let fetchedContent = null;
    
    function logMessage(message) {
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
    }
    
    // Function to try fetching via proxy
    async function fetchViaProxy(url, proxyIndex = 0) {
        if (proxyIndex >= corsProxies.length) {
            logMessage('All proxies failed. Unable to bypass CORS restrictions.');
            return null;
        }
        
        const proxyUrl = corsProxies[proxyIndex] + encodeURIComponent(url);
        logMessage(`Trying proxy ${proxyIndex + 1}/${corsProxies.length}: ${corsProxies[proxyIndex]}`);
        
        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const html = await response.text();
            logMessage(`Successfully fetched content via proxy ${proxyIndex + 1}`);
            return html;
        } catch (error) {
            logMessage(`Proxy ${proxyIndex + 1} failed: ${error.message}`);
            // Try next proxy
            return fetchViaProxy(url, proxyIndex + 1);
        }
    }
    
    // Function to inject content into a sandbox iframe
    function injectContent(html) {
        // Create a sandbox frame to hold the content
        const sandboxFrame = document.createElement('iframe');
        sandboxFrame.style.width = '100%';
        sandboxFrame.style.height = '100%';
        sandboxFrame.style.border = 'none';
        sandboxFrame.sandbox = 'allow-same-origin';
        
        // Clear current content
        while (siteFrame.parentNode.firstChild) {
            siteFrame.parentNode.removeChild(siteFrame.parentNode.firstChild);
        }
        
        // Add the new frame
        siteFrame.parentNode.appendChild(sandboxFrame);
        
        // Now write content to it
        setTimeout(() => {
            try {
                const frameDoc = sandboxFrame.contentDocument;
                frameDoc.open();
                frameDoc.write(html);
                frameDoc.close();
                logMessage('Content injected into sandbox frame');
                overlay.style.display = 'none';
                fetchedContent = frameDoc;
            } catch (error) {
                logMessage(`Error injecting content: ${error.message}`);
                overlay.innerHTML = `
                    <h3>Content Injection Failed</h3>
                    <p>Unable to inject content into sandbox: ${error.message}</p>
                `;
                fetchedContent = null;
            }
        }, 100);
    }
    
    // Improved load site function with proxy support
    loadSiteBtn.addEventListener('click', async function() {
        const url = urlInput.value.trim();
        if (!url) {
            logMessage('Error: Please enter a URL');
            return;
        }
        
        logMessage(`Attempting to load: ${url}`);
        overlay.innerHTML = '<h3>Loading site...</h3><p>Trying direct iframe first...</p>';
        
        // First try direct iframe (will likely fail for cross-origin)
        siteFrame.src = url;
        
        // Set a flag to track if direct loading succeeded
        let directLoadSucceeded = false;
        
        // Check if direct iframe load works
        siteFrame.onload = function() {
            try {
                // This will fail for cross-origin sites
                const title = siteFrame.contentDocument.title;
                logMessage(`Successfully loaded directly: ${title}`);
                overlay.style.display = 'none';
                directLoadSucceeded = true;
                fetchedContent = siteFrame.contentDocument;
            } catch (error) {
                if (!directLoadSucceeded) {
                    logMessage('Direct iframe loading failed due to CORS. Trying proxies...');
                    overlay.innerHTML = '<h3>Loading site via proxy...</h3><p>Direct access blocked, trying CORS proxies as fallback...</p>';
                    
                    // Try using proxies to fetch the content
                    fetchViaProxy(url).then(html => {
                        if (html) {
                            injectContent(html);
                        } else {
                            overlay.innerHTML = `
                                <h3>CORS Bypass Failed</h3>
                                <p>All proxy attempts failed. Unable to load content from ${url}</p>
                                <p>This demonstrates the significant challenges in accessing cross-origin content.</p>
                            `;
                        }
                    });
                }
            }
        };
    });
    
    // Updated analyze function to work with proxied content
    analyzeBtn.addEventListener('click', function() {
        logMessage('Analyzing page content...');
        
        try {
            let links = [];
            let bodyText = '';
            
            // Try to access content depending on how it was loaded
            if (fetchedContent) {
                try {
                    links = fetchedContent.querySelectorAll('a');
                    bodyText = fetchedContent.body.textContent.toLowerCase();
                } catch (error) {
                    logMessage(`Error accessing fetched content: ${error.message}`);
                    throw new Error('Cannot access content structure');
                }
            } else {
                // Try direct iframe access (will fail for cross-origin)
                links = siteFrame.contentDocument.querySelectorAll('a');
                bodyText = siteFrame.contentDocument.body.textContent.toLowerCase();
            }
            
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
            
            // Also search text for privacy terms
            const privacyTerms = ['privacy', 'personal data', 'delete account', 'gdpr', 'ccpa', 'opt out'];
            privacyTerms.forEach(term => {
                if (bodyText.includes(term)) {
                    logMessage(`Found reference to "${term}" in page content`);
                }
            });
            
        } catch (error) {
            logMessage(`Analysis failed: ${error.message}`);
            logMessage('Cannot analyze content due to security restrictions or failed proxy.');
        }
    });
    
    // Updated find privacy function to work with proxied content
    findPrivacyBtn.addEventListener('click', function() {
        logMessage('Searching for privacy options...');
        try {
            let bodyText = '';
            
            // Try to access content depending on how it was loaded
            if (fetchedContent) {
                try {
                    bodyText = fetchedContent.body.textContent.toLowerCase();
                } catch (error) {
                    logMessage(`Error accessing fetched content: ${error.message}`);
                    throw new Error('Cannot access content text');
                }
            } else {
                // Try direct iframe access (will fail for cross-origin)
                bodyText = siteFrame.contentDocument.body.textContent.toLowerCase();
            }
            
            const privacyTerms = ['privacy', 'personal data', 'delete account', 'gdpr', 'ccpa', 'opt out', 
                                 'data protection', 'cookie', 'tracking', 'data rights', 'your information',
                                 'delete my data', 'right to erasure', 'forget me'];
            
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
            logMessage('Even with CORS proxies, there are significant limitations to browser-based solutions.');
        }
    });
    
    // Initial log message
    logMessage('Enhanced Privacy Agent Demo initialized with CORS proxy support.');
    logMessage('This demo attempts to bypass CORS restrictions using multiple proxy services.');
    logMessage('Note: Many public CORS proxies have request limits or may be offline.');
});