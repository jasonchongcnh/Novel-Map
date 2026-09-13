/**
 * Holographic Map Public Video Storage Configuration
 * 
 * To make videos publicly available to ALL visitors across the internet:
 * 1. Create a free account at https://supabase.com and create a project.
 * 2. Set SUPABASE_URL and SUPABASE_ANON_KEY below.
 * 3. In your Supabase Dashboard SQL Editor, run:
 * 
 *    CREATE TABLE IF NOT EXISTS public_map_videos (
 *      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *      title TEXT NOT NULL,
 *      description TEXT,
 *      video_url TEXT NOT NULL,
 *      lat DOUBLE PRECISION NOT NULL,
 *      lng DOUBLE PRECISION NOT NULL,
 *      created_at TIMESTAMPTZ DEFAULT NOW()
 *    );

 *    ALTER TABLE public_map_videos ENABLE ROW LEVEL SECURITY;
 *    CREATE POLICY "Allow public read" ON public_map_videos FOR SELECT USING (true);
 *    CREATE POLICY "Allow public insert" ON public_map_videos FOR INSERT WITH CHECK (true);
 * 
 * 4. Go to Storage -> Create bucket named 'videos' -> Set Public to TRUE.
 *    Add storage policies allowing public INSERT and SELECT.
 */

const SUPABASE_URL = "https://rzrsuvnmyxgapeufxfwg.supabase.co/"; 
const SUPABASE_ANON_KEY = "sb_publishable_38oDVT8li0UWnWmmuamgTw_mcMr1niz";

// Initialize Supabase Client if configured
let supabaseClient = null;
if (typeof supabase !== 'undefined' && SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY") {
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

// Global API Helper
window.HoloMapAPI = {
    isCloudEnabled: () => !!supabaseClient,
    
    uploadVideo: async function({ title, description, file, lat, lng, onProgress }) {
        const id = 'vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const createdAt = new Date().toISOString();

        if (supabaseClient) {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const filePath = `${id}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('videos')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) {
                throw new Error("Supabase Storage Error: " + uploadError.message);
            }

            const { data: publicUrlData } = supabaseClient
                .storage
                .from('videos')
                .getPublicUrl(filePath);

            const videoUrl = publicUrlData.publicUrl;

            // Insert Record into Database
            const { data: dbData, error: dbError } = await supabaseClient
                .from('public_map_videos')
                .insert([{
                    title: title || "全息定位影片",
                    description: description || "",
                    video_url: videoUrl,
                    lat: parseFloat(lat),
                    lng: parseFloat(lng)
                }])
                .select();

            if (dbError) {
                throw new Error("Supabase Database Error: " + dbError.message);
            }

            return dbData[0];
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
                        is_local: true
                    };
                    await saveVideoLocally(videoRecord);
                    resolve(videoRecord);
                };
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });
        }
    },

    fetchVideos: async function() {
        let videos = [];
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('public_map_videos')
                    .select('*')
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
    }
};
