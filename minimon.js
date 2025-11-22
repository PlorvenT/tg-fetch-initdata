import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

let users = [
    {name: 'Артурчик', profileDir: './profiles/arturchik'},
    {name: 'roman', profileDir: './profiles/roman'},
    {name: 'игорь сергеевич Oil', profileDir: './profiles/igoroil'},
    {name: 'артур пирожков', profileDir: './profiles/atryrpiroj'},
    {name: 'брохиозавр', profileDir: './profiles/pavelbrohio'},
    {name: 'Олександа Усікова', profileDir: './profiles/oleksandrausikova'},
    {name: 'нигибатор', profileDir: './profiles/nagibator'},
    {name: 'infinity', profileDir: './profiles/infinity'},
    {name: 'Макс', profileDir: './profiles/maks'},
    {name: 'Karina_Koroleva', profileDir: './profiles/karina'},
    {name: 'tony_cash', profileDir: './profiles/tonycash'},
    {name: 'nick', profileDir: './profiles/nick'},
    {name: 'Стас Crypto', profileDir: './profiles/stascrypto'},
    {name: 'xViteKx', profileDir: './profiles/xxvitekx'},
    {name: 'павло', profileDir: './profiles/pavlo'},
    {name: 'алина_гордеева', profileDir: './profiles/alinagord'},
];

let usersWithPath = [
    {name: 'Артурчик', profileDir: './profiles/arturchik'},
    {name: 'roman', profileDir: './profiles/roman'},
    {name: 'игорь сергеевич Oil', profileDir: './profiles/igoroil'},
    {name: 'infinity', profileDir: './profiles/infinity'},
];

const TASK_COUNT = 50;
const MIN_DELAY = 8000; // 35 seconds
const MAX_DELAY = 10000; // 40 seconds
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const filePath = path.resolve('./account-minimon-config.json');

// Toggle: set to true to load tokens from file, false to get fresh tokens
const USE_SAVED_TOKENS = false;
const DAILY_CODE = [
    0,
    7,
    9,
    10
];

