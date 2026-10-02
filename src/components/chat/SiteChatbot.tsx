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
  HiSparkles,
  HiPrinter,
  HiTruck,
  HiBanknotes,
  HiQuestionMarkCircle,
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

// The chat is for public pages only.
const HIDDEN_PREFIXES = ['/admin', '/dashboard', '/login', '/register', '/forgot-password'];

const ICONS: Record<string, ElementType> = {
  quote: HiDocumentText,
  gift: HiGift,
  apparel: HiSparkles,
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
  // On phones the sheet tracks the visual viewport so the on-screen keyboard never covers the input.
  const [mobileBox, setMobileBox] = useState<{ top: number; height: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initKeyRef = useRef<string | null>(null);

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

    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousWidth = document.body.style.width;
    const scrollY = window.scrollY;

    const applyLock = () => {
      if (mediaQuery.matches) {
        // A fixed body is more reliable than overflow:hidden alone on iOS Safari.
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.position = previousPosition;
        document.body.style.top = '';
        document.body.style.width = previousWidth;
        document.body.style.overflow = previousOverflow;
      }
    };

    applyLock();
    mediaQuery.addEventListener('change', applyLock);

    return () => {
      mediaQuery.removeEventListener('change', applyLock);
      document.body.style.position = previousPosition;
      document.body.style.top = '';
      document.body.style.width = previousWidth;
      document.body.style.overflow = previousOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  /* Keep the phone sheet sized to the visible area (handles the on-screen keyboard). */
  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;

    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const vv = window.visualViewport;

    const update = () => {
      if (!mediaQuery.matches || !vv) {
        setMobileBox(null);
        return;
      }
      setMobileBox({ top: vv.offsetTop, height: vv.height });
    };

    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    mediaQuery.addEventListener('change', update);

    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      mediaQuery.removeEventListener('change', update);
      setMobileBox(null);
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
   * Scroll the message list itself. scrollIntoView() also scrolls the page and
   * the visual viewport, which is what pushed the sheet around on phones.
   */
  useEffect(() => {
    if (!isOpen || showHistory) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping, isOpen, showHistory, isLoadingConversation, mobileBox?.height]);

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
    <div className="space-y-1.5">
      {text.split('\n').map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;

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

  /*
   * The outer wrapper must never carry a transform (translate, scale, etc.).
   * A transformed ancestor becomes the containing block for `position: fixed`
   * children, which would trap the full-screen mobile sheet inside this small
   * corner box. The scroll-fade animation lives on the launcher wrapper only.
   */
  return (
    <div
      className="fixed bottom-3 left-3 z-55 font-sans sm:bottom-5 sm:left-5 lg:bottom-6 lg:left-6"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
      }}
    >
      {/* Chat window: full-screen sheet on phones, floating panel from sm up */}
      <div
        role="dialog"
        aria-label={`${organizationName} assistant`}
        aria-hidden={!isOpen}
        // On phones, follow the visual viewport so the keyboard never hides the input.
        style={mobileBox ? { top: mobileBox.top, height: mobileBox.height, bottom: 'auto' } : undefined}
        className={`fixed inset-0 flex h-dvh w-full origin-bottom-left flex-col overflow-hidden border border-brand-navy/15 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] transition-all duration-300 sm:absolute sm:inset-auto sm:bottom-18 sm:left-0 sm:h-[min(620px,calc(100dvh-6rem))] sm:w-95 lg:bottom-20 lg:h-[min(680px,calc(100dvh-7rem))] lg:w-100 ${
          isOpen
            ? 'pointer-events-auto visible z-110 translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none invisible -z-10 translate-y-4 scale-95 opacity-0 sm:z-auto'
        }`}
      >
        {/* Header */}
        <header
          className="flex shrink-0 items-center justify-between bg-brand-navy px-4 py-3.5 text-white"
          style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="relative shrink-0">
              <img
                src={agentAvatar}
                alt=""
                className="h-9 w-9 border border-white/20 bg-white object-contain p-0.5 sm:h-10 sm:w-10"
              />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 border-2 border-brand-navy bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">Protocol Promotion Assistant</h3>
              <p className="mt-0.5 truncate text-[11px] text-white/60">Printing and branding assistant</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {userId && (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                title="Conversation history"
                aria-label="Conversation history"
                className="flex h-9 w-9 items-center justify-center text-white/70 transition hover:bg-white/10 hover:text-white sm:h-8 sm:w-8"
              >
                <HiClock size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={() => void startNewConversation()}
              title="New conversation"
              aria-label="New conversation"
              className="flex h-9 w-9 items-center justify-center text-white/70 transition hover:bg-white/10 hover:text-white sm:h-8 sm:w-8"
            >
              <HiPlus size={18} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="flex h-9 w-9 items-center justify-center text-white/70 transition hover:bg-white/10 hover:text-white sm:h-8 sm:w-8"
            >
              <HiXMark size={19} />
            </button>
          </div>
        </header>

        {showHistory && userId ? (
          /* History */
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-brand-surface">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-navy/10 bg-white px-4 py-3">
              <div>
                <h4 className="text-sm font-semibold text-black">Your conversations</h4>
                <p className="mt-0.5 text-[11px] text-gray-600">Your previous chats with us</p>
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

            <div className="space-y-2 p-3">
              {conversations.length === 0 ? (
                <div className="py-12 text-center">
                  <HiChatBubbleLeftEllipsis className="mx-auto text-gray-500" size={32} />
                  <p className="mt-3 text-sm text-gray-600">No previous conversations</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`border bg-white p-3 transition ${
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
                        <p className="mt-1 text-[10px] text-gray-600">
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
                        className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 transition hover:bg-red-50 hover:text-red-600 sm:h-7 sm:w-7"
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
            {/* Conversation */}
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-brand-surface px-3 py-4 sm:px-3.5"
            >
              {isLoadingConversation ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="h-2 w-2 animate-pulse bg-brand-navy/30" />
                    Loading conversation...
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-center">
                    <span className="inline-flex items-center gap-1.5 border border-brand-navy/15 bg-white px-2.5 py-1 text-[10px] text-gray-600">
                      <HiShieldCheck size={12} />
                      {userId ? 'Saved to your account' : 'Private conversation'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[90%] flex-col sm:max-w-[88%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`wrap-break-word px-3.5 py-3 text-[13px] leading-relaxed ${
                              msg.sender === 'user'
                                ? 'bg-brand-navy text-white'
                                : 'border border-brand-navy/15 bg-white text-black shadow-sm'
                            }`}
                            style={{ overflowWrap: 'anywhere' }}
                          >
                            {renderMessage(msg.text)}
                          </div>
                          <span className="mt-1.5 px-1 text-[10px] text-gray-600">{formatTime(msg.timestamp)}</span>
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex justify-start" aria-live="polite">
                        <div className="border border-brand-navy/15 bg-white px-4 py-3 shadow-sm">
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
                </>
              )}
            </div>

            {/* Quick actions: only before the first question, so they stop eating space on phones */}
            {quickActions.length > 0 && !hasUserMessage && (
              <div className="shrink-0 border-t border-brand-navy/10 bg-white px-3 py-2.5">
                <div className="-mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 scrollbar-none sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                  {quickActions.map((action) => {
                    const Icon = ICONS[action.icon_key] ?? HiChatBubbleLeftEllipsis;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        disabled={isTyping || isLoadingConversation}
                        onClick={() => void sendMessage(action.query)}
                        className="flex shrink-0 snap-start items-center gap-1.5 border border-brand-navy/20 bg-white px-3 py-2 text-[11px] font-medium text-black transition hover:border-brand-navy hover:bg-brand-navy hover:text-white disabled:opacity-40"
                      >
                        <Icon size={13} />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WhatsApp handoff, shown only when a number is configured */}
            {cleanPhone && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-emerald-200 bg-emerald-50 px-3.5 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <HiShieldCheck className="shrink-0 text-emerald-600" size={16} />
                  <span className="truncate text-[11px] text-emerald-800">Want to speak with our team?</span>
                </div>
                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  <FaWhatsapp size={14} />
                  WhatsApp
                </button>
              </div>
            )}

            {/* Contact: one short line on phones, full details from sm up */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-brand-navy/10 bg-white px-3.5 py-1.5 text-[10px]">
              <a href={`tel:${CONTACT_PHONE_LINK}`} className="font-medium text-black hover:text-brand-orange">
                <span className="sm:hidden">Call us</span>
                <span className="hidden sm:inline">Call {CONTACT_PHONE}</span>
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="min-w-0 truncate font-medium text-black hover:text-brand-orange">
                <span className="sm:hidden">Email us</span>
                <span className="hidden sm:inline">{CONTACT_EMAIL}</span>
              </a>
            </div>

            {/* Input */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
              className="flex shrink-0 items-center gap-2 border-t border-brand-navy/15 bg-white p-2.5"
              style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0px))' }}
            >
              {/*
                Not disabled while the bot replies: disabling a focused input closes the
                phone keyboard and makes the whole layout jump. sendMessage() already
                ignores submits while a reply is pending.
              */}
              <input
                type="text"
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                maxLength={2000}
                placeholder="Ask about products, quotes or delivery..."
                aria-label="Type your message"
                aria-busy={isTyping}
                enterKeyHint="send"
                autoComplete="off"
                // 16px minimum on phones stops iOS Safari from zooming in on focus.
                className="min-w-0 flex-1 border border-transparent bg-brand-surface px-3.5 py-2.5 text-base text-black outline-none transition placeholder:text-gray-500 focus:border-brand-navy/30 focus:bg-white sm:text-xs"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping || isLoadingConversation}
                aria-label="Send message"
                // Keep focus in the input so the keyboard stays open after tapping send.
                onMouseDown={(event) => event.preventDefault()}
                className="flex h-11 w-11 shrink-0 items-center justify-center bg-brand-orange text-white transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10"
              >
                <HiPaperAirplane size={15} />
              </button>
            </form>
          </>
        )}
      </div>

      {/* Launcher. The fade animation lives here, never on the outer wrapper. */}
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
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
          aria-expanded={isOpen}
          tabIndex={launcherHidden ? -1 : 0}
          className={`h-14 w-14 items-center justify-center bg-brand-navy text-white shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition-colors hover:bg-brand-orange active:scale-95 lg:h-16 lg:w-16 ${
            isOpen ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {isOpen ? <HiXMark size={23} /> : <HiChatBubbleLeftEllipsis size={25} />}
        </button>
      </div>
    </div>
  );
}