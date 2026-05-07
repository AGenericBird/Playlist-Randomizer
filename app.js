const API_KEY = 'AIzaSyBBC55AqSHDwuFX68Ogny-lbEfqtVJ6yQU'; 
// forcing update with comment

let player;
let shuffledVideoIds = [];
let currentIndex = 0;

// This function is automatically called by the YouTube IFrame API when it loads
function onYouTubeIframeAPIReady() {
    console.log("YouTube Player API Ready.");
}

async function loadAndShuffle() {
    const urlInput = document.getElementById('playlist-url').value;
    const playlistId = extractPlaylistId(urlInput);

    if (!playlistId) {
        alert("Could not find a playlist ID in that URL. Please check the link.");
        return;
    }

    document.getElementById('player').innerHTML = "Fetching all videos... This might take a second for large playlists.";

    // 1. Fetch all videos
    const videoIds = await fetchAllVideos(playlistId);
    
    if (videoIds.length === 0) return;

    // 2. Apply a true mathematical shuffle
    shuffledVideoIds = fisherYatesShuffle(videoIds);
    currentIndex = 0;

    // 3. Start playing
    playCurrentVideo();
}

// Extracts the "list=XXXX" part of a YouTube URL
function extractPlaylistId(url) {
    const reg = /[?&]list=([^#\&\?]+)/;
    const match = url.match(reg);
    return match && match[1] ? match[1] : null;
}

// Loops through the YouTube API to get all pages of the playlist
async function fetchAllVideos(playlistId) {
    let videos = [];
    let nextPageToken = '';
    
    try {
        do {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${API_KEY}&pageToken=${nextPageToken}`);
            const data = await response.json();
            
            if (data.error) {
                console.error("API Error:", data.error.message);
                alert("API Error: Did you insert your API key?");
                return [];
            }

            if (data.items) {
                videos.push(...data.items.map(item => item.contentDetails.videoId));
            }
            
            // If there's another page of 50 videos, grab the token to fetch them
            nextPageToken = data.nextPageToken || '';
        } while (nextPageToken);
        
    } catch (error) {
        console.error("Fetch error:", error);
        alert("Failed to fetch the playlist.");
    }
    return videos;
}

// The Fisher-Yates shuffle algorithm (the industry standard for unbiased shuffling)
function fisherYatesShuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// Loads the video into the IFrame player
function playCurrentVideo() {
    if (shuffledVideoIds.length === 0) return;

    if (player && typeof player.loadVideoById === 'function') {
        // If player already exists, just load the new video ID
        player.loadVideoById(shuffledVideoIds[currentIndex]);
    } else {
        // Create the player for the first time
        player = new YT.Player('player', {
            height: '390',
            width: '640',
            videoId: shuffledVideoIds[currentIndex],
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }
}

// Autoplay when ready
function onPlayerReady(event) {
    event.target.playVideo();
}

// Detect when a video ends so we can play the next one in our shuffled array
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        currentIndex++;
        if (currentIndex < shuffledVideoIds.length) {
            playCurrentVideo();
        } else {
            alert("You've reached the end of the shuffled playlist!");
        }
    }
}