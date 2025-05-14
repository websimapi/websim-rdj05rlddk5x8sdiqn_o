document.addEventListener('DOMContentLoaded', function() {
    const startScanBtn = document.getElementById('start-scan');
    const deleteDataBtn = document.getElementById('delete-data');
    const resetDemoBtn = document.getElementById('reset-demo');
    const agentLog = document.getElementById('agent-log');
    const actionPoint = document.getElementById('action-point');
    const browserContent = document.getElementById('browser-content');
    const addressBar = document.getElementById('address-bar');
    const privacyLink = document.getElementById('privacy-link');
    const privacyForm = document.getElementById('privacy-form');
    const nameInput = document.getElementById('name-input');
    const emailInput = document.getElementById('email-input');
    const reasonInput = document.getElementById('reason-input');
    const submitFormBtn = document.getElementById('submit-form');
    
    let demoState = 'initial';
    
    function logMessage(message, type = 'Agent') {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = `[${type}] ${message}`;
        agentLog.appendChild(logEntry);
        agentLog.scrollTop = agentLog.scrollHeight;
    }
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async function animateClick(element) {
        // Position the action point over the element
        const rect = element.getBoundingClientRect();
        const contentRect = browserContent.getBoundingClientRect();
        
        actionPoint.style.left = (rect.left - contentRect.left + rect.width/2 - 10) + 'px';
        actionPoint.style.top = (rect.top - contentRect.top + rect.height/2 - 10) + 'px';
        actionPoint.style.display = 'block';
        
        // Animate the click
        await sleep(500);
        actionPoint.style.transform = 'scale(0.8)';
        await sleep(200);
        actionPoint.style.transform = 'scale(1)';
        await sleep(300);
        actionPoint.style.display = 'none';
    }
    
    async function simulatePrivacyScan() {
        logMessage('Starting privacy scan...', 'System');
        logMessage('Loading browser automation engine...');
        await sleep(1000);
        
        logMessage('Scanning for websites with your personal data...');
        await sleep(1500);
        
        logMessage('Found 4 websites with potential personal data:');
        logMessage('- example-social-media.com');
        logMessage('- example-shopping.com');
        logMessage('- example-news.com');
        logMessage('- example-forum.com');
        
        await sleep(1000);
        logMessage('Analyzing example-social-media.com...');
        addressBar.textContent = 'https://example-social-media.com';
        
        await sleep(1000);
        logMessage('Searching for privacy settings...');
        await sleep(800);
        logMessage('Found privacy settings link');
        
        // Simulate clicking the privacy link
        await animateClick(privacyLink);
        await sleep(500);
        
        // Update address bar to show we navigated
        addressBar.textContent = 'https://example-social-media.com/privacy-settings';
        logMessage('Navigated to privacy settings page');
        
        await sleep(1000);
        logMessage('Analyzing page for data deletion options...');
        await sleep(1200);
        logMessage('Found "Request Data Deletion" form');
        
        demoState = 'found-form';
        logMessage('Scan complete. Click "Request Data Deletion" to proceed', 'System');
    }
    
    async function simulateDataDeletion() {
        if (demoState !== 'found-form') {
            logMessage('Please run a privacy scan first', 'System');
            return;
        }
        
        logMessage('Preparing to submit data deletion requests...');
        await sleep(800);
        
        // Show the mock form
        privacyForm.style.display = 'block';
        await sleep(1000);
        
        // Fill the form with user data
        logMessage('Auto-filling form with your personal information...');
        await sleep(500);
        
        // Animate typing the name
        for (let i = 0; i < 'John Smith'.length; i++) {
            nameInput.value = 'John Smith'.substring(0, i+1);
            await sleep(50);
        }
        
        await sleep(300);
        
        // Animate typing the email
        for (let i = 0; i < 'john.smith@example.com'.length; i++) {
            emailInput.value = 'john.smith@example.com'.substring(0, i+1);
            await sleep(30);
        }
        
        await sleep(500);
        
        // Animate typing the reason
        const reason = 'I request complete deletion of my personal data under GDPR Article 17.';
        for (let i = 0; i < reason.length; i++) {
            reasonInput.value = reason.substring(0, i+1);
            await sleep(20);
        }
        
        await sleep(1000);
        logMessage('Form completed. Submitting request...');
        
        // Simulate clicking the submit button
        await animateClick(submitFormBtn);
        await sleep(800);
        
        // Hide the form and show success
        privacyForm.style.display = 'none';
        logMessage('Request submitted successfully!');
        logMessage('Response received: "Your data deletion request has been received. Reference #45872"', 'Website');
        
        await sleep(1500);
        logMessage('Moving to next website in queue...');
        logMessage('Would proceed with similar process for remaining sites', 'System');
        
        demoState = 'completed';
    }
    
    function resetDemo() {
        // Clear the log except for the initial messages
        while (agentLog.children.length > 3) {
            agentLog.removeChild(agentLog.lastChild);
        }
        
        // Reset UI elements
        actionPoint.style.display = 'none';
        privacyForm.style.display = 'none';
        nameInput.value = '';
        emailInput.value = '';
        reasonInput.value = '';
        addressBar.textContent = 'https://example-social-media.com';
        
        // Reset state
        demoState = 'initial';
        
        logMessage('Demo reset. Ready to start again.', 'System');
    }
    
    // Add event listeners
    startScanBtn.addEventListener('click', simulatePrivacyScan);
    deleteDataBtn.addEventListener('click', simulateDataDeletion);
    resetDemoBtn.addEventListener('click', resetDemo);
    
    // Prevent actual form submission
    submitFormBtn.addEventListener('click', function(e) {
        e.preventDefault();
    });
});