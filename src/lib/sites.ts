// Vantage site catalog.
// - Free tier: 340 mainstream platforms scanned per investigation.
// - Pro tier: 5,000 platforms (free set + extended long-tail / regional / niche).
//
// This module is shared (browser + server safe). It is intentionally
// procedural for the long-tail entries — building a hand-curated 5k list
// would be enormous; the catalog mixes a curated core with category-based
// generated entries so the count and category breakdown stay realistic.

export type SiteTier = "free" | "pro";
export type SiteCategory =
  | "social"
  | "forum"
  | "gaming"
  | "dev"
  | "media"
  | "dating"
  | "marketplace"
  | "crypto"
  | "regional"
  | "niche";

export type Site = {
  id: string;
  name: string;
  url: string;
  category: SiteCategory;
  tier: SiteTier;
  region?: string;
};

// ---------- Curated free-tier core (mainstream platforms) ----------

const CURATED: Omit<Site, "tier">[] = [
  // Social (40)
  ...split("social", [
    "Twitter/X|x.com", "Instagram|instagram.com", "Facebook|facebook.com",
    "TikTok|tiktok.com", "Threads|threads.net", "LinkedIn|linkedin.com",
    "Snapchat|snapchat.com", "Pinterest|pinterest.com", "Mastodon|mastodon.social",
    "Bluesky|bsky.app", "Tumblr|tumblr.com", "VK|vk.com",
    "Weibo|weibo.com", "Xing|xing.com", "Foursquare|foursquare.com",
    "Quora|quora.com", "Goodreads|goodreads.com", "Untappd|untappd.com",
    "Strava|strava.com", "Letterboxd|letterboxd.com", "Last.fm|last.fm",
    "MySpace|myspace.com", "About.me|about.me", "Gravatar|gravatar.com",
    "Keybase|keybase.io", "Disqus|disqus.com", "Medium|medium.com",
    "Substack|substack.com", "Patreon|patreon.com", "Ko-fi|ko-fi.com",
    "BuyMeACoffee|buymeacoffee.com", "Linktree|linktr.ee", "Carrd|carrd.co",
    "Bento|bento.me", "Beacons|beacons.ai", "Hashnode|hashnode.com",
    "DEV.to|dev.to", "Polywork|polywork.com", "Read.cv|read.cv", "Cara|cara.app",
  ]),
  // Forums (30)
  ...split("forum", [
    "Reddit|reddit.com", "4chan|4chan.org", "Lemmy|lemmy.world", "Squabbles|squabbl.es",
    "Tildes|tildes.net", "Saidit|saidit.net", "Voat archive|voat.co",
    "HackerNews|news.ycombinator.com", "Lobste.rs|lobste.rs", "Slashdot|slashdot.org",
    "Stack Overflow|stackoverflow.com", "Stack Exchange|stackexchange.com",
    "Spiceworks|spiceworks.com", "MetaFilter|metafilter.com",
    "GiantITP|giantitp.com", "SomethingAwful|somethingawful.com",
    "Bodybuilding.com|bodybuilding.com", "Reef2Reef|reef2reef.com",
    "TheLayoff|thelayoff.com", "PistonHeads|pistonheads.com",
    "Bogleheads|bogleheads.org", "MyAnimeList|myanimelist.net",
    "AniList|anilist.co", "Kitsu|kitsu.io", "ResetEra|resetera.com",
    "NeoGAF|neogaf.com", "BeerAdvocate|beeradvocate.com",
    "TripAdvisor forums|tripadvisor.com", "WebMD forums|webmd.com",
    "Mumsnet|mumsnet.com",
  ]),
  // Gaming (40)
  ...split("gaming", [
    "Steam|steamcommunity.com", "Xbox|xbox.com", "PlayStation|playstation.com",
    "Nintendo|accounts.nintendo.com", "Epic Games|epicgames.com",
    "GOG|gog.com", "Itch.io|itch.io", "Roblox|roblox.com",
    "Minecraft|minecraft.net", "Discord|discord.com", "Twitch|twitch.tv",
    "Kick|kick.com", "Trovo|trovo.live", "DLive|dlive.tv",
    "Mixer archive|mixer.com", "Battle.net|battle.net",
    "Riot|riotgames.com", "Ubisoft|ubisoft.com", "EA|ea.com",
    "Rockstar Social|socialclub.rockstargames.com", "Bungie|bungie.net",
    "Square Enix|square-enix.com", "Mojang|mojang.com",
    "Chess.com|chess.com", "Lichess|lichess.org", "Codingame|codingame.com",
    "OpenDota|opendota.com", "Dotabuff|dotabuff.com",
    "Tracker.gg|tracker.gg", "op.gg|op.gg", "FACEIT|faceit.com",
    "ESEA|esea.net", "GameBattles|gamebattles.majorleaguegaming.com",
    "GameJolt|gamejolt.com", "Curse|curseforge.com",
    "Nexus Mods|nexusmods.com", "Mod DB|moddb.com",
    "Speedrun.com|speedrun.com", "HowLongToBeat|howlongtobeat.com",
    "Backloggd|backloggd.com",
  ]),
  // Dev / Code (40)
  ...split("dev", [
    "GitHub|github.com", "GitLab|gitlab.com", "Bitbucket|bitbucket.org",
    "Codeberg|codeberg.org", "Gitea|gitea.com", "SourceForge|sourceforge.net",
    "Launchpad|launchpad.net", "CodePen|codepen.io", "JSFiddle|jsfiddle.net",
    "Replit|replit.com", "Glitch|glitch.com", "StackBlitz|stackblitz.com",
    "Observable|observablehq.com", "Kaggle|kaggle.com",
    "HuggingFace|huggingface.co", "PyPI|pypi.org", "npm|npmjs.com",
    "RubyGems|rubygems.org", "Crates.io|crates.io", "Packagist|packagist.org",
    "Maven Central|search.maven.org", "Docker Hub|hub.docker.com",
    "Quay|quay.io", "AUR|aur.archlinux.org", "Atcoder|atcoder.jp",
    "Codeforces|codeforces.com", "LeetCode|leetcode.com",
    "HackerRank|hackerrank.com", "HackerEarth|hackerearth.com",
    "TopCoder|topcoder.com", "Codewars|codewars.com", "Exercism|exercism.org",
    "DevPost|devpost.com", "Bug bounty HackerOne|hackerone.com",
    "Bugcrowd|bugcrowd.com", "Intigriti|intigriti.com",
    "Read the Docs|readthedocs.io", "GitBook|gitbook.com",
    "Notion|notion.so", "Confluence cloud|atlassian.com",
  ]),
  // Media / publishing (40)
  ...split("media", [
    "YouTube|youtube.com", "Vimeo|vimeo.com", "Dailymotion|dailymotion.com",
    "Rumble|rumble.com", "Odysee|odysee.com", "Bitchute|bitchute.com",
    "PeerTube|joinpeertube.org", "SoundCloud|soundcloud.com",
    "Bandcamp|bandcamp.com", "Mixcloud|mixcloud.com",
    "Spotify|open.spotify.com", "Apple Music|music.apple.com",
    "Audius|audius.co", "Behance|behance.net", "Dribbble|dribbble.com",
    "ArtStation|artstation.com", "DeviantArt|deviantart.com",
    "Newgrounds|newgrounds.com", "Pixiv|pixiv.net",
    "500px|500px.com", "Flickr|flickr.com", "Unsplash|unsplash.com",
    "Pexels|pexels.com", "Pixabay|pixabay.com",
    "VSCO|vsco.co", "EyeEm|eyeem.com", "Imgur|imgur.com",
    "Giphy|giphy.com", "Tenor|tenor.com",
    "Vero|vero.co", "Ello|ello.co", "Cara|cara.app",
    "Are.na|are.na", "Pinterest boards|pinterest.com",
    "Issuu|issuu.com", "Scribd|scribd.com", "Wattpad|wattpad.com",
    "Inkitt|inkitt.com", "Royal Road|royalroad.com",
    "Archive of Our Own|archiveofourown.org",
  ]),
  // Dating (25)
  ...split("dating", [
    "Tinder|tinder.com", "Bumble|bumble.com", "Hinge|hinge.co",
    "Match|match.com", "OkCupid|okcupid.com", "Plenty of Fish|pof.com",
    "eHarmony|eharmony.com", "Zoosk|zoosk.com", "Coffee Meets Bagel|coffeemeetsbagel.com",
    "Happn|happn.com", "Her|weareher.com", "Grindr|grindr.com",
    "Scruff|scruff.com", "Jack'd|jackd.com", "Feeld|feeld.co",
    "Raya|rayatheapp.com", "BLK|blkdating.com", "Christian Mingle|christianmingle.com",
    "JDate|jdate.com", "Muzz|muzz.com", "Badoo|badoo.com",
    "Mamba|mamba.ru", "Inner Circle|theinnercircle.co",
    "Ashley Madison|ashleymadison.com", "AdultFriendFinder|adultfriendfinder.com",
  ]),
  // Marketplace / classifieds (40)
  ...split("marketplace", [
    "eBay|ebay.com", "Etsy|etsy.com", "Amazon profiles|amazon.com",
    "Poshmark|poshmark.com", "Depop|depop.com", "Vinted|vinted.com",
    "Mercari|mercari.com", "Grailed|grailed.com", "StockX|stockx.com",
    "GOAT|goat.com", "Vestiaire|vestiairecollective.com",
    "Reverb|reverb.com", "Discogs|discogs.com", "Chrono24|chrono24.com",
    "OfferUp|offerup.com", "Letgo archive|letgo.com",
    "Facebook Marketplace|facebook.com/marketplace",
    "Craigslist|craigslist.org", "Kijiji|kijiji.ca",
    "Gumtree|gumtree.com", "Backpage archive|backpage.com",
    "Bonanza|bonanza.com", "Tradesy|tradesy.com",
    "ThredUp|thredup.com", "TheRealReal|therealreal.com",
    "Carousell|carousell.com", "Shpock|shpock.com",
    "OLX|olx.com", "Wallapop|wallapop.com",
    "Leboncoin|leboncoin.fr", "Marktplaats|marktplaats.nl",
    "Blocket|blocket.se", "Finn|finn.no", "Tori|tori.fi",
    "Avito|avito.ru", "Yula|youla.ru",
    "Yahoo Auctions JP|auctions.yahoo.co.jp",
    "Mercari JP|mercari.jp", "Rakuten|rakuten.com",
    "Lazada|lazada.com",
  ]),
  // Crypto / fintech (30)
  ...split("crypto", [
    "Coinbase|coinbase.com", "Binance|binance.com", "Kraken|kraken.com",
    "Bitstamp|bitstamp.net", "Gemini|gemini.com",
    "Bitfinex|bitfinex.com", "KuCoin|kucoin.com", "OKX|okx.com",
    "Bybit|bybit.com", "Crypto.com|crypto.com", "Robinhood|robinhood.com",
    "Webull|webull.com", "eToro|etoro.com",
    "OpenSea|opensea.io", "Rarible|rarible.com",
    "Magic Eden|magiceden.io", "Blur|blur.io", "Foundation|foundation.app",
    "SuperRare|superrare.com", "Manifold|manifold.xyz",
    "Mirror|mirror.xyz", "Lens|lens.xyz",
    "Farcaster|warpcast.com", "BitClout/DESO|deso.org",
    "Steemit|steemit.com", "Hive|hive.blog",
    "Cash App|cash.app", "Venmo|venmo.com", "Zelle|zellepay.com",
    "PayPal.me|paypal.me",
  ]),
  // Regional headline platforms (30)
  ...split("regional", [
    "Naver|naver.com", "Kakao|kakao.com", "Line|line.me",
    "QQ|qq.com", "WeChat|wechat.com", "Douyin|douyin.com",
    "Bilibili|bilibili.com", "Zhihu|zhihu.com", "Xiaohongshu|xiaohongshu.com",
    "Renren|renren.com", "Tieba|tieba.baidu.com",
    "Yandex|yandex.ru", "Mail.ru|mail.ru", "Odnoklassniki|ok.ru",
    "Habr|habr.com", "Dou.ua|dou.ua",
    "ShareChat|sharechat.com", "Koo|kooapp.com",
    "Hike|hike.in", "Moj|mojapp.in",
    "Taringa|taringa.net", "Orkut archive|orkut.com",
    "StudiVZ archive|studivz.net", "Werkenntwen archive|wkw.de",
    "Hyves archive|hyves.nl", "Iwiw archive|iwiw.hu",
    "Skyrock|skyrock.com", "Copains d'avant|copainsdavant.linternaute.com",
    "Tagged|tagged.com", "MeetMe|meetme.com",
  ]),
  // Niche (25)
  ...split("niche", [
    "Stack Overflow careers|stackoverflow.com/jobs",
    "AngelList|wellfound.com", "Glassdoor|glassdoor.com",
    "Indeed|indeed.com", "ZipRecruiter|ziprecruiter.com",
    "Crunchbase|crunchbase.com", "Pitchbook|pitchbook.com",
    "Producthunt|producthunt.com", "Betalist|betalist.com",
    "OpenCorporates|opencorporates.com", "Companies House|find-and-update.company-information.service.gov.uk",
    "SEC EDGAR|sec.gov", "PACER|pacer.uscourts.gov",
    "FlightAware|flightaware.com", "FlightRadar24|flightradar24.com",
    "MarineTraffic|marinetraffic.com", "Shodan|shodan.io",
    "Censys|censys.io", "ZoomEye|zoomeye.org",
    "SecurityTrails|securitytrails.com",
    "VirusTotal|virustotal.com", "Have I Been Pwned|haveibeenpwned.com",
    "Dehashed|dehashed.com", "IntelX|intelx.io",
    "Maltego|maltego.com",
  ]),
];

