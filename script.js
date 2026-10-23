// Spotify API Info
const CLIENT_ID = '3776abcff8504f0d992e4ab2bda7f8b6';
const CLIENT_SECRET = 'c859c5f33f7f45b0a2a183f462b4990c';

let token = '';
let tokenTime = 0;
let songs = [];

// Sections from the HTML
const intro = document.getElementById('intro-section');
const form = document.getElementById('form-section');
const loading = document.getElementById('loading-section');
const moodBox = document.getElementById('mood-section');
const playlistBox = document.getElementById('playlist-section');
const errorBox = document.getElementById('error-section');
const moodForm = document.getElementById('mood-form');
const rantInput = document.getElementById('rant-input');
const artistInput = document.getElementById('artist-input');

// Get Spotify Token
async function getToken() 
{
    if (token && Date.now() < tokenTime) 
    {
        return token;
    }

    try 
    {
        const result = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
            },
            body: 'grant_type=client_credentials'
        });

        if (!result.ok) throw new Error('Auth failed');

        const data = await result.json();
        token = data.access_token;
        tokenTime = Date.now() + data.expires_in * 1000 - 60000;

        return token;
    } 
      
    catch (err) 
    {
        console.error('Token error:', err);
        throw new Error('Spotify login failed');
    }
}

// Mood check
function checkMood(text) 
{
    const words = text.toLowerCase().split(/\s+/);

    const happyWords = ['happy', 'excited', 'amazing', 'great', 'love', 'awesome', 'fantastic', 'wonderful', 'good', 'excellent', 'joy', 'brilliant', 'perfect', 'beautiful'];
    const sadWords = ['angry', 'frustrated', 'hate', 'terrible', 'awful', 'bad', 'annoyed', 'upset', 'mad', 'disappointed', 'sad', 'depressed', 'horrible', 'worst'];
    const hypeWords = ['pumped', 'hyped', 'energetic', 'motivated', 'fired up', 'intense', 'powerful', 'dynamic', 'active', 'vigorous', 'electric', 'charged'];
    const chillWords = ['peaceful', 'relaxed', 'calm', 'serene', 'chill', 'mellow', 'tranquil', 'zen', 'soothing', 'gentle'];

    let pos = 0, neg = 0, energy = 0, calm = 0;

    words.forEach(w => {
        if (happyWords.includes(w)) pos++;
        if (sadWords.includes(w)) neg++;
        if (hypeWords.includes(w)) energy++;
        if (chillWords.includes(w)) calm++;
    });

  //calculates net valence and net energy 
    const rawValence = pos - neg;
    const rawEnergy = energy - calm;

    const valence = Math.max(0, Math.min(1, 0.5 + rawValence * 0.15)); 
    const eng = Math.max(0, Math.min(1, 0.5 + rawEnergy * 0.2)); 
    const moodScore = Math.abs(rawValence) + Math.abs(rawEnergy);
    const confidence = Math.min(0.95, 0.6 + moodScore * 0.1); //how strongly the mood is felt

    let mood = '';
    let desc = '';

    if (valence >= 0.65 && eng >= 0.65) 
    {
        mood = 'Energetic & Upbeat';
        desc = 'High energy and positive vibes detected';
    } 
    else if (valence >= 0.65 && eng <= 0.4) 
    {
        mood = 'Happy & Relaxed';
        desc = 'Positive but calm emotions';
    }
    else if (valence <= 0.4 && eng >= 0.65) 
    {
        mood = 'Intense & Powerful';
        desc = 'Strong emotions and high energy';
    } 
    else if (valence <= 0.4 && eng <= 0.4) 
    {
        mood = 'Melancholic & Reflective';
        desc = 'Contemplative and introspective mood';
    } 
    else if (eng >= 0.6) 
    {
        mood = 'Dynamic & Motivated';
        desc = 'High energy with mixed emotions';
    } 
    else if (valence >= 0.6) 
    {
        mood = 'Peaceful & Positive';
        desc = 'Chill and slightly upbeat';
    } 
    else if (valence <= 0.3) 
    {
        mood = 'Tense or Sad';
        desc = 'Negative or low-energy vibe detected';
    } 
    else 
    {
        mood = 'Balanced & Thoughtful';
        desc = 'Neutral emotional state';
    }

    return { mood, valence, energy: eng, confidence, description: desc };
}


