(() => {
  console.clear();
  console.log('Credits: https://t.me/coneticlarp & https://youtube.com/conetic');

  const COINS = {
    BTC: "bitcoin", ETH: "ethereum", LTC: "litecoin", USDT: "tether", SOL: "solana",
    DOGE: "dogecoin", BCH: "bitcoin-cash", XRP: "ripple", TRX: "tron", EOS: "eos",
    BNB: "binancecoin", USDC: "usd-coin", APE: "apecoin", BUSD: "binance-usd",
    CRO: "crypto-com-chain", DAI: "dai", LINK: "chainlink", SAND: "the-sandbox",
    SHIB: "shiba-inu", UNI: "uniswap", POL: "polygon", TRUMP: "trumpcoin"
  };

  const API = `https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(COINS).join(',')}&vs_currencies=usd`;
  const CONV_SELECTOR = 'span.label-content.svelte-osbo5w.full-width div.crypto[data-testid="conversion-amount"]';
  
  const prices = {};
  const originalTexts = new WeakMap();
  
  const getElements = () => ({
    excluded: document.evaluate('/html/body/div[1]/div[1]/div[2]/div[2]/div/div/div/div[4]/div/div[5]/label/span[2]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
    usd: [
      '/html/body/div[1]/div[2]/div[2]/div[4]/div/div/div/div[1]/div/div[2]/div/div/div/div/div/div[1]/div/div/div/div/div[1]/div[2]/div[1]/div/button',
      '/html/body/div[1]/div[2]/div[2]/div[4]/div/div/div/div[1]/div/div[2]/div/div/div/div/div/div[1]/div/div/div/div/div[2]/div[1]/div[4]/div/div/div/button/div'
    ].map(xpath => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue).filter(Boolean)
  });

  const shouldSkip = (node, elements) => elements.excluded?.contains(node);
  const isUSDElement = (node, elements) => elements.usd.some(el => el?.contains(node));

  const fetchPrices = async () => {
    try {
      const data = await (await fetch(API)).json();
      Object.entries(COINS).forEach(([sym, id]) => {
        prices[sym.toLowerCase()] = data[id]?.usd || null;
      });
    } catch {}
  };

  const convertAll = () => {
    const val = document.querySelector('input[data-test="input-game-amount"]')?.value;
    const amount = val ? Math.max(0, +val) || null : null;

    document.querySelectorAll(CONV_SELECTOR).forEach(div => {
      if (!originalTexts.has(div)) originalTexts.set(div, div.textContent);
      const cur = (div.textContent.match(/([A-Z]{2,5})$/)?.[1] || '').toLowerCase();
      const price = prices[cur];
      div.textContent = amount && price ? `${(amount / price).toFixed(8)} ${cur.toUpperCase()}` : originalTexts.get(div);
    });
  };

  const replaceARS = () => {
    const elements = getElements();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: n => shouldSkip(n, elements) ? NodeFilter.FILTER_REJECT : 
                     n.nodeValue.includes('ARS') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    
    let node;
    while (node = walker.nextNode()) {
      node.nodeValue = node.nodeValue.replace(/ARS[\s\u00A0]*/g, isUSDElement(node, elements) ? 'USD' : '$');
    }
  };

  const setupTextObserver = () => {
    const observer = new MutationObserver(muts => {
      const elements = getElements();
      muts.forEach(m => {
        if (m.type === 'characterData' && m.target.nodeValue.includes('ARS') && !shouldSkip(m.target, elements)) {
          m.target.nodeValue = m.target.nodeValue.replace(/ARS[\s\u00A0]*/g, isUSDElement(m.target, elements) ? 'USD' : '$');
        }
      });
    });

    const observeNode = node => {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('ARS')) {
        const elements = getElements();
        if (!shouldSkip(node, elements)) {
          observer.observe(node, { characterData: true });
          node.nodeValue = node.nodeValue.replace(/ARS[\s\u00A0]*/g, isUSDElement(node, elements) ? 'USD' : '$');
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        [...node.childNodes].forEach(observeNode);
      }
    };

    observeNode(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  const pathReplacements = [
    { from: { fill: "#FFC800", d: "M48 96c26.51 0 48-21.49 48-48S74.51 0 48 0 0 21.49 0 48s21.49 48 48 48" }, 
      to: { fill: "#6CDE07", d: "M48 96c26.51 0 48-21.49 48-48S74.51 0 48 0 0 21.49 0 48s21.49 48 48 48" }},
    { from: { fill: "#276304", d: "M79.2 67.32v-4.56l.04.04c5.52-1 8.64-4.88 8.64-10.16 0-6.6-5.56-8.64-9.72-10.16-2.84-1.04-4.68-1.92-4.68-3.68 0-1.48 1.08-2.6 3.32-2.6s4.84.84 6.88 2.68l3.6-5.88c-2.16-1.88-4.96-3.12-8.08-3.56v-4.56h-5.12v4.64c-5.64.96-8.72 5.12-8.72 9.68 0 6.657 5.28 8.558 9.427 10.05l.413.15c2.72 1.04 4.64 1.96 4.64 3.92 0 1.6-1.4 2.84-3.76 2.84-3.12 0-6-1.44-7.92-3.48l-3.76 6.08c2.4 2.32 5.48 3.76 9.68 4.16v4.4z" }, 
      to: { fill: "#1B3802", d: "M51.52 73.32v6.56h-5.8V73.4c-7.56-.6-13.08-3.56-16.92-7.64l4.72-6.56c2.84 3 6.96 5.68 12.2 6.48V51.64c-7.48-1.88-15.4-4.64-15.4-14.12 0-7.4 6.04-13.32 15.4-14.12v-6.68h5.8v6.84c5.96.6 10.84 2.92 14.6 6.56l-4.88 6.32c-2.68-2.68-6.12-4.36-9.76-5.08v12.52c7.56 2.04 15.72 4.88 15.72 14.6 0 7.4-4.8 13.8-15.72 14.84zm-5.8-30.96V31.04c-4.16.44-6.68 2.68-6.68 5.96 0 2.84 2.84 4.28 6.68 5.36M58.6 59.28c0-3.36-3-4.88-7.04-6.12v12.52c5-.72 7.04-3.64 7.04-6.4" }}
  ];

  const deleteAttrs = { fill: "#276304", "fill-rule": "evenodd", d: "m27.8 62.4-1.24-5.08H16.52l-1.24 5.08H7.16l9.64-32.6h9.52l9.64 32.6zm-6.2-25.68-3.48 13.8h6.96zM53.36 62.4l-4.32-11.24h-2.92V62.4H38.2V29.8h13.28c6.36 0 10.4 4.6 10.4 10.6 0 5.52-2.84 8.32-5.28 9.4l5.52 12.6zm-3.08-25.8h-4.16v7.76h4.16c2.12 0 3.6-1.52 3.6-3.88s-1.52-3.92-3.6-3.92z", "clip-rule": "evenodd" };

  const matches = (el, attrs) => Object.entries(attrs).every(([k, v]) => el.getAttribute(k) === v);

  const replacePaths = () => {
    const { excluded } = getElements();
    document.querySelectorAll('path').forEach(path => {
      if (shouldSkip(path, { excluded })) return;
      
      const replacement = pathReplacements.find(r => matches(path, r.from));
      if (replacement) {
        Object.entries(replacement.to).forEach(([k, v]) => path.setAttribute(k, v));
      } else if (matches(path, deleteAttrs)) {
        path.remove();
      }
    });
  };

  const hookInput = i => {
    if (!i?.dataset.hooked) {
      i.dataset.hooked = '1';
      ['input', 'change'].forEach(e => i.addEventListener(e, convertAll));
    }
  };

  const setupDecimalLogger = () => {
    const logged = new Set();
    
    const checkDecimals = () => {
      const current = new Set();
      document.querySelectorAll('span, div').forEach(el => {
        if (!/^\d+\.\d{8}$/.test(el.textContent?.trim())) return;
        
        let parent = el.parentElement;
        for (let i = 0; i < 8 && parent; i++, parent = parent.parentElement) {
          const currency = [...parent.querySelectorAll('span, div')]
            .find(e => /^[A-Z]{2,5}$/.test(e.textContent?.trim()))?.textContent.trim();
          const dollar = [...parent.querySelectorAll('span, div')]
            .find(e => /\$\d/.test(e.textContent))?.textContent.match(/\$[\d,]+\.\d{2}/)?.[0];
          
          if (currency && dollar && dollar !== "$0.00") {
            const dollarAmount = parseFloat(dollar.replace(/[$,]/g, ''));
            const cur = currency.toLowerCase();
            const price = prices[cur];
            
            let convertedAmount = el.textContent.trim();
            if (dollarAmount && price) {
              convertedAmount = (dollarAmount / price).toFixed(8) + ' ' + currency;
            }
            
            const key = `${dollar}-${convertedAmount}-${currency}`;
            current.add(key);
            if (!logged.has(key)) {
              logged.add(key);
              
              const decimalPart = convertedAmount.split(' ')[0];
              if (decimalPart !== el.textContent.trim()) {
                const textNodes = [];
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                let node;
                while (node = walker.nextNode()) {
                  if (/^\d+\.\d{8}$/.test(node.nodeValue.trim())) {
                    node.nodeValue = node.nodeValue.replace(/\d+\.\d{8}/, decimalPart);
                    break;
                  }
                }
              }
            }
            break;
          }
        }
      });
      
      logged.forEach(key => !current.has(key) && logged.delete(key));
      requestAnimationFrame(checkDecimals);
    };
    
    checkDecimals();
  };

  (async () => {
    await fetchPrices();
    convertAll();
    document.querySelectorAll('input[data-test="input-game-amount"]').forEach(hookInput);
    replaceARS();
    replacePaths();
    setupTextObserver();
    setupDecimalLogger();

    setInterval(fetchPrices, 60000);
    setInterval(() => { convertAll(); replaceARS(); }, 1000);

    new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(n => {
          if (n.nodeType === 1) {
            if (n.matches?.('input[data-test="input-game-amount"]')) hookInput(n);
            n.querySelectorAll?.('input[data-test="input-game-amount"]').forEach(hookInput);
          }
        });
      });
      replaceARS();
      replacePaths();
    }).observe(document.body, { childList: true, subtree: true });
  })();
})();
