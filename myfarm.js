// minimon-multiurl.js
import axios from 'axios';
import {getAdsUrl} from "./ads/core.js";

const ACCOUNTS = [
];

const BONUS_URL = 'https://farmy.live/php/ad_bonus.php';
const WATCH_DELAY_MS = 15_000;

// ================== HELPERS ==================
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function log(user, msg) {
    const time = new Date().toISOString().substring(11, 19);
    console.log(`[${time}] ${user}: ${msg}`);
}

// ================== CORE API CALLS ==================
async function fetchAd(account) {
    const headers = {
        Referer: 'https://farmy.live/',
        Origin: 'https://farmy.live',
        Host: 'api.adsgram.ai',
        'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        'x-viewport-height': '565',
        'x-is-fullscreen': 'false',
    };

    // const params = { appid: 'farmy_live' };

    const buildAdsUrl = getAdsUrl(account.token);

    // const response = await axios.get(account.adsUrl, { params, headers });
    const response = await axios.get(buildAdsUrl, { headers });
    return response.data;
}

function extractRewardUrl(adData) {
    if (!adData?.banners?.length) return null;
    const tracking = adData.banners[0].banner.trackings.find((t) => t.name === 'reward');
    return tracking?.value || null;
}

async function watchAd(rewardUrl, user) {
    if (!rewardUrl) throw new Error('No reward URL found');
    await axios.get(rewardUrl);
    log(user, `🟢 Viewed ad and hit reward URL`);
}

async function getBonusStatus(token) {
    const res = await axios.post(
        BONUS_URL,
        { action: 'status', initData: token },
        {
            headers: { 'Content-Type': 'application/json' },
        }
    );
    return res.data;
}

async function claimBonus(token) {
    const res = await axios.post(
        BONUS_URL,
        { action: 'claim', initData: token },
        { headers: { 'Content-Type': 'application/json' } }
    );
    return res.data;
}

// ================== MAIN LOGIC PER ACCOUNT ==================
async function processAccount(account) {
    const user = account.name;
    const token = account.token;

    try {
        log(user, `🎮 Starting...`);
        let status = await getBonusStatus(token);
        log(user, `📊 Initial status: left=${status.left}`);

        if (!status?.success) {
            log(user, '❌ Failed to get initial status');
            return;
        }

        while (status.left > 0) {
            log(user, `➡️ Ads left: ${status.left}`);

            let adData;
            try {
                adData = await fetchAd(account);
            } catch (err) {
                log(user, `⚠️ Fetch ad failed: ${err.message}`);
                await delay(WATCH_DELAY_MS);
                continue;
            }

            const rewardUrl = extractRewardUrl(adData);
            if (!rewardUrl) {
                log(user, '⚠️ No reward URL, retrying...');
                await delay(WATCH_DELAY_MS);
                continue;
            }

            await watchAd(rewardUrl, user);

            log(user, `⏳ Waiting ${WATCH_DELAY_MS / 1000}s before claim...`);
            await delay(WATCH_DELAY_MS);

            status = await getBonusStatus(token);
            if (status.can_reward && status.claimed < status.total) {
                const claimResult = await claimBonus(token);
                // log(user, `✅ Claimed: ${JSON.stringify(claimResult.reward)}`);
                log(user, `✅ Claimed:`);
            } else {
                log(user, 'ℹ️ Nothing to claim yet');
            }

            status = await getBonusStatus(token);
            log(user, `🔁 Updated: left=${status.left}`);

            if (status.left <= 0) {
                log(user, '🏁 Finished — no bonuses left');
                break;
            }

            log(user, `⏸ Waiting before next ad...`);
            await delay(WATCH_DELAY_MS);
        }
    } catch (err) {
        log(user, `❌ Error: ${err.message}`);
    }
}

// ================== MAIN LOOP ==================
async function main() {
    const tasks = [];

    for (const account of ACCOUNTS) {
        const randomDelay = Math.floor(Math.random() * 5000);
        await delay(randomDelay);
        log(account.name, `🚀 Starting after ${randomDelay}ms`);
        tasks.push(processAccount(account));
    }

    await Promise.all(tasks);
    console.log('🏁 All accounts finished');
}

main();