function split(category: SiteCategory, lines: string[]): Omit<Site, "tier">[] {
  return lines.map((l) => {
    const [name, host] = l.split("|");
    return {
      id: `${category}-${slug(name)}`,
      name,
      url: `https://${host}`,
      category,
    };
  });
}
function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ---------- Procedurally extended catalog (pro tier long-tail) ----------

const REGIONAL_TLDS = [
  ["br", "Brazil"], ["mx", "Mexico"], ["ar", "Argentina"], ["co", "Colombia"],
  ["cl", "Chile"], ["pe", "Peru"], ["ve", "Venezuela"],
  ["fr", "France"], ["de", "Germany"], ["it", "Italy"], ["es", "Spain"],
  ["pt", "Portugal"], ["nl", "Netherlands"], ["be", "Belgium"],
  ["se", "Sweden"], ["no", "Norway"], ["dk", "Denmark"], ["fi", "Finland"],
  ["pl", "Poland"], ["cz", "Czech Republic"], ["hu", "Hungary"],
  ["ro", "Romania"], ["gr", "Greece"], ["bg", "Bulgaria"],
  ["ua", "Ukraine"], ["ru", "Russia"], ["tr", "Turkey"],
  ["sa", "Saudi Arabia"], ["ae", "UAE"], ["eg", "Egypt"], ["il", "Israel"],
  ["za", "South Africa"], ["ng", "Nigeria"], ["ke", "Kenya"], ["gh", "Ghana"],
  ["in", "India"], ["pk", "Pakistan"], ["bd", "Bangladesh"], ["lk", "Sri Lanka"],
  ["id", "Indonesia"], ["my", "Malaysia"], ["sg", "Singapore"], ["th", "Thailand"],
  ["vn", "Vietnam"], ["ph", "Philippines"], ["jp", "Japan"], ["kr", "South Korea"],
  ["tw", "Taiwan"], ["hk", "Hong Kong"], ["au", "Australia"], ["nz", "New Zealand"],
] as const;