// Logging utility
function log(message) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${timestamp}] ${message}`);
}

// Random delay between requests
function getRandomDelay() {
    return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
}

// Sleep utility
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const delay = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

// ========== AUTH FUNCTIONS ==========

async function getInitDataForUser(user) {
    log(`\n=== Getting auth token for ${user.name} ===`);

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        userDataDir: user.profileDir,
    });

    const page = await browser.newPage();
    await page.goto('https://web.telegram.org/k/#@WildRush_bot');

    log(`✅ ${user.name} logged in...`);
    await delay(2.5);

    try {
        const botCommandDiv = await page.$('div.new-message-bot-commands');
        if (botCommandDiv) {
            log('✅ Found bot commands div, clicking...');
            await botCommandDiv.click();
            await delay(2);
        } else {
            log('⚠️ Bot commands div not found — open manually.');
        }
    } catch (err) {
        log('⚠️ Could not click bot commands div:', err.message);
    }

    async function waitForInitData(page, timeout = 30000, interval = 500) {
        const start = Date.now();

        while (true) {
            const initData = await page.evaluate(() => {
                const iframe = document.querySelector('iframe.payment-verification');
                if (!iframe) return null;

                const hash = iframe.src.split('#')[1] || '';
                const params = new URLSearchParams(hash);
                return params.get('tgWebAppData');
            });

            if (initData) return initData;

            if (Date.now() - start > timeout) {
                throw new Error('Timeout waiting for initData in iframe');
            }

            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    const initData = await waitForInitData(page);

    if (initData === null) {
        log(`❌ INIT DATA Error for ${user.name}`);
        await browser.close();
        return null;
    }

    log(`✅ Got auth token for ${user.name}`);
    await browser.close();

    return {
        name: user.name,
        authToken: initData,
    };
}

async function getAllAuthTokens() {
    log('=== Starting authentication for all users ===');

    const accounts = [];

    for (const user of users) {
        try {
            const account = await getInitDataForUser(user);
            if (account) {
                accounts.push(account);
            }
        } catch (error) {
            log(`❌ Error getting auth for ${user.name}: ${error.message}`);
        }
    }

    // Save to file
    fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2), 'utf-8');
    log(`✅ Saved ${accounts.length} accounts to ${filePath}`);

    return accounts;
}

function loadTokensFromFile() {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            const accounts = JSON.parse(data);
            log(`✅ Loaded ${accounts.length} accounts from ${filePath}`);
            return accounts;
        } else {
            log('⚠️ Config file not found, will get fresh tokens');
            return null;
        }
    } catch (error) {
        log(`❌ Error loading tokens from file: ${error.message}`);
        return null;
    }
}

// ========== TASK FUNCTIONS ==========

// Send task completion request
async function sendTaskRequest(authToken) {
    try {
        const response = await axios.post(
            'https://minimon.app/php/tasks.php',
            {
                initData: authToken,
                action: 'ads_event',
                kind: 'view'
            },
            {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Origin': 'https://minimon.app',
                    'Referer': 'https://minimon.app/',
                    'Content-Type': 'application/json'
                }
            }
        );
        return {success: true, data: response.data};
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

async function dailyQuest(authToken) {
    try {
        const response = await axios.post(
            'https://minimon.app/php/bonus.php',
            {
                initData: authToken,
                action: 'claim',
                selected: DAILY_CODE
            },
            {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Origin': 'https://minimon.app',
                    'Referer': 'https://minimon.app/',
                    'Content-Type': 'application/json'
                }
            }
        );
        return {success: true, data: response.data};
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

async function getMiningInfo(authToken) {
    try {
        const response = await axios.post(
            'https://minimon.app/php/cards.php',
            {
                initData: authToken,
                action: 'state'
            },
            {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Origin': 'https://minimon.app',
                    'Referer': 'https://minimon.app/',
                    'Content-Type': 'application/json'
                }
            }
        );
        return {success: true, data: response.data.data.mining};
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

async function miningCollect(authToken) {
    try {
        const response = await axios.post(
            'https://minimon.app/php/cards.php',
            {
                initData: authToken,
                action: 'mining_collect'
            },
            {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Origin': 'https://minimon.app',
                    'Referer': 'https://minimon.app/',
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Mining collected:', response.data);
    } catch (error) {
        console.log(error.response?.data || error.message);
    }
}

async function promo(authToken, promoCode) {
    try {
        const response = await axios.post(
            'https://minimon.app/php/promo_codes.php',
            {
                "initData": authToken,
                "action": "redeem",
                "promo_code": promoCode
            },
            {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Origin': 'https://minimon.app',
                    'Referer': 'https://minimon.app/',
                    'Content-Type': 'application/json'
                }
            }
        );
        return {success: true, data: response.data};
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

// Process tasks for a single user
async function processUserTasks(user) {
    log(`👤 Processing tasks for: ${user.name}`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i <= TASK_COUNT; i++) {
        const delay = getRandomDelay();
        const delayString = `${(delay / 1000).toFixed(1)}s...`;

        const result = await sendTaskRequest(user.authToken);

        if (result.success) {
            successCount++;
            log(`  ✅ Task ${i}/${TASK_COUNT} completed successfully - Response: ${JSON.stringify(result.data.data)} ⏳${delayString}`);
        } else {
            failCount++;
            log(`  ❌ Task ${i}/${TASK_COUNT} failed: ${result.error}`);
            break;
        }

        await sleep(delay);
    }

    log(`📊 ${user.name} Summary: ${successCount} successful, ${failCount} failed`);
    log('');

    return {successCount, failCount};
}

async function runDailyQuests(accounts) {
    log('🚀 Starting Daily Quests');
    for (const user of accounts) {
        const result = await dailyQuest(user.authToken);
        if (result.success) {
            log(`✅ Daily quest claimed for ${user.name} - Response: ${JSON.stringify(result.data.data)}`);
        } else {
            log(`❌ Failed to claim daily quest for ${user.name}: ${result.error}`);
        }
        await sleep(2000); // Short delay between users
    }
    log('✅ Daily Quests completed');
}

async function runGetMining(accounts) {
    for (const user of accounts) {
        const result = await getMiningInfo(user.authToken);
        if (result.success) {
            if (!result.data.enabled) {
                continue;
            }
            const leftMS = result.data.left_ms;
            const leftFormatted = `${Math.floor(leftMS / 60000)}m ${Math.floor((leftMS % 60000) / 1000)}s`;
            log(`User ${user.name} - left: ${leftFormatted}`);
            if (result.data.enabled && result.data.can_collect) {
                log(`✅ Can collect mining rewards ${user.name}`);
                await miningCollect(user.authToken);
            }
        } else {
            log(`❌ Failed to claim daily quest for ${user.name}: ${result.error}`);
        }
        await sleep(300); // Short delay between users
    }
}

async function runPromo(accounts, promoCode) {
    log('🚀 Starting Daily Quests');
    for (const user of accounts) {
        const result = await promo(user.authToken, promoCode);
        if (result.success) {
            log(`✅ Daily quest claimed for ${user.name} - Response: ${JSON.stringify(result.data.data)}`);
        } else {
            log(`❌ Failed to claim daily quest for ${user.name}: ${result.error}`);
        }
        await sleep(2000); // Short delay between users
    }
    log('✅ Daily Quests completed');
}

// ========== MAIN ==========

async function main() {
    log('🚀 Minimon Auto-Claimer Started');
    log('');

    let accounts;

    // Option 1: Load from file (if USE_SAVED_TOKENS is true)
    if (USE_SAVED_TOKENS) {
        accounts = loadTokensFromFile();
        if (!accounts || accounts.length === 0) {
            log('❌ Failed to load tokens, getting fresh tokens instead');
            accounts = await getAllAuthTokens();
        }
    } else {
        // Option 2: Get fresh tokens from browser
        accounts = await getAllAuthTokens();
    }

    if (!accounts || accounts.length === 0) {
        log('❌ No accounts available. Exiting.');
        return;
    }

    log(`📝 Users: ${accounts.length}`);
    log(`🔄 Tasks per user: ${TASK_COUNT}`);
    log(`⏱️  Delay range: ${MIN_DELAY / 1000}-${MAX_DELAY / 1000} seconds`);
    log('⚡ Running all users in parallel');
    log('');

    // Run daily quests first
    await runDailyQuests(accounts);
    // await runPromo(accounts, '42-80-51');
    // return;
    // return;
    log('');

    // Run all users in parallel for task completion
    const promises = accounts.map(user =>
        processUserTasks(user)
            .then(result => ({name: user.name, ...result}))
            .catch(error => {
                log(`❌ Error processing ${user.name}: ${error.message}`);
                return {name: user.name, successCount: 0, failCount: TASK_COUNT};
            })
    );

    const results = await Promise.all(promises);

    // Final summary
    log('═══════════════════════════════════════');
    log('📈 FINAL SUMMARY');
    log('═══════════════════════════════════════');

    results.forEach(result => {
        log(`  ${result.name}: ${result.successCount}/${TASK_COUNT} successful`);
    });

    const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
    const totalTasks = accounts.length * TASK_COUNT;

    log('');
    log(`✨ Total: ${totalSuccess}/${totalTasks} tasks completed`);
    log('✅ Script finished');
}

async function checkDailyPassState(authToken) {
    try {
        const response = await fetch('https://minimon.app/php/premium.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                initData: authToken,
                action: 'state'
            })
        });

        const data = await response.json();

        if (data.ok && data.data) {
            const now = Date.now();
            const nextClaimAt = data.data.nextClaimAt;
            const canClaim = nextClaimAt <= now;

            return {
                success: true,
                canClaim: canClaim,
                nextClaimAt: nextClaimAt,
                timeUntilClaim: canClaim ? 0 : nextClaimAt - now
            };
        }

        return {success: false, error: 'Invalid response'};
    } catch (error) {
        return {success: false, error: error.message};
    }
}

async function filterUsersWithPass(accounts) {
    log('🔍 Checking which users have claimable daily pass...');
    const usersWithPass = [];

    for (const user of accounts) {
        //check if in array usersWithPath
        if (!usersWithPath.find(u => u.name === user.name)) {
            // log(`⚠️ ${user.name} - Skipping check (not in usersWithPath)`);
            continue;
        }
        const state = await checkDailyPassState(user.authToken);

        if (state.success) {
            if (state.canClaim) {
                log(`✅ ${user.name} - Can claim daily pass NOW`);
                usersWithPass.push(user);
            } else {
                const hours = Math.floor(state.timeUntilClaim / (1000 * 60 * 60));
                const minutes = Math.floor((state.timeUntilClaim % (1000 * 60 * 60)) / (1000 * 60));
                log(`⏳ ${user.name} - Next claim in ${hours}h ${minutes}m`);
            }
        } else {
            log(`❌ ${user.name} - Failed to check pass state: ${state.error}`);
        }

        await sleep(1000); // Small delay between checks
    }

    log(`\n📊 ${usersWithPass.length}/${accounts.length} users can claim daily pass`);
    return usersWithPass;
}

async function claimDailyPass(authToken) {
    try {
        const response = await fetch('https://minimon.app/php/premium.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                initData: authToken,
                action: 'claim'
            })
        });

        const data = await response.json();
        return {success: data.ok, data: data};
    } catch (error) {
        return {success: false, error: error.message};
    }
}

async function runDailyPassClaims(accounts) {
    log('🎁 Starting Daily Pass Claims');
    let successCount = 0;
    let failCount = 0;

    for (const user of accounts) {
        const result = await claimDailyPass(user.authToken);
        if (result.success) {
            log(`✅ Daily pass claimed for ${user.name}`);
            successCount++;
        } else {
            log(`❌ Failed to claim daily pass for ${user.name}: ${result.error}`);
            failCount++;
        }
        await sleep(500);
    }

    log(`\n📈 Daily Pass Results: ${successCount} success, ${failCount} failed`);
    log('✅ Daily Pass Claims completed\n');
}

async function loopRunGetMining() {
    await runGetMining(loadTokensFromFile());
}

async function loopDailyPass() {
    let accounts;

    // Load accounts
    if (USE_SAVED_TOKENS) {
        accounts = loadTokensFromFile();
        if (!accounts || accounts.length === 0) {
            log('❌ Failed to load tokens, getting fresh tokens instead');
            accounts = await getAllAuthTokens();
        }
    } else {
        accounts = await getAllAuthTokens();
    }

    if (!accounts || accounts.length === 0) {
        log('❌ No accounts available. Exiting.');
        return;
    }

    // Filter users who can claim daily pass
    const usersWithPass = await filterUsersWithPass(accounts);
    log('');

    // Claim daily pass for eligible users
    if (usersWithPass.length > 0) {
        await runDailyPassClaims(usersWithPass);
    } else {
        log('⚠️  No users can claim daily pass at this time\n');
    }
    // setTimeout(loopDailyPass, 301 * 1000);
}
//
// setTimeout(loopDailyPass, (3 * 3600 + 30 * 60) * 1000);
// setTimeout(loopRunGetMining, (3 * 3600 + 30 * 60) * 1000);
async function mainRunGetMining() {
    while (true) {
        console.log(`[${new Date().toISOString()}] ⛏️ Running mining task...`);

        try {
            await runGetMining(loadTokensFromFile()); // your main logic here
        } catch (err) {
            console.error('Error during mining:', err);
        }

        console.log('Waiting 6 minutes before next run...');
        await delay(6 * 60); // 6 minutes
    }
}

// mainRunGetMining();

// Run the script
main().catch(error => {
// loopRunGetMining().catch(error => {
    log(`❌ Fatal error: ${error.message}`);
    process.exit(1);
});