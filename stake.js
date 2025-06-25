// Currency Converter and UI Modifier
// Converts ARS to USD and modifies various UI elements
(() => {
  'use strict';

  // Configuration
  const CONFIG = {
    EXCHANGE_RATES: {
      ARS_TO_USD: 1321.12,
      RANK_DIVISOR: 18
    },
    UPDATE_INTERVALS: {
      PRICE_FETCH: 60000, // 1 minute
      CONVERSION_CHECK: 1000 // 1 second
    },
    DEBOUNCE_DELAY: 100,
    CONVERSION_DELAY: 300
  };

  // Cryptocurrency mapping
  const CRYPTO_COINS = {
    BTC: "bitcoin", ETH: "ethereum", LTC: "litecoin", USDT: "tether", 
    SOL: "solana", DOGE: "dogecoin", BCH: "bitcoin-cash", XRP: "ripple",
    TRX: "tron", EOS: "eos", BNB: "binancecoin", USDC: "usd-coin",
    APE: "apecoin", BUSD: "binance-usd", CRO: "crypto-com-chain",
    DAI: "dai", LINK: "chainlink", SAND: "the-sandbox", SHIB: "shiba-inu",
    UNI: "uniswap", POL: "polygon", TRUMP: "trumpcoin"
  };

  // Selectors
  const SELECTORS = {
    BET_INPUT: 'input[data-test="input-game-amount"]',
    CONVERSION_SPAN: 'span.label-content.svelte-osbo5w.full-width div.crypto[data-testid="conversion-amount"]',
    CONVERSION_AMOUNT: 'div[data-testid="conversion-amount"]',
    TOOLTIP: 'div[data-portal="true"] div.tooltip span',
    CURRENCY_ARS: 'input[data-testid="currency-ars"]:checked',
    CURRENCY_USD: 'input[data-testid="currency-usd"]',
    SAVE_BUTTON: '[data-testid="save-button"]',
    SAVE_WALLET: '[data-testid="save-wallet-settings"]',
    MODAL_OVERLAY: '[data-modal-overlay]',
    BET_TABS: ['high-rollers-bets-tab', 'all-bets-tab'].map(id => `button[data-testid="${id}"]`).join(','),
    AMOUNT_ELEMENTS: 'tr td .currency .content .numeric.with-icon-space span',
    RANK_ELEMENT: "div.stack.x-space-between.y-center.gap-small.padding-none.direction-horizontal span.weight-semibold.variant-highlighted",
    CURRENCY_WRAP: "div.currency-wrap div.currency span.content span.weight-semibold.variant-highlighted.numeric span",
    SUCCESS_ELEMENT: "div.currency span.content span.weight-semibold.variant-success.numeric span"
  };

  // Excluded XPaths for text replacement
  const EXCLUDED_XPATHS = [
    '/html/body/div[1]/div[1]/div[2]/div[2]/div/div/div[2]/div',
    '/html/body/div[5]/div/div/div[2]/div/button[3]/div/span[1]',
    '/html/body/div[5]/div/div/div[2]/div/button[3]/div/span[2]'
  ];

  // Custom dollar sign path for SVG modification
  const DOLLAR_SIGN_PATH = "M51.52 73.32v6.56h-5.8V73.4c-7.56-.6-13.08-3.56-16.92-7.64l4.72-6.56c2.84 3 6.96 5.68 12.2 6.48V51.64c-7.48-1.88-15.4-4.64-15.4-14.12 0-7.4 6.04-13.32 15.4-14.12v-6.68h5.8v6.84c5.96.6 10.84 2.92 14.6 6.56l-4.88 6.32c-2.68-2.68-6.12-4.36-9.76-5.08v12.52c7.56 2.04 15.72 4.88 15.72 14.6 0 7.4-4.8 13.8-15.72 14.84h.04Zm-5.8-30.96V31.04c-4.16.44-6.68 2.68-6.68 5.96 0 2.84 2.84 4.28 6.68 5.36ZM58.6 59.28c0-3.36-3-4.88-7.04-6.12v12.52c5-.72 7.04-3.64 7.04-6.4Z";

  // State management
  const state = {
    prices: {},
    tooltipAmount: null,
    isNegative: false,
    lastUpdate: 0,
    processedAmounts: new WeakSet(),
    previousValues: [],
    replaced: [false, false]
  };

  // Utility functions
  const utils = {
    throttle(func, limit) {
      let inThrottle = false;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    debounce(func, delay) {
      let timeoutId;
      return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    },

    parseInputValue(input) {
      if (!input?.value) return null;
      const val = parseFloat(input.value);
      return (!isNaN(val) && val > 0) ? val : null;
    },

    extractCurrency(text) {
      const match = text.match(/([A-Z]{2,5})$/);
      return match ? match[1].toLowerCase() : null;
    },

    isExcludedElement(element) {
      try {
        return EXCLUDED_XPATHS.some(xpath => {
          const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          return result.singleNodeValue?.contains(element);
        });
      } catch {
        return false;
      }
    },

    getOrdinalSuffix(num) {
      const suffixes = ["th", "st", "nd", "rd"];
      const v = num % 100;
      return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    },

    formatCurrency(amount, decimals = 2) {
      return amount.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }
  };

  // Price fetching functionality
  const priceManager = {
    async fetchPrices() {
      try {
        const coinIds = Object.values(CRYPTO_COINS).join(',');
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`);
        const data = await response.json();
        
        Object.entries(CRYPTO_COINS).forEach(([symbol, coinId]) => {
          const price = data[coinId]?.usd;
          if (price) {
            state.prices[symbol.toLowerCase()] = price;
          }
        });
      } catch (error) {
        console.error('Failed to fetch cryptocurrency prices:', error);
      }
    },

    startPriceFetching() {
      this.fetchPrices();
      setInterval(() => this.fetchPrices(), CONFIG.UPDATE_INTERVALS.PRICE_FETCH);
    }
  };

  // DOM manipulation functions
  const domModifiers = {
    addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .fresh-node { opacity: 0; }
        .fresh-node-ready { opacity: 1; transition: opacity 0.1s; }
      `;
      document.head.appendChild(style);
    },

    fixSVGPath(pathElement) {
      if (!pathElement) return;
      
      const currentPath = pathElement.getAttribute("d");
      if (currentPath?.startsWith("M79.2 67.32") || currentPath?.startsWith("m27.8 62.4")) {
        pathElement.setAttribute("d", DOLLAR_SIGN_PATH);
      }
      
      if (pathElement.getAttribute("fill") === "#FFC800") {
        pathElement.setAttribute("fill", "#6CDE07");
      }
    },

    fixTextContent(element) {
      if (!element || utils.isExcludedElement(element)) return;
      
      const useUSD = !element.closest('[data-testid="conversion-amount"]');
      
      element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.includes("ARS")) {
          node.nodeValue = node.nodeValue.replace(/ARS\s*/g, useUSD ? "$" : "USD");
        }
      });
    },

    processNewElement(element) {
      element.classList?.add('fresh-node');
      
      setTimeout(() => {
        const tagName = element.nodeName.toLowerCase();
        
        if (tagName === 'path') {
          this.fixSVGPath(element);
        } else if (tagName === 'span') {
          this.fixTextContent(element);
        }
        
        // Process child elements
        if (element.querySelectorAll) {
          element.querySelectorAll('path').forEach(path => this.fixSVGPath(path));
          element.querySelectorAll('span').forEach(span => this.fixTextContent(span));
        }
        
        element.classList?.replace('fresh-node', 'fresh-node-ready');
      }, 0);
    },

    processAllElements() {
      document.querySelectorAll("path").forEach(path => this.fixSVGPath(path));
      document.querySelectorAll("span").forEach(span => this.fixTextContent(span));
    }
  };

  // Currency conversion functionality
  const converter = {
    convertCryptoAmounts(force = false) {
      if (!force && Date.now() - state.lastUpdate < CONFIG.CONVERSION_DELAY) return;
      state.lastUpdate = Date.now();

      const betInput = document.querySelector(SELECTORS.BET_INPUT);
      const betValue = utils.parseInputValue(betInput);
      
      const conversionSpans = document.querySelectorAll(SELECTORS.CONVERSION_SPAN);
      
      if (betValue === null) {
        conversionSpans.forEach(div => {
          div.textContent = '0.00000000 ETH';
        });
        return;
      }

      conversionSpans.forEach(div => {
        const currency = utils.extractCurrency(div.textContent) || 'eth';
        const price = state.prices[currency];
        
        if (!price || price === 0) return;

        const convertedValue = betValue / price;
        if (isNaN(convertedValue)) return;

        const formattedValue = convertedValue.toFixed(8) + ' ' + currency.toUpperCase();
        if (div.textContent.trim() !== formattedValue) {
          div.textContent = formattedValue;
        }
      });
    },

    fixInputConversions() {
      document.querySelectorAll(SELECTORS.CONVERSION_AMOUNT).forEach(div => {
        const input = div.closest("div")?.querySelector('input');
        if (!input?.value) return;

        const match = div.textContent.match(/^([\d,.]+)\s*([A-Z]+)$/i);
        if (!match) return;

        const [, , symbol] = match;
        const price = state.prices[symbol.toLowerCase()];
        
        if (price) {
          const convertedAmount = (parseFloat(input.value) / price).toFixed(8);
          div.textContent = `${convertedAmount} ${symbol}`;
        }
      });
    }
  };

  // Input handling
  const inputManager = {
    hookInput(input) {
      if (!input || input.dataset.overrideHooked) return;
      input.dataset.overrideHooked = '1';

      ['input', 'change'].forEach(eventType => {
        input.addEventListener(eventType, () => converter.convertCryptoAmounts(true));
      });
    },

    hookAllInputs() {
      document.querySelectorAll(SELECTORS.BET_INPUT).forEach(input => this.hookInput(input));
    }
  };

  // Tooltip management
  const tooltipManager = {
    updateTooltip: utils.debounce(() => {
      const tooltip = document.querySelector(SELECTORS.TOOLTIP);
      if (tooltip && state.tooltipAmount !== null) {
        tooltip.textContent = state.isNegative ? `-${state.tooltipAmount}` : state.tooltipAmount;
      }
    }, 10),

    handleMouseOver(event) {
      const currencyElement = event.target.closest(".currency");
      if (!currencyElement) return;

      const titleElement = currencyElement.querySelector("[title]");
      if (!titleElement) return;

      const match = currencyElement.textContent.match(/^(-?)\s*([$A-Z]+)?\s*([\d,]+(?:\.\d+)?)/);
      if (!match) return;

      const [, negativeSign, , amountString] = match;
      const amount = parseFloat(amountString.replace(/[,\s]/g, ""));
      const coinKey = titleElement.title.toUpperCase();
      const rate = state.prices[coinKey] || state.prices["USD"];

      state.tooltipAmount = titleElement.title === "usd" 
        ? amount.toFixed(2) 
        : rate ? (amount / rate).toFixed(8) : null;
      state.isNegative = negativeSign === "-";
      
      this.updateTooltip();
    },

    handleMouseOut() {
      state.tooltipAmount = null;
      state.isNegative = false;
      this.updateTooltip();
    }
  };

  // Currency settings management
  const settingsManager = {
    handleCurrencySwitch() {
      const arsInput = document.querySelector(SELECTORS.CURRENCY_ARS);
      const usdInput = document.querySelector(SELECTORS.CURRENCY_USD);
      
      if (arsInput && usdInput && !usdInput.checked) {
        usdInput.click();
      }
    },

    createSaveButton() {
      if (document.querySelector(SELECTORS.SAVE_BUTTON)) return;

      const existingButton = document.querySelector(SELECTORS.SAVE_WALLET);
      if (!existingButton) return;

      const newButton = existingButton.cloneNode(true);
      newButton.dataset.testid = "save-button";
      newButton.textContent = "Save";

      newButton.addEventListener("click", () => {
        document.querySelector(SELECTORS.MODAL_OVERLAY)?.click();
      }, { once: true });

      existingButton.replaceWith(newButton);
    }
  };

  // Amount processing for betting tables
  const amountProcessor = {
    processTableAmounts() {
      const amountElements = document.querySelectorAll(SELECTORS.AMOUNT_ELEMENTS);
      
      amountElements.forEach(element => {
        if (state.processedAmounts.has(element) || 
            !element.textContent.includes('$') || 
            element.textContent.includes('CA$')) {
          return;
        }
        
        const isNegative = element.textContent.startsWith('-');
        const rawValue = element.textContent.replace(/[$,\s]/g, '');
        const numericValue = Math.abs(parseFloat(rawValue)) / CONFIG.EXCHANGE_RATES.ARS_TO_USD;
        
        if (!isNaN(numericValue)) {
          element.textContent = `${isNegative ? '-' : ''}$${utils.formatCurrency(numericValue)} `;
          state.processedAmounts.add(element);
        }
      });
    },

    checkAndProcessBets() {
      const activeButtons = document.querySelectorAll(SELECTORS.BET_TABS);
      
      for (const button of activeButtons) {
        const span = button.querySelector('span.chromatic-ignore');
        if (span?.textContent && button.classList.contains('!bg-grey-400')) {
          this.processTableAmounts();
          break;
        }
      }
    }
  };

  // Rank and prize processing
  const rankProcessor = {
    processRankAndPrize() {
      const selectors = [SELECTORS.RANK_ELEMENT, SELECTORS.CURRENCY_WRAP];
      
      selectors.forEach((selector, index) => {
        const element = document.querySelector(selector);
        if (!element) return;
        
        const currentValue = element.textContent.trim();
        if (currentValue && currentValue !== state.previousValues[index] && !state.replaced[index]) {
          state.previousValues[index] = currentValue;
          
          if (index === 0) {
            // Process rank
            const rankNumber = Math.round(parseInt(currentValue, 10) / CONFIG.EXCHANGE_RATES.RANK_DIVISOR);
            if (rankNumber < 5000) {
              const successElement = document.querySelector(SELECTORS.SUCCESS_ELEMENT);
              if (successElement) {
                successElement.textContent = "$3.00 ";
              }
            }
            
            const suffix = utils.getOrdinalSuffix(rankNumber);
            const remainingText = currentValue.replace(/\d+[a-zA-Z]+/, "").trim();
            element.textContent = rankNumber + suffix + " " + remainingText;
          } else {
            // Process currency
            const numericValue = parseFloat(currentValue.replace(/[$,]/g, ""));
            const convertedValue = numericValue * CONFIG.EXCHANGE_RATES.ARS_TO_USD;
            element.textContent = "$" + utils.formatCurrency(convertedValue);
          }
          
          state.replaced[index] = true;
        }
      });
    },

    resetProcessingFlags() {
      const hasElements = [SELECTORS.RANK_ELEMENT, SELECTORS.CURRENCY_WRAP]
        .some(selector => document.querySelector(selector));
      
      if (!hasElements) {
        state.replaced = [false, false];
      }
    }
  };

  // Main initialization and observers
  const observers = {
    setupMutationObserver() {
      const observer = new MutationObserver(mutations => {
        const addedElements = [];
        
        mutations.forEach(({ addedNodes }) => {
          addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              addedElements.push(node);
              domModifiers.processNewElement(node);
            }
          });
        });

        if (addedElements.length > 0) {
          setTimeout(() => {
            converter.fixInputConversions();
          }, 0);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    },

    setupSettingsObserver() {
      const observer = new MutationObserver(() => {
        settingsManager.handleCurrencySwitch();
        settingsManager.createSaveButton();
      });

      observer.observe(document.body, { childList: true, subtree: true });
    },

    setupConversionObserver() {
      const debouncedConvert = utils.debounce(() => {
        converter.convertCryptoAmounts();
        inputManager.hookAllInputs();
      }, 50);

      const observer = new MutationObserver(debouncedConvert);
      observer.observe(document.body, { childList: true, subtree: true });
    },

    setupAmountObserver() {
      const throttledProcessor = utils.throttle(() => {
        amountProcessor.checkAndProcessBets();
      }, CONFIG.DEBOUNCE_DELAY);

      const observer = new MutationObserver(throttledProcessor);
      observer.observe(document.body, { childList: true, subtree: true });
    },

    setupRankObserver() {
      const observer = new MutationObserver(() => {
        rankProcessor.resetProcessingFlags();
        rankProcessor.processRankAndPrize();
      });

      observer.observe(document.body, { childList: true, subtree: true });
    },

    setupTooltipObserver() {
      const observer = new MutationObserver(tooltipManager.updateTooltip);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  };

  // Event listeners
  const eventListeners = {
    setupEventListeners() {
      // Mouse events for tooltips
      document.addEventListener("mouseover", event => tooltipManager.handleMouseOver(event));
      document.addEventListener("mouseout", () => tooltipManager.handleMouseOut());

      // DOM ready events
      document.addEventListener('readystatechange', () => domModifiers.processAllElements());
      document.addEventListener('DOMContentLoaded', () => domModifiers.processAllElements());
      window.addEventListener('load', () => domModifiers.processAllElements());
    }
  };

  // Override createElement to handle new elements
  const overrideCreateElement = () => {
    const originalCreateElement = document.createElement;
    
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(document, tagName);
      
      if (tagName.toLowerCase() === 'span') {
        element.classList.add('fresh-node');
        setTimeout(() => {
          domModifiers.fixTextContent(element);
          element.classList.replace('fresh-node', 'fresh-node-ready');
        }, 0);
      } else if (tagName.toLowerCase() === 'path') {
        setTimeout(() => domModifiers.fixSVGPath(element), 0);
      }
      
      return element;
    };
  };

  // Main initialization
  const init = async () => {
    try {
      // Setup styles and DOM overrides
      domModifiers.addStyles();
      overrideCreateElement();

      // Setup all observers
      observers.setupMutationObserver();
      observers.setupSettingsObserver();
      observers.setupConversionObserver();
      observers.setupAmountObserver();
      observers.setupRankObserver();
      observers.setupTooltipObserver();

      // Setup event listeners
      eventListeners.setupEventListeners();

      // Initial processing
      domModifiers.processAllElements();

      // Start price fetching
      await priceManager.startPriceFetching();

      // Initial conversion and input hooking
      converter.convertCryptoAmounts();
      inputManager.hookAllInputs();

      // Setup recurring tasks
      setInterval(() => {
        converter.convertCryptoAmounts();
        inputManager.hookAllInputs();
      }, CONFIG.UPDATE_INTERVALS.CONVERSION_CHECK);

      // Initial processing of existing elements
      amountProcessor.checkAndProcessBets();
      rankProcessor.processRankAndPrize();

      console.log('Currency converter script initialized successfully');
    } catch (error) {
      console.error('Failed to initialize currency converter:', error);
    }
  };

  // Start the application
  init();
})();