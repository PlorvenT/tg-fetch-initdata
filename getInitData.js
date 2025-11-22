// multiUserInitData.js
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const users = [
    { name: 'Артурчик', profileDir: './profiles/arturchik' },
    { name: 'infinity', profileDir: './profiles/infinity' },
    { name: 'roman', profileDir: './profiles/roman' },
    { name: 'брохиозавр', profileDir: './profiles/pavelbrohio' },
    { name: 'Олександа Усікова', profileDir: './profiles/oleksandrausikova' },
    { name: 'игорь сергеевич Oil', profileDir: './profiles/igoroil' },
    { name: 'артур пирожков', profileDir: './profiles/atryrpiroj' },
    { name: 'нигибатор', profileDir: './profiles/nagibator' },
    { name: 'Макс', profileDir: './profiles/maks' },
    { name: 'Karina_Koroleva', profileDir: './profiles/karina' },
    { name: 'nick', profileDir: './profiles/nick' },
    { name: 'tony_cash', profileDir: './profiles/tonycash' },
    { name: 'Стас Crypto', profileDir: './profiles/stascrypto' },
    { name: 'xViteKx', profileDir: './profiles/xxvitekx' },
    { name: 'павло', profileDir: './profiles/pavlo' },
    { name: 'алина_гордеева', profileDir: './profiles/alinagord' },
    // add more users here
];

const filePath = path.resolve('./account-config.json');

// Clear file before loop
fs.writeFileSync(filePath, '[]', 'utf-8');

const delay = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

function transformInitData(initData) {
    // decode URL-encoded string
    const decoded = decodeURIComponent(initData);

    // parse parameters
    const params = new URLSearchParams(decoded);

    const hash = params.get('hash') || '';
    const auth_date = params.get('auth_date') || '';
    const query_id = params.get('query_id') || '';
    const signature = params.get('signature') || '';
    const user = params.get('user') || '';

    // build formatted string
    return [
        `tg::${hash}::auth_date=${auth_date}`,
        `query_id=${query_id}`,
        `signature=${signature}`,
        `user=${user}`
    ].join('\n');
}

async function getInitDataForUser(user) {
    console.log(`\n=== Processing ${user.name} ===`);

    const browser = await puppeteer.launch({
        headless: false, // show browser so you can log in
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        userDataDir: user.profileDir,
    });

    const page = await browser.newPage();
    await page.goto('https://web.telegram.org/k/#@minefarm_game_bot');

    console.log(`✅ ${user.name} logged ...`);
    await delay(2);

    try {
        const botCommandDiv = await page.$('div.new-message-bot-commands');
        if (botCommandDiv) {
            console.log('✅ Found bot commands div, clicking...');
            await botCommandDiv.click();
            await delay(2);
        } else {
            console.log('⚠️ Bot commands div not found — open manually.');
        }
    } catch (err) {
        console.log('⚠️ Could not click bot commands div:', err);
    }

    async function waitForInitData(page, timeout = 15000, interval = 500) {
        const start = Date.now();

        while (true) {
            const initData = await page.evaluate(() => {
                const iframe = document.querySelector('iframe.payment-verification');
                if (!iframe) return null;

                const hash = iframe.src.split('#')[1] || '';
                const params = new URLSearchParams(hash);
                return params.get('tgWebAppData');
            });

            // console.log('initData', initData)
            if (initData) return initData;

            if (Date.now() - start > timeout) {
                throw new Error('Timeout waiting for initData in iframe');
            }

            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    const initData = await waitForInitData(page);
    if (initData === null) {
        console.log(`\n🎯 INIT DATA Error for ${user.name}:\n${initData}\n`);
        await browser.close();
        return;
    }
    const formatted = transformInitData(initData);
    // console.log(formatted);
    const encoded = encodeURIComponent(formatted);
    // console.log(encoded);

    // Read current content
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Append new account
    content.push({
        acc: user.name,
        token: encoded,
    });

    // Save updated content
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');

    await browser.close();
}

(async () => {
    for (const user of users) {
        await getInitDataForUser(user);
    }
})();