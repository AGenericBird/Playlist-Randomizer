const API_KEY = 'AIzaSyBBC55AqSHDwuFX68Ogny-lbEfqtVJ6yQU'; 
// forcing update with comment

let player;
let shuffledVideos = []; // Now stores objects: { id, title }
let currentIndex = 0;
let isRepeat = false;

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

    document.getElementById('player').innerHTML = "Fetching all videos and titles... This might take a second.";
    
    // Hide controls while loading
    document.getElementById('player-controls').style.display = 'none';
    document.getElementById('upcoming-container').style.display = 'none';

    // 1. Fetch all videos (Now includes titles)
    const videos = await fetchAllVideos(playlistId);
    
    if (videos.length === 0) return;

    // 2. Apply a true mathematical shuffle
    shuffledVideos = fisherYatesShuffle(videos);
    currentIndex = 0;

    // Show controls now that we have a playlist
    document.getElementById('player-controls').style.display = 'flex';
    document.getElementById('upcoming-container').style.display = 'block';

    // 3. Start playing
    playCurrentVideo();
}

function extractPlaylistId(url) {
    const reg = /[?&]list=([^#\&\?]+)/;
    const match = url.match(reg);
    return match && match[1] ? match[1] : null;
}

async function fetchAllVideos(playlistId) {
    let videos = [];
    let nextPageToken = '';
    
    try {
        do {
            // CHANGED: part=snippet,contentDetails (so we can get the video titles)
            const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${API_KEY}&pageToken=${nextPageToken}`);
            const data = await response.json();
            
            if (data.error) {
                console.error("API Error:", data.error.message);
                alert("API Error: Check console for details.");
                return [];
            }

            if (data.items) {
                // CHANGED: We now save both the ID and the Title
                videos.push(...data.items.map(item => ({
                    id: item.contentDetails.videoId,
                    title: item.snippet.title
                })));
            }
            
            nextPageToken = data.nextPageToken || '';
        } while (nextPageToken);
        
    } catch (error) {
        console.error("Fetch error:", error);
        alert("Failed to fetch the playlist.");
    }
    return videos;
}

function fisherYatesShuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// NEW: Reshuffle function
function reshufflePlaylist() {
    if (shuffledVideos.length === 0) return;
    shuffledVideos = fisherYatesShuffle([...shuffledVideos]);
    currentIndex = 0;
    playCurrentVideo();
}

// NEW: Toggle repeat
function toggleRepeat() {
    isRepeat = !isRepeat;
    const btn = document.getElementById('repeat-btn');
    btn.innerText = isRepeat ? '🔁 Repeat: ON' : '🔁 Repeat: OFF';
    // Visual feedback color
    btn.style.backgroundColor = isRepeat ? '#2E7D32' : '#4CAF50'; 
}

// NEW: Updates the text list below the video
function updateUpcomingUI() {
    const list = document.getElementById('upcoming-list');
    list.innerHTML = ''; // Clear current list
    
    // Get the next 10 songs (slicing prevents lagging the browser on huge playlists)
    const nextSongs = shuffledVideos.slice(currentIndex + 1, currentIndex + 11);
    
    if (nextSongs.length === 0) {
        const li = document.createElement('li');
        li.innerText = isRepeat ? "Playlist ends, then repeats." : "No more upcoming tracks.";
        li.style.fontStyle = "italic";
        list.appendChild(li);
        return;
    }

    nextSongs.forEach(song => {
        const li = document.createElement('li');
        li.innerText = song.title;
        list.appendChild(li);
    });
}

function playCurrentVideo() {
    if (shuffledVideos.length === 0) return;

    const currentVideoId = shuffledVideos[currentIndex].id;

    if (player && typeof player.loadVideoById === 'function') {
        player.loadVideoById(currentVideoId);
    } else {
        player = new YT.Player('player', {
            height: '390',
            width: '640',
            videoId: currentVideoId,
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }
    
    // Update the UI list every time a new video plays
    updateUpcomingUI();
}

function onPlayerReady(event) {
    event.target.playVideo();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        currentIndex++;
        if (currentIndex < shuffledVideos.length) {
            playCurrentVideo();
        } else {
            // CHANGED: Check if repeat is ON
            if (isRepeat) {
                currentIndex = 0; // Reset to beginning
                playCurrentVideo();
            } else {
                alert("You've reached the end of the shuffled playlist!");
            }
        }
    }
}