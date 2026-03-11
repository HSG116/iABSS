import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, Users, Trophy, Clock, Volume2, ChevronLeft, User, Trash2, Sparkles, CheckCircle2, Loader2, Gauge, Zap, Star, LogOut, Home, Search, Globe, Target, ShieldCheck, Eye, Layers, Palette, Monitor } from 'lucide-react';
import { ProAvatar } from './ProAvatar';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';

interface LogoRoundProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface GameConfig {
    joinKeyword: string;
    maxPlayers: number;
    roundDuration: number;
    // isBlurred removed/ignored - always clear
    autoProgress: boolean;
    totalRounds: number;
    // New aesthetic settings
    showHints: boolean;
    difficulty: 'Easy' | 'Hard';
    soundEffects: boolean;
    streamerMode: boolean;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'PLAYING' | 'REVEAL' | 'FINALE';

interface Brand {
    name: string;
    domain: string;
    aliases: string[];
}

const POPULAR_BRANDS: Brand[] = [
    { name: 'Google', domain: 'google.com', aliases: ['قوقل', 'جوجل'] },
    { name: 'Apple', domain: 'apple.com', aliases: ['ابل', 'أبل'] },
    { name: 'Microsoft', domain: 'microsoft.com', aliases: ['مايكروسوفت'] },
    { name: 'Amazon', domain: 'amazon.com', aliases: ['امازون', 'أمازون'] },
    { name: 'Facebook', domain: 'facebook.com', aliases: ['فيسبوك', 'فيس بوك'] },
    { name: 'Instagram', domain: 'instagram.com', aliases: ['انستقرام', 'إنستغرام', 'انستجرام'] },
    { name: 'Twitter', domain: 'twitter.com', aliases: ['تويتر'] },
    { name: 'YouTube', domain: 'youtube.com', aliases: ['يوتيوب'] },
    { name: 'Netflix', domain: 'netflix.com', aliases: ['نتفلكس', 'نتفليكس'] },
    { name: 'Spotify', domain: 'spotify.com', aliases: ['سبوتيفاي'] },
    { name: 'Nike', domain: 'nike.com', aliases: ['نايكي', 'نايك'] },
    { name: 'Adidas', domain: 'adidas.com', aliases: ['اديداس', 'أديداس'] },
    { name: 'Coca-Cola', domain: 'cocacola.com', aliases: ['كوكاكولا', 'كوكا كولا'] },
    { name: 'Pepsi', domain: 'pepsi.com', aliases: ['ببسي', 'بيبسي'] },
    { name: 'McDonalds', domain: 'mcdonalds.com', aliases: ['ماكدونالدز', 'ماك'] },
    { name: 'Starbucks', domain: 'starbucks.com', aliases: ['ستارباكس'] },
    { name: 'Samsung', domain: 'samsung.com', aliases: ['سامسونج', 'سامسونغ'] },
    { name: 'Toyota', domain: 'toyota.com', aliases: ['تويوتا'] },
    { name: 'Mercedes', domain: 'mercedes-benz.com', aliases: ['مرسيدس'] },
    { name: 'BMW', domain: 'bmw.com', aliases: ['بي ام دبليو', 'بي ام'] },
    { name: 'Tesla', domain: 'tesla.com', aliases: ['تسلا'] },
    { name: 'Sony', domain: 'sony.com', aliases: ['سوني'] },
    { name: 'Disney', domain: 'disney.com', aliases: ['ديزني'] },
    { name: 'Visa', domain: 'visa.com', aliases: ['فيزا'] },
    { name: 'Mastercard', domain: 'mastercard.com', aliases: ['ماستركارد'] },
    { name: 'PayPal', domain: 'paypal.com', aliases: ['بايبال', 'باي بال'] },
    { name: 'Uber', domain: 'uber.com', aliases: ['اوبر', 'أوبر'] },
    { name: 'Airbnb', domain: 'airbnb.com', aliases: ['اير بي ان بي', 'ايربنب'] },
    { name: 'Snapchat', domain: 'snapchat.com', aliases: ['سناب شات', 'سناب'] },
    { name: 'TikTok', domain: 'tiktok.com', aliases: ['تيك توك'] },
    { name: 'WhatsApp', domain: 'whatsapp.com', aliases: ['واتساب', 'واتس اب'] },
    { name: 'Telegram', domain: 'telegram.org', aliases: ['تليجرام', 'تلغرام'] },
    { name: 'Discord', domain: 'discord.com', aliases: ['ديسكورد'] },
    { name: 'Slack', domain: 'slack.com', aliases: ['سلاك'] },
    { name: 'Adobe', domain: 'adobe.com', aliases: ['ادوبي', 'أدوبي'] },
    { name: 'Intel', domain: 'intel.com', aliases: ['انتل', 'أنتل'] },
    { name: 'Nvidia', domain: 'nvidia.com', aliases: ['نيفيديا', 'انفيديا'] },
    { name: 'Red Bull', domain: 'redbull.com', aliases: ['ريدبول', 'ريد بول'] },
    { name: 'Lego', domain: 'lego.com', aliases: ['ليجو', 'ليغو'] },
    { name: 'Ikea', domain: 'ikea.com', aliases: ['ايكيا', 'أيكيا'] },
    { name: 'Rolex', domain: 'rolex.com', aliases: ['رولكس'] },
    { name: 'Gucci', domain: 'gucci.com', aliases: ['قوتشي', 'غوتشي'] },
    { name: 'Louis Vuitton', domain: 'louisvuitton.com', aliases: ['لويس فيتون'] },
    { name: 'Chanel', domain: 'chanel.com', aliases: ['شانيل'] },
    { name: 'Hermes', domain: 'hermes.com', aliases: ['هيرميس'] },
    { name: 'Ferrari', domain: 'ferrari.com', aliases: ['فيراري'] },
    { name: 'Porsche', domain: 'porsche.com', aliases: ['بورش', 'بورشه'] },
    { name: 'Lamborghini', domain: 'lamborghini.com', aliases: ['لامبورجيني', 'لامبورغيني'] },
    { name: 'Bentley', domain: 'bentley.com', aliases: ['بنتلي'] },
    { name: 'Audi', domain: 'audi.com', aliases: ['اودي', 'أودي'] },
    { name: 'Volkswagen', domain: 'volkswagen.com', aliases: ['فولكس فاجن', 'فولكس واجن'] },
    { name: 'Ford', domain: 'ford.com', aliases: ['فورد'] },
    { name: 'Honda', domain: 'honda.com', aliases: ['هوندا'] },
    { name: 'Nissan', domain: 'nissan-global.com', aliases: ['نيسان'] },
    { name: 'Hyundai', domain: 'hyundai.com', aliases: ['هيونداي'] },
    { name: 'Kia', domain: 'kia.com', aliases: ['كيا'] },
    { name: 'Amex', domain: 'americanexpress.com', aliases: ['اميكس'] },
    { name: 'Goldman Sachs', domain: 'goldmansachs.com', aliases: ['غولدمان ساكس'] },
    { name: 'HSBC', domain: 'hsbc.com', aliases: ['اش اس بي سي'] },
    { name: 'Siemens', domain: 'siemens.com', aliases: ['سيمنز', 'سيمنس'] },
    { name: 'GE', domain: 'ge.com', aliases: ['جي اي'] },
    { name: 'Boeing', domain: 'boeing.com', aliases: ['بوينج', 'بوينغ'] },
    { name: 'Airbus', domain: 'airbus.com', aliases: ['ايرباص', 'أيرباص'] },
    { name: 'FedEx', domain: 'fedex.com', aliases: ['فيديكس'] },
    { name: 'UPS', domain: 'ups.com', aliases: ['يو بي اس'] },
    { name: 'DHL', domain: 'dhl.com', aliases: ['دي اتش ال'] },
    { name: 'Oracle', domain: 'oracle.com', aliases: ['اوراكل'] },
    { name: 'IBM', domain: 'ibm.com', aliases: ['اي بي ام'] },
    { name: 'HP', domain: 'hp.com', aliases: ['اتش بي'] },
    { name: 'Dell', domain: 'dell.com', aliases: ['ديل'] },
    { name: 'Cisco', domain: 'cisco.com', aliases: ['سيسكو'] },
    { name: 'Huawei', domain: 'huawei.com', aliases: ['هواوي'] },
    { name: 'Xiaomi', domain: 'mi.com', aliases: ['شاومي'] },
    { name: 'Oppo', domain: 'oppo.com', aliases: ['اوبو'] },
    { name: 'Vivo', domain: 'vivo.com', aliases: ['فيفو'] },
    { name: 'PlayStation', domain: 'playstation.com', aliases: ['بلايستيشن', 'سوني'] },
    { name: 'Xbox', domain: 'xbox.com', aliases: ['اكسبوكس', 'مايكروسوفت'] },
    { name: 'Nintendo', domain: 'nintendo.com', aliases: ['نينتيندو'] },
    { name: 'Twitch', domain: 'twitch.tv', aliases: ['تويتش'] },
    { name: 'Kick', domain: 'kick.com', aliases: ['كيك'] },
    { name: 'SoundCloud', domain: 'soundcloud.com', aliases: ['ساوند كلاود'] },
    { name: 'Pandora', domain: 'pandora.com', aliases: ['باندورا'] },
    { name: 'Roblox', domain: 'roblox.com', aliases: ['روبلوكس'] },
    { name: 'Minecraft', domain: 'minecraft.net', aliases: ['ماينكرافت'] },
    { name: 'Fortnite', domain: 'fortnite.com', aliases: ['فورتنايت'] },
    { name: 'Steam', domain: 'steampowered.com', aliases: ['ستيم'] },
    { name: 'Origin', domain: 'origin.com', aliases: ['اورجن'] },
    { name: 'Ubisoft', domain: 'ubisoft.com', aliases: ['يوبيسوفت'] },
    { name: 'Activision', domain: 'activision.com', aliases: ['اكتيفجن'] },
    { name: 'EA', domain: 'ea.com', aliases: ['اي ايه'] },
    { name: 'Nestle', domain: 'nestle.com', aliases: ['نستله'] },
    { name: 'Danone', domain: 'danone.com', aliases: ['دانون'] },
    { name: 'Kelloggs', domain: 'kelloggs.com', aliases: ['كيلوقز'] },
    { name: 'Heineken', domain: 'heineken.com', aliases: ['هاينكن'] },
    { name: 'Budweiser', domain: 'budweiser.com', aliases: ['بودوايزر'] },
    { name: 'Guinness', domain: 'guinness.com', aliases: ['جينيس'] },
    { name: 'KFC', domain: 'kfc.com', aliases: ['كنتاكي'] },
    { name: 'Burger King', domain: 'burgerking.com', aliases: ['برجر كنج'] },
    { name: 'Pizza Hut', domain: 'pizzahut.com', aliases: ['بيتزا هت'] },
    { name: 'Dominoes', domain: 'dominos.com', aliases: ['دومينوز بيتزا'] },
    { name: 'Subway', domain: 'subway.com', aliases: ['صب واي'] },
    { name: 'Taco Bell', domain: 'tacobell.com', aliases: ['تاكو بيل'] },
    { name: 'Wendy\'s', domain: 'wendys.com', aliases: ['وينديز'] },
    { name: 'Dunkin', domain: 'dunkindonuts.com', aliases: ['دنكن'] },
    { name: 'ZARA', domain: 'zara.com', aliases: ['زارا'] },
    { name: 'H&M', domain: 'hm.com', aliases: ['اتش اند ام'] },
    { name: 'Uniqlo', domain: 'uniqlo.com', aliases: ['يونيكلو'] },
    { name: 'Gap', domain: 'gap.com', aliases: ['قاب'] },
    { name: 'Levis', domain: 'levi.com', aliases: ['ليفايز'] },
    { name: 'L’Oréal', domain: 'loreal.com', aliases: ['لوريال'] },
    { name: 'Colgate', domain: 'colgate.com', aliases: ['كولجيت'] },
    { name: 'Gillette', domain: 'gillette.com', aliases: ['جيليت'] },
    { name: 'Pampers', domain: 'pampers.com', aliases: ['بامبرز'] },
    { name: 'Johnson & Johnson', domain: 'jnj.com', aliases: ['جونسون'] },
    { name: 'Pfizer', domain: 'pfizer.com', aliases: ['فايزر'] },
    { name: 'Moderna', domain: 'modernatx.com', aliases: ['موديرنا'] },
    { name: 'Shell', domain: 'shell.com', aliases: ['شل'] },
    { name: 'ExxonMobil', domain: 'exxonmobil.com', aliases: ['اكسون موبيل'] },
    { name: 'BP', domain: 'bp.com', aliases: ['بي بي'] },
    { name: 'Chevron', domain: 'chevron.com', aliases: ['شيفرون'] },
    { name: 'TotalEnergies', domain: 'totalenergies.com', aliases: ['توتال'] },
    { name: 'Amazon Web Services', domain: 'aws.amazon.com', aliases: ['اي دبليو اس'] },
    { name: 'Google Cloud', domain: 'cloud.google.com', aliases: ['جوجل كلاود'] },
    { name: 'Microsoft Azure', domain: 'azure.microsoft.com', aliases: ['ازور'] },
    { name: 'Zoom', domain: 'zoom.us', aliases: ['زوم'] },
    { name: 'Salesforce', domain: 'salesforce.com', aliases: ['سيلز فورس'] },
    { name: 'Shopify', domain: 'shopify.com', aliases: ['شوبيفاي'] },
    { name: 'Etsy', domain: 'etsy.com', aliases: ['اتسي'] },
    { name: 'eBay', domain: 'ebay.com', aliases: ['ايباي'] },
    { name: 'AliExpress', domain: 'aliexpress.com', aliases: ['علي اكسبرس'] },
    { name: 'Alibaba', domain: 'alibaba.com', aliases: ['علي بابا'] },
    { name: 'JD.com', domain: 'jd.com', aliases: ['جي دي'] },
    { name: 'Baidu', domain: 'baidu.com', aliases: ['بايدو'] },
    { name: 'Tencent', domain: 'tencent.com', aliases: ['تنسنت'] },
    { name: 'Panasonic', domain: 'panasonic.com', aliases: ['باناسونيك'] },
    { name: 'LG', domain: 'lg.com', aliases: ['ال جي'] },
    { name: 'Sharp', domain: 'sharp-world.com', aliases: ['شارب'] },
    { name: 'Toshiba', domain: 'toshiba.co.jp', aliases: ['توشيبا'] },
    { name: 'Canon', domain: 'canon.com', aliases: ['كانون'] },
    { name: 'Nikon', domain: 'nikon.com', aliases: ['نيكون'] },
    { name: 'Fuji', domain: 'fujifilm.com', aliases: ['فوجي'] },
    { name: 'Olympus', domain: 'olympus-global.com', aliases: ['اوليمبوس'] },
    { name: 'Casio', domain: 'casio.com', aliases: ['كاسيو'] },
    { name: 'Seiko', domain: 'seikowatches.com', aliases: ['سيكو'] },
    { name: 'Swatch', domain: 'swatch.com', aliases: ['سواتش'] },
    { name: 'Omega', domain: 'omegawatches.com', aliases: ['اوميغا'] },
    { name: 'Cartier', domain: 'cartier.com', aliases: ['كارتييه'] },
    { name: 'Tiffany', domain: 'tiffany.com', aliases: ['تيفاني'] },
    { name: 'Swarovski', domain: 'swarovski.com', aliases: ['سواروفسكي'] },
    { name: 'Prada', domain: 'prada.com', aliases: ['برادا'] },
    { name: 'Burberry', domain: 'burberry.com', aliases: ['بربري'] },
    { name: 'Dior', domain: 'dior.com', aliases: ['ديور'] },
    { name: 'Valentino', domain: 'valentino.com', aliases: ['فالنتينو'] },
    { name: 'Versace', domain: 'versace.com', aliases: ['فرزاتشي'] },
    { name: 'Armani', domain: 'armani.com', aliases: ['ارماني'] },
    { name: 'Ralph Lauren', domain: 'ralphlauren.com', aliases: ['رالف لورين'] },
    { name: 'Calvin Klein', domain: 'calvinklein.com', aliases: ['كالفن كلاين'] },
    { name: 'Tommy Hilfiger', domain: 'tommy.com', aliases: ['تومي'] },
    { name: 'Victoria\'s Secret', domain: 'victoriassecret.com', aliases: ['فيكتوريا سيكريت'] },
    { name: 'Under Armour', domain: 'underarmour.com', aliases: ['اندر ارمور'] },
    { name: 'Puma', domain: 'puma.com', aliases: ['بوما'] },
    { name: 'Reebok', domain: 'reebok.com', aliases: ['ريبوك'] },
    { name: 'New Balance', domain: 'newbalance.com', aliases: ['نيو بالانس'] },
    { name: 'ASICS', domain: 'asics.com', aliases: ['اسيكس'] },
    { name: 'Brooks', domain: 'brooksrunning.com', aliases: ['بروكس'] },
    { name: 'Mizuno', domain: 'mizuno.com', aliases: ['ميزونو'] },
    { name: 'YETI', domain: 'yeti.com', aliases: ['يتي'] },
    { name: 'GoPro', domain: 'gopro.com', aliases: ['جو برو'] },
    { name: 'Fitbit', domain: 'fitbit.com', aliases: ['فتبت'] },
    { name: 'Garmin', domain: 'garmin.com', aliases: ['جارمن'] },
    { name: 'Peloton', domain: 'onepeloton.com', aliases: ['بيلوتون'] },
    { name: 'Lululemon', domain: 'lululemon.com', aliases: ['لولو ليمون'] },
    { name: 'North Face', domain: 'thenorthface.com', aliases: ['نورث فيس'] },
    { name: 'Patagonia', domain: 'patagonia.com', aliases: ['باتاجونيا'] },
    { name: 'Columbia', domain: 'columbia.com', aliases: ['كولومبيا'] },
    { name: 'Vans', domain: 'vans.com', aliases: ['فانز'] },
    { name: 'Converse', domain: 'converse.com', aliases: ['كونفرس'] },
    { name: 'Timberland', domain: 'timberland.com', aliases: ['تمبرلاند'] },
    { name: 'Dr. Martens', domain: 'drmartens.com', aliases: ['دكتور مارتنز'] },
    { name: 'Ray-Ban', domain: 'ray-ban.com', aliases: ['ريبان'] },
    { name: 'Oakley', domain: 'oakley.com', aliases: ['اوكلي'] },
    { name: 'Luxottica', domain: 'luxottica.com', aliases: ['لوكسوتيكا'] },
    { name: 'Warby Parker', domain: 'warbyparker.com', aliases: ['واربي باركر'] },
    { name: 'Logitech', domain: 'logitech.com', aliases: ['لوجيتك'] },
    { name: 'Razer', domain: 'razer.com', aliases: ['رايزر'] },
    { name: 'Corsair', domain: 'corsair.com', aliases: ['كورسير'] },
    { name: 'SteelSeries', domain: 'steelseries.com', aliases: ['ستيل سيريز'] },
    { name: 'HyperX', domain: 'hyperx.com', aliases: ['هايبر اكس'] },
    { name: 'WD', domain: 'wd.com', aliases: ['دبليو دي'] },
    { name: 'Seagate', domain: 'seagate.com', aliases: ['سيجيت'] },
    { name: 'Kingston', domain: 'kingston.com', aliases: ['كينغستون'] },
    { name: 'SanDisk', domain: 'sandisk.com', aliases: ['سان ديسك'] },
    { name: 'Dropbox', domain: 'dropbox.com', aliases: ['دروب بوكس'] },
    { name: 'Box', domain: 'box.com', aliases: ['بوكس'] },
    { name: 'Deere', domain: 'deere.com', aliases: ['جون دير'] },
    { name: 'Caterpillar', domain: 'caterpillar.com', aliases: ['كاتربيلر'] },
    { name: '3M', domain: '3m.com', aliases: ['3 ام'] },
    { name: 'Honeywell', domain: 'honeywell.com', aliases: ['هانيويل'] },
    { name: 'General Dynamics', domain: 'gd.com', aliases: ['جنرال دايناميكس'] },
    { name: 'Lockheed Martin', domain: 'lockheedmartin.com', aliases: ['لوكهيد مارتن'] },
    { name: 'Northrop Grumman', domain: 'northropgrumman.com', aliases: ['نورثروب جرومان'] },
    { name: 'SpaceX', domain: 'spacex.com', aliases: ['سبيس اكس'] },
    { name: 'Blue Origin', domain: 'blueorigin.com', aliases: ['بلو اوريجن'] },
    { name: 'Virgin Galactic', domain: 'virgingalactic.com', aliases: ['فيرجن جالاكتيك'] },
    { name: 'Nokia', domain: 'nokia.com', aliases: ['نوكيا'] },
    { name: 'Ericsson', domain: 'ericsson.com', aliases: ['اريكسون'] },
    { name: 'Qualcomm', domain: 'qualcomm.com', aliases: ['كوالكوم'] },
    { name: 'Broadcom', domain: 'broadcom.com', aliases: ['برودكام'] },
    { name: 'AMD', domain: 'amd.com', aliases: ['اي ام دي'] },
    { name: 'MediaTek', domain: 'mediatek.com', aliases: ['ميديا تيك'] },
    { name: 'TSMC', domain: 'tsmc.com', aliases: ['تي اس ام سي'] },
    { name: 'Foxconn', domain: 'foxconn.com.tw', aliases: ['فوكسكون'] },
    { name: 'Reddit', domain: 'reddit.com', aliases: ['ريديت'] },
    { name: 'LinkedIn', domain: 'linkedin.com', aliases: ['لينكد إن', 'لينكدان'] },
    { name: 'Pinterest', domain: 'pinterest.com', aliases: ['بينتريست'] },
    { name: 'Quora', domain: 'quora.com', aliases: ['كورا'] },
    { name: 'Medium', domain: 'medium.com', aliases: ['ميديوم'] },
    { name: 'Tumblr', domain: 'tumblr.com', aliases: ['تمبلر'] },
    { name: 'Flickr', domain: 'flickr.com', aliases: ['فليكر'] },
    { name: 'Vimeo', domain: 'vimeo.com', aliases: ['فيميو'] },
    { name: 'Behance', domain: 'behance.net', aliases: ['بيهانس'] },
    { name: 'Dribbble', domain: 'dribbble.com', aliases: ['دريبل'] },
    { name: 'GitHub', domain: 'github.com', aliases: ['جيتهاب', 'قيت هاب'] },
    { name: 'GitLab', domain: 'gitlab.com', aliases: ['جيتلاب'] },
    { name: 'Stack Overflow', domain: 'stackoverflow.com', aliases: ['ستاك اوفر فلو'] },
    { name: 'Wikipedia', domain: 'wikipedia.org', aliases: ['ويكيبيديا'] },
    { name: 'IMDb', domain: 'imdb.com', aliases: ['اي ام دي بي'] },
    { name: 'Rotten Tomatoes', domain: 'rottentomatoes.com', aliases: ['روتن توميتوز'] },
    { name: 'IGN', domain: 'ign.com', aliases: ['اي جي ان'] },
    { name: 'GameSpot', domain: 'gamespot.com', aliases: ['جيم سبوت'] },
    { name: 'The Verge', domain: 'theverge.com', aliases: ['ذا فيرج'] },
    { name: 'TechCrunch', domain: 'techcrunch.com', aliases: ['تيك كرانش'] },
    { name: 'Wired', domain: 'wired.com', aliases: ['وايرد'] },
    { name: 'Forbes', domain: 'forbes.com', aliases: ['فوربس'] },
    { name: 'Bloomberg', domain: 'bloomberg.com', aliases: ['بلومبيرج'] },
    { name: 'BBC', domain: 'bbc.com', aliases: ['بي بي سي'] },
    { name: 'CNN', domain: 'cnn.com', aliases: ['سي ان ان'] },
    { name: 'Al Jazeera', domain: 'aljazeera.net', aliases: ['الجزيرة'] },
    { name: 'Yahoo', domain: 'yahoo.com', aliases: ['ياهو'] },
    { name: 'Bing', domain: 'bing.com', aliases: ['بينج'] },
    { name: 'DuckDuckGo', domain: 'duckduckgo.com', aliases: ['داك داك جو'] },
    { name: 'Brave', domain: 'brave.com', aliases: ['بريف'] },
    { name: 'Opera', domain: 'opera.com', aliases: ['اوبرا'] },
    { name: 'ProtonMail', domain: 'proton.me', aliases: ['بروتون'] },
    { name: 'Gmail', domain: 'gmail.com', aliases: ['جيميل'] },
    { name: 'Outlook', domain: 'outlook.com', aliases: ['اوتلوك'] },
    { name: 'WordPress', domain: 'wordpress.com', aliases: ['ووردبريس'] },
    { name: 'Wix', domain: 'wix.com', aliases: ['ويكس'] },
    { name: 'Squarespace', domain: 'squarespace.com', aliases: ['سكوير سبيس'] },
    { name: 'Substack', domain: 'substack.com', aliases: ['سوبستاك'] },
    { name: 'Patreon', domain: 'patreon.com', aliases: ['باتريون'] },
    { name: 'Fiverr', domain: 'fiverr.com', aliases: ['فايفر'] },
    { name: 'Upwork', domain: 'upwork.com', aliases: ['ابورك'] },
    { name: 'Canva', domain: 'canva.com', aliases: ['كانفا'] },
    { name: 'Figma', domain: 'figma.com', aliases: ['فيجما'] },
    { name: 'Trello', domain: 'trello.com', aliases: ['تريلو'] },
    { name: 'Asana', domain: 'asana.com', aliases: ['اسانا'] },
    { name: 'Notion', domain: 'notion.so', aliases: ['نوشن'] },
    { name: 'Evernote', domain: 'evernote.com', aliases: ['ايفرنوت'] },
    { name: 'Pocket', domain: 'getpocket.com', aliases: ['بوكيت'] },
    { name: 'Duolingo', domain: 'duolingo.com', aliases: ['دوولينجو'] },
    { name: 'Coursera', domain: 'coursera.org', aliases: ['كورسيرا'] },
    { name: 'Udemy', domain: 'udemy.com', aliases: ['يوديمي'] },
    { name: 'edX', domain: 'edx.org', aliases: ['ايدكس'] },
    { name: 'Khan Academy', domain: 'khanacademy.org', aliases: ['خان اكاديمي'] },
    { name: 'Glassdoor', domain: 'glassdoor.com', aliases: ['جلاس دور'] },
    { name: 'Indeed', domain: 'indeed.com', aliases: ['انديد'] },
    { name: 'Stripe', domain: 'stripe.com', aliases: ['سترايب'] },
    { name: 'Coinbase', domain: 'coinbase.com', aliases: ['كوينبيس'] },
    { name: 'Binance', domain: 'binance.com', aliases: ['بينانس'] },
    { name: 'OpenSea', domain: 'opensea.io', aliases: ['اوبن سي'] },
    { name: 'Discord', domain: 'discord.com', aliases: ['ديسكورد'] },
    { name: 'Steam', domain: 'steampowered.com', aliases: ['ستيم'] },
    { name: 'Twitch', domain: 'twitch.tv', aliases: ['تويتش'] },
    { name: 'Kick', domain: 'kick.com', aliases: ['كيك'] },
    { name: 'SoundCloud', domain: 'soundcloud.com', aliases: ['ساوند كلاود'] },
    { name: 'Roblox', domain: 'roblox.com', aliases: ['روبلوكس'] },
    { name: 'Minecraft', domain: 'minecraft.net', aliases: ['ماينكرافت'] },
    { name: 'Uber Eats', domain: 'ubereats.com', aliases: ['اوبر ايتس'] },
    { name: 'DoorDash', domain: 'doordash.com', aliases: ['دورداش'] },
    { name: 'Grubhub', domain: 'grubhub.com', aliases: ['جراب هاب'] },
    { name: 'Booking.com', domain: 'booking.com', aliases: ['بوكينج'] },
    { name: 'Expedia', domain: 'expedia.com', aliases: ['اكسبيديا'] },
    { name: 'Tripadvisor', domain: 'tripadvisor.com', aliases: ['تريب ادفايزر'] },
    { name: 'Skyscanner', domain: 'skyscanner.net', aliases: ['سكاي سكانر'] },
    { name: 'Zillow', domain: 'zillow.com', aliases: ['زيلو'] },
    { name: 'Hulu', domain: 'hulu.com', aliases: ['هولو'] },
    { name: 'Disney+', domain: 'disneyplus.com', aliases: ['ديزني بلس'] },
    { name: 'HBOMax', domain: 'hbomax.com', aliases: ['اتش بي او ماكس'] },
    { name: 'Paramount+', domain: 'paramountplus.com', aliases: ['باراماونت بلس'] },
    { name: 'Apple TV', domain: 'tv.apple.com', aliases: ['ابل تي في'] },
    { name: 'Amazon Prime', domain: 'primevideo.com', aliases: ['امازون برايم'] },
    { name: 'Shazam', domain: 'shazam.com', aliases: ['شازام'] },
    { name: 'Truecaller', domain: 'truecaller.com', aliases: ['تروكولر'] },
    { name: 'Avast', domain: 'avast.com', aliases: ['أفاست'] },
    { name: 'McAfee', domain: 'mcafee.com', aliases: ['ماكافي'] },
    { name: 'Norton', domain: 'norton.com', aliases: ['نورتون'] },
    { name: 'TeamViewer', domain: 'teamviewer.com', aliases: ['تيم فيور'] },
    { name: 'AnyDesk', domain: 'anydesk.com', aliases: ['اني ديسك'] },
    { name: 'Bitly', domain: 'bitly.com', aliases: ['بتلي'] },
    { name: 'Grammarly', domain: 'grammarly.com', aliases: ['جرامرلي'] },
    { name: 'NordVPN', domain: 'nordvpn.com', aliases: ['نورد في بي ان'] },
    { name: 'ExpressVPN', domain: 'expressvpn.com', aliases: ['اكسبريس في بي ان'] },
    { name: 'Malwarebytes', domain: 'malwarebytes.com', aliases: ['مالوير بايتس'] },
    { name: 'LastPass', domain: 'lastpass.com', aliases: ['لاست باس'] },
    { name: 'Bitdefender', domain: 'bitdefender.com', aliases: ['بت ديفندر'] },
    { name: 'Kaspersky', domain: 'kaspersky.com', aliases: ['كاسبرسكي'] },
    { name: 'Eset', domain: 'eset.com', aliases: ['ايسيت'] },
    { name: 'LogMeIn', domain: 'logmein.com', aliases: ['لوق مي ان'] },
    { name: 'GoDaddy', domain: 'godaddy.com', aliases: ['جو دادي'] },
    { name: 'Bluehost', domain: 'bluehost.com', aliases: ['بلوهوست'] },
    { name: 'HostGator', domain: 'hostgator.com', aliases: ['هوست جيتور'] },
    { name: 'DigitalOcean', domain: 'digitalocean.com', aliases: ['ديجيتال اوشن'] },
    { name: 'Cloudflare', domain: 'cloudflare.com', aliases: ['كلاود فلير'] },
    { name: 'Mailchimp', domain: 'mailchimp.com', aliases: ['ميل تشيمب'] },
    { name: 'HubSpot', domain: 'hubspot.com', aliases: ['هاب سبوت'] },
    { name: 'Zendesk', domain: 'zendesk.com', aliases: ['زين ديسك'] },
    { name: 'Intercom', domain: 'intercom.com', aliases: ['انتركم'] },
    { name: 'Typeform', domain: 'typeform.com', aliases: ['تايب فورم'] },
    { name: 'SurveyMonkey', domain: 'surveymonkey.com', aliases: ['سيرفي مونكي'] },
    { name: 'Hotjar', domain: 'hotjar.com', aliases: ['هوتجار'] },
    { name: 'Mixpanel', domain: 'mixpanel.com', aliases: ['ميكس بانل'] },
    { name: 'Tableau', domain: 'tableau.com', aliases: ['تابلو'] },
    { name: 'Splunk', domain: 'splunk.com', aliases: ['سبلانك'] },
    { name: 'Elastic', domain: 'elastic.co', aliases: ['الاستيك'] },
    { name: 'MongoDB', domain: 'mongodb.com', aliases: ['مونجو دي بي'] },
    { name: 'PostgreSQL', domain: 'postgresql.org', aliases: ['بوست جريس'] },
    { name: 'MySQL', domain: 'mysql.com', aliases: ['ماي اس كيو ال'] },
    { name: 'Redis', domain: 'redis.io', aliases: ['ريديس'] },
    { name: 'Docker', domain: 'docker.com', aliases: ['دوكر'] },
    { name: 'Kubernetes', domain: 'kubernetes.io', aliases: ['كوبرنيتيس'] },
    { name: 'Terraform', domain: 'terraform.io', aliases: ['تيرافورم'] },
    { name: 'CircleCI', domain: 'circleci.com', aliases: ['سيركل سي اي'] },
    { name: 'Travis CI', domain: 'travis-ci.com', aliases: ['ترافيس سي اي'] },
    { name: 'New Relic', domain: 'newrelic.com', aliases: ['نيو ريليك'] },
    { name: 'Datadog', domain: 'datadog.com', aliases: ['داتا دوق'] },
    { name: 'PagerDuty', domain: 'pagerduty.com', aliases: ['بيجر ديوتي'] },
    { name: 'Okta', domain: 'okta.com', aliases: ['اوكتا'] },
    { name: 'Auth0', domain: 'auth0.com', aliases: ['اوث زيرو'] },
    { name: 'Snagpad', domain: 'snagpad.com', aliases: ['سناج باد'] },
    { name: 'Glassdoor', domain: 'glassdoor.com', aliases: ['جلاس دور'] },
    { name: 'CareerBuilder', domain: 'careerbuilder.com', aliases: ['كارير بيلدر'] },
    { name: 'Monster', domain: 'monster.com', aliases: ['مونستر'] },
    { name: 'ZipRecruiter', domain: 'ziprecruiter.com', aliases: ['زيب ريكروتر'] },
    { name: 'Upwork', domain: 'upwork.com', aliases: ['ابورك'] },
    { name: 'Freelancer', domain: 'freelancer.com', aliases: ['فريلانسر'] },
    { name: 'Fiverr', domain: 'fiverr.com', aliases: ['فايفر'] },
    { name: 'Toptal', domain: 'toptal.com', aliases: ['توبتول'] },
    { name: 'Guru', domain: 'guru.com', aliases: ['جورو'] },
    { name: '99designs', domain: '99designs.com', aliases: ['99 ديزاينز'] },
    { name: 'Dribbble', domain: 'dribbble.com', aliases: ['دريبل'] },
    { name: 'Behance', domain: 'behance.net', aliases: ['بيهانس'] },
    { name: 'DeviantArt', domain: 'deviantart.com', aliases: ['ديفيانت ارت'] },
    { name: 'ArtStation', domain: 'artstation.com', aliases: ['ارت ستيشن'] },
    { name: 'Unsplash', domain: 'unsplash.com', aliases: ['انسبلاش'] },
    { name: 'Pexels', domain: 'pexels.com', aliases: ['بيكسلز'] },
    { name: 'Pixabay', domain: 'pixabay.com', aliases: ['بيكساباي'] },
    { name: 'Shutterstock', domain: 'shutterstock.com', aliases: ['شترستوك'] },
    { name: 'Getty Images', domain: 'gettyimages.com', aliases: ['جيتي ايميجز'] },
    { name: 'iStock', domain: 'istockphoto.com', aliases: ['اي ستوك'] },
    { name: 'Adobe Stock', domain: 'stock.adobe.com', aliases: ['ادوبي ستوك'] },
    { name: 'Iconfinder', domain: 'iconfinder.com', aliases: ['ايكون فايندر'] },
    { name: 'Flaticon', domain: 'flaticon.com', aliases: ['فلات ايكون'] },
    { name: 'FontAwesome', domain: 'fontawesome.com', aliases: ['فونت اوسم'] },
    { name: 'Google Fonts', domain: 'fonts.google.com', aliases: ['جوجل فونتس'] },
    { name: 'Vercel', domain: 'vercel.com', aliases: ['فيرسل'] },
    { name: 'Netlify', domain: 'netlify.com', aliases: ['نيتليفاي'] },
    { name: 'Heroku', domain: 'heroku.com', aliases: ['هيروكو'] },
    { name: 'Linode', domain: 'linode.com', aliases: ['لينود'] },
    { name: 'Vultr', domain: 'vultr.com', aliases: ['فولتير'] },
    { name: 'Twilio', domain: 'twilio.com', aliases: ['تويليو'] },
    { name: 'SendGrid', domain: 'sendgrid.com', aliases: ['سند جريد'] },
    { name: 'Mailgun', domain: 'mailgun.com', aliases: ['ميل جن'] },
    { name: 'Postmark', domain: 'postmarkapp.com', aliases: ['بوست مارك'] },
    { name: 'Algolia', domain: 'algolia.com', aliases: ['الجوليا'] },
    { name: 'Elasticsearch', domain: 'elastic.co', aliases: ['الاستيك سيرش'] },
    { name: 'Pusher', domain: 'pusher.com', aliases: ['بوشر'] },
    { name: 'Ably', domain: 'ably.com', aliases: ['ابلي'] },
    { name: 'Firebase', domain: 'firebase.google.com', aliases: ['فايربيس'] },
    { name: 'Supabase', domain: 'supabase.com', aliases: ['سوبابيس'] },
    { name: 'Hasura', domain: 'hasura.io', aliases: ['هاسورا'] },
    { name: 'Apollo GraphQL', domain: 'apollographql.com', aliases: ['ابولو'] },
    { name: 'Prisma', domain: 'prisma.io', aliases: ['بريزما'] },
    { name: 'Sentry', domain: 'sentry.io', aliases: ['سنتري'] },
    { name: 'LogRocket', domain: 'logrocket.com', aliases: ['لوج روكيت'] },
    { name: 'FullStory', domain: 'fullstory.com', aliases: ['فول ستوري'] },
    { name: 'Segment', domain: 'segment.com', aliases: ['سيجمنت'] },
    { name: 'Amplitude', domain: 'amplitude.com', aliases: ['امبليتيود'] },
    { name: 'LaunchDarkly', domain: 'launchdarkly.com', aliases: ['لونش داركلي'] },
    { name: 'Optimizely', domain: 'optimizely.com', aliases: ['اوبتيمايزلي'] },
    { name: 'Circle', domain: 'circle.com', aliases: ['سيركل'] },
    { name: 'Discord', domain: 'discord.com', aliases: ['ديسكورد'] },
    { name: 'Slack', domain: 'slack.com', aliases: ['سلاك'] },
    { name: 'Microsoft Teams', domain: 'microsoft.com/teams', aliases: ['تيمز'] },
    { name: 'Zoom', domain: 'zoom.us', aliases: ['زوم'] },
    { name: 'Cisco Webex', domain: 'webex.com', aliases: ['ويبكس'] },
    { name: 'GoToMeeting', domain: 'goto.com/meeting', aliases: ['جو تو ميتينج'] },
    { name: 'Skype', domain: 'skype.com', aliases: ['سكايب'] },
    { name: 'Viber', domain: 'viber.com', aliases: ['فايبر'] },
    { name: 'WeChat', domain: 'wechat.com', aliases: ['وي شات'] },
    { name: 'Line', domain: 'line.me', aliases: ['لاين'] },
    { name: 'Kakaotalk', domain: 'kakao.com', aliases: ['كاكاو توك'] },
    { name: 'Signal', domain: 'signal.org', aliases: ['سيجنال'] },
    { name: 'Threema', domain: 'threema.ch', aliases: ['ثريما'] },
    { name: 'Wickr', domain: 'wickr.com', aliases: ['ويكر'] },
    { name: 'Basecamp', domain: 'basecamp.com', aliases: ['بيس كامب'] },
    { name: 'Jira', domain: 'atlassian.com/software/jira', aliases: ['جيرا'] },
    { name: 'Confluence', domain: 'atlassian.com/software/confluence', aliases: ['كونفلوينس'] },
    { name: 'Bitbucket', domain: 'bitbucket.org', aliases: ['بت باكت'] },
    { name: 'Bamboo', domain: 'atlassian.com/software/bamboo', aliases: ['بامبو'] },
    { name: 'SourceTree', domain: 'sourcetreeapp.com', aliases: ['سورس تري'] },
    { name: 'Fork', domain: 'git-fork.com', aliases: ['فورك'] },
    { name: 'Tower', domain: 'git-tower.com', aliases: ['تاور'] },
    { name: 'GitKraken', domain: 'gitkraken.com', aliases: ['جيت كراكن'] },
    { name: 'Sublime Text', domain: 'sublimetext.com', aliases: ['سوبلايم'] },
    { name: 'VS Code', domain: 'code.visualstudio.com', aliases: ['في اس كود'] },
    { name: 'IntelliJ IDEA', domain: 'jetbrains.com/idea', aliases: ['انتليج'] },
    { name: 'WebStorm', domain: 'jetbrains.com/webstorm', aliases: ['ويب ستورم'] },
    { name: 'PyCharm', domain: 'jetbrains.com/pycharm', aliases: ['باي تشارم'] },
    { name: 'CLion', domain: 'jetbrains.com/clion', aliases: ['سي ليون'] },
    { name: 'Rider', domain: 'jetbrains.com/rider', aliases: ['رايدر'] },
    { name: 'DataGrip', domain: 'jetbrains.com/datagrip', aliases: ['داتا جريب'] },
    { name: 'PhpStorm', domain: 'jetbrains.com/phpstorm', aliases: ['بي اتش بي ستورم'] },
    { name: 'RubyMine', domain: 'jetbrains.com/rubymine', aliases: ['روبي ماين'] },
    { name: 'AppCode', domain: 'jetbrains.com/objc', aliases: ['اب كود'] },
    { name: 'GoLand', domain: 'jetbrains.com/go', aliases: ['جو لاند'] },
    { name: 'Fleet', domain: 'jetbrains.com/fleet', aliases: ['فليت'] },
    { name: 'Postman', domain: 'postman.com', aliases: ['بوست مان'] },
    { name: 'Insomnia', domain: 'insomnia.rest', aliases: ['انسومنيا'] },
    { name: 'Charles Proxy', domain: 'charlesproxy.com', aliases: ['تشارلز'] },
    { name: 'Fiddler', domain: 'telerik.com/fiddler', aliases: ['فيدلر'] },
    { name: 'Wireshark', domain: 'wireshark.org', aliases: ['واير شارك'] },
    { name: 'Burp Suite', domain: 'portswigger.net', aliases: ['بيرب سويت'] },
    { name: 'Metasploit', domain: 'metasploit.com', aliases: ['ميتا سبوليت'] },
    { name: 'Kali Linux', domain: 'kali.org', aliases: ['كالي لينكس'] },
    { name: 'Ubuntu', domain: 'ubuntu.com', aliases: ['اوبونتو'] },
    { name: 'Debian', domain: 'debian.org', aliases: ['ديبيان'] },
    { name: 'CentOS', domain: 'centos.org', aliases: ['سنت او اس'] },
    { name: 'Fedora', domain: 'fedoraproject.org', aliases: ['فيدورا'] },
    { name: 'Arch Linux', domain: 'archlinux.org', aliases: ['آرتش لينكس'] },
    { name: 'Manjaro', domain: 'manjaro.org', aliases: ['مانجارو'] },
    { name: 'Mint', domain: 'linuxmint.com', aliases: ['لينكس منت'] },
    { name: 'Red Hat', domain: 'redhat.com', aliases: ['ريد هات'] },
    { name: 'SUSE', domain: 'suse.com', aliases: ['سوزي'] },
    { name: 'FreeBSD', domain: 'freebsd.org', aliases: ['فري بي اس دي'] },
    { name: 'OpenBSD', domain: 'openbsd.org', aliases: ['اوبن بي اس دي'] },
    { name: 'NetBSD', domain: 'netbsd.org', aliases: ['نت بي اس دي'] },
    { name: 'Solaris', domain: 'oracle.com/solaris', aliases: ['سولاريس'] },
    { name: 'React', domain: 'reactjs.org', aliases: ['رياكت'] },
    { name: 'Vue.js', domain: 'vuejs.org', aliases: ['فيو'] },
    { name: 'Angular', domain: 'angular.io', aliases: ['انجلر'] },
    { name: 'Svelte', domain: 'svelte.dev', aliases: ['سفلت'] },
    { name: 'Next.js', domain: 'nextjs.org', aliases: ['نيكست'] },
    { name: 'Nuxt.js', domain: 'nuxtjs.org', aliases: ['ناكست'] },
    { name: 'Gatsby', domain: 'gatsbyjs.com', aliases: ['جاتسبي'] },
    { name: 'Remix', domain: 'remix.run', aliases: ['ريميكس'] },
    { name: 'SolidJS', domain: 'solidjs.com', aliases: ['سوليد'] },
    { name: 'Qwik', domain: 'qwik.builder.io', aliases: ['كويك'] },
    { name: 'Astor', domain: 'astro.build', aliases: ['استرو'] },
    { name: 'Tailwind CSS', domain: 'tailwindcss.com', aliases: ['تيلويند'] },
    { name: 'Bootstrap', domain: 'getbootstrap.com', aliases: ['بوتستراب'] },
    { name: 'Sass', domain: 'sass-lang.com', aliases: ['ساس'] },
    { name: 'Less', domain: 'lesscss.org', aliases: ['ليس'] },
    { name: 'Stylus', domain: 'stylus-lang.com', aliases: ['ستايلس'] },
    { name: 'PostCSS', domain: 'postcss.org', aliases: ['بوست سي اس اس'] },
    { name: 'Webpack', domain: 'webpack.js.org', aliases: ['ويب باك'] },
    { name: 'Rollup', domain: 'rollupjs.org', aliases: ['رول اب'] },
    { name: 'Parcel', domain: 'parceljs.org', aliases: ['بارسل'] },
    { name: 'Vite', domain: 'vitejs.dev', aliases: ['فايت'] },
    { name: 'Esbuild', domain: 'esbuild.github.io', aliases: ['ايس بيلد'] },
    { name: 'SWC', domain: 'swc.rs', aliases: ['اس دبليو سي'] },
    { name: 'Babel', domain: 'babeljs.io', aliases: ['بابل'] },
    { name: 'TypeScript', domain: 'typescriptlang.org', aliases: ['تايب سكريبت'] },
    { name: 'JavaScript', domain: 'javascript.com', aliases: ['جافا سكريبت'] },
    { name: 'Python', domain: 'python.org', aliases: ['بايثون'] },
    { name: 'Java', domain: 'java.com', aliases: ['جافا'] },
    { name: 'C++', domain: 'isocpp.org', aliases: ['سي بلس بلس'] },
    { name: 'C#', domain: 'dotnet.microsoft.com/languages/csharp', aliases: ['سي شارب'] },
    { name: 'Go', domain: 'go.dev', aliases: ['جو لاند'] },
    { name: 'Rust', domain: 'rust-lang.org', aliases: ['رست'] },
    { name: 'Swift', domain: 'swift.org', aliases: ['سويفت'] },
    { name: 'Kotlin', domain: 'kotlinlang.org', aliases: ['كوتلن'] },
    { name: 'PHP', domain: 'php.net', aliases: ['بي اتش بي'] },
    { name: 'Ruby', domain: 'ruby-lang.org', aliases: ['روبي'] },
    { name: 'Rust', domain: 'rust-lang.org', aliases: ['رست'] },
    { name: 'Dart', domain: 'dart.dev', aliases: ['دارت'] },
    { name: 'Scala', domain: 'scala-lang.org', aliases: ['سكالا'] },
    { name: 'Haskell', domain: 'haskell.org', aliases: ['هاسكل'] },
    { name: 'Elixir', domain: 'elixir-lang.org', aliases: ['الكسير'] },
    { name: 'Clojure', domain: 'clojure.org', aliases: ['كلوجر'] },
    { name: 'Erlang', domain: 'erlang.org', aliases: ['ايرلانج'] },
    { name: 'F#', domain: 'fsharp.org', aliases: ['اف شارب'] },
    { name: 'Lua', domain: 'lua.org', aliases: ['لوا'] },
    { name: 'Julia', domain: 'julialang.org', aliases: ['جوليا'] },
    { name: 'Perl', domain: 'perl.org', aliases: ['بيرل'] },
    { name: 'R Language', domain: 'r-project.org', aliases: ['ار'] },
    { name: 'SQL', domain: 'sql.org', aliases: ['اس كيو ال'] },
    { name: 'NoSQL', domain: 'nosql-database.org', aliases: ['نو اس كيو ال'] },
    { name: 'GraphQL', domain: 'graphql.org', aliases: ['جراف كيو ال'] },
    { name: 'Redis', domain: 'redis.io', aliases: ['ريديس'] },
    { name: 'Memcached', domain: 'memcached.org', aliases: ['ميم كاشد'] },
    { name: 'RabbitMQ', domain: 'rabbitmq.com', aliases: ['رابت ام كيو'] },
    { name: 'Kafka', domain: 'kafka.apache.org', aliases: ['كافكا'] },
    { name: 'ActiveMQ', domain: 'activemq.apache.org', aliases: ['اكتيف ام كيو'] },
    { name: 'NATS', domain: 'nats.io', aliases: ['ناتس'] },
    { name: 'ZeroMQ', domain: 'zeromq.org', aliases: ['زيرو ام كيو'] },
    { name: 'Socket.io', domain: 'socket.io', aliases: ['سوكيت اي او'] },
    { name: 'WebRTC', domain: 'webrtc.org', aliases: ['ويب ار تي'] },
    { name: 'WebAssembly', domain: 'webassembly.org', aliases: ['ويب اسيمبلي'] },
    { name: 'Docker', domain: 'docker.com', aliases: ['دوكر'] },
    { name: 'Podman', domain: 'podman.io', aliases: ['بودمان'] },
    { name: 'LXC', domain: 'linuxcontainers.org', aliases: ['ال اكس سي'] },
    { name: 'Vagrant', domain: 'vagrantup.com', aliases: ['فاجرانت'] },
    { name: 'Ansible', domain: 'ansible.com', aliases: ['انسبرل'] },
    { name: 'Puppet', domain: 'puppet.com', aliases: ['بابت'] },
    { name: 'Chef', domain: 'chef.io', aliases: ['شيف'] },
    { name: 'SaltStack', domain: 'saltproject.io', aliases: ['سولت ستاك'] },
    { name: 'Jenkins', domain: 'jenkins.io', aliases: ['جينكنز'] },
    { name: 'GitHub Actions', domain: 'github.com/features/actions', aliases: ['جيتهاب اكشنز'] },
    { name: 'GitLab CI', domain: 'about.gitlab.com/stages-devops-lifecycle/continuous-integration', aliases: ['جيتلاب سي اي'] },
    { name: 'Azure DevOps', domain: 'azure.microsoft.com/services/devops', aliases: ['ازور ديف اوبس'] },
    { name: 'Bitbucket Pipelines', domain: 'bitbucket.org/product/features/pipelines', aliases: ['بايبلاينز'] },
    { name: 'CircleCI', domain: 'circleci.com', aliases: ['سيركل سي اي'] },
    { name: 'Travis CI', domain: 'travis-ci.com', aliases: ['ترافيس سي اي'] },
    { name: 'AppVeyor', domain: 'appveyor.com', aliases: ['اب فيور'] },
    { name: 'CodeShip', domain: 'cloudbees.com/products/codeship', aliases: ['كود شيب'] },
    { name: 'Drone', domain: 'drone.io', aliases: ['درون'] },
    { name: 'Buildkite', domain: 'buildkite.com', aliases: ['بيلد كايت'] },
    { name: 'SonarQube', domain: 'sonarqube.org', aliases: ['سونار كيوب'] },
    { name: 'CodeClimate', domain: 'codeclimate.com', aliases: ['كود كلايمت'] },
    { name: 'Coveralls', domain: 'coveralls.io', aliases: ['كوفرولز'] },
    { name: 'Codecov', domain: 'codecov.io', aliases: ['كود كوف'] },
    { name: 'AWS Lambda', domain: 'aws.amazon.com/lambda', aliases: ['لامبدا'] },
    { name: 'Google Cloud Functions', domain: 'cloud.google.com/functions', aliases: ['جوجل فنكشنز'] },
    { name: 'Azure Functions', domain: 'azure.microsoft.com/services/functions', aliases: ['ازور فنكشنز'] },
    { name: 'OpenFaaS', domain: 'openfaas.com', aliases: ['اوبن فاس'] },
    { name: 'Knative', domain: 'knative.dev', aliases: ['كنيتيف'] },
    { name: 'Serverless Framework', domain: 'serverless.com', aliases: ['سيرفرليس'] },
    { name: 'AWS S3', domain: 'aws.amazon.com/s3', aliases: ['اس 3'] },
    { name: 'Google Cloud Storage', domain: 'cloud.google.com/storage', aliases: ['جوجل ستورج'] },
    { name: 'Azure Blob Storage', domain: 'azure.microsoft.com/services/storage/blobs', aliases: ['بلوب ستورج'] },
    { name: 'MinIO', domain: 'min.io', aliases: ['مين اي او'] },
    { name: 'Ceph', domain: 'ceph.com', aliases: ['سيف'] },
    { name: 'GlusterFS', domain: 'gluster.org', aliases: ['جلوستر'] },
    { name: 'IPFS', domain: 'ipfs.tech', aliases: ['اي بي اف اس'] },
    { name: 'Arweave', domain: 'arweave.org', aliases: ['ارفيف'] },
    { name: 'Filecoin', domain: 'filecoin.io', aliases: ['فايل كوين'] },
    { name: 'Storj', domain: 'storj.io', aliases: ['ستورج'] },
    { name: 'Siacoin', domain: 'sia.tech', aliases: ['سيا كوين'] },
    { name: 'Nginx', domain: 'nginx.org', aliases: ['انجين اكس'] },
    { name: 'Apache', domain: 'apache.org', aliases: ['اباتشي'] },
    { name: 'Caddy', domain: 'caddyserver.com', aliases: ['كادي'] },
    { name: 'Traefik', domain: 'traefik.io', aliases: ['ترافيك'] },
    { name: 'HAProxy', domain: 'haproxy.org', aliases: ['اتش اي بروكسي'] },
    { name: 'Envoy', domain: 'envoyproxy.io', aliases: ['انفوي'] },
    { name: 'Istio', domain: 'istio.io', aliases: ['ايستيو'] },
    { name: 'Linkerd', domain: 'linkerd.io', aliases: ['لينكيرد'] },
    { name: 'Consul', domain: 'consul.io', aliases: ['كونسول'] },
    { name: 'Vault', domain: 'vaultproject.io', aliases: ['فولت'] },
    { name: 'Nomad', domain: 'nomadproject.io', aliases: ['نوماد'] },
    { name: 'Boundary', domain: 'boundaryproject.io', aliases: ['باوندري'] },
    { name: 'Waypoint', domain: 'waypointproject.io', aliases: ['وايبوينت'] },
    { name: 'Vagrant', domain: 'vagrantup.com', aliases: ['فاجرانت'] },
    { name: 'Packer', domain: 'packer.io', aliases: ['باكر'] },
    { name: 'GitHub Desktop', domain: 'desktop.github.com', aliases: ['جيتهاب ديسكتوب'] },
    { name: 'Sourcetree', domain: 'sourcetreeapp.com', aliases: ['سورس تري'] },
    { name: 'Fork', domain: 'git-fork.com', aliases: ['فورك'] },
    { name: 'Tower', domain: 'git-tower.com', aliases: ['تاور'] },
    { name: 'Gitkraken', domain: 'gitkraken.com', aliases: ['جيت كراكن'] },
    { name: 'Postman', domain: 'postman.com', aliases: ['بوست مان'] },
    { name: 'Insomnia', domain: 'insomnia.rest', aliases: ['انسومنيا'] },
    { name: 'Paw', domain: 'paw.cloud', aliases: ['باو'] },
    { name: 'SoapUI', domain: 'soapui.org', aliases: ['سوب يو اي'] },
    { name: 'Katalon', domain: 'katalon.com', aliases: ['كاتالون'] },
    { name: 'Selenium', domain: 'selenium.dev', aliases: ['سيلينيوم'] },
    { name: 'Cypress', domain: 'cypress.io', aliases: ['سایبرس'] },
    { name: 'Playwright', domain: 'playwright.dev', aliases: ['بلاي رايت'] },
    { name: 'Puppeteer', domain: 'pptr.dev', aliases: ['بابيتير'] },
    { name: 'Jest', domain: 'jestjs.io', aliases: ['جيست'] },
    { name: 'Mocha', domain: 'mochajs.org', aliases: ['موكا'] },
    { name: 'Chai', domain: 'chaijs.com', aliases: ['تشاي'] },
    { name: 'Enzyme', domain: 'airbnb.io/enzyme', aliases: ['انزايم'] },
    { name: 'Testing Library', domain: 'testing-library.com', aliases: ['تيستينج ليبراري'] },
    { name: 'Storybook', domain: 'storybook.js.org', aliases: ['ستوري بوك'] },
    { name: 'Lighthouse', domain: 'developers.google.com/web/tools/lighthouse', aliases: ['لايت هاوس'] },
    { name: 'PageSpeed Insights', domain: 'developers.google.com/speed/pagespeed/insights', aliases: ['بيج سبيد'] },
    { name: 'GTmetrix', domain: 'gtmetrix.com', aliases: ['جي تي ميتريكس'] },
    { name: 'Pingdom', domain: 'pingdom.com', aliases: ['بينجدوم'] },
    { name: 'UptimeRobot', domain: 'uptimerobot.com', aliases: ['اب تايم روبوت'] },
    { name: 'Statuspage', domain: 'statuspage.io', aliases: ['ستاتس بيج'] },
    { name: 'Vercel', domain: 'vercel.com', aliases: ['فيرسل'] },
    { name: 'Netlify', domain: 'netlify.com', aliases: ['نيتليفاي'] },
    { name: 'Heroku', domain: 'heroku.com', aliases: ['هيروكو'] },
    { name: 'Firebase', domain: 'firebase.google.com', aliases: ['فايربيس'] },
    { name: 'Supabase', domain: 'supabase.com', aliases: ['سوبابيس'] },
    { name: 'Render', domain: 'render.com', aliases: ['ريندر'] },
    { name: 'Railway', domain: 'railway.app', aliases: ['رايلواي'] },
    { name: 'Fly.io', domain: 'fly.io', aliases: ['فلاي'] },
    { name: 'Begin', domain: 'begin.com', aliases: ['بيجين'] },
    { name: 'Surge', domain: 'surge.sh', aliases: ['سيرج'] },
    { name: 'GitHub Pages', domain: 'pages.github.com', aliases: ['جيتهاب بيجز'] },
    { name: 'GitLab Pages', domain: 'about.gitlab.com/stages-devops-lifecycle/pages', aliases: ['جيتلاب بيجز'] },
    { name: 'Cloudflare Pages', domain: 'pages.cloudflare.com', aliases: ['كلاود فلير بيجز'] },
    { name: 'StackBlitz', domain: 'stackblitz.com', aliases: ['ستاك بليتز'] },
    { name: 'CodeSandbox', domain: 'codesandbox.io', aliases: ['كود ساند بوكس'] },
    { name: 'Repl.it', domain: 'replit.com', aliases: ['ريبليت'] },
    { name: 'Glitch', domain: 'glitch.com', aliases: ['جليتش'] },
    { name: 'CodePen', domain: 'codepen.io', aliases: ['كود بن'] },
    { name: 'JSFiddle', domain: 'jsfiddle.net', aliases: ['جي اس فيدل'] },
    { name: 'JSBin', domain: 'jsbin.com', aliases: ['جي اس بين'] },
    { name: 'CodeShare', domain: 'codeshare.io', aliases: ['كود شير'] },
    { name: 'Ideone', domain: 'ideone.com', aliases: ['ايديون'] },
    { name: 'Pastebin', domain: 'pastebin.com', aliases: ['باستبين'] },
    { name: 'HackerRank', domain: 'hackerrank.com', aliases: ['هاكر رانك'] },
    { name: 'LeetCode', domain: 'leetcode.com', aliases: ['ليت كود'] },
    { name: 'Codewars', domain: 'codewars.com', aliases: ['كود وورز'] },
    { name: 'Exercism', domain: 'exercism.org', aliases: ['اكسرسيزم'] },
    { name: 'Topcoder', domain: 'topcoder.com', aliases: ['توب كودر'] },
    { name: 'Codeforces', domain: 'codeforces.com', aliases: ['كود فورسيز'] },
    { name: 'Kaggle', domain: 'kaggle.com', aliases: ['كاجل'] },
    { name: 'DataCamp', domain: 'datacamp.com', aliases: ['داتا كامب'] },
    { name: 'DataQuest', domain: 'dataquest.io', aliases: ['داتا كويست'] },
    { name: 'Brilliant', domain: 'brilliant.org', aliases: ['بريليانت'] },
    { name: 'Wolfram Alpha', domain: 'wolframalpha.com', aliases: ['ولفرام الفا'] },
    { name: 'ChatGPT', domain: 'chat.openai.com', aliases: ['شات جي بي تي'] },
    { name: 'OpenAI', domain: 'openai.com', aliases: ['اوبن اي اي'] },
    { name: 'Claude', domain: 'anthropic.com', aliases: ['كلود'] },
    { name: 'Anthropic', domain: 'anthropic.com', aliases: ['أنثروبيك'] },
    { name: 'Gemini', domain: 'gemini.google.com', aliases: ['جيميناي'] },
    { name: 'Midjourney', domain: 'midjourney.com', aliases: ['ميدجورني'] },
    { name: 'Stable Diffusion', domain: 'stability.ai', aliases: ['ستيبل ديفيوجن'] },
    { name: 'DALL-E', domain: 'openai.com/dall-e-2', aliases: ['دالي'] },
    { name: 'Jasper', domain: 'jasper.ai', aliases: ['جاسبر'] },
    { name: 'Copy.ai', domain: 'copy.ai', aliases: ['كوبي اي اي'] },
    { name: 'Notion AI', domain: 'notion.so/product/ai', aliases: ['نوشن اي اي'] },
    { name: 'GrammarlyGO', domain: 'grammarly.com/grammarlygo', aliases: ['جرامرلي جو'] },
    { name: 'Adobe Firefly', domain: 'adobe.com/sensei/generative-ai/firefly.html', aliases: ['فايرفلاي'] },
    { name: 'Canva Magic Edit', domain: 'canva.com/magic-edit', aliases: ['ماجيك اديت'] },
    { name: 'Runway', domain: 'runwayml.com', aliases: ['رنواي'] },
    { name: 'Pika', domain: 'pika.art', aliases: ['بيكا'] },
    { name: 'Sora', domain: 'openai.com/sora', aliases: ['سورا'] },
    { name: 'HeyGen', domain: 'heygen.com', aliases: ['هاي جين'] },
    { name: 'Synthesia', domain: 'synthesia.io', aliases: ['سينثيزيا'] },
    { name: 'Murf AI', domain: 'murf.ai', aliases: ['ميرف'] },
    { name: 'ElevenLabs', domain: 'elevenlabs.io', aliases: ['ايلفن لابس'] },
    { name: 'Descript', domain: 'descript.com', aliases: ['ديسكريبت'] },
    { name: 'Otter.ai', domain: 'otter.ai', aliases: ['اوتر اي اي'] },
    { name: 'Gong', domain: 'gong.io', aliases: ['جونج'] },
    { name: 'Chorus.ai', domain: 'chorus.ai', aliases: ['كورس'] },
    { name: 'ZoomInfo', domain: 'zoominfo.com', aliases: ['زوم انفو'] },
    { name: 'Clearbit', domain: 'clearbit.com', aliases: ['كلير بت'] },
    { name: 'Lusha', domain: 'lusha.com', aliases: ['لوشا'] },
    { name: 'Hunter.io', domain: 'hunter.io', aliases: ['هنتر اي او'] },
    { name: 'RocketReach', domain: 'rocketreach.co', aliases: ['روكيت ريتش'] },
    { name: 'Apollo.io', domain: 'apollo.io', aliases: ['ابولو'] },
    { name: 'Crunchbase', domain: 'crunchbase.com', aliases: ['كرانش بيس'] },
    { name: 'PitchBook', domain: 'pitchbook.com', aliases: ['بيتش بوك'] },
    { name: 'CB Insights', domain: 'cbinsights.com', aliases: ['سي بي انسايتس'] },
    { name: 'Statista', domain: 'statista.com', aliases: ['ستاتيستا'] },
    { name: 'Similarweb', domain: 'similarweb.com', aliases: ['سيميلار ويب'] },
    { name: 'Ahrefs', domain: 'ahrefs.com', aliases: ['اهريفس'] },
    { name: 'SEMrush', domain: 'semrush.com', aliases: ['سيم رتش'] },
    { name: 'Moz', domain: 'moz.com', aliases: ['موز'] },
    { name: 'BuzzSumo', domain: 'buzzsumo.com', aliases: ['بز سومو'] },
    { name: 'SpyFu', domain: 'spyfu.com', aliases: ['سباي فو'] },
    { name: 'Majestic', domain: 'majestic.com', aliases: ['ماجيستيك'] },
    { name: 'Screaming Frog', domain: 'screamingfrog.co.uk', aliases: ['سكريمينج فروج'] },
    { name: 'Yoast SEO', domain: 'yoast.com', aliases: ['يوست'] },
    { name: 'Rank Math', domain: 'rankmath.com', aliases: ['رانك ماث'] },
    { name: 'All in One SEO', domain: 'aioseo.com', aliases: ['اول ان ون'] },
    { name: 'Bluehost', domain: 'bluehost.com', aliases: ['بلوهوست'] },
    { name: 'SiteGround', domain: 'siteground.com', aliases: ['سايت جراوند'] },
    { name: 'DreamHost', domain: 'dreamhost.com', aliases: ['دريم هوست'] },
    { name: 'A2 Hosting', domain: 'a2hosting.com', aliases: ['اي تو هوستينج'] },
    { name: 'InMotion Hosting', domain: 'inmotionhosting.com', aliases: ['ان موشن'] },
    { name: 'WPEngine', domain: 'wpengine.com', aliases: ['دبليو بي انجن'] },
    { name: 'Kinsta', domain: 'kinsta.com', aliases: ['كينستا'] },
    { name: 'Flywheel', domain: 'getflywheel.com', aliases: ['فلاي ويل'] },
    { name: 'Pantheon', domain: 'pantheon.io', aliases: ['بانثيون'] },
    { name: 'Liquid Web', domain: 'liquidweb.com', aliases: ['ليكود ويب'] },
    { name: 'Rackspace', domain: 'rackspace.com', aliases: ['راك سبيس'] },
    { name: 'OVHcloud', domain: 'ovhcloud.com', aliases: ['او في اتش'] },
    { name: 'Hetzner', domain: 'hetzner.com', aliases: ['هيتزنر'] },
    { name: 'Linode', domain: 'linode.com', aliases: ['لينود'] },
    { name: 'DigitalOcean', domain: 'digitalocean.com', aliases: ['ديجيتال اوشن'] },
    { name: 'Vultr', domain: 'vultr.com', aliases: ['فولتير'] },
    { name: 'Scaleway', domain: 'scaleway.com', aliases: ['سكاي واي'] },
    { name: 'Google Workspace', domain: 'workspace.google.com', aliases: ['وورك سبيس'] },
    { name: 'Microsoft 365', domain: 'microsoft365.com', aliases: ['اوفيس 365'] },
    { name: 'Slack', domain: 'slack.com', aliases: ['سلاك'] },
    { name: 'Zoom', domain: 'zoom.us', aliases: ['زوم'] },
    { name: 'Webex', domain: 'webex.com', aliases: ['ويبكس'] },
    { name: 'GoTo', domain: 'goto.com', aliases: ['جو تو'] },
    { name: 'TeamViewer', domain: 'teamviewer.com', aliases: ['تيم فيور'] },
    { name: 'AnyDesk', domain: 'anydesk.com', aliases: ['اني ديسك'] },
    { name: 'Splashtop', domain: 'splashtop.com', aliases: ['سبلاش توب'] },
    { name: 'LogMeIn', domain: 'logmein.com', aliases: ['لوق مي ان'] },
    { name: 'LastPass', domain: 'lastpass.com', aliases: ['لاست باس'] },
    { name: '1Password', domain: '1password.com', aliases: ['ون باس وورد'] },
    { name: 'Dashlane', domain: 'dashlane.com', aliases: ['داش لين'] },
    { name: 'Bitwarden', domain: 'bitwarden.com', aliases: ['بت واردن'] },
    { name: 'Keeper', domain: 'keepersecurity.com', aliases: ['كيبر'] },
    { name: 'RoboForm', domain: 'roboform.com', aliases: ['روبو فورم'] },
    { name: 'Enpass', domain: 'enpass.io', aliases: ['ان باس'] },
    { name: 'NordPass', domain: 'nordpass.com', aliases: ['نورد باس'] },
    { name: 'Dropbox', domain: 'dropbox.com', aliases: ['دروب بوكس'] },
    { name: 'Box', domain: 'box.com', aliases: ['بوكس'] },
    { name: 'Google Drive', domain: 'drive.google.com', aliases: ['كلاود'] },
    { name: 'OneDrive', domain: 'onedrive.com', aliases: ['ون درايف'] },
    { name: 'iCloud', domain: 'icloud.com', aliases: ['اي كلاود'] },
    { name: 'Mega', domain: 'mega.nz', aliases: ['ميجا'] },
    { name: 'pCloud', domain: 'pcloud.com', aliases: ['بي كلاود'] },
    { name: 'Sync.com', domain: 'sync.com', aliases: ['سينك'] },
    { name: 'Nextcloud', domain: 'nextcloud.com', aliases: ['نيكست كلاود'] },
    { name: 'MediaFire', domain: 'mediafire.com', aliases: ['ميديا فاير'] },
    { name: 'WeTransfer', domain: 'wetransfer.com', aliases: ['وي ترانسفير'] },
    { name: 'SendAnywhere', domain: 'send-anywhere.com', aliases: ['سند اني وير'] },
    { name: 'TransferNow', domain: 'transfernow.net', aliases: ['ترانسفير ناو'] },
    { name: 'Smash', domain: 'fromsmash.com', aliases: ['سماش'] },
    { name: 'HighTail', domain: 'hightail.com', aliases: ['هاي تيل'] },
    { name: 'Filemail', domain: 'filemail.com', aliases: ['فايل ميل'] },
    { name: 'ZippyShare', domain: 'zippyshare.com', aliases: ['زيبي شير'] },
    { name: '4Shared', domain: '4shared.com', aliases: ['فور شيرد'] },
    { name: 'RapidGator', domain: 'rapidgator.net', aliases: ['رابيد جيتور'] },
    { name: 'Uploaded.net', domain: 'uploaded.net', aliases: ['ابلوديد'] },
    { name: 'NitroFlare', domain: 'nitroflare.com', aliases: ['نيترو فلير'] },
    { name: 'Turbobit', domain: 'turbobit.net', aliases: ['تيربو بت'] },
    { name: 'Keep2Share', domain: 'k2s.cc', aliases: ['كيب تو شير'] },
    { name: 'AlfaFile', domain: 'alfafile.net', aliases: ['الفا فايل'] },
    { name: 'FileFactory', domain: 'filefactory.com', aliases: ['فايل فاكتوري'] },
    { name: 'SendSpace', domain: 'sendspace.com', aliases: ['سند سبيس'] },
    { name: 'DepositFiles', domain: 'depositfiles.com', aliases: ['ديبوزيت فايلز'] },
    { name: 'UserCloud', domain: 'userscloud.com', aliases: ['يوزر كلاود'] },
];

export const LogoRound: React.FC<LogoRoundProps> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<GameConfig>({
        joinKeyword: 'شعار',
        maxPlayers: 100,
        roundDuration: 20,
        autoProgress: true,
        totalRounds: 10,
        showHints: true,
        difficulty: 'Easy',
        soundEffects: true,
        streamerMode: false
    });

    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [timer, setTimer] = useState(0);
    const [currentRound, setCurrentRound] = useState(1);
    const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
    const [roundWinner, setRoundWinner] = useState<ChatUser | null>(null);

    const phaseRef = useRef(phase);
    const configRef = useRef(config);
    const currentBrandRef = useRef(currentBrand);
    const participantsRef = useRef(participants);

    useEffect(() => {
        phaseRef.current = phase;
        configRef.current = config;
        currentBrandRef.current = currentBrand;
        participantsRef.current = participants;
    }, [phase, config, currentBrand, participants]);

    const nextLogo = () => {
        const remainingBrands = POPULAR_BRANDS.filter(b => b.domain !== currentBrand?.domain); // Avoid repeats in sequence
        const random = remainingBrands[Math.floor(Math.random() * remainingBrands.length)];
        setCurrentBrand(random);
        setRoundWinner(null);
        setTimer(config.roundDuration);
        setPhase('PLAYING');
    };

    useEffect(() => {
        const unsubscribe = chatService.onMessage((msg) => {
            const content = msg.content.trim().toLowerCase();
            const username = msg.user.username;

            if (phaseRef.current === 'LOBBY') {
                if (content === configRef.current.joinKeyword.toLowerCase()) {
                    setParticipants(prev => {
                        if (prev.length >= configRef.current.maxPlayers) return prev;
                        if (prev.some(p => p.username === username)) return prev;

                        // Fetch real Kick avatar asynchronously
                        chatService.fetchKickAvatar(username).then(avatar => {
                            if (avatar) {
                                setParticipants(current => current.map(p =>
                                    p.username === username ? { ...p, avatar } : p
                                ));
                            }
                        });

                        return [...prev, msg.user];
                    });
                }
            }

            if (phaseRef.current === 'PLAYING' && currentBrandRef.current) {
                if (!participantsRef.current.some(p => p.username === username)) return;

                const brand = currentBrandRef.current;
                const isCorrect = brand.name.toLowerCase() === content ||
                    brand.aliases.some(a => a === content) ||
                    brand.domain.split('.')[0] === content;

                if (isCorrect) {
                    handleWin(msg.user);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleWin = (user: ChatUser) => {
        setRoundWinner(user);
        setScores(prev => ({ ...prev, [user.username]: (prev[user.username] || 0) + 1 }));
        setPhase('REVEAL');

        setTimeout(() => {
            if (currentRound >= config.totalRounds) {
                setPhase('FINALE');
                leaderboardService.recordWin(user.username, user.avatar || '', 200);
            } else {
                setCurrentRound(r => r + 1);
                nextLogo();
            }
        }, 4000);
    };

    useEffect(() => {
        let interval: number;
        if (phase === 'PLAYING' && timer > 0) {
            interval = window.setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else if (phase === 'PLAYING' && timer === 0) {
            setPhase('REVEAL');
            setTimeout(() => {
                if (currentRound >= config.totalRounds) {
                    setPhase('FINALE');
                } else {
                    setCurrentRound(r => r + 1);
                    nextLogo();
                }
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [phase, timer]);

    const startLobby = () => setPhase('LOBBY');

    const startRound = () => {
        setCurrentRound(1);
        setScores({});
        nextLogo();
    };

    const resetGame = () => {
        setPhase('SETUP');
        setParticipants([]);
        setScores({});
        setCurrentRound(1);
    };

    return (
        <div className="w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none overflow-hidden" dir="rtl">
            {/* Dark Professional Background */}
            <div className="absolute inset-0 bg-[#08080a] -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(59,130,246,0.1),transparent_70%)]"></div>
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full"></div>
                <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-indigo-600/5 blur-[100px] rounded-full"></div>
                {/* Brand pattern overlay */}
                <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            {phase === 'SETUP' && (
                <div className="w-full max-w-4xl mt-12 animate-in fade-in zoom-in duration-700">
                    <div className="text-center mb-12">
                        <Globe size={80} className="mx-auto text-blue-500 mb-6 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
                        <h1 className="text-7xl font-black text-white italic tracking-tighter">جـولـة الـشـعـارات</h1>
                        <p className="text-blue-500 font-black tracking-[0.4em] text-[10px] uppercase mt-2">Premium Brand Challenge</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-10 rounded-[3.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl space-y-8">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                <Settings className="text-blue-400" /> إعـدادات الـجـولـة
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">كلمة الانضمام</label>
                                    <input
                                        value={config.joinKeyword}
                                        onChange={e => setConfig({ ...config, joinKeyword: e.target.value })}
                                        className="w-full bg-black/40 border-2 border-white/10 focus:border-blue-400 rounded-2xl p-3 text-white font-bold outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-400 uppercase">عـدد الـجـولات</label>
                                        <span className="text-xl font-black text-blue-400 font-mono">{config.totalRounds}</span>
                                    </div>
                                    <input
                                        type="range" min="5" max="500" step="5"
                                        value={config.totalRounds}
                                        onChange={e => setConfig({ ...config, totalRounds: +e.target.value })}
                                        className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-400"
                                    />
                                </div>

                                {/* New Aesthetic Settings (Visual Only/Basic Logic) */}
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Eye size={16} className="text-blue-400" />
                                        <span className="text-[10px] font-bold text-gray-300">تلميحات ذكية</span>
                                    </div>
                                    <div onClick={() => setConfig({ ...config, showHints: !config.showHints })} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${config.showHints ? 'bg-blue-500' : 'bg-gray-600'}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.showHints ? 'right-0.5' : 'right-4.5'}`}></div>
                                    </div>
                                </div>

                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Layers size={16} className="text-purple-400" />
                                        <span className="text-[10px] font-bold text-gray-300">الصعوبة</span>
                                    </div>
                                    <span onClick={() => setConfig({ ...config, difficulty: config.difficulty === 'Easy' ? 'Hard' : 'Easy' })} className="text-[10px] font-black bg-black/40 px-2 py-1 rounded-lg cursor-pointer hover:text-white transition-colors text-gray-400 uppercase">{config.difficulty}</span>
                                </div>

                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Volume2 size={16} className="text-green-400" />
                                        <span className="text-[10px] font-bold text-gray-300">مؤثرات صوتية</span>
                                    </div>
                                    <div onClick={() => setConfig({ ...config, soundEffects: !config.soundEffects })} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${config.soundEffects ? 'bg-green-500' : 'bg-gray-600'}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.soundEffects ? 'right-0.5' : 'right-4.5'}`}></div>
                                    </div>
                                </div>

                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Monitor size={16} className="text-orange-400" />
                                        <span className="text-[10px] font-bold text-gray-300">وضع البث</span>
                                    </div>
                                    <div onClick={() => setConfig({ ...config, streamerMode: !config.streamerMode })} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${config.streamerMode ? 'bg-orange-500' : 'bg-gray-600'}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.streamerMode ? 'right-0.5' : 'right-4.5'}`}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="glass-card p-10 rounded-[3.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl flex-1 flex flex-col justify-center items-center text-center">
                                <Target size={54} className="text-indigo-400 mb-4 animate-float" />
                                <h4 className="text-xl font-black text-white mb-2">قـواعـد الـمـنـافـسة</h4>
                                <p className="text-gray-400 text-sm font-bold leading-relaxed px-6">
                                    ستظهر شعارات لماركات عالمية، حاول تخمين اسم الماركة في الشات بأسرع وقت ممكن. أول من يجيب بشكل صحيح يحصل على نقطة!
                                </p>
                            </div>

                            <button
                                onClick={startLobby}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black py-8 rounded-[3rem] text-4xl shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-4 group"
                            >
                                بـدأ الـبـحـث <Search className="group-hover:scale-125 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <button onClick={onHome} className="mt-8 mx-auto flex items-center gap-2 text-gray-500 hover:text-white font-bold transition-all">
                        <ChevronLeft /> العودة للرئيسية
                    </button>
                </div>
            )}

            {phase === 'LOBBY' && (
                <div className="w-full max-w-6xl mt-12 animate-in fade-in duration-700 flex flex-col items-center">
                    <div className="text-center mb-12">
                        <h1 className="text-8xl font-black text-white italic tracking-tighter mb-4 red-neon-text">تـقـصـي الـحـقـائق</h1>
                        <div className="flex items-center justify-center gap-4 bg-white/5 px-10 py-5 rounded-[2.5rem] border border-white/10 backdrop-blur-md shadow-2xl">
                            <span className="text-2xl font-bold text-gray-300">أرسل الكلمة للانـضمـام للتحـدي:</span>
                            <span className="text-5xl font-black text-blue-400 px-8 py-2 bg-blue-400/10 rounded-2xl border border-blue-400/30">{config.joinKeyword}</span>
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 px-10 mb-20 overflow-y-auto max-h-[500px] custom-scrollbar">
                        {participants.map((p, i) => (
                            <div key={p.username} className="glass-card p-5 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-4 animate-in zoom-in group hover:border-blue-500/30 transition-all bg-white/5" style={{ animationDelay: `${i * 30}ms` }}>
                                <div className="w-24 h-24 rounded-[2rem] border-4 border-white/10 shadow-xl group-hover:scale-105 transition-transform bg-zinc-900 flex items-center justify-center overflow-visible">
                                    <ProAvatar username={p.username} url={p.avatar} size="w-24 h-24" className="overflow-visible" />
                                </div>
                                <span className="font-black text-white text-base truncate w-full text-center">{p.username}</span>
                            </div>
                        ))}
                    </div>

                    <div className="fixed bottom-12 left-0 right-0 flex justify-center gap-8">
                        <button onClick={resetGame} className="px-10 py-6 bg-white/5 hover:bg-white/10 rounded-[2.5rem] text-gray-400 font-black border border-white/10 transition-all flex items-center gap-3">
                            <Trash2 size={24} /> إلـغـاء
                        </button>
                        <button
                            onClick={startRound}
                            disabled={participants.length < 1}
                            className="px-24 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale rounded-[2.5rem] text-white font-black text-3xl shadow-[0_20px_40px_rgba(37,99,235,0.3)] transition-all flex items-center gap-4"
                        >
                            <Play size={32} /> بـدء الـجـولة الأولى ({participants.length})
                        </button>
                    </div>
                </div>
            )}

            {(phase === 'PLAYING' || phase === 'REVEAL') && currentBrand && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 relative">
                    {/* Header Info */}
                    <div className="absolute top-10 left-10 right-10 flex justify-between items-start">
                        <div className="flex flex-col gap-4">
                            <div className="glass-card px-10 py-5 rounded-[2.5rem] border border-white/10 flex items-center gap-6 bg-black/60 backdrop-blur-xl">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">الـجـولـة</div>
                                    <div className="text-5xl font-black text-white font-mono">{currentRound} / {config.totalRounds}</div>
                                </div>
                                <Target size={40} className="text-blue-500" />
                            </div>
                            <div className="glass-card px-10 py-5 rounded-[2.5rem] border border-white/10 flex items-center gap-6 bg-black/60 backdrop-blur-xl">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">الـوقـت</div>
                                    <div className={`text-4xl font-black font-mono ${timer < 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timer}s</div>
                                </div>
                                <Clock size={32} className={timer < 5 ? 'text-red-500' : 'text-gray-500'} />
                            </div>
                        </div>

                        <div className="glass-card w-80 rounded-[3rem] border border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="font-black text-white italic">أفـضل الـمحـققين</h3>
                                <ShieldCheck size={18} className="text-blue-500" />
                            </div>
                            <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5).map(([user, score], i) => (
                                    <div key={user} className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 transition-all hover:bg-white/10">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-white font-black text-xl border border-blue-500/30">
                                            #{i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-black text-white">{user}</div>
                                            <div className="text-xs text-blue-400 font-bold">{score} شعارات صـحيحة</div>
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(scores).length === 0 && (
                                    <div className="py-10 text-center opacity-20 italic font-bold">لا يـوجد نقـاط بـعـد</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Logo Display Area */}
                    <div className="text-center animate-in zoom-in duration-500 flex flex-col items-center gap-12">
                        <div className="relative group">
                            {/* Decorative Rings */}
                            <div className="absolute -inset-20 border-2 border-dashed border-white/5 rounded-full animate-rotate-slow"></div>
                            <div className="absolute -inset-10 border-4 border-blue-500/5 rounded-full animate-rotate-reverse"></div>

                            <div className={`w-[450px] h-[450px] bg-white rounded-[4rem] flex items-center justify-center p-16 shadow-[0_0_100px_rgba(255,255,255,0.1),0_40px_100px_rgba(0,0,0,0.5)] border-8 border-zinc-900 transition-all duration-500 ${phase === 'REVEAL' ? 'scale-110 shadow-blue-500/20' : ''}`}>
                                <img
                                    src={`https://img.logo.dev/${currentBrand.domain}?token=${process.env.LOGO_DEV_TOKEN || ''}`}
                                    className="w-full h-full object-contain filter-none"
                                    alt="Brand Logo"
                                />

                                {phase === 'PLAYING' && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <Search size={150} className="text-black/5" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {phase === 'PLAYING' ? (
                            <div className="space-y-4">
                                <h2 className="text-6xl font-black text-white italic tracking-tighter drop-shadow-2xl">خـمّـن اسـم الـشـعـار!</h2>
                                <p className="text-2xl text-gray-500 font-bold uppercase tracking-widest animate-pulse">أرسل الإجابة في الشات حـالا!</p>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-bottom duration-500 space-y-6">
                                {roundWinner ? (
                                    <div className="flex flex-col items-center gap-6 bg-green-500/10 p-8 rounded-[3rem] border-4 border-green-500/30 backdrop-blur-xl">
                                        <div className="text-green-500 font-black text-2xl uppercase tracking-[0.5em] mb-2">إجـابـة مـذهـلـة</div>
                                        <div className="flex items-center gap-8">
                                            <div className="w-32 h-32 rounded-[2.5rem] border-4 border-green-500 shadow-xl bg-zinc-900 flex items-center justify-center overflow-visible">
                                                <ProAvatar username={roundWinner.username} url={roundWinner.avatar} size="w-32 h-32" className="overflow-visible" />
                                            </div>
                                            <div className="text-right">
                                                <div className="text-6xl font-black text-white italic tracking-tighter mb-2">{roundWinner.username}</div>
                                                <div className="text-3xl font-bold text-gray-400">الإجـابـة: <span className="text-white text-5xl mr-4">{currentBrand.name}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-6 bg-red-500/10 p-10 rounded-[4rem] border-4 border-red-500/30 backdrop-blur-xl">
                                        <h2 className="text-6xl font-black text-white opacity-50 italic">انـتهـى الـوقت!</h2>
                                        <p className="text-3xl font-bold text-gray-400">الإجـابة كانت: <span className="text-white text-6xl mr-6">{currentBrand.name}</span></p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {phase === 'FINALE' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000">
                    <div className="mb-12 relative">
                        <div className="absolute inset-0 bg-blue-500 blur-[150px] opacity-20 rounded-full"></div>
                        <ShieldCheck size={180} className="text-blue-500 animate-pulse relative z-10" />
                    </div>

                    <h1 className="text-9xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_20px_60px_rgba(59,130,246,0.3)]">أقـوى محـقق</h1>

                    {Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0] && (
                        <div className="flex flex-col items-center gap-8 mb-20 animate-in zoom-in duration-700 delay-300">
                            <div className="w-72 h-72 rounded-[4rem] border-8 border-blue-500 shadow-[0_0_120px_rgba(59,130,246,0.4)] relative bg-black/40 backdrop-blur-xl flex items-center justify-center overflow-visible">
                                <ProAvatar 
                                    username={Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]} 
                                    url={participants.find(p => p.username === Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0])?.avatar}
                                    size="w-72 h-72" 
                                    className="overflow-visible" 
                                />
                            </div>
                            <div className="text-center">
                                <div className="text-8xl font-black text-white mb-6 italic tracking-tighter">{Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]}</div>
                                <div className="text-4xl px-20 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl uppercase tracking-[0.2em] italic">
                                    SCORE: {Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0][1]} LOGOS
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-8">
                        <button onClick={onHome} className="px-16 py-7 bg-white/5 hover:bg-white/10 text-white font-black rounded-[2.5rem] border border-white/10 transition-all text-2xl">
                            الـرئـيـسـيـة
                        </button>
                        <button onClick={resetGame} className="px-24 py-7 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[2.5rem] transition-all text-3xl shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:scale-105">
                            تـحـدي جـديد
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
