import { useCallback, useEffect, useRef, useState, type ElementType } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  HiXMark,
  HiPaperAirplane,
  HiChatBubbleLeftEllipsis,
  HiShieldCheck,
  HiClock,
  HiChevronLeft,
  HiPlus,
  HiTrash,
  HiDocumentText,
  HiGift,
  HiPrinter,
  HiTruck,
  HiBanknotes,
  HiQuestionMarkCircle,
  HiPhone,
  HiEnvelope,
} from 'react-icons/hi2';
import { FaWhatsapp } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import { CONSENT_EVENT, hasConsent, hasDecided } from '@/lib/consent';

/* ---------------------------------------------------------------
   Types
---------------------------------------------------------------- */

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface QuickAction {
  id: string;
  label: string;
  query: string;
  icon_key: string;
}

interface SiteChatbotProps {
  organizationName?: string;
  agentAvatar?: string;
  /** Digits only, international format, for example 254700000000. Defaults to VITE_WHATSAPP_PHONE. */
  whatsappPhone?: string;
}

/* ---------------------------------------------------------------
   Constants
---------------------------------------------------------------- */

const GUEST_STORAGE_KEY = 'protocol_guest_chat';
const CONTACT_PHONE = '+254 762 446 077';
const CONTACT_PHONE_LINK = '+254762446077';
const CONTACT_EMAIL = 'protocolpromotions@gmail.com';
const MAX_HISTORY_FOR_AI = 20;
const MOBILE_QUERY = '(max-width: 639px)';
// If the visual viewport is this much shorter than the layout viewport, the keyboard is open.
const KEYBOARD_THRESHOLD_PX = 120;

// The chat is for public pages only.
const HIDDEN_PREFIXES = ['/admin', '/dashboard', '/login', '/register', '/forgot-password'];

const ICONS: Record<string, ElementType> = {
  quote: HiDocumentText,
  gift: HiGift,
  apparel: HiGift,
  print: HiPrinter,
  delivery: HiTruck,
  proof: HiShieldCheck,
  price: HiBanknotes,
  help: HiQuestionMarkCircle,
};

const welcomeMessage = (organizationName: string): Message => ({
  id: `welcome-${Date.now()}`,
  sender: 'bot',
  text:
    `Karibu! Welcome to ${organizationName}.\n\n` +
    `Tell me what you need branded or printed and I can point you to the right products, ` +
    `explain branding methods and timelines, and walk you through how ordering works.`,
  timestamp: new Date().toISOString(),
});

const generateId = (): string => {
  // crypto.randomUUID only exists in secure contexts, and some webviews lack it.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* fall through */
    }
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatTime = (value: string | Date): string =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Most LLM APIs require the conversation to start with a user turn, and our
 * history begins with the bot's welcome message. Trim it and cap the length.
 */
const toApiMessages = (history: Message[]) => {
  const recent = history.slice(-MAX_HISTORY_FOR_AI);
  const firstUser = recent.findIndex((m) => m.sender === 'user');
  if (firstUser === -1) return [];
  return recent.slice(firstUser).map(({ sender, text }) => ({ sender, text }));
};

/* ---------------------------------------------------------------
   Guest storage (functional consent required)
---------------------------------------------------------------- */

function saveGuestMessages(items: Message[]): void {
  if (typeof window === 'undefined' || !hasConsent('functional')) return;
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(items.slice(-60)));
  } catch {
    /* private browsing or storage full */
  }
}

function loadGuestMessages(organizationName: string): Message[] {
  if (typeof window !== 'undefined' && hasConsent('functional')) {
    try {
      const saved = window.localStorage.getItem(GUEST_STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(
            (m): m is Message =>
              !!m && typeof m.id === 'string' && typeof m.text === 'string' && (m.sender === 'user' || m.sender === 'bot'),
          );
          if (valid.length > 0) return valid;
        }
      }
    } catch {
      /* ignore malformed storage */
    }
  }
  return [welcomeMessage(organizationName)];
}

/* ---------------------------------------------------------------
   Supabase helpers
---------------------------------------------------------------- */

async function fetchQuickActions(): Promise<QuickAction[]> {
  const { data, error } = await supabase
    .from('chat_quick_actions')
    .select('id, label, query, icon_key')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as QuickAction[];
}

