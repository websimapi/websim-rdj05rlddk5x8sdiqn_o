const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Add recaptcha plugin with 2captcha/anticaptcha service
// In a real app, you'd use an actual API key
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: process.env.CAPTCHA_API_KEY || 'DEMO_API_KEY' // would come from secure env var
    },
    visualFeedback: true // colorize reCAPTCHAs to see which were detected
  })
);

// Cached browser instance
let browserInstance = null;

class BrowserAutomation {
  constructor(logger) {
    this.logger = logger || console;
    this.screenshots = [];
  }

  /**
   * Initialize the browser instance
   */
  async initBrowser() {
    if (browserInstance) {
      return browserInstance;
    }

    this.logger.info('Initializing browser instance');
    try {
      browserInstance = await puppeteer.launch({
        headless: false, // Set to false for debugging
        defaultViewport: { width: 1280, height: 800 },
        args: [
          '--disable-web-security',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1280,800'
        ]
      });

      return browserInstance;
    } catch (error) {
      this.logger.error('Failed to initialize browser', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async close() {
    if (browserInstance) {
      await browserInstance.close();
      browserInstance = null;
    }
  }

  /**
   * Take a screenshot and save it
   */
  async takeScreenshot(page, name) {
    const screenshotDir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);

    await page.screenshot({ path: filepath, fullPage: true });
    this.screenshots.push(filepath);
    this.logger.info(`Screenshot saved: ${filepath}`);

    return filepath;
  }

  /**
   * Navigate to a URL
   */
  async navigateTo(page, url) {
    this.logger.info(`Navigating to: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.takeScreenshot(page, 'navigation');
      return true;
    } catch (error) {
      this.logger.error(`Failed to navigate to ${url}`, { error: error.message });
      await this.takeScreenshot(page, 'navigation_error');
      return false;
    }
  }

  /**
   * Find and navigate to privacy-related pages
   */
  async findPrivacyPage(page) {
    this.logger.info('Searching for privacy-related links');

    const privacyKeywords = [
      'privacy', 'data protection', 'personal data', 'account settings',
      'gdpr', 'ccpa', 'delete account', 'delete my data', 'data deletion',
      'right to be forgotten', 'right to erasure', 'data rights'
    ];

    try {
      // Get all links on the page
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.textContent.trim(),
          href: a.href,
          id: a.id,
          classes: a.className
        }));
      });

      // Filter for privacy-related links
      const privacyLinks = links.filter(link => {
        const text = link.text.toLowerCase();
        return privacyKeywords.some(keyword => text.includes(keyword));
      });

      this.logger.info(`Found ${privacyLinks.length} potential privacy-related links`);

      if (privacyLinks.length > 0) {
        // Navigate to the first matching link
        const targetLink = privacyLinks[0];
        this.logger.info(`Navigating to privacy page: ${targetLink.text} (${targetLink.href})`);

        await page.evaluate((selector) => {
          const elements = Array.from(document.querySelectorAll('a'));
          const element = elements.find(el => el.href === selector.href);
          if (element) element.click();
        }, targetLink);

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        await this.takeScreenshot(page, 'privacy_page');

        return true;
      } else {
        this.logger.warn('No privacy-related links found');
        return false;
      }
    } catch (error) {
      this.logger.error('Error finding privacy page', { error: error.message });
      await this.takeScreenshot(page, 'privacy_search_error');
      return false;
    }
  }

  /**
   * Find and fill out deletion request forms
   */
  async findAndFillDeletionForm(page, personalInfo) {
    this.logger.info('Searching for data deletion form');

    try {
      // Look for forms with relevant fields
      const formData = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map(form => ({
          id: form.id,
          action: form.action,
          method: form.method,
          fields: Array.from(form.querySelectorAll('input, textarea, select')).map(field => ({
            type: field.type,
            name: field.name,
            id: field.id,
            placeholder: field.placeholder
          }))
        }));
      });

      this.logger.info(`Found ${formData.length} forms on the page`);

      // Find forms that might be related to data deletion
      const potentialForms = formData.filter(form => {
        // Check if form action or ID contains relevant keywords
        const formText = (form.id + ' ' + form.action).toLowerCase();
        const deletionKeywords = ['delete', 'removal', 'erasure', 'forget', 'gdpr', 'ccpa', 'privacy'];

        const hasRelevantAction = deletionKeywords.some(keyword => formText.includes(keyword));

        // Check if form has enough fields for personal info
        const hasNameField = form.fields.some(field => {
          const fieldText = (field.name + ' ' + field.id + ' ' + field.placeholder).toLowerCase();
          return fieldText.includes('name');
        });

        const hasEmailField = form.fields.some(field => {
          const fieldText = (field.name + ' ' + field.id + ' ' + field.placeholder).toLowerCase();
          return fieldText.includes('email');
        });

        return hasRelevantAction || (hasNameField && hasEmailField);
      });

      if (potentialForms.length > 0) {
        this.logger.info(`Found ${potentialForms.length} potential deletion request forms`);

        // Attempt to fill the first potential form
        const targetForm = potentialForms[0];

        await this.fillForm(page, targetForm, personalInfo);
        await this.takeScreenshot(page, 'form_filled');

        return true;
      } else {
        this.logger.warn('No suitable deletion request forms found');
        return false;
      }
    } catch (error) {
      this.logger.error('Error finding or filling deletion form', { error: error.message });
      await this.takeScreenshot(page, 'form_error');
      return false;
    }
  }

  /**
   * Fill out a form with personal information
   */
  async fillForm(page, formData, personalInfo) {
    this.logger.info('Filling form with personal information');

    try {
      // Map field types to personal info
      for (const field of formData.fields) {
        const fieldIdentifier = field.id || field.name;
        if (!fieldIdentifier) continue;

        // Determine what information to put in each field
        let value = null;

        const fieldText = (field.name + ' ' + field.id + ' ' + field.placeholder).toLowerCase();

        if (fieldText.includes('name') || fieldText.includes('fullname')) {
          value = personalInfo.name;
        } else if (fieldText.includes('email')) {
          value = personalInfo.email;
        } else if (fieldText.includes('phone')) {
          value = personalInfo.phone;
        } else if (fieldText.includes('reason') || fieldText.includes('comment') || fieldText.includes('message')) {
          value = personalInfo.message || 'I am requesting deletion of my personal data under GDPR Article 17 / CCPA.';
        } else if (field.type === 'checkbox' && fieldText.includes('consent')) {
          // Check consent checkboxes
          await page.click(`#${fieldIdentifier}`);
          continue;
        }

        if (value) {
          await page.evaluate((id, val) => {
            const element = document.getElementById(id) || document.getElementsByName(id)[0];
            if (element) {
              element.value = val;
              // Trigger events
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, fieldIdentifier, value);

          this.logger.info(`Filled field: ${fieldIdentifier}`);
        }
      }

      this.logger.info('Form filling completed');
      return true;
    } catch (error) {
      this.logger.error('Error filling form', { error: error.message });
      return false;
    }
  }

  /**
   * Submit the form and handle any captchas
   */
  async submitForm(page) {
    this.logger.info('Attempting to submit form');

    try {
      // First check for and solve any CAPTCHA
      const { hasCaptcha, solved } = await page.solveRecaptchas();

      if (hasCaptcha) {
        if (solved) {
          this.logger.info('Successfully solved CAPTCHA');
        } else {
          this.logger.warn('Failed to solve CAPTCHA');
          return false;
        }
      }

      // Look for submit buttons
      const buttonSelector = await page.evaluate(() => {
        // Try multiple approaches to find the submit button
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button:contains("Submit")',
          'button:contains("Send")',
          'button:contains("Delete")',
          'a:contains("Submit")'
        ];

        for (const selector of submitSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return selector;
          }
        }

        return null;
      });

      if (!buttonSelector) {
        this.logger.warn('Could not find submit button');
        return false;
      }

      // Click the submit button
      await page.click(buttonSelector);
      this.logger.info('Clicked submit button');

      // Wait for the form submission to complete
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});

