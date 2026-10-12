/**
 * Holographic Map Video Storage Configuration
 * 
 * To make approved videos publicly available to ALL visitors across the internet:
 * 1. Create a free account at https://supabase.com and create a project.
 * 2. Set SUPABASE_URL and SUPABASE_ANON_KEY below.
 * 3. In your Supabase Dashboard SQL Editor, run supabase-manual-approval.sql.
 * 
 * 4. Go to Storage -> Create bucket named 'videos' -> Set Public to TRUE.
 *    Add storage policies allowing public INSERT and SELECT.
 */

const SUPABASE_URL = "https://rzrsuvnmyxgapeufxfwg.supabase.co/"; 
const SUPABASE_ANON_KEY = "sb_publishable_38oDVT8li0UWnWmmuamgTw_mcMr1niz";
const isSupabaseConfigured = SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

// Initialize Supabase Client if configured
let supabaseClient = null;
if (typeof supabase !== 'undefined' && isSupabaseConfigured) {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.warn("Supabase initialization failed, using IndexedDB local storage mode.", e);
    }
}

// --- IndexedDB Fallback for Local Storage & Instant Testing ---
const DB_NAME = "HoloMapDB";
const DB_VERSION = 1;
const STORE_NAME = "videos";

function openLocalDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveVideoLocally(videoRecord) {
    const db = await openLocalDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(videoRecord);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

async function getLocalVideos() {
    try {
        const db = await openLocalDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    } catch (e) {
        console.error("IndexedDB read error:", e);
        return [];
    }
}

function createUploadId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Global API Helper
window.HoloMapAPI = {
    isCloudEnabled: () => !!supabaseClient,
    getClient: () => supabaseClient,
    
    uploadVideo: async function({ title, description, file, lat, lng, onProgress }) {
        const id = createUploadId();
        const createdAt = new Date().toISOString();

        if (supabaseClient) {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const filePath = `${id}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('videos')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });

            if (uploadError) {
                throw new Error("Supabase Storage Error: " + uploadError.message);
            }

            const { data: publicUrlData } = supabaseClient
                .storage
                .from('videos')
                .getPublicUrl(filePath);

            const videoUrl = publicUrlData.publicUrl;

            // Insert Record into Database
            const videoRecord = {
                id,
                title: title || "全息定位影片",
                description: description || "",
                video_url: videoUrl,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                status: "pending"
            };
            // Pending rows are hidden by RLS, so insert without requesting them back.
            const { error: dbError } = await supabaseClient
                .from('public_map_videos')
                .insert([videoRecord]);

            if (dbError) {
                throw new Error("Supabase Database Error: " + dbError.message);
            }

            return { ...videoRecord, created_at: createdAt };
        } else {
            // Fallback: Read file into Data URL and store in IndexedDB
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onprogress = (e) => {
                    if (e.lengthComputable && onProgress) {
                        onProgress((e.loaded / e.total) * 100);
                    }
                };
                reader.onload = async () => {
                    const videoRecord = {
                        id,
                        title: title || "定位影片 (本地保存)",
                        description: description || "",
                        video_url: reader.result,
                        lat: parseFloat(lat),
                        lng: parseFloat(lng),
                        created_at: createdAt,
                        status: "approved",
                        is_local: true
                    };
                    try {
                        await saveVideoLocally(videoRecord);
                        resolve(videoRecord);
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });
        }
    },

    fetchUploadStatus: async function(uploadId) {
        const id = String(uploadId || '').trim().toLowerCase();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
            throw new Error("Invalid upload ID.");
        }

        // This public lookup must work without the SDK or a saved admin session.
        if (isSupabaseConfigured) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            try {
                const response = await fetch(new URL('/rest/v1/rpc/get_video_upload_status', SUPABASE_URL), {
                    method: 'POST',
                    headers: {
                        apikey: SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'omit',
                    cache: 'no-store',
                    body: JSON.stringify({ p_upload_id: id }),
                    signal: controller.signal
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Cloud status lookup failed.');
                if (!Array.isArray(data)) throw new Error('Invalid status lookup response.');
                if (data.length) return data[0];
            } catch (error) {
                if (error.name === 'AbortError' || error.name === 'TypeError') {
                    const connectionError = new Error('Could not connect to the upload status service.');
                    connectionError.code = 'STATUS_CONNECTION_ERROR';
                    throw connectionError;
                }
                throw error;
            } finally {
                clearTimeout(timeout);
            }
        }

        const localVideo = (await getLocalVideos()).find(video => video.id === id);
        if (localVideo) {
            return { id, status: localVideo.status, created_at: localVideo.created_at, is_local: true };
        }
        if (!isSupabaseConfigured) throw new Error("Cloud status lookup is unavailable.");
        return null;
    },

    fetchVideos: async function() {
        let videos = [];
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('public_map_videos')
                    .select('*')
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false });
                if (!error && data) {
                    videos = data;
                }
            } catch (e) {
                console.error("Failed to fetch cloud videos:", e);
            }
        }

        // Also fetch local IndexedDB videos
        const localVideos = await getLocalVideos();
        // Merge without duplicates
        const cloudIds = new Set(videos.map(v => v.id));
        for (const localVid of localVideos) {
            if (!cloudIds.has(localVid.id)) {
                videos.push(localVid);
            }
        }
        return videos;
    },

    getCurrentUser: async function() {
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) return null;
        return data.user;
    },

    signInAdmin: async function(email, password) {
        if (!supabaseClient) {
            throw new Error("Supabase is not configured.");
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw new Error(error.message);
        }

        return data.user;
    },

    signOutAdmin: async function() {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            throw new Error(error.message);
        }
    },

    fetchPendingVideos: async function() {
        if (!supabaseClient) {
            throw new Error("Supabase is not configured.");
        }

        const { data, error } = await supabaseClient
            .from('public_map_videos')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(error.message);
        }

        return data || [];
    },

    updateVideoStatus: async function(id, status) {
        if (!supabaseClient) {
            throw new Error("Supabase is not configured.");
        }

        if (!["approved", "rejected"].includes(status)) {
            throw new Error("Invalid approval status.");
        }

        const { data, error } = await supabaseClient
            .from('public_map_videos')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return data;
    }
};
