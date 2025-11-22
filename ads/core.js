function getCheckString(e) {
    if (!e) return "";
    const n = new URLSearchParams(e), r = new Set(["hash", "signature"]), i = [];
    for (const [a, s] of n) r.has(a) || i.push(`${a}=${s}`);
    i.sort(new Intl.Collator("en").compare);
    const o = i.join("\n");
    try {
        return function (e) {
            const t = (new TextEncoder).encode(e), n = String.fromCodePoint(...t);
            return btoa(n).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
        }(o)
    } catch {
        console.log('catched error')
    }
}

function getParamFromAuthToken(authToken, param) {
    const params = new URLSearchParams(authToken);
    return params.get(param);
}


export function getAdsUrl(authToken) {
    const request_id = (113194749940435348632166478196n + BigInt(Math.floor(Date.now() / 1000))).toString();
    const ADS_URL = 'https://api.adsgram.ai/adv';

    const authUser = getParamFromAuthToken(authToken, 'user');
    const dataForRandomString = 'c5405f3a747a6ffa0066b8b22f46742636fe1a16ee79700d76a6fc6f8b21f430';
    const userId = JSON.parse(decodeURIComponent(authUser)).id;
    const result = {
        envType: 'telegram',
        blockId: 13225,
        platform: 'Linux+x86_64',
        language: 'ru',
        chat_type: 'sender',
        chat_instance: getParamFromAuthToken(authToken, 'chat_instance'),
        top_domain: 'farmy.live',
        signature: getParamFromAuthToken(authToken, 'signature'),
        data_check_string: getCheckString(authToken),
        sdk_version: '1.32.0',
        tg_id: userId,
        tg_platform: 'weba',
        tma_version: '9.1',
        request_id,
        raw: dataForRandomString,
    };

    const urlParams = new URLSearchParams(result).toString();
    const finalUrl = `${ADS_URL}?${urlParams}`;

    return finalUrl;
}

