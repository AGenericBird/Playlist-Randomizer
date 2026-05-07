// Google policies applied so that this only works with this page
const API_KEY = 'AIzaSyBBC55AqSHDwuFX68Ogny-lbEfqtVJ6yQU'; 
// forcing update with comment
let player;
let isPlayerReady = false; 
let shuffledVideos = []; 
let currentIndex = 0;
let isRepeat = false;
let watchdogTimer; 

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
    clearTimeout(watchdogTimer); 
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
    clearTimeout(watchdogTimer);
    if (shuffledVideos.length === 0) return;
    
    if (currentIndex > 0) {
        currentIndex--;
        playCurrentVideo();
    } else if (isRepeat) {
        currentIndex = shuffledVideos.length - 1;
        playCurrentVideo();
    } else {
        if (isPlayerReady && player) player.seekTo(0);
    }
}

function jumpToSong(newIndex) {
    clearTimeout(watchdogTimer);
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

    // Start the strict watchdog timer every time a new video is called
    startWatchdog();

    if (player && isPlayerReady) {
        player.loadVideoById(currentVideoId);
    } else if (!player) {
        player = new YT.Player('player', {
            height: '390',
            width: '640',
            videoId: currentVideoId,
            playerVars: {
                'autoplay': 1, // Force autoplay explicitly
                'playsinline': 1
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError 
            }
        });
    }
    
    updateUpcomingUI();
}

function startWatchdog() {
    clearTimeout(watchdogTimer);
    // Give the player exactly 4 seconds to start playing or buffering
    watchdogTimer = setTimeout(() => {
        console.warn("Watchdog timeout: Video refused to load. Forcing skip.");
        playNext();
    }, 4000);
}

function onPlayerReady(event) {
    isPlayerReady = true; 
    event.target.playVideo();
}

function onPlayerStateChange(event) {
    // If the player successfully starts playing, buffering, or is paused by the user,
    // it is healthy. Cancel the watchdog timer.
    if (event.data === YT.PlayerState.PLAYING || 
        event.data === YT.PlayerState.BUFFERING || 
        event.data === YT.PlayerState.PAUSED) {
        clearTimeout(watchdogTimer); 
    }

    if (event.data === YT.PlayerState.ENDED) {
        playNext(); 
    } 
}

function onPlayerError(event) {
    console.warn(`Playback error (Code: ${event.data}). Skipping to next track.`);
    clearTimeout(watchdogTimer); 
    playNext(); 
}



// ... (keep all your other functions the same) ...

// NEW: The function that sends the data to your cloud buffer
async function logPlayToCloud(videoObj) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/incoming_plays`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                video_id: videoObj.id,
                title: videoObj.title
            })
        });
        console.log(`Logged play for: ${videoObj.title}`);
    } catch (error) {
        console.error("Cloud logging failed. Silently skipping.", error);
    }
}

// UPDATED: Trigger the log when the video ends
function onPlayerStateChange(event) {
    clearTimeout(watchdogTimer); 

    if (event.data === YT.PlayerState.ENDED) {
        // Grab the current video info before skipping to the next one
        const finishedVideo = shuffledVideos[currentIndex];
        
        // Log it to the cloud asynchronously (doesn't pause the music)
        logPlayToCloud(finishedVideo); 

        playNext(); 
    } 
    else if (event.data === YT.PlayerState.UNSTARTED) {
        watchdogTimer = setTimeout(() => {
            playNext();
        }, 5000); 
    }
}