// Search Spotify
async function searchSongs(query, limit = 10) 
{
    try {
        const t = await getToken();
        const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`, {
            headers: {
                'Authorization': 'Bearer ' + t
            }
        });

        if (!res.ok) throw new Error('Search failed');

        const data = await res.json();

        return data.tracks.items.map(song => ({
            id: song.id,
            name: song.name,
            artist: song.artists[0]?.name || 'Unknown',
            album: song.album.name,
            duration: formatTime(song.duration_ms),
            album_art: song.album.images[0]?.url
        }));

    } catch (err) {
        console.error('Search error:', err);
        return [];
    }
}

// Turn ms to min:sec
function formatTime(ms) 
{
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Color for mood dot
function getColor(v, e) 
{
    if (v > 0.6 && e > 0.6) return '#1db954';
    if (v > 0.6) return '#3b82f6';
    if (e > 0.6) return '#f97316';
    return '#8b5cf6';
} 

// Show mood results
function showMood(moodData) 
{
    document.getElementById('mood-name').textContent = moodData.mood;
    document.getElementById('mood-description').textContent = moodData.description;
    document.getElementById('confidence-fill').style.width = `${moodData.confidence * 100}%`;
    document.getElementById('confidence-text').textContent = `${Math.round(moodData.confidence * 100)}%`;
    document.getElementById('mood-dot').style.backgroundColor = getColor(moodData.valence, moodData.energy);
}

// Show playlist
function showPlaylist(tracks) 
{
    songs = tracks;
    const list = document.getElementById('track-list');
    list.innerHTML = '';

    tracks.forEach(t => {
        const el = document.createElement('div');
        el.className = 'track-item';
        el.onclick = () => window.open(t.external_urls.spotify, '_blank');

        el.innerHTML = `
            <div class="track-artwork">
                ${t.album_art ? `<img src="${t.album_art}" alt="Album cover">` : '<span>🎵</span>'}
            </div>
            <div class="track-info">
                <div class="track-name">${t.name}</div>
                <div class="track-artist">${t.artist}</div>
                <div class="track-album">${t.album}</div>
            </div>
            <div class="track-duration">${t.duration}</div>
        `;

        list.appendChild(el);
    });
}


// Show error
function showError(msg) 
{
    document.getElementById('error-message').textContent = msg;
    show('error-section');
}

// Main playlist generator
async function makePlaylist(rant, artist) 
{
    try {
        show('loading-section');
        const mood = checkMood(rant);

        let foundSongs = [];
        try {
            const q = `artist:"${artist}"`;
            foundSongs = await searchSongs(q, 10);
            if (foundSongs.length === 0) {
                foundSongs = await searchSongs(artist, 10);
            }
        } catch (err) {
            throw new Error('Spotify search failed');
        }

        if (foundSongs.length === 0) {
            throw new Error('No songs found for that artist');
        }

        showMood(mood);
        showPlaylist(foundSongs);
        show('mood-section');
        setTimeout(() => playlistBox.classList.remove('hidden'), 500);

    } catch (err) {
        console.error('Playlist error:', err);
        showError(err.message || 'Something went wrong');
    }
}

// Reset back to start
function resetAll() {
    show('intro-section');
    setTimeout(() => form.classList.remove('hidden'), 100);
    rantInput.value = '';
    artistInput.value = '';
    songs = [];
}




// Show a section
function show(id) {
    const all = [form, intro, loading, moodBox, playlistBox, errorBox];
    all.forEach(s => s.classList.add('hidden'));
    const sec = document.getElementById(id);
    if (sec) sec.classList.remove('hidden');
}



// Submit form
moodForm.addEventListener('submit', async (e) => 
{
    e.preventDefault();
    const rant = rantInput.value.trim();
    const artist = artistInput.value.trim();

    if (rant.length < 10) {
        alert('Please type at least 10 characters.');
        return;
    }

    if (!artist) {
        alert('Please give us your favorite artist.');
        return;
    }

    await makePlaylist(rant, artist);
});