
import Pusher from 'pusher-js';
import { ChatMessage } from '../types';

type MessageCallback = (message: ChatMessage) => void;
type StatusCallback = (isConnected: boolean, error?: boolean, details?: string) => void;

const getRoleFromIdentity = (identity: any): 'owner' | 'moderator' | 'vip' | 'user' => {
  if (!identity || !identity.badges) return 'user';
  const badges = identity.badges;
  if (badges.some((b: any) => b.type === 'broadcaster')) return 'owner';
  if (badges.some((b: any) => b.type === 'moderator')) return 'moderator';
  if (badges.some((b: any) => b.type === 'vip')) return 'vip';
  return 'user';
};

class ChatService {
  private isConnected: boolean = false;
  private listeners: MessageCallback[] = [];
  private deleteListeners: ((id: string) => void)[] = [];
  private statusListeners: StatusCallback[] = [];
  private pusher: any = null;
  private channel: any = null;
  private avatarCache: Record<string, string> = {};
  private pendingAvatarFetches: Record<string, Promise<string>> = {};

  private KNOWN_CHATROOM_IDS: Record<string, number> = {
    // We removed 'iabs' from here to force a fresh lookup from the API, 
    // ensuring we get the correct Chatroom ID every time.
    'xeid': 47582,
  };

  async getChatroomId(channelSlug: string): Promise<number | null> {
    const slug = channelSlug.toLowerCase().trim();

    // 1. Check Memory Cache
    if (this.KNOWN_CHATROOM_IDS[slug]) {
      return this.KNOWN_CHATROOM_IDS[slug];
    }

    // 2. Check Local Storage Cache (Fastest persistent)
    const cachedId = localStorage.getItem(`kick_chatroom_id_${slug}`);
    if (cachedId) {
      console.log(`[ChatService] Using cached ID for ${slug}: ${cachedId}`);
      return parseInt(cachedId);
    }

    // 3. Fetch from Proxies
    const proxies = [
      `https://kick.com/api/v1/channels/${slug}`, // Direct (if CORS allows or via extension)
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://kick.com/api/v2/channels/${slug}`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://kick.com/api/v2/channels/${slug}`)}`,
      `https://proxy.cors.sh/https://kick.com/api/v2/channels/${slug}`
    ];

    for (const proxyUrl of proxies) {
      try {
        const response = await fetch(proxyUrl);
        if (!response.ok) continue;

        const rawData = await response.json();
        const data = proxyUrl.includes('allorigins') ? JSON.parse(rawData.contents) : rawData;

        let foundId = null;
        if (data?.chatroom?.id) foundId = data.chatroom.id;
        else if (data?.id) foundId = data.id;

        if (foundId) {
          console.log(`[ChatService] ✅ Found ID: ${foundId}`);
          // Cache it for future sessions
          localStorage.setItem(`kick_chatroom_id_${slug}`, foundId.toString());
          return foundId;
        }
      } catch (e) {
        console.warn(`[ChatService] Proxy failed: ${proxyUrl}`);
      }
    }

    return null;
  }

  private connectionId = 0;

  async connect(channelSlug: string = 'iabs') {
    const slug = channelSlug.toLowerCase().trim();
    this.disconnect();
    const myConnectionId = this.connectionId;

    this.notifyStatus(false, false, `جاري البحث عن قناة ${slug}...`);

    try {
      let chatroomId = await this.getChatroomId(slug);

      // Check if this connection attempt is still valid
      if (this.connectionId !== myConnectionId) {
        console.warn(`[ChatService] Connection attempt ${myConnectionId} aborted (superseded).`);
        return;
      }

      // If iabs look up fails, log it clearly but don't auto-switch to xeid unless user asked.
      // We will stick to the requested channel to avoid confusion.

      if (!chatroomId) {
        console.error(`[ChatService] Could not find ID for ${slug}.`);
        throw new Error(`لم يتم العثور على القناة: ${slug}`);
      }

      console.log(`[ChatService] Connecting to Chatroom: ${chatroomId}`);

      // Initialize Pusher with a fresh instance
      const PusherClient = (Pusher as any).default || Pusher;
      this.pusher = new PusherClient('32cbd69e4b950bf97679', {
        cluster: 'us2',
        forceTLS: true,
        enabledTransports: ['ws', 'wss']
      });

      this.channel = this.pusher.subscribe(`chatrooms.${chatroomId}.v2`);

      // DEBUG: Listen to ALL events (Disabled for performance)
      // this.channel.bind_global((eventName: string, data: any) => {
      //   console.log(`[ChatService] GLOBAL EVENT: ${eventName}`, data);
      // });

      this.channel.bind('App\\Events\\ChatMessageEvent', (data: any) => {
        const message: ChatMessage = {
          id: data.id || Math.random().toString(36).substr(2, 9),
          user: {
            id: data.sender?.id || '0',
            username: data.sender?.username || 'Unknown',
            color: data.sender?.identity?.color || '#31d6d6',
            avatar: data.sender?.profile_pic || '',
          },
          content: data.content || '',
          role: getRoleFromIdentity(data.sender?.identity),
          timestamp: Date.now()
        };

        // Safety: ensure one listener failure doesn't stop others
        this.listeners.forEach(cb => {
          try {
            cb(message);
          } catch (e) {
            console.error("[ChatService] Listener error:", e);
          }
        });
      });

      this.channel.bind('App\\Events\\MessageDeletedEvent', (data: any) => {
        console.log("[ChatService] Message Deleted Received:", data);
        const messageId = data.message?.id;
        if (messageId) {
          this.deleteListeners.forEach(cb => cb(messageId));
        }
      });

      this.pusher.connection.bind('connected', () => {
        // Double check validity (though less likely to race here if pusher instance is exclusive)
        if (this.connectionId !== myConnectionId) return;

        console.log("[ChatService] WebSocket Connected!");
        this.isConnected = true;
        this.notifyStatus(true, false, `متصل (ID: ${chatroomId})`);
      });

      this.pusher.connection.bind('error', (err: any) => {
        if (this.connectionId !== myConnectionId) return;
        console.error("[ChatService] Pusher Error:", err);
        this.notifyStatus(false, true, "خطأ في الاتصال بسيرفر الشات");
      });

      this.pusher.connection.bind('state_change', (states: any) => {
        console.log("[ChatService] Connection State:", states.current);
      });

    } catch (error: any) {
      if (this.connectionId !== myConnectionId) return;
      console.error("[ChatService] Fatal Error:", error);
      this.notifyStatus(false, true, error.message);
    }
  }