      // Take screenshot of result
      await this.takeScreenshot(page, 'form_submitted');

      return true;
    } catch (error) {
      this.logger.error('Error submitting form', { error: error.message });
      await this.takeScreenshot(page, 'submission_error');
      return false;
    }
  }

  /**
   * Check if the submission was successful
   */
  async checkSubmissionSuccess(page) {
    this.logger.info('Checking if submission was successful');

    try {
      const pageContent = await page.content();
      const $ = cheerio.load(pageContent);

      const successIndicators = [
        'success',
        'thank you',
        'received',
        'confirmed',
        'submitted',
        'request sent',
        'we will process'
      ];

      const pageText = $('body').text().toLowerCase();

      for (const indicator of successIndicators) {
        if (pageText.includes(indicator)) {
          this.logger.info(`Submission appears successful (matched: ${indicator})`);
          return true;
        }
      }

      this.logger.warn('No success indicators found in response');
      return false;
    } catch (error) {
      this.logger.error('Error checking submission status', { error: error.message });
      return false;
    }
  }

  /**
   * Main method to process a website
   */
  async processWebsite(url, personalInfo) {
    this.logger.info(`Starting to process website: ${url}`);

    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      // Configure the page
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1280, height: 800 });

      // Navigate to the target website
      const navigationSuccess = await this.navigateTo(page, url);
      if (!navigationSuccess) {
        throw new Error('Failed to navigate to website');
      }

      // Find and navigate to the privacy page
      const foundPrivacyPage = await this.findPrivacyPage(page);
      if (!foundPrivacyPage) {
        this.logger.warn('Could not find privacy page, continuing with current page');
      }

      // Find and fill the deletion request form
      const foundAndFilledForm = await this.findAndFillDeletionForm(page, personalInfo);
      if (!foundAndFilledForm) {
        throw new Error('Could not find or fill deletion request form');
      }

      // Submit the form
      const submittedForm = await this.submitForm(page);
      if (!submittedForm) {
        throw new Error('Failed to submit form');
      }

      // Check if submission was successful
      const wasSuccessful = await this.checkSubmissionSuccess(page);

      // Close the page but keep the browser open for future requests
      await page.close();

      return {
        success: wasSuccessful,
        message: wasSuccessful ? 'Data deletion request submitted successfully' : 'Submission completed but success uncertain',
        screenshots: this.screenshots
      };
    } catch (error) {
      this.logger.error(`Failed to process website ${url}`, { error: error.message });
      return {
        success: false,
        message: `Error: ${error.message}`,
        screenshots: this.screenshots
      };
    }
  }
}

module.exports = BrowserAutomation;