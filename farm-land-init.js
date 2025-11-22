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

const filePath = path.resolve('./account-farmland-config.json');


// Logging utility
function log(message) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${timestamp}] ${message}`);
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
    await page.goto('https://web.telegram.org/a/#?tgaddr=tg%3A%2F%2Fresolve%3Fdomain%3DFarmyLand_bot%26appname%3Dgame');

    log(`✅ ${user.name} logged in...`);
    await delay(2.5);

    // try {
    //     const botCommandDiv = await page.$('div.new-message-bot-commands');
    //     if (botCommandDiv) {
    //         log('✅ Found bot commands div, clicking...');
    //         await botCommandDiv.click();
    //         await delay(2);
    //     } else {
    //         log('⚠️ Bot commands div not found — open manually.');
    //     }
    // } catch (err) {
    //     log('⚠️ Could not click bot commands div:', err.message);
    // }

    async function waitForInitData(page, timeout = 30000, interval = 500) {
        const start = Date.now();

        while (true) {
            const initData = await page.evaluate(() => {
                const iframe = document.querySelector('.modal-content iframe');
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
        token: initData,
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

// ========== MAIN ==========

async function main() {
    log('🚀 FarmLand Auto-Claimer Started');
    log('');

    const accounts = await getAllAuthTokens();

}

// Run the script
main().catch(error => {
    log(`❌ Fatal error: ${error.message}`);
    process.exit(1);
});