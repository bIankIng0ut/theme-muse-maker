// Curated username-enumeration templates. {u} is replaced with the target.
// Each entry: { platform, url, notFoundStatus?, notFoundText? }.
// notFoundText is matched against response body (lowercased) to filter
// soft-404s that return HTTP 200.

export type ProfileTemplate = {
  platform: string;
  url: string;
  notFoundStatus?: number[];
  notFoundText?: string[];
};

export const PROFILE_TEMPLATES: ProfileTemplate[] = [
  { platform: "GitHub", url: "https://github.com/{u}", notFoundStatus: [404] },
  { platform: "GitLab", url: "https://gitlab.com/{u}", notFoundStatus: [404] },
  { platform: "Bitbucket", url: "https://bitbucket.org/{u}/", notFoundStatus: [404] },
  { platform: "Codeberg", url: "https://codeberg.org/{u}", notFoundStatus: [404] },
  { platform: "Reddit", url: "https://www.reddit.com/user/{u}/about.json", notFoundStatus: [404] },
  { platform: "HackerNews", url: "https://news.ycombinator.com/user?id={u}", notFoundText: ["no such user"] },
  { platform: "Twitter/X", url: "https://x.com/{u}", notFoundStatus: [404] },
  { platform: "Instagram", url: "https://www.instagram.com/{u}/", notFoundStatus: [404] },
  { platform: "TikTok", url: "https://www.tiktok.com/@{u}", notFoundStatus: [404] },
  { platform: "Threads", url: "https://www.threads.net/@{u}", notFoundStatus: [404] },
  { platform: "Pinterest", url: "https://www.pinterest.com/{u}/", notFoundStatus: [404] },
  { platform: "Tumblr", url: "https://{u}.tumblr.com", notFoundStatus: [404] },
  { platform: "Medium", url: "https://medium.com/@{u}", notFoundStatus: [404] },
  { platform: "Dev.to", url: "https://dev.to/{u}", notFoundStatus: [404] },
  { platform: "Hashnode", url: "https://hashnode.com/@{u}", notFoundStatus: [404] },
  { platform: "Substack", url: "https://{u}.substack.com", notFoundStatus: [404] },
  { platform: "About.me", url: "https://about.me/{u}", notFoundStatus: [404] },
  { platform: "Gravatar", url: "https://en.gravatar.com/{u}.json", notFoundStatus: [404] },
  { platform: "Keybase", url: "https://keybase.io/{u}", notFoundStatus: [404] },
  { platform: "Linktree", url: "https://linktr.ee/{u}", notFoundStatus: [404] },
  { platform: "Carrd", url: "https://{u}.carrd.co", notFoundStatus: [404] },
  { platform: "Bento", url: "https://bento.me/{u}", notFoundStatus: [404] },
  { platform: "Beacons", url: "https://beacons.ai/{u}", notFoundStatus: [404] },
  { platform: "Linkedin", url: "https://www.linkedin.com/in/{u}", notFoundStatus: [404, 999] },
  { platform: "Behance", url: "https://www.behance.net/{u}", notFoundStatus: [404] },
  { platform: "Dribbble", url: "https://dribbble.com/{u}", notFoundStatus: [404] },
  { platform: "ArtStation", url: "https://www.artstation.com/{u}", notFoundStatus: [404] },
  { platform: "DeviantArt", url: "https://www.deviantart.com/{u}", notFoundStatus: [404] },
  { platform: "Newgrounds", url: "https://{u}.newgrounds.com", notFoundStatus: [404] },
  { platform: "SoundCloud", url: "https://soundcloud.com/{u}", notFoundStatus: [404] },
  { platform: "Bandcamp", url: "https://{u}.bandcamp.com", notFoundStatus: [404] },
  { platform: "Mixcloud", url: "https://www.mixcloud.com/{u}/", notFoundStatus: [404] },
  { platform: "Last.fm", url: "https://www.last.fm/user/{u}", notFoundStatus: [404] },
  { platform: "Letterboxd", url: "https://letterboxd.com/{u}/", notFoundStatus: [404] },
  { platform: "Goodreads", url: "https://www.goodreads.com/{u}", notFoundStatus: [404] },
  { platform: "Untappd", url: "https://untappd.com/user/{u}", notFoundStatus: [404] },
  { platform: "Strava", url: "https://www.strava.com/athletes/{u}", notFoundStatus: [404] },
  { platform: "MyAnimeList", url: "https://myanimelist.net/profile/{u}", notFoundStatus: [404] },
  { platform: "AniList", url: "https://anilist.co/user/{u}/", notFoundStatus: [404] },
  { platform: "Twitch", url: "https://www.twitch.tv/{u}", notFoundStatus: [404] },
  { platform: "Kick", url: "https://kick.com/{u}", notFoundStatus: [404] },
  { platform: "YouTube @handle", url: "https://www.youtube.com/@{u}", notFoundStatus: [404] },
  { platform: "Vimeo", url: "https://vimeo.com/{u}", notFoundStatus: [404] },
  { platform: "Steam", url: "https://steamcommunity.com/id/{u}", notFoundText: ["the specified profile could not be found"] },
  { platform: "Chess.com", url: "https://www.chess.com/member/{u}", notFoundStatus: [404] },
  { platform: "Lichess", url: "https://lichess.org/@/{u}", notFoundStatus: [404] },
  { platform: "Speedrun.com", url: "https://www.speedrun.com/users/{u}", notFoundStatus: [404] },
  { platform: "Replit", url: "https://replit.com/@{u}", notFoundStatus: [404] },
  { platform: "CodePen", url: "https://codepen.io/{u}", notFoundStatus: [404] },
  { platform: "Patreon", url: "https://www.patreon.com/{u}", notFoundStatus: [404] },
  { platform: "Ko-fi", url: "https://ko-fi.com/{u}", notFoundStatus: [404] },
  { platform: "BuyMeACoffee", url: "https://www.buymeacoffee.com/{u}", notFoundStatus: [404] },
  { platform: "Roblox profile", url: "https://www.roblox.com/user.aspx?username={u}", notFoundStatus: [404] },
  { platform: "Pixiv", url: "https://www.pixiv.net/users/{u}", notFoundStatus: [404] },
  { platform: "Flickr", url: "https://www.flickr.com/people/{u}/", notFoundStatus: [404] },
  { platform: "500px", url: "https://500px.com/p/{u}", notFoundStatus: [404] },
  { platform: "VSCO", url: "https://vsco.co/{u}", notFoundStatus: [404] },
  { platform: "Imgur", url: "https://imgur.com/user/{u}", notFoundStatus: [404] },
  { platform: "Quora", url: "https://www.quora.com/profile/{u}", notFoundStatus: [404] },
  { platform: "Wattpad", url: "https://www.wattpad.com/user/{u}", notFoundStatus: [404] },
  { platform: "AO3", url: "https://archiveofourown.org/users/{u}", notFoundStatus: [404] },
  { platform: "Disqus", url: "https://disqus.com/by/{u}/", notFoundStatus: [404] },
];

export function isValidUsername(u: string): boolean {
  return /^[a-zA-Z0-9_.-]{2,40}$/.test(u);
}