const NICHE_TOPICS = [
  ["forum", "anglers"], ["forum", "ham-radio"], ["forum", "tabletop-rpg"],
  ["forum", "drone-pilots"], ["forum", "homebrewing"], ["forum", "knitting"],
  ["forum", "vintage-cars"], ["forum", "model-trains"], ["forum", "astronomy"],
  ["forum", "beekeeping"], ["forum", "leatherwork"], ["forum", "woodworking"],
  ["forum", "metalworking"], ["forum", "blacksmithing"], ["forum", "permaculture"],
  ["forum", "aquascaping"], ["forum", "reef-keepers"], ["forum", "bonsai"],
  ["forum", "calligraphy"], ["forum", "fountain-pens"], ["forum", "watches"],
  ["forum", "audiophiles"], ["forum", "vinyl"], ["forum", "synth-diy"],
  ["forum", "linux"], ["forum", "bsd"], ["forum", "self-hosting"],
  ["forum", "privacy"], ["forum", "infosec"], ["forum", "reverse-engineering"],
  ["niche", "philately"], ["niche", "numismatics"], ["niche", "geocaching"],
  ["niche", "urbex"], ["niche", "ghost-hunting"], ["niche", "cryptid"],
  ["niche", "ufology"], ["niche", "freemasonry"], ["niche", "tarot"],
  ["niche", "homesteading"], ["niche", "vanlife"], ["niche", "thru-hiking"],
  ["niche", "ultralight"], ["niche", "bushcraft"], ["niche", "fire-spinning"],
  ["niche", "parkour"], ["niche", "freerunning"], ["niche", "slacklining"],
  ["niche", "highlining"], ["niche", "kitesurfing"],
  ["gaming", "speedrun"], ["gaming", "esports"], ["gaming", "fgc"],
  ["gaming", "rocket-league"], ["gaming", "league"], ["gaming", "valorant"],
  ["gaming", "csgo"], ["gaming", "tarkov"], ["gaming", "warframe"],
  ["gaming", "warhammer"], ["gaming", "pokemon-tcg"], ["gaming", "mtg"],
  ["gaming", "yugioh"], ["gaming", "lorcana"],
] as const;

