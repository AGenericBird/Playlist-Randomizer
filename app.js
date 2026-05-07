const API_KEY = 'AIzaSyBBC55AqSHDwuFX68Ogny-lbEfqtVJ6yQU'; 
// forcing update with comment
let player;
let isPlayerReady = false; // NEW: The traffic light flag
let shuffledVideos = []; 
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
    
    document.getElementById('player-controls').style.display = 'none';
    document.getElementById('upcoming-container').style.display = 'none';

    const videos = await fetchAllVideos(playlistId);
    
    if (videos.length === 0) return;

    shuffledVideos = fisherYatesShuffle(videos);
    currentIndex = 0;

    document.getElementById('player-controls').style.display = 'flex';
    document.getElementById('upcoming-container').style.display = 'block';

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
            const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${API_KEY}&pageToken=${nextPageToken}`);
            const data = await response.json();
            
            if (data.error) {
                console.error("API Error:", data.error.message);
                alert("API Error: Check console for details.");
                return [];
            }

            if (data.items) {
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

function reshufflePlaylist() {
    if (shuffledVideos.length === 0) return;
    shuffledVideos = fisherYatesShuffle([...shuffledVideos]);
    currentIndex = 0;
    playCurrentVideo();
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    const btn = document.getElementById('repeat-btn');
    btn.innerText = isRepeat ? '🔁 Repeat: ON' : '🔁 Repeat: OFF';
    btn.style.backgroundColor = isRepeat ? '#2E7D32' : '#4CAF50'; 
}

function playNext() {
    if (shuffledVideos.length === 0) return;
    
    if (currentIndex < shuffledVideos.length - 1) {
        currentIndex++;
        playCurrentVideo();
    } else if (isRepeat) {
        currentIndex = 0;
        playCurrentVideo();
    } else {
        alert("You've reached the end of the shuffled playlist!");
    }
}

function playPrevious() {
    if (shuffledVideos.length === 0) return;
    
    if (currentIndex > 0) {
        currentIndex--;
        playCurrentVideo();
    } else {
        // If at the very beginning, restart the current song
        if (isPlayerReady && player) player.seekTo(0);
    }
}

function jumpToSong(newIndex) {
    currentIndex = newIndex;
    playCurrentVideo();
}

function updateUpcomingUI() {
    const list = document.getElementById('upcoming-list');
    list.innerHTML = ''; 
    
    const nextSongs = shuffledVideos.slice(currentIndex + 1, currentIndex + 11);
    
    if (nextSongs.length === 0) {
        const li = document.createElement('li');
        li.innerText = isRepeat ? "Playlist ends, then repeats." : "No more upcoming tracks.";
        li.style.fontStyle = "italic";
        li.style.color = "#888888";
        list.appendChild(li);
        return;
    }

    nextSongs.forEach((song, i) => {
        const actualIndex = currentIndex + 1 + i;
        const li = document.createElement('li');
        
        li.innerText = song.title;
        li.classList.add('clickable-song'); 
        li.onclick = () => jumpToSong(actualIndex); 
        
        list.appendChild(li);
    });
}

function playCurrentVideo() {
    if (shuffledVideos.length === 0) return;

    const currentVideoId = shuffledVideos[currentIndex].id;

    // UPDATED: Strict logic to prevent destroying the player
    if (player && isPlayerReady) {
        // Player is fully built and safe to change
        player.loadVideoById(currentVideoId);
    } else if (!player) {
        // Player doesn't exist at all, build it safely
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
    
    updateUpcomingUI();
}

function onPlayerReady(event) {
    isPlayerReady = true; // Turn the traffic light green
    event.target.playVideo();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        playNext(); 
    }
}