async function loadConversations(customerId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', customerId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('Unable to load conversations:', error);
    return [];
  }
  return (data ?? []) as Conversation[];
}

async function createConversation(customerId: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({ user_id: customerId })
    .select('id, title, created_at, updated_at')
    .single();
  if (error) {
    console.error('Unable to create conversation:', error);
    return null;
  }
  return data as Conversation;
}

async function saveMessage(conversationId: string, customerId: string, message: Message): Promise<void> {
  const { error } = await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    user_id: customerId,
    sender: message.sender,
    message: message.text,
  });
  if (error) console.error('Unable to save chat message:', error);
}

/* ---------------------------------------------------------------
   Component
---------------------------------------------------------------- */

export default function SiteChatbot({
  organizationName = 'Protocol Promotions',
  agentAvatar = '/favicon.png',
  whatsappPhone = (import.meta.env.VITE_WHATSAPP_PHONE as string | undefined) ?? '',
}: SiteChatbotProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const hiddenRoute = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isScrollVisible, setIsScrollVisible] = useState(true);
  // Starts true so the launcher never flashes on first paint (the site is server rendered). The effect below corrects it.
  const [consentPending, setConsentPending] = useState(true);
  // Only flips when the on-screen keyboard opens or closes (not on every resize frame).
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initKeyRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef(0);

  const cleanPhone = whatsappPhone.replace(/\D/g, '');

  const { data: quickActions = [] } = useQuery({
    queryKey: ['chat-quick-actions'],
    queryFn: fetchQuickActions,
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  /* Close the chat if the visitor navigates into a hidden area. */
  useEffect(() => {
    if (hiddenRoute && isOpen) setIsOpen(false);
  }, [hiddenRoute, isOpen]);

  /* Hide the launcher while the cookie banner is waiting for an answer, so it never covers the buttons. */
  useEffect(() => {
    const sync = () => setConsentPending(!hasDecided());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  /* Lock page scroll on phones while the full-screen chat is open. */
  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;

    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    const saved = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    const release = () => {
      body.style.overflow = saved.bodyOverflow;
      body.style.position = saved.bodyPosition;
      body.style.top = saved.bodyTop;
      body.style.left = saved.bodyLeft;
      body.style.right = saved.bodyRight;
      body.style.width = saved.bodyWidth;
      html.style.overflow = saved.htmlOverflow;
      html.style.overscrollBehavior = saved.htmlOverscroll;
    };

    const applyLock = () => {
      if (mediaQuery.matches) {
        // A fixed body is more reliable than overflow:hidden alone on iOS Safari.
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        html.style.overflow = 'hidden';
        html.style.overscrollBehavior = 'none';
      } else {
        release();
      }
    };

    applyLock();
    mediaQuery.addEventListener('change', applyLock);

    return () => {
      mediaQuery.removeEventListener('change', applyLock);
      release();
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  /*
   * Keep the phone sheet exactly the size of the visible area (handles the on-screen keyboard).
   * Styles are written straight to the element, with no React state and no CSS transition on
   * top/height. Re-rendering and animating on every resize frame is what made the sheet jump.
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const vv = window.visualViewport;
    let frame = 0;

    const clearStyles = () => {
      dialog.style.removeProperty('top');
      dialog.style.removeProperty('height');
      dialog.style.removeProperty('bottom');
    };

    const apply = () => {
      frame = 0;

      if (!mediaQuery.matches || !vv) {
        clearStyles();
        setKeyboardOpen(false);
        return;
      }

      const list = scrollRef.current;
      const wasNearBottom = list ? list.scrollHeight - list.scrollTop - list.clientHeight < 80 : true;

      dialog.style.top = `${Math.round(vv.offsetTop)}px`;
      // min() with 100svh keeps the sheet above the browser's bottom toolbar (iOS Safari reports a taller
      // visual viewport than what is actually visible). When the keyboard opens, vv.height is smaller and wins.
      dialog.style.height = `min(${Math.round(vv.height)}px, 100svh)`;
      dialog.style.bottom = 'auto';

      setKeyboardOpen(window.innerHeight - vv.height > KEYBOARD_THRESHOLD_PX);

      // Keep the latest message visible when the keyboard opens, without animating.
      if (list && wasNearBottom) list.scrollTop = list.scrollHeight;
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();
    vv?.addEventListener('resize', schedule);
    vv?.addEventListener('scroll', schedule);
    mediaQuery.addEventListener('change', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      vv?.removeEventListener('resize', schedule);
      vv?.removeEventListener('scroll', schedule);
      mediaQuery.removeEventListener('change', schedule);
      clearStyles();
      setKeyboardOpen(false);
    };
  }, [isOpen]);

  /* Signed-in customer. */
  useEffect(() => {
    let active = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active && data.user) setUserId(data.user.id);
      })
      .catch(() => {
        /* treated as a guest */
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadConversation = useCallback(
    async (conversationId: string, customerId: string): Promise<boolean> => {
      setIsLoadingConversation(true);
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id, sender, message, created_at')
          .eq('conversation_id', conversationId)
          .eq('user_id', customerId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Unable to load messages:', error);
          return false;
        }

        const loaded: Message[] = (data ?? []).map((item) => ({
          id: item.id as string,
          sender: item.sender === 'user' ? 'user' : 'bot',
          text: item.message as string,
          timestamp: item.created_at as string,
        }));

        setMessages(loaded.length > 0 ? loaded : [welcomeMessage(organizationName)]);
        setCurrentConversationId(conversationId);
        setShowHistory(false);
        return true;
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [organizationName],
  );

  /*
   * Set up the chat when it opens or the sign-in state changes.
   * initKeyRef stops it from re-initialising (and wiping the visible chat)
   * on every close/open when nothing about the visitor changed.
   */
  useEffect(() => {
    if (!isOpen) return;

    const key = userId ?? 'guest';
    if (initKeyRef.current === key) return;

    let cancelled = false;

    const initialise = async () => {
      if (!userId) {
        setConversations([]);
        setCurrentConversationId(null);
        setMessages(loadGuestMessages(organizationName));
        setIsLoadingConversation(false);
        initKeyRef.current = key;
        return;
      }

      setIsLoadingConversation(true);
      try {
        const list = await loadConversations(userId);
        if (cancelled) return;
        setConversations(list);

        if (list.length > 0) {
          await loadConversation(list[0].id, userId);
          if (!cancelled) initKeyRef.current = key;
          return;
        }

        const created = await createConversation(userId);
        if (cancelled) return;

        const welcome = welcomeMessage(organizationName);
        setMessages([welcome]);

        if (!created) {
          setCurrentConversationId(null);
          initKeyRef.current = key;
          return;
        }

        setConversations([created]);
        setCurrentConversationId(created.id);
        initKeyRef.current = key;
        await saveMessage(created.id, userId, welcome);
      } finally {
        setIsLoadingConversation(false);
      }
    };

    void initialise();
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId, organizationName, loadConversation]);

  /*
   * Keep the newest message in view.
   * Scroll the message list itself (scrollIntoView also moves the page and the visual viewport).
   * Only a single newly added message animates; loads, history switches and the typing
   * indicator jump instantly so scrolling never fights itself.
   */
  useEffect(() => {
    if (!isOpen || showHistory) return;
    const el = scrollRef.current;
    if (!el) return;

    const addedOne = messages.length - prevMessageCountRef.current === 1;
    prevMessageCountRef.current = messages.length;

    el.scrollTo({ top: el.scrollHeight, behavior: addedOne ? 'smooth' : 'auto' });
  }, [messages, isTyping, isOpen, showHistory, isLoadingConversation]);

  /* Fade the launcher out while the page is scrolling. */
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) return;
      setIsScrollVisible(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setIsScrollVisible(true), 700);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [isOpen]);

  /* -------------------------------------------------------------
     Conversations
  ------------------------------------------------------------- */

  const startNewConversation = async () => {
    const welcome = welcomeMessage(organizationName);

    if (!userId) {
      setMessages([welcome]);
      saveGuestMessages([welcome]);
      setShowHistory(false);
      return;
    }

    const created = await createConversation(userId);
    if (!created) return;

    setConversations((prev) => [created, ...prev]);
    setCurrentConversationId(created.id);
    setMessages([welcome]);
    setShowHistory(false);
    await saveMessage(created.id, userId, welcome);
  };

  const deleteConversation = async (conversationId: string) => {
    if (!userId) return;
    if (!window.confirm('Delete this conversation?')) return;

    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Unable to delete conversation:', error);
      return;
    }

    const remaining = conversations.filter((c) => c.id !== conversationId);
    setConversations(remaining);

    if (currentConversationId === conversationId) {
      if (remaining.length > 0) await loadConversation(remaining[0].id, userId);
      else await startNewConversation();
    }
  };

  /* -------------------------------------------------------------
     AI reply
  ------------------------------------------------------------- */

  const fetchAIResponse = async (history: Message[], conversationId: string | null) => {
    setIsTyping(true);

    const persist = async (message: Message, fullHistory: Message[]) => {
      if (userId && conversationId) await saveMessage(conversationId, userId, message);
      else saveGuestMessages(fullHistory);
    };

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { messages: toApiMessages(history) },
      });

      if (error) throw error;

      const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
      if (!reply) throw new Error('Empty AI response');

      const botMessage: Message = {
        id: generateId(),
        sender: 'bot',
        text: reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
      await persist(botMessage, [...history, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);

      const fallback: Message = {
        id: generateId(),
        sender: 'bot',
        text: cleanPhone
          ? 'I am having trouble connecting right now. You can continue on WhatsApp and the Protocol Promotions team will help you directly.'
          : 'I am having trouble connecting right now. Please use the Request a quote page and the Protocol Promotions team will get back to you.',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, fallback]);
      await persist(fallback, [...history, fallback]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async (textToSend?: string) => {
    if (isTyping || isLoadingConversation) return;

    const text = (textToSend ?? inputMessage).trim().slice(0, 2000);
    if (!text) return;

    const userMessage: Message = {
      id: generateId(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    const isFirstUserMessage = !messages.some((m) => m.sender === 'user');
    const updatedHistory = [...messages, userMessage];

    setMessages(updatedHistory);
    setInputMessage('');

    // Keep the keyboard open after sending, like a normal chat app. Must run inside the tap.
    if (textToSend === undefined) inputRef.current?.focus({ preventScroll: true });

    if (userId && currentConversationId) {
      await saveMessage(currentConversationId, userId, userMessage);

      // Name the conversation after the first question so the history list is readable.
      if (isFirstUserMessage) {
        const title = text.slice(0, 48);
        const conversationId = currentConversationId;
        void supabase
          .from('chat_conversations')
          .update({ title })
          .eq('id', conversationId)
          .eq('user_id', userId)
          .then(({ error }) => {
            if (!error) {
              setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, title } : c)));
            }
          });
      }
    } else {
      saveGuestMessages(updatedHistory);
    }

    await fetchAIResponse(updatedHistory, userId ? currentConversationId : null);
  };

  const openWhatsApp = () => {
    if (!cleanPhone) return;
    const text = encodeURIComponent(`Hi ${organizationName}, I would like help with a branding or printing order.`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  /* -------------------------------------------------------------
     Message formatting: bullets, **bold** and *italic* only
  ------------------------------------------------------------- */

  const renderMessage = (text: string) => (
    <div className="space-y-1">
      {text.split('\n').map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-0.5" />;

        const isBullet = /^[-*]\s+/.test(trimmed);
        const cleanLine = isBullet ? trimmed.replace(/^[-*]\s+/, '') : trimmed;
        const parts = cleanLine.split(/(\*\*.*?\*\*|\*.*?\*)/g);

        return (
          <div key={index} className={isBullet ? 'flex gap-2' : undefined}>
            {isBullet && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-current" />}
            <span>
              {parts.map((part, partIndex) => {
                if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
                }
                if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
                  return <em key={partIndex}>{part.slice(1, -1)}</em>;
                }
                return <span key={partIndex}>{part}</span>;
              })}
            </span>
          </div>
        );
      })}
    </div>
  );

  if (hiddenRoute) return null;

  const launcherHidden = consentPending && !isOpen;
  const hasUserMessage = messages.some((m) => m.sender === 'user');
  const contactCols = cleanPhone ? 'grid-cols-3' : 'grid-cols-2';

  /*
   * The outer wrapper must never carry a transform (translate, scale, etc.).
   * A transformed ancestor becomes the containing block for `position: fixed`
   * children, which would trap the full-screen mobile sheet inside this small
   * corner box. The scroll-fade animation lives on the launcher wrapper only.
   */
  return (
    <div className="fixed bottom-3 right-3 z-55 font-sans sm:bottom-5 sm:right-5 lg:bottom-6 lg:right-6">
      {/*
        Chat window: edge-to-edge sheet on phones (no border, no gap), floating panel from sm up.
        Only opacity and transform are transitioned. top/height are set live from the
        visual viewport and must never animate, or the sheet lags behind the keyboard.
      */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-label={`${organizationName} assistant`}
        aria-hidden={!isOpen}
        className={`fixed inset-0 flex h-svh w-full flex-col overflow-hidden bg-white transition-[opacity,transform] duration-300 ease-out max-sm:border-0 max-sm:shadow-none sm:absolute sm:inset-auto sm:bottom-18 sm:right-0 sm:h-[min(620px,calc(100dvh-6rem))] sm:w-95 sm:origin-bottom-right sm:border sm:border-brand-navy/15 sm:shadow-[0_24px_70px_rgba(15,23,42,0.18)] lg:bottom-20 lg:h-[min(680px,calc(100dvh-7rem))] lg:w-100 ${
          isOpen
            ? 'pointer-events-auto visible z-110 translate-y-0 opacity-100 sm:scale-100'
            : 'pointer-events-none invisible -z-10 translate-y-full opacity-0 sm:z-auto sm:translate-y-4 sm:scale-95'
        }`}
      >
        {/* Header */}
        <header
          className="flex shrink-0 items-center justify-between bg-brand-navy px-3 pb-2.5 text-white sm:px-4"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative shrink-0">
              <img src={agentAvatar} alt="" className="h-9 w-9 border border-white/20 bg-white object-contain p-0.5" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 border-2 border-brand-navy bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold leading-tight">Protocol Promotion Assistant</h3>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] leading-tight text-white/65">
                <HiShieldCheck size={11} className="shrink-0" />
                <span className="truncate">{userId ? 'Saved to your account' : 'Private conversation'}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            {userId && (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                title="Conversation history"
                aria-label="Conversation history"
                className="flex h-9 w-9 items-center justify-center text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <HiClock size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={() => void startNewConversation()}
              title="New conversation"
              aria-label="New conversation"
              className="flex h-9 w-9 items-center justify-center text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <HiPlus size={18} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="flex h-9 w-9 items-center justify-center text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <HiXMark size={19} />
            </button>
          </div>
        </header>

        {showHistory && userId ? (
          /* History */
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-brand-surface">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-navy/10 bg-white px-3 py-2.5">
              <div>
                <h4 className="text-sm font-semibold text-black">Your conversations</h4>
                <p className="text-[11px] text-gray-600">Your previous chats with us</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                aria-label="Back to chat"
                className="flex h-8 w-8 items-center justify-center text-gray-600 hover:text-black"
              >
                <HiChevronLeft size={19} />
              </button>
            </div>

            <div className="space-y-1.5 p-2.5">
              {conversations.length === 0 ? (
                <div className="py-10 text-center">
                  <HiChatBubbleLeftEllipsis className="mx-auto text-gray-500" size={30} />
                  <p className="mt-2 text-sm text-gray-600">No previous conversations</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`border bg-white p-2.5 transition ${
                      currentConversationId === conversation.id ? 'border-brand-orange' : 'border-brand-navy/15 hover:border-brand-navy/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => void loadConversation(conversation.id, userId)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-black">{conversation.title}</p>
                        <p className="mt-0.5 text-[10px] text-gray-600">
                          {new Date(conversation.updated_at).toLocaleDateString([], {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteConversation(conversation.id)}
                        title="Delete conversation"
                        aria-label="Delete conversation"
                        className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <HiTrash size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {/*
              Conversation. The inner column is min-h-full + justify-end, so a short chat sits at the
              bottom next to the input instead of leaving a big empty gap above the composer.
            */}
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-brand-surface px-2.5 py-3 sm:px-3"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {isLoadingConversation ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="h-2 w-2 animate-pulse bg-brand-navy/30" />
                    Loading conversation...
                  </div>
                </div>
              ) : (
                <div className="flex min-h-full flex-col justify-end gap-2.5">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[92%] flex-col sm:max-w-[88%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`wrap-break-word px-3 py-2 text-[14px] leading-snug sm:text-[13px] ${
                            msg.sender === 'user'
                              ? 'bg-brand-navy text-white'
                              : 'border border-brand-navy/15 bg-white text-black shadow-sm'
                          }`}
                          style={{ overflowWrap: 'anywhere' }}
                        >
                          {renderMessage(msg.text)}
                        </div>
                        <span className="mt-0.5 px-0.5 text-[10px] leading-none text-gray-500">{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start" aria-live="polite">
                      <div className="border border-brand-navy/15 bg-white px-3.5 py-2.5 shadow-sm">
                        <span className="sr-only">Assistant is typing</span>
                        <div className="flex gap-1.5" aria-hidden="true">
                          <span className="h-1.5 w-1.5 animate-bounce bg-brand-navy/40 [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 animate-bounce bg-brand-navy/40 [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce bg-brand-navy/40" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick actions: only before the first question, and hidden while the keyboard is up */}
            {quickActions.length > 0 && !hasUserMessage && !keyboardOpen && (
              <div className="shrink-0 border-t border-brand-navy/10 bg-white py-2">
                <div className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-2.5 scrollbar-none sm:px-3 [&::-webkit-scrollbar]:hidden">
                  {quickActions.map((action) => {
                    const Icon = ICONS[action.icon_key] ?? HiChatBubbleLeftEllipsis;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        disabled={isTyping || isLoadingConversation}
                        onClick={() => void sendMessage(action.query)}
                        className="flex shrink-0 snap-start items-center gap-1.5 border border-brand-navy/20 bg-white px-2.5 py-1.5 text-[11px] font-medium text-black transition hover:border-brand-navy hover:bg-brand-navy hover:text-white disabled:opacity-40"
                      >
                        <Icon size={13} />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* One slim contact row (WhatsApp, call, email), hidden while the keyboard is up */}
            {!keyboardOpen && (
              <div className={`grid shrink-0 divide-x divide-brand-navy/10 border-t border-brand-navy/10 bg-white ${contactCols}`}>
                {cleanPhone && (
                  <button
                    type="button"
                    onClick={openWhatsApp}
                    aria-label="Chat with our team on WhatsApp"
                    className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    <FaWhatsapp size={14} />
                    WhatsApp
                  </button>
                )}
                <a
                  href={`tel:${CONTACT_PHONE_LINK}`}
                  aria-label={`Call ${CONTACT_PHONE}`}
                  title={CONTACT_PHONE}
                  className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-black transition hover:bg-brand-surface hover:text-brand-orange"
                >
                  <HiPhone size={14} />
                  Call
                </a>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  aria-label={`Email ${CONTACT_EMAIL}`}
                  title={CONTACT_EMAIL}
                  className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-black transition hover:bg-brand-surface hover:text-brand-orange"
                >
                  <HiEnvelope size={14} />
                  Email
                </a>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
              className="flex shrink-0 items-center gap-2 border-t border-brand-navy/15 bg-white px-2.5 pt-2"
              style={{
                // The home-indicator inset is wasted space once the keyboard covers it.
                paddingBottom: keyboardOpen ? '0.5rem' : 'max(0.875rem, env(safe-area-inset-bottom, 0px))',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                maxLength={2000}
                placeholder="Ask about products, quotes or delivery..."
                aria-label="Type your message"
                aria-busy={isTyping}
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
                // 16px minimum on phones stops iOS Safari from zooming in on focus.
                className="min-w-0 flex-1 border border-transparent bg-brand-surface px-3 py-2.5 text-base text-black outline-none transition placeholder:text-gray-500 focus:border-brand-navy/30 focus:bg-white sm:text-xs"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping || isLoadingConversation}
                aria-label="Send message"
                // Keep focus in the input so the keyboard stays open after tapping send.
                onMouseDown={(event) => event.preventDefault()}
                onTouchStart={(event) => event.preventDefault()}
                className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand-orange text-white transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-30"
              >
                <HiPaperAirplane size={15} />
              </button>
            </form>
          </>
        )}
      </div>

      <div
        className={`transition-all duration-300 ${
          launcherHidden
            ? 'pointer-events-none opacity-0'
            : isScrollVisible || isOpen
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-10 opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Close WhatsApp chat' : 'Open WhatsApp chat'}
          aria-expanded={isOpen}
          tabIndex={launcherHidden ? -1 : 0}
          className={`h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition-transform hover:scale-105 active:scale-95 lg:h-16 lg:w-16 ${
            isOpen ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {isOpen ? <HiXMark size={23} /> : <FaWhatsapp size={30} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}