  onMessage(callback: MessageCallback) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(cb => cb !== callback); };
  }

  onDeleteMessage(callback: (id: string) => void) {
    this.deleteListeners.push(callback);
    return () => { this.deleteListeners = this.deleteListeners.filter(cb => cb !== callback); };
  }

  // Remove all listeners (useful when switching games)
  clearListeners() {
    this.listeners = [];
    this.deleteListeners = [];
  }

  onStatusChange(callback: StatusCallback) {
    this.statusListeners.push(callback);
    return () => { this.statusListeners = this.statusListeners.filter(cb => cb !== callback); };
  }

  private notifyStatus(connected: boolean, error: boolean, details: string) {
    this.statusListeners.forEach(cb => cb(connected, error, details));
  }

  async fetchKickAvatar(username: string): Promise<string> {
    const slug = username.toLowerCase().trim().replace('@', '');

    if (this.avatarCache[slug]) return this.avatarCache[slug];
    if (this.pendingAvatarFetches[slug]) return this.pendingAvatarFetches[slug];

    const fetchPromise = (async () => {
      try {
        const proxies = [
          `https://decapi.me/kick/avatar/${slug}`,
          `https://api.allorigins.win/get?url=${encodeURIComponent(`https://kick.com/api/v2/channels/${slug}`)}&disableCache=true`,
          `https://corsproxy.io/?${encodeURIComponent(`https://kick.com/api/v2/channels/${slug}`)}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://kick.com/api/v2/channels/${slug}`)}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://kick.com/api/v1/channels/${slug}`)}`
        ];

        for (const proxyUrl of proxies) {
          try {
            console.log(`[ChatService] Trying proxy for ${slug}: ${proxyUrl}`);
            const response = await fetch(proxyUrl, {
              cache: 'no-store',
              headers: { 'Accept': 'application/json, text/plain' }
            });
            if (!response.ok) continue;

            let avatar = '';

            // Handle pure text response (like decapi.me)
            if (proxyUrl.includes('decapi.me')) {
              const textUrl = await response.text();
              if (textUrl && textUrl.startsWith('http')) {
                avatar = textUrl.trim();
              }
            } else {
              // Handle JSON wrappers
              const rawData = await response.json();
              let data: any;

              if (proxyUrl.includes('allorigins')) {
                if (!rawData.contents) continue;
                data = JSON.parse(rawData.contents);
              } else {
                data = rawData;
              }

              // Try multiple possible paths for the avatar URL
              avatar = data.user?.profile_pic ||
                data.user?.profilepic ||
                data.profile_pic ||
                data.user?.avatar?.url ||
                data.user?.avatar ||
                data.chatroom?.sender?.profile_pic || '';
            }

            if (avatar && avatar.length > 5) {
              // Ensure it's a full URL
              let finalAvatar = avatar;
              if (finalAvatar.startsWith('//')) finalAvatar = 'https:' + finalAvatar;
              if (finalAvatar.startsWith('/')) finalAvatar = 'https://kick.com' + finalAvatar;

              // Ensure files.kick.com is used for kick.com domain images to bypass some blocks
              finalAvatar = finalAvatar.replace('https://kick.com/', 'https://files.kick.com/');

              console.log(`[ChatService] ✅ Found avatar for ${slug}: ${finalAvatar}`);
              this.avatarCache[slug] = finalAvatar;
              return finalAvatar;
            }
          } catch (e) {
            // continue
          }
        }
      } catch (e) {
        console.error(`[ChatService] Error for ${username}`, e);
      } finally {
        delete this.pendingAvatarFetches[slug];
      }
      return '';
    })();

    this.pendingAvatarFetches[slug] = fetchPromise;
    return fetchPromise;
  }

  disconnect() {
    this.connectionId++; // Invalidate pending connections
    if (this.channel) {
      this.channel.unbind_all();
      this.channel.unsubscribe();
      this.channel = null;
    }
    if (this.pusher) {
      this.pusher.unbind_all();
      this.pusher.disconnect();
      this.pusher = null;
    }
    this.isConnected = false;
  }
}

export const chatService = new ChatService();
