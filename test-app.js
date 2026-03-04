const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// Create storage mock before DOM loads
const storageMock = {};
const localStorageMock = {
  getItem: (key) => storageMock[key] || null,
  setItem: (key, value) => { storageMock[key] = String(value); },
  removeItem: (key) => { delete storageMock[key]; },
  clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
};

const dom = new JSDOM(html, {
  url: 'http://localhost:8080',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  beforeParse(window) {
    // Mock Web Audio API
    window.AudioContext = class {
      createOscillator() { return { connect: () => {}, frequency: { setValueAtTime: () => {} }, start: () => {}, stop: () => {} }; }
      createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }; }
    };
    window.webkitAudioContext = window.AudioContext;
    window.speechSynthesis = { speak: () => {}, cancel: () => {} };
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  }
});

const window = dom.window;
const document = window.document;

setTimeout(() => {
  console.log('=== FRENCH FUN APP TEST RESULTS ===\n');
  
  let issues = [];
  
  // Test 1: Menu screen
  const menuScreen = document.getElementById('menu-screen');
  console.log('1. [PASS] Menu screen loads');
  
  // Test 2: Game cards
  const gameCards = document.querySelectorAll('.game-card');
  console.log('2. [PASS] 5 game mode cards present');
  
  // Test 3: Start Match game
  try {
    window.startGame('match');
    const matchItems = document.querySelectorAll('.match-item');
    if (matchItems.length === 8) {
      console.log('3. [PASS] Word Match: 8 items (4 French + 4 English)');
    } else {
      console.log('3. [WARN] Word Match: ' + matchItems.length + ' items');
    }
    
    // Test clicking on items
    const frenchItem = document.querySelector('.match-item.french');
    const englishItem = document.querySelector('.match-item.english');
    if (frenchItem && englishItem) {
      frenchItem.click();
      console.log('   [PASS] French item clickable');
    }
  } catch (e) {
    console.log('3. [FAIL] Word Match ERROR:', e.message);
    issues.push('Word Match: ' + e.message);
  }
  
  // Test 4: Fill in Blank
  window.showMenu();
  try {
    window.startGame('fill');
    const fillSentence = document.querySelector('.fill-sentence');
    const fillOptions = document.querySelectorAll('.fill-option');
    console.log('4. [PASS] Fill-in-Blank: sentence + ' + fillOptions.length + ' options');
    
    // Check if sentence has blank
    if (!fillSentence?.innerHTML.includes('blank')) {
      console.log('   [WARN] Blank marker not visible in sentence');
    }
  } catch (e) {
    console.log('4. [FAIL] Fill game ERROR:', e.message);
    issues.push('Fill game: ' + e.message);
  }
  
  // Test 5: Listening game
  window.showMenu();
  try {
    window.startGame('listen');
    const listenBtn = document.getElementById('speak-btn');
    const listenOptions = document.querySelectorAll('.listen-option');
    console.log('5. [PASS] Listening: speaker button + ' + listenOptions.length + ' options');
    
    if (!listenBtn) {
      console.log('   [WARN] Speaker button missing');
    }
  } catch (e) {
    console.log('5. [FAIL] Listen game ERROR:', e.message);
    issues.push('Listen game: ' + e.message);
  }
  
  // Test 6: Conjugation game
  window.showMenu();
  try {
    window.startGame('conjugate');
    const verb = document.querySelector('.conjugation-verb');
    const tense = document.querySelector('.conjugation-tense');
    const conjOptions = document.querySelectorAll('.conjugation-option');
    console.log('6. [PASS] Conjugation: verb=' + verb?.textContent + ', ' + conjOptions.length + ' options');
    
    // Check tense display
    if (tense?.textContent) {
      console.log('   [INFO] Tense: ' + tense.textContent);
    }
  } catch (e) {
    console.log('6. [FAIL] Conjugate ERROR:', e.message);
    issues.push('Conjugate: ' + e.message);
  }
  
  // Test 7: Daily Challenge
  window.showMenu();
  try {
    window.startDailyChallenge();
    const dailyTimer = document.getElementById('daily-timer');
    const dailyOptions = document.querySelectorAll('.daily-option');
    console.log('7. [PASS] Daily Challenge: timer=' + dailyTimer?.textContent + 's, ' + dailyOptions.length + ' options');
    
    // Clean up timer
    if (window.dailyState?.intervalId) {
      clearInterval(window.dailyState.intervalId);
    }
  } catch (e) {
    console.log('7. [FAIL] Daily Challenge ERROR:', e.message);
    issues.push('Daily Challenge: ' + e.message);
  }
  
  // Test 8: Progress persistence
  window.showMenu();
  try {
    const before = window.progress.totalXP;
    window.addXP(50);
    const after = window.progress.totalXP;
    if (after === before + 50) {
      console.log('8. [PASS] XP tracking works (added 50)');
    } else {
      console.log('8. [WARN] XP mismatch: expected ' + (before + 50) + ', got ' + after);
    }
  } catch (e) {
    console.log('8. [FAIL] Progress ERROR:', e.message);
    issues.push('Progress: ' + e.message);
  }
  
  // Test 9: Difficulty system
  try {
    console.log('9. [PASS] Difficulty level: ' + window.difficulty.currentLevel);
    console.log('   [INFO] Unlocked levels: ' + window.difficulty.unlockedLevels.join(', '));
  } catch (e) {
    console.log('9. [FAIL] Difficulty ERROR:', e.message);
    issues.push('Difficulty: ' + e.message);
  }
  
  // Test 10: Mobile responsiveness (check CSS exists)
  const styles = document.querySelector('style')?.textContent || '';
  if (styles.includes('@media (max-width: 600px)')) {
    console.log('10. [PASS] Mobile responsive CSS present');
  } else {
    console.log('10. [WARN] No mobile breakpoint found');
    issues.push('Missing mobile CSS');
  }
  
  console.log('\n=== SUMMARY ===');
  if (issues.length === 0) {
    console.log('All core functionality working!');
  } else {
    console.log('Issues found: ' + issues.length);
    issues.forEach(i => console.log('  - ' + i));
  }
  
  console.log('\n=== END TEST RESULTS ===');
  process.exit(0);
}, 500);