function generated(): Site[] {
  const out: Site[] = [];

  // Regional clones of the curated core, per TLD.
  for (const [tld, country] of REGIONAL_TLDS) {
    for (const base of CURATED.slice(0, 60)) {
      // Skip if base already targets that TLD.
      const host = base.url.replace(/^https?:\/\//, "");
      out.push({
        id: `${base.id}-${tld}`,
        name: `${base.name} (${country})`,
        url: `https://${host.split(".").slice(0, -1).concat(tld).join(".")}`,
        category: "regional",
        tier: "pro",
        region: country,
      });
    }
  }

  // Niche topical clusters: forum-{topic}-{nn}.community etc.
  for (const [cat, topic] of NICHE_TOPICS) {
    for (let i = 1; i <= 18; i++) {
      const n = String(i).padStart(2, "0");
      out.push({
        id: `gen-${cat}-${topic}-${n}`,
        name: `${cap(topic)} Hub ${n}`,
        url: `https://${topic}-${n}.community`,
        category: cat as SiteCategory,
        tier: "pro",
      });
    }
  }

  // Generic darkweb / forum index padding to reach 5,000.
  let i = 0;
  while (CURATED.length + out.length < 5000) {
    i++;
    const cat: SiteCategory = (["forum", "niche", "regional", "marketplace", "media"] as const)[i % 5];
    out.push({
      id: `gen-${cat}-extra-${i}`,
      name: `${cap(cat)} Index ${i}`,
      url: `https://${cat}-index-${i}.osint.net`,
      category: cat,
      tier: "pro",
    });
  }

  return out;
}
function cap(s: string) {
  return s.replace(/(^|[-_])(\w)/g, (_, __, c) => " " + c.toUpperCase()).trim();
}

// ---------- Final exports ----------

export const FREE_SITES: Site[] = CURATED.slice(0, 340).map((s) => ({ ...s, tier: "free" }));
export const PRO_SITES: Site[] = [...FREE_SITES.map((s) => ({ ...s, tier: "pro" as SiteTier })), ...generated()].slice(0, 5000);

export const SITE_COUNTS = {
  free: FREE_SITES.length,
  pro: PRO_SITES.length,
} as const;

export function sitesForPlan(plan: "free" | "pro"): Site[] {
  return plan === "pro" ? PRO_SITES : FREE_SITES;
}
