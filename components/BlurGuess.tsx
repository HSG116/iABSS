
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { Eye, EyeOff, Search, Play, RotateCcw, Trophy, Image as ImageIcon, Trash2, Wand2, ChevronRight, ChevronLeft, LogOut, Home, Sparkles } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface BlurGuessProps {
  channelConnected: boolean;
  onHome: () => void;
}

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";

const ENGLISH_WORDS = [
  "Lion", "Tiger", "Elephant", "Giraffe", "Zebra", "Monkey", "Kangaroo", "Panda", "Koala", "Leopard",
  "Cheetah", "Wolf", "Fox", "Bear", "Polar Bear", "Rabbit", "Squirrel", "Deer", "Horse", "Donkey",
  "Camel", "Cow", "Sheep", "Goat", "Pig", "Chicken", "Duck", "Goose", "Turkey", "Eagle",
  "Hawk", "Falcon", "Owl", "Parrot", "Penguin", "Flamingo", "Peacock", "Swan", "Sparrow", "Pigeon",
  "Crow", "Seagull", "Whale", "Dolphin", "Shark", "Octopus", "Jellyfish", "Crab", "Lobster", "Shrimp",
  "Starfish", "Seahorse", "Turtle", "Frog", "Toad", "Snake", "Lizard", "Crocodile", "Alligator", "Chameleon",
  "Butterfly", "Bee", "Ant", "Spider", "Scorpion", "Mosquito", "Fly", "Beetle", "Ladybug", "Dragonfly",
  "Grasshopper", "Cricket", "Snail", "Slug", "Worm", "Apple", "Banana", "Orange", "Grape", "Strawberry",
  "Blueberry", "Raspberry", "Blackberry", "Cherry", "Peach", "Pear", "Plum", "Apricot", "Pineapple", "Mango",
  "Papaya", "Watermelon", "Melon", "Kiwi", "Lemon", "Lime", "Coconut", "Pomegranate", "Fig", "Date",
  "Avocado", "Tomato", "Potato", "Carrot", "Onion", "Garlic", "Ginger", "Pepper", "Cucumber", "Zucchini",
  "Eggplant", "Broccoli", "Cauliflower", "Cabbage", "Lettuce", "Spinach", "Kale", "Corn", "Peas", "Beans",
  "Mushroom", "Pumpkin", "Radish", "Celery", "Asparagus", "Artichoke", "Okra", "Turnip", "Beet", "Yam",
  "Sweet Potato", "Rice", "Wheat", "Oats", "Barley", "Quinoa", "Bread", "Pasta", "Noodle", "Pizza",
  "Burger", "Sandwich", "Soup", "Salad", "Steak", "Chicken", "Fish", "Sushi", "Taco", "Burrito",
  "Curry", "Rice", "Egg", "Cheese", "Milk", "Yogurt", "Butter", "Cream", "Ice Cream", "Cake",
  "Cookie", "Pie", "Donut", "Muffin", "Pancake", "Waffle", "Chocolate", "Candy", "Honey", "Jam",
  "Tea", "Coffee", "Juice", "Water", "Soda", "Wine", "Beer", "Chair", "Table", "Sofa",
  "Bed", "Lamp", "Desk", "Cabinet", "Shelf", "Mirror", "Clock", "Rug", "Curtain", "Pillow",
  "Blanket", "Door", "Window", "Wall", "Floor", "Ceiling", "Roof", "Stairs", "Elevator", "House",
  "Apartment", "Building", "School", "Library", "Hospital", "Bank", "Post Office", "Police Station", "Fire Station", "Park",
  "Garden", "Zoo", "Museum", "Cinema", "Theater", "Restaurant", "Cafe", "Hotel", "Airport", "Station",
  "Car", "Bus", "Train", "Bicycle", "Motorcycle", "Truck", "Van", "Taxi", "Boat", "Ship",
  "Airplane", "Helicopter", "Rocket", "Spaceship", "Traffic Light", "Road", "Bridge", "Tunnel", "Map", "Compass",
  "Phone", "Computer", "Laptop", "Tablet", "Camera", "Television", "Radio", "Speaker", "Headphones", "Microphone",
  "Keyboard", "Mouse", "Screen", "Battery", "Charger", "Cable", "Light Bulb", "Fan", "Heater", "Air Conditioner",
  "Washing Machine", "Dryer", "Fridge", "Oven", "Stove", "Microwave", "Toaster", "Blender", "Mixer", "Iron",
  "Vacuum", "Broom", "Mop", "Bucket", "Sponge", "Soap", "Shampoo", "Toothbrush", "Toothpaste", "Towel",
  "Comb", "Brush", "Razor", "Scissors", "Knife", "Fork", "Spoon", "Plate", "Bowl", "Cup",
  "Glass", "Bottle", "Jar", "Can", "Box", "Bag", "Backpack", "Wallet", "Purse", "Key",
  "Lock", "Umbrella", "Raincoat", "Hat", "Cap", "Scarf", "Gloves", "Jacket", "Coat", "Shirt",
  "T-shirt", "Blouse", "Sweater", "Dress", "Skirt", "Pants", "Jeans", "Shorts", "Socks", "Shoes",
  "Boots", "Sandals", "Slippers", "Watch", "Ring", "Necklace", "Bracelet", "Earrings", "Glasses", "Sunglasses",
  "Book", "Notebook", "Pen", "Pencil", "Eraser", "Ruler", "Paper", "Envelope", "Stamp", "Card",
  "Gift", "Toy", "Doll", "Ball", "Bat", "Racket", "Net", "Goal", "Tent", "Sleeping Bag",
  "Fire", "Water", "Earth", "Air", "Sun", "Moon", "Star", "Cloud", "Rain", "Snow",
  "Wind", "Storm", "Lightning", "Thunder", "Rainbow", "Mountain", "Hill", "Valley", "River", "Lake",
  "Ocean", "Sea", "Beach", "Island", "Desert", "Forest", "Jungle", "Tree", "Flower", "Grass",
  "Leaf", "Root", "Seed", "Fruit", "Vegetable", "Meat", "Bone", "Skin", "Hair", "Eye",
  "Ear", "Nose", "Mouth", "Tooth", "Tongue", "Lip", "Hand", "Finger", "Thumb", "Palm",
  "Arm", "Elbow", "Shoulder", "Leg", "Knee", "Foot", "Toe", "Heel", "Ankle", "Body",
  "Head", "Neck", "Chest", "Back", "Stomach", "Heart", "Brain", "Blood", "Sweat", "Tears",
  "Smile", "Laugh", "Cry", "Shout", "Whisper", "Sing", "Dance", "Run", "Walk", "Jump",
  "Sit", "Stand", "Sleep", "Dream", "Wake", "Eat", "Drink", "Cook", "Wash", "Clean",
  "Read", "Write", "Draw", "Paint", "Listen", "Speak", "Think", "Learn", "Teach", "Work",
  "Play", "Win", "Lose", "Buy", "Sell", "Give", "Take", "Open", "Close", "Push",
  "Pull", "Cut", "Paste", "Copy", "Delete", "Save", "Search", "Find", "Help", "Love",
  "Hate", "Like", "Dislike", "Happy", "Sad", "Angry", "Fear", "Surprise", "Disgust", "Bored",
  "Tired", "Hungry", "Thirsty", "Sick", "Healthy", "Strong", "Weak", "Fast", "Slow", "Big",
  "Small", "Tall", "Short", "Fat", "Thin", "Old", "Young", "New", "Good", "Bad",
  "High", "Low", "Hot", "Cold", "Warm", "Cool", "Dry", "Wet", "Hard", "Soft",
  "Rough", "Smooth", "Heavy", "Light", "Dark", "Bright", "Clean", "Dirty", "Rich", "Poor",
  "Cheap", "Expensive", "Free", "Busy", "Lazy", "Smart", "Stupid", "Funny", "Serious", "Kind",
  "Cruel", "Brave", "Coward", "Calm", "Nervous", "Shy", "Friendly", "Rude", "Polite", "Honest",
  "Liar", "True", "False", "Right", "Wrong", "Easy", "Difficult", "Simple", "Complex", "Beautiful",
  "Ugly", "Cute", "Scary", "Funny", "Strange", "Normal", "Loud", "Quiet", "Sweet", "Sour",
  "Bitter", "Salty", "Spicy", "Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Pink",
  "Brown", "Black", "White", "Gray", "Gold", "Silver", "One", "Two", "Three", "Four",
  "Five", "Six", "Seven", "Eight", "Nine", "Ten", "First", "Second", "Third", "Last",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Day", "Night", "Morning",
  "Afternoon", "Evening", "Week", "Month", "Year", "Time", "Hour", "Minute", "Second", "Now",
  "Today", "Tomorrow", "Yesterday", "Future", "Past", "History", "Science", "Math", "Art", "Music"
];

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const BlurGuess: React.FC<BlurGuessProps> = ({ channelConnected, onHome }) => {
  const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'WINNER'>('SETUP');
  const [arabicWord, setArabicWord] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blurLevel, setBlurLevel] = useState(100);
  const [timer, setTimer] = useState(0);
  const [winner, setWinner] = useState<{ name: string, avatar?: string, color?: string } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [recentMessages, setRecentMessages] = useState<{ user: string, content: string, color?: string }[]>([]);

  const gameStateRef = useRef(gameState);
  const arabicWordRef = useRef(arabicWord);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { arabicWordRef.current = arabicWord; }, [arabicWord]);

  const [isImageLoading, setIsImageLoading] = useState(false);

  useEffect(() => {
    if (photos.length > 0 && photos[photoIndex]) {
      setIsImageLoading(true);
      // Use 'large' instead of 'large2x' for faster loading (approx 50% smaller file size but good quality)
      const src = photos[photoIndex].src.large;

      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImageUrl(src);
        setIsImageLoading(false);
      };
      img.onerror = () => {
        // Fallback if large fails, though unlikely
        setIsImageLoading(false);
      }
    }
  }, [photos, photoIndex]);

  useEffect(() => {
    let interval: number;
    if (gameState === 'PLAYING') {
      interval = window.setInterval(() => setTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    // Stricter/Slower blur progression for more challenge
    if (timer < 10) setBlurLevel(100);
    else if (timer < 25) setBlurLevel(60);
    else if (timer < 45) setBlurLevel(30);
    else if (timer < 60) setBlurLevel(15);
    else setBlurLevel(0);
  }, [timer, gameState]);

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage(async (msg) => {
      if (gameStateRef.current !== 'PLAYING') return;
      setRecentMessages(prev => [{
        user: msg.user.username,
        content: msg.content,
        color: msg.user.color
      }, ...prev].slice(0, 5));

      if (msg.content.trim().toLowerCase() === arabicWordRef.current.trim().toLowerCase()) {
        const username = msg.user.username;
        const userWinner = { name: username, avatar: msg.user.avatar, color: msg.user.color };
        setWinner(userWinner);
        setGameState('WINNER');
        setBlurLevel(0);
        await leaderboardService.recordWin(userWinner.name, userWinner.avatar || '', 100);
      }
    });
    return cleanup;
  }, [channelConnected]);

  // Improved translation logic using Google Translate fallback
  const translateToArabic = async (text: string): Promise<string> => {
    if (!text) return '';
    try {
      // Use a more reliable translation mirror for Google Translate
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      return data[0][0][0] || text;
    } catch (e) {
      // Fallback to MyMemory if Google fails
      try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|en`);
        const data = await res.json();
        return data.responseData?.translatedText?.replace(/[.!?,]/g, '') || text;
      } catch (err) { return text; }
    }
  };

  const handleArabicChange = async (val: string) => {
    setArabicWord(val);
    if (val.length > 2) {
      setIsTranslating(true);
      const translated = await translateToArabic(val);
      setSearchQuery(translated);
      setIsTranslating(false);

      // Auto-fetch images behind the scenes
      if (translated) {
        setIsSearching(true);
        try {
          const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(translated)}&per_page=30`, {
            headers: { Authorization: PEXELS_API_KEY }
          });
          const data = await res.json();
          if (data.photos?.length > 0) {
            setPhotos(data.photos);
            setPhotoIndex(0);
          }
        } catch (e) { } finally { setIsSearching(false); }
      }
    }
  };

  const handleRandomWord = async () => {
    setIsTranslating(true);
    setIsSearching(true);
    setPhotos([]);
    setImageUrl(null);
    setPhotoIndex(0);

    const randomEnglish = ENGLISH_WORDS[Math.floor(Math.random() * ENGLISH_WORDS.length)];

    // Translate English -> Arabic for the "Answer"
    const arabicRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(randomEnglish)}`);
    const arabicData = await arabicRes.json();
    const arabicTranslation = arabicData[0][0][0];

    setArabicWord(arabicTranslation);
    setSearchQuery(randomEnglish); // Use English for Pexels search (Better results)

    // Fetch Images using English word
    try {
      const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(randomEnglish)}&per_page=30`, {
        headers: { Authorization: PEXELS_API_KEY }
      });
      const data = await res.json();
      if (data.photos?.length > 0) {
        setPhotos(data.photos);
        setPhotoIndex(0);
      }
    } catch (e) { } finally {
      setIsSearching(false);
      setIsTranslating(false);
    }
  };

  const resetGame = () => { setGameState('SETUP'); setWinner(null); setBlurLevel(100); setTimer(0); setPhotos([]); setImageUrl(null); setArabicWord(''); setSearchQuery(''); };

  return (
    <>
      <SidebarPortal>
        <div className="bg-[#080808] p-6 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl animate-in slide-in-from-right duration-500 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>

          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <ImageIcon size={14} className="text-red-600" /> مـحرك الـتخمين الـذكي
            </h4>
          </div>

          {gameState === 'SETUP' ? (
            <div className="space-y-6">
              {/* Single Input: Only Arabic solution */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">ادخـل الـكلمة بـالعربية</label>
                <div className="relative">
                  <input
                    value={arabicWord}
                    onChange={(e) => handleArabicChange(e.target.value)}
                    placeholder="مثال: أسد، سيارة، برج..."
                    className="w-full bg-black/60 border-2 border-white/5 rounded-2xl py-6 px-14 text-white font-black text-2xl outline-none focus:border-red-600 transition-all shadow-inner text-center"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    {(isTranslating || isSearching) && <div className="w-6 h-6 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />}
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-600">
                    <Sparkles size={24} className="animate-pulse" />
                  </div>
                </div>
                <p className="text-[9px] text-gray-600 font-bold italic pr-2">سيتم الترجمة والبحث عن الصور تلقائياً "خلف الستار"</p>
              </div>

              <button
                onClick={handleRandomWord}
                disabled={isTranslating || isSearching}
                className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all border border-blue-500/20 text-[10px]"
              >
                <Wand2 size={16} className={isTranslating ? "animate-spin" : ""} /> {isTranslating ? 'جاري السحر...' : 'كلمة عشوائية (Random)'}
              </button>

              {/* Preview Image Only in Sidebar for Privacy */}
              <div className="relative h-44 rounded-[2rem] overflow-hidden border-4 border-white/5 group shadow-2xl animate-in zoom-in bg-black/50">
                {isImageLoading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                  </div>
                )}
                {imageUrl && (
                  <>
                    <img src={imageUrl} className={`w-full h-full object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-50' : 'opacity-100'}`} alt="preview" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-between">
                      <button onClick={() => setPhotoIndex(p => (p - 1 + photos.length) % photos.length)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><ChevronRight size={24} /></button>
                      <span className="text-[10px] font-black text-white italic">صورة {photoIndex + 1} / {photos.length}</span>
                      <button onClick={() => setPhotoIndex(p => (p + 1) % photos.length)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><ChevronLeft size={24} /></button>
                    </div>
                    <div className="absolute top-4 right-4 bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg italic">مـعاينة الإدارة</div>
                  </>
                )}
              </div>

              <button
                onClick={() => setGameState('PLAYING')}
                disabled={!imageUrl || !arabicWord}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-black py-6 rounded-[2rem] text-xl shadow-[0_20px_50px_rgba(220,38,38,0.3)] hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-10 italic border-t-2 border-white/20 flex items-center justify-center gap-4"
              >
                <Play fill="currentColor" size={24} /> بـدء الـتحدي الآن
              </button>

              <button
                onClick={onHome}
                className="w-full bg-white/5 py-5 rounded-[1.5rem] text-[10px] font-black text-gray-500 hover:text-white hover:bg-white/10 border border-white/5 transition-all flex items-center justify-center gap-3 uppercase tracking-widest italic"
              >
                <Home size={18} /> الـعودة للـقائمة الـرئيسـية
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between shadow-xl">
                <div>
                  <div className="text-[9px] text-gray-500 mb-1 uppercase font-black tracking-widest">الإجـابة هـي</div>
                  <div className="text-2xl font-black text-white italic">{showSolution ? arabicWord : '••••••••'}</div>
                </div>
                <button onClick={() => setShowSolution(!showSolution)} className="w-12 h-12 flex items-center justify-center bg-red-600/10 text-red-500 rounded-full hover:bg-red-600 hover:text-white transition-all">
                  {showSolution ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
              <button onClick={resetGame} className="w-full bg-white/5 py-5 rounded-[1.5rem] text-xs font-black text-gray-400 hover:text-white border border-white/5 transition-all flex items-center justify-center gap-3">
                <RotateCcw size={18} /> جـولة جـديـدة
              </button>
              <button onClick={onHome} className="w-full bg-red-600/10 py-5 rounded-[1.5rem] text-xs font-black text-red-500 hover:bg-red-600/20 border border-red-500/20 transition-all flex items-center justify-center gap-3">
                <Home size={18} /> خـروج
              </button>
            </div>
          )}
        </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-8 relative overflow-hidden bg-black select-none">
        {/* Main Display: Static Info during Setup, Hidden image for privacy */}
        {gameState === 'SETUP' && (
          <div className="text-center animate-in fade-in zoom-in duration-1000">
            <div className="relative mb-10">
              <div className="absolute inset-0 bg-red-600 blur-[100px] opacity-10 animate-pulse"></div>
              <div className="w-32 h-32 bg-gradient-to-br from-red-600 to-red-900 rounded-[3rem] mx-auto flex items-center justify-center shadow-2xl relative border-2 border-white/10 rotate-12">
                <ImageIcon size={64} className="text-white drop-shadow-lg" />
              </div>
            </div>
            <h1 className="text-9xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-[0_20px_60px_rgba(255,255,255,0.1)]">تـخمين الـصورة</h1>
            <div className="mt-8 flex items-center justify-center gap-8">
              <div className="h-px w-20 bg-gradient-to-l from-transparent via-red-600 to-transparent"></div>
              <p className="text-red-500 font-black tracking-[0.6em] text-xs uppercase italic">ARENA GUESS ENGINE</p>
              <div className="h-px w-20 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
            </div>
          </div>
        )}

        {/* PLAYING MODE: Image is shown (Blurred) */}
        {gameState === 'PLAYING' && imageUrl && (
          <div className="relative w-full h-[90vh] flex flex-col items-center justify-center gap-10 animate-in fade-in slide-in-from-top-10 duration-700">
            <div className="relative group w-full max-w-6xl aspect-video rounded-[4rem] overflow-hidden border-[15px] border-[#16161a] shadow-[0_0_100px_rgba(0,0,0,0.8)] bg-zinc-900">
              {isImageLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                  <div className="w-16 h-16 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin mb-4" />
                  <span className="text-white font-black tracking-widest animate-pulse">جاري تحميل الصورة...</span>
                </div>
              )}
              <img
                src={imageUrl}
                className={`w-full h-full object-cover transition-all duration-1000 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                style={{ filter: `blur(${blurLevel}px)` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

              {/* HUD Overlays */}
              <div className="absolute top-10 inset-x-0 flex justify-center px-10 pointer-events-none">
                <div className="bg-red-600 text-white px-20 py-5 rounded-[2.5rem] font-black italic text-4xl shadow-[0_30px_60px_rgba(220,38,38,0.5)] border-t-2 border-white/20 animate-bounce tracking-tight">
                  خـمن الـصـورة!
                </div>
              </div>

              {/* Sleek Bottom HUD Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-10 flex items-end justify-between">
                <div className="flex gap-8">
                  <div className="glass-card bg-white/5 border border-white/10 px-10 py-5 rounded-[2rem] flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 font-black uppercase mb-1">الـوقت</span>
                    <span className="text-4xl font-black text-white font-mono">{timer}s</span>
                  </div>
                  <div className="glass-card bg-white/5 border border-white/10 px-10 py-5 rounded-[2rem] flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 font-black uppercase mb-1">الـضباب</span>
                    <span className="text-4xl font-black text-kick-green font-mono">{Math.round((blurLevel / 100) * 100)}%</span>
                  </div>
                </div>


              </div>
            </div>
          </div>
        )}

        {/* WINNER DISPLAY */}
        {gameState === 'WINNER' && winner && (
          <div className="text-center animate-in zoom-in duration-700 z-10 p-10">
            <div className="relative flex flex-col items-center">
              <div className="absolute inset-0 bg-amber-500 blur-[150px] opacity-10"></div>
              <Trophy size={200} className="text-[#FFD700] mb-10 animate-bounce drop-shadow-[0_0_80px_rgba(255,215,0,0.6)]" fill="currentColor" />
            </div>

            <h1 className="text-[12rem] font-black text-white italic tracking-tighter mb-8 uppercase drop-shadow-[0_20px_80px_rgba(0,0,0,1)] leading-none">{arabicWord}</h1>

            <div className="bg-[#050505]/80 backdrop-blur-3xl px-20 py-12 rounded-[5rem] border-2 border-red-600 inline-block shadow-[0_0_150px_rgba(255,0,0,0.3)] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
              <div className="text-red-600 font-black uppercase tracking-[0.8em] text-sm mb-6 italic">Champion Detected</div>

              <div className="flex items-center gap-10">
                <ProAvatar
                  url={winner.avatar}
                  username={winner.name}
                  size="w-32 h-32"
                  className="rounded-[2.5rem] shadow-2xl transition-transform hover:scale-110"
                />
                <div className="text-8xl font-black text-white italic tracking-tighter drop-shadow-lg">{winner.name}</div>
              </div>
            </div>

            <div className="mt-16 flex gap-8 justify-center">
              <button onClick={resetGame} className="px-16 py-6 bg-white text-black font-black text-3xl rounded-3xl hover:scale-110 active:scale-95 transition-all italic shadow-2xl flex items-center gap-3"><RotateCcw size={32} /> جـولة جـديـدة</button>
              <button onClick={onHome} className="px-16 py-6 bg-red-600/10 border border-red-600/30 text-red-500 font-black text-3xl rounded-3xl hover:bg-red-600 hover:text-white transition-all italic shadow-2xl">خـروج</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 50px rgba(220, 38, 38, 0.4); }
          50% { box-shadow: 0 0 80px rgba(220, 38, 38, 0.6); }
        }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
      `}</style>
    </>
  );
};
