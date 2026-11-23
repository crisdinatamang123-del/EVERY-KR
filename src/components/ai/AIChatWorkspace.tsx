/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { OFFICIAL_EVERYKR_ICON } from '../../constants/brandAssets';
import { EveryKrAnimatedLogo } from '../common/EveryKrAnimatedLogo';
import {
  ChatSession,
  ChatMessage,
  GroundingSource,
  SupportedDocFormat,
  GeneratedDocClientItem,
  UploadedFileClientItem,
  ExecutionJobClientItem,
  AiProjectClientItem,
  AiTaskClientItem
} from '../../types/chat';
import {
  getStoredChatSessions,
  getActiveSessionId,
  setActiveSessionId,
  createNewChatSession,
  updateSessionMessages,
  deleteChatSession,
  renameChatSession,
  getOrCreateGuestSessionId,
  getStoredGuestDisplayName,
  saveGuestDisplayName,
  buildPersonalizedAiGreeting,
  getLocalizedWelcomeGateCopy,
  sanitizeGuestDisplayNameClient
} from '../../services/chatSessionService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AI_LANGUAGES } from './EveryKrAIAssistant';
import {
  Bot,
  User,
  Send,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Sparkles,
  Paperclip,
  Mic,
  Volume2,
  VolumeX,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Code2,
  GraduationCap,
  BookOpen,
  CalendarClock,
  Compass,
  FileText,
  ArrowRight,
  FolderKanban,
  CheckSquare,
  FileSpreadsheet,
  Terminal,
  Download,
  Play,
  Loader2,
  CheckCircle2,
  Clock,
  FileArchive,
  Presentation,
  Eye,
  Sun,
  Moon
} from 'lucide-react';

type ActiveWorkspaceTab = 'chat' | 'projects' | 'files' | 'sandbox';

export const AIChatWorkspace: React.FC = () => {
  const { setActivePage, showToast, currentUser, language, theme, setTheme } = useApp();
  const isNight = theme === 'dark';
  const isAuthenticated = Boolean(currentUser && (currentUser.id || currentUser.uid));
  const guestSessionId = useRef<string>(getOrCreateGuestSessionId()).current;
  const userScope = isAuthenticated
    ? String(currentUser?.id || currentUser?.uid)
    : guestSessionId;

  const isRtl = language === 'ur';
  const welcomeCopy = getLocalizedWelcomeGateCopy(language);

  // Personalized Display Name & Guest Gate State
  const [guestName, setGuestName] = useState<string | null>(() => getStoredGuestDisplayName());
  const [guestNameInput, setGuestNameInput] = useState<string>(() => getStoredGuestDisplayName() || '');
  const [guestNameError, setGuestNameError] = useState<string>('');
  const [isEditingGuestName, setIsEditingGuestName] = useState<boolean>(false);

  const activeDisplayName = isAuthenticated
    ? (currentUser?.name?.trim() || currentUser?.email?.split('@')[0] || 'Student')
    : (guestName || '');

  const showGuestWelcomeGate = !isAuthenticated && (!guestName || isEditingGuestName);

  // Listen for guest name updates from floating launcher
  useEffect(() => {
    const onGuestNameUpdate = () => {
      setGuestName(getStoredGuestDisplayName());
    };
    window.addEventListener('everykr-ai-guest-name-updated', onGuestNameUpdate);
    return () => window.removeEventListener('everykr-ai-guest-name-updated', onGuestNameUpdate);
  }, []);

  // Navigation & Sidebar State
  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveId] = useState<string>('');
  const [sessionSearch, setSessionSearch] = useState('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');

  // Active chat state
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeExecutionStage, setActiveExecutionStage] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    mimeType: string;
    dataUrl: string;
    base64: string;
  } | null>(null);
  const [requestedDocFormat, setRequestedDocFormat] = useState<SupportedDocFormat | ''>('');
  const [autoExecuteCode, setAutoExecuteCode] = useState<boolean>(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Unified Projects, Tasks, Files, Documents & Jobs state
  const [projects, setProjects] = useState<AiProjectClientItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [tasks, setTasks] = useState<AiTaskClientItem[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileClientItem[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocClientItem[]>([]);
  const [executionJobs, setExecutionJobs] = useState<ExecutionJobClientItem[]>([]);

  // Project & Task creation inputs
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<AiProjectClientItem['category']>('general');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<AiTaskClientItem['priority']>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Document Studio state
  const [docStudioTitle, setDocStudioTitle] = useState('South Korea University Comparison & Study Plan');
  const [docStudioFormat, setDocStudioFormat] = useState<SupportedDocFormat>('pdf');
  const [docStudioContent, setDocStudioContent] = useState(
    `# South Korea Study Plan & University Comparison (March 2027 Intake)\n\n## 1. Academic & Career Objective\nPursuing an international degree in South Korea with verified scholarship pathways.\n\n## 2. Target University Comparison\n| University | City | Semester Tuition (KRW) | Language Track |\n| --- | --- | --- | --- |\n| KAIST | Daejeon | 4,300,000 | English Track |\n| Yonsei University | Seoul | 6,400,000 | English / Korean |\n| Korea University | Seoul | 5,900,000 | English / Korean |\n| Kyungpook National University | Daegu | 2,600,000 | English / Korean |`
  );
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [previewFileItem, setPreviewFileItem] = useState<UploadedFileClientItem | null>(null);

  // Code Execution Sandbox state
  const [sandboxLang, setSandboxLang] = useState<'python' | 'javascript' | 'typescript' | 'html'>('python');
  const [sandboxCode, setSandboxCode] = useState<string>(
    `# EVERYKR AI — Isolated Python 3 Execution Sandbox\nuniversities = [\n    {"name": "SNU", "tuition_krw": 3800000, "scholarship_pct": 0.50},\n    {"name": "KAIST", "tuition_krw": 4300000, "scholarship_pct": 1.00},\n    {"name": "Yonsei", "tuition_krw": 6400000, "scholarship_pct": 0.40},\n    {"name": "KNU", "tuition_krw": 2600000, "scholarship_pct": 0.50},\n]\n\nprint("University Net Semester Tuition Summary (KRW):")\nfor u in universities:\n    net = int(u["tuition_krw"] * (1 - u["scholarship_pct"]))\n    print(f"- {u['name']}: {net:,} KRW (after {int(u['scholarship_pct']*100)}% scholarship)")\n`
  );
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);
  const [activeSandboxJob, setActiveSandboxJob] = useState<ExecutionJobClientItem | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const studioFileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const releaseMicrophoneSession = () => {
    try {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
    } catch {
      // ignore stop errors
    }
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    } catch {
      // ignore stream cleanup errors
    }
    setIsListening(false);
  };

  useEffect(() => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
      }
    } catch {
      // ignore
    }
    return () => {
      releaseMicrophoneSession();
    };
  }, []);

  // Personalized Greeting Message Builder
  const personalizedGreetingText = buildPersonalizedAiGreeting(
    activeDisplayName || 'Friend',
    isAuthenticated,
    language
  );

  // Initialize sessions scoped by user UID or guestSessionId
  useEffect(() => {
    let stored = getStoredChatSessions(userScope);
    if (stored.length === 0) {
      const greetingMsg: ChatMessage = {
        id: 'welcome_greeting_1',
        sender: 'assistant',
        text: personalizedGreetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const defaultSession = createNewChatSession(
        'EVERYKR AI',
        [greetingMsg],
        userScope
      );
      stored = [defaultSession];
    } else {
      // Refresh the welcome greeting message in the active session if it only has the initial welcome turn
      stored = stored.map(s => {
        if (s.messages.length === 1 && s.messages[0].id.startsWith('welcome')) {
          const updatedMsgs = [{ ...s.messages[0], text: personalizedGreetingText }];
          updateSessionMessages(s.id, updatedMsgs, userScope);
          return { ...s, messages: updatedMsgs };
        }
        return s;
      });
    }
    setSessions(stored);
    const activeId = getActiveSessionId(userScope) || stored[0]?.id;
    setActiveId(activeId);
  }, [userScope, personalizedGreetingText]);

  // Fetch Projects, Tasks, Uploaded Files, Generated Documents & Execution Jobs from backend
  const refreshBackendWorkspaceData = async () => {
    try {
      const [projRes, taskRes, fileRes, docRes, jobRes] = await Promise.all([
        fetch(`/api/ai/projects?ownerId=${encodeURIComponent(userScope)}`),
        fetch(`/api/ai/tasks?ownerId=${encodeURIComponent(userScope)}`),
        fetch(`/api/ai/files?ownerId=${encodeURIComponent(userScope)}`),
        fetch(`/api/ai/documents?ownerId=${encodeURIComponent(userScope)}`),
        fetch(`/api/ai/jobs?ownerId=${encodeURIComponent(userScope)}`)
      ]);

      if (projRes.ok) {
        const d = await projRes.json();
        if (Array.isArray(d.projects)) {
          setProjects(d.projects);
          if (!selectedProjectId && d.projects[0]?.id) {
            setSelectedProjectId(d.projects[0].id);
          }
        }
      }
      if (taskRes.ok) {
        const d = await taskRes.json();
        if (Array.isArray(d.tasks)) setTasks(d.tasks);
      }
      if (fileRes.ok) {
        const d = await fileRes.json();
        if (Array.isArray(d.files)) setUploadedFiles(d.files);
      }
      if (docRes.ok) {
        const d = await docRes.json();
        if (Array.isArray(d.documents)) setGeneratedDocs(d.documents);
      }
      if (jobRes.ok) {
        const d = await jobRes.json();
        if (Array.isArray(d.jobs)) {
          setExecutionJobs(d.jobs);
          if (!activeSandboxJob && d.jobs[0]) {
            setActiveSandboxJob(d.jobs[0]);
          }
        }
      }
    } catch {
      // ignore network error during initial hydration
    }
  };

  useEffect(() => {
    refreshBackendWorkspaceData();
  }, [userScope]);

  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Auto scroll to bottom on new chat messages
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages, isGenerating, activeTab]);

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputMessage]);

  // Guest Name Submission Handler
  const handleGuestNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = sanitizeGuestDisplayNameClient(guestNameInput);
    if (!validation.valid) {
      setGuestNameError(validation.error || 'Please enter a valid name.');
      return;
    }
    const saved = saveGuestDisplayName(validation.name);
    if (saved) {
      setGuestName(saved);
      setGuestNameError('');
      setIsEditingGuestName(false);

      // Update the initial greeting in the current session
      const newGreeting = buildPersonalizedAiGreeting(saved, false, language);
      if (currentSession) {
        const hasOnlyWelcome =
          currentSession.messages.length <= 1 &&
          (currentSession.messages[0]?.id.startsWith('welcome') || currentSession.messages.length === 0);
        if (hasOnlyWelcome) {
          const updated: ChatMessage[] = [
            {
              id: 'welcome_greeting_1',
              sender: 'assistant',
              text: newGreeting,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ];
          updateSessionMessages(currentSession.id, updated, userScope);
          setSessions(getStoredChatSessions(userScope));
        }
      }
      showToast(`Welcome to EVERYKR AI, ${saved}!`);
    }
  };

  // STRICT USER-INITIATED MICROPHONE PERMISSION (Only runs when user explicitly clicks Mic button)
  const toggleVoiceInput = async () => {
    if (isListening) {
      releaseMicrophoneSession();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice input is not supported by your current browser. Text chat remains fully functional.');
      return;
    }

    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      const langObj = AI_LANGUAGES.find(l => l.code === language);
      recognition.lang = langObj ? langObj.ttsCode : 'en-US';
      const baseInput = inputMessage.trim();

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = 0; i < (event?.results?.length || 0); i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0]?.transcript || '';
          } else {
            interimTranscript += res[0]?.transcript || '';
          }
        }
        const combined = (finalTranscript || interimTranscript).trim();
        if (combined) {
          setInputMessage(baseInput ? `${baseInput} ${combined}` : combined);
        }
        if (finalTranscript) {
          releaseMicrophoneSession();
        }
      };

      recognition.onerror = () => {
        releaseMicrophoneSession();
        showToast('Microphone access was denied or ended. You can continue chatting by text.');
      };

      recognition.onend = () => {
        releaseMicrophoneSession();
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      showToast('Listening... Speak now');
    } catch {
      releaseMicrophoneSession();
      showToast('Microphone permission was not granted. Text chat remains fully available.');
    }
  };

  const toggleSpeakMessage = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech is not supported on this browser.');
      return;
    }
    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/```[\s\S]*?```/g, 'Code block omitted.').replace(/[#*_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const langObj = AI_LANGUAGES.find(l => l.code === language);
    utterance.lang = langObj ? langObj.ttsCode : 'en-US';
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Handle File Attachment in Chat Input or Studio
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, uploadDirectlyToStudio = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('File size must be under 15 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const resultStr = reader.result as string;
      const base64Data = resultStr.split(',')[1] || '';

      if (uploadDirectlyToStudio) {
        try {
          const res = await fetch('/api/ai/files/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ownerId: userScope,
              projectId: selectedProjectId || undefined,
              conversationId: currentSession?.id,
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              base64Data
            })
          });
          const data = await res.json();
          if (res.ok && data.file) {
            setUploadedFiles(prev => [data.file, ...prev]);
            setPreviewFileItem(data.file);
            showToast(`Processed ${file.name}`);
          } else {
            showToast(data.error || 'Failed to process file');
          }
        } catch {
          showToast('Error uploading file');
        }
      } else {
        setAttachedFile({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataUrl: resultStr,
          base64: base64Data
        });
        showToast(`Attached ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Create New Session with Personalized Greeting
  const handleCreateNewChat = () => {
    const greetingMsg: ChatMessage = {
      id: 'welcome_greeting_' + Date.now(),
      sender: 'assistant',
      text: personalizedGreetingText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const newSession = createNewChatSession(
      'New Conversation',
      [greetingMsg],
      userScope,
      selectedProjectId || undefined
    );
    setSessions(getStoredChatSessions(userScope));
    setActiveId(newSession.id);
    setInputMessage('');
    setAttachedFile(null);
    setActiveTab('chat');
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectSession = (id: string) => {
    setActiveId(id);
    setActiveSessionId(id, userScope);
    setActiveTab('chat');
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteChatSession(id, userScope);
    setSessions(updated);
    if (activeSessionId === id) {
      if (updated.length > 0) {
        setActiveId(updated[0].id);
        setActiveSessionId(updated[0].id, userScope);
      } else {
        const greetingMsg: ChatMessage = {
          id: 'welcome_greeting_' + Date.now(),
          sender: 'assistant',
          text: personalizedGreetingText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const fresh = createNewChatSession('New Conversation', [greetingMsg], userScope);
        setSessions([fresh]);
        setActiveId(fresh.id);
        setActiveSessionId(fresh.id, userScope);
      }
    }
    showToast('Conversation deleted');
  };

  const handleSaveRename = (id: string) => {
    if (titleInput.trim()) {
      renameChatSession(id, titleInput.trim(), userScope);
      setSessions(getStoredChatSessions(userScope));
    }
    setEditingTitleId(null);
  };

  // Submit Message to Unified EVERYKR AI Router
  const handleSendMessage = async (textOverride?: string, formatOverride?: SupportedDocFormat) => {
    const messageToSend = textOverride !== undefined ? textOverride : inputMessage.trim();
    if ((!messageToSend && !attachedFile) || isGenerating) return;
    if (!currentSession) return;

    const effectiveDocFormat = formatOverride || (requestedDocFormat ? requestedDocFormat : undefined);

    const userMessageId = 'msg_user_' + Date.now();
    const newUserMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: messageToSend || (attachedFile ? `Analyze uploaded file: ${attachedFile.name}` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fileAttachment: attachedFile
        ? {
            name: attachedFile.name,
            mimeType: attachedFile.mimeType,
            dataUrl: attachedFile.dataUrl
          }
        : undefined
    };

    const updatedMessages = [...currentSession.messages, newUserMsg];
    updateSessionMessages(currentSession.id, updatedMessages, userScope);
    setSessions(getStoredChatSessions(userScope));

    const currentFilePayload = attachedFile
      ? { name: attachedFile.name, data: attachedFile.base64, mimeType: attachedFile.mimeType }
      : undefined;

    setInputMessage('');
    setAttachedFile(null);
    setRequestedDocFormat('');
    setIsGenerating(true);
    setActiveExecutionStage('Understanding request');

    const assistantMsgId = 'msg_ai_' + Date.now();
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: [],
      executionStages: ['Understanding request']
    };

    const messagesWithPlaceholder = [...updatedMessages, initialAssistantMsg];
    updateSessionMessages(currentSession.id, messagesWithPlaceholder, userScope);
    setSessions(getStoredChatSessions(userScope));

    const requestBody = {
      message: messageToSend,
      conversation: updatedMessages
        .filter(m => !m.id.startsWith('welcome_greeting'))
        .slice(-6)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          text: m.text
        })),
      language,
      ownerId: userScope,
      projectId: selectedProjectId || undefined,
      conversationId: currentSession.id,
      fileAttachment: currentFilePayload,
      requestedDocFormat: effectiveDocFormat,
      autoExecuteCode,
      studentContext: currentUser
        ? {
            uid: currentUser.id || currentUser.uid,
            name: activeDisplayName,
            nationality: currentUser.nationality,
            major: currentUser.major,
            studyLevel: currentUser.studyLevel,
            currentCity: currentUser.currentCity,
            university: currentUser.university
          }
        : {
            name: activeDisplayName
          }
    };

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming connection failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let receivedSources: GroundingSource[] = [];
      let receivedStages: string[] = ['Understanding request'];
      let receivedDocs: GeneratedDocClientItem[] = [];
      let receivedJob: ExecutionJobClientItem | null = null;
      let receivedUpload: UploadedFileClientItem | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));
              if (parsed.stage) {
                setActiveExecutionStage(parsed.stage);
                if (!receivedStages.includes(parsed.stage)) {
                  receivedStages.push(parsed.stage);
                }
              }
              if (parsed.text) {
                accumulatedText += parsed.text;
                const snapshotText = accumulatedText;
                const snapshotStages = [...receivedStages];
                setSessions(prev =>
                  prev.map(s =>
                    s.id === currentSession.id
                      ? {
                          ...s,
                          messages: s.messages.map(m =>
                            m.id === assistantMsgId
                              ? { ...m, text: snapshotText, executionStages: snapshotStages }
                              : m
                          )
                        }
                      : s
                  )
                );
              }
              if (parsed.done) {
                if (Array.isArray(parsed.sources)) receivedSources = parsed.sources;
                if (Array.isArray(parsed.executionStages)) receivedStages = parsed.executionStages;
                if (Array.isArray(parsed.generatedDocuments)) receivedDocs = parsed.generatedDocuments;
                if (parsed.executionJob) receivedJob = parsed.executionJob;
                if (parsed.uploadedFile) receivedUpload = parsed.uploadedFile;
              }
            } catch {
              // Ignore partial SSE JSON frame
            }
          }
        }
      }

      const completedList = messagesWithPlaceholder.map(m =>
        m.id === assistantMsgId
          ? {
              ...m,
              text: accumulatedText || 'I processed your request.',
              sources: receivedSources,
              executionStages: receivedStages,
              generatedDocuments: receivedDocs,
              executionJob: receivedJob,
              uploadedFile: receivedUpload
            }
          : m
      );
      updateSessionMessages(currentSession.id, completedList, userScope);
      setSessions(getStoredChatSessions(userScope));
      refreshBackendWorkspaceData();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        try {
          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          const data = await res.json();
          const finalList = getStoredChatSessions(userScope).find(s => s.id === currentSession.id)?.messages || [];
          const completedList = finalList.map(m =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: data.reply || 'System encountered an error. Please try again.',
                  sources: data.sources || [],
                  executionStages: data.executionStages || ['Understanding request'],
                  generatedDocuments: data.generatedDocuments || [],
                  executionJob: data.executionJob || null,
                  uploadedFile: data.uploadedFile,
                  isOfflineFallback: data.isOfflineFallback
                }
              : m
          );
          updateSessionMessages(currentSession.id, completedList, userScope);
          setSessions(getStoredChatSessions(userScope));
          refreshBackendWorkspaceData();
        } catch {
          showToast('Failed to connect to AI engine.');
        }
      }
    } finally {
      setIsGenerating(false);
      setActiveExecutionStage(null);
      abortControllerRef.current = null;
    }
  };

  // Quick Export Message Content as Real Downloadable File
  const handleQuickExportMessage = async (msgText: string, format: SupportedDocFormat) => {
    try {
      showToast(`Generating ${format.toUpperCase()} document...`);
      const res = await fetch('/api/ai/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: userScope,
          projectId: selectedProjectId || undefined,
          conversationId: currentSession?.id,
          title: currentSession?.title || 'EVERYKR_AI_Export',
          format,
          content: msgText
        })
      });
      const data = await res.json();
      if (res.ok && data.document) {
        setGeneratedDocs(prev => [data.document, ...prev]);
        window.open(data.document.downloadUrl, '_blank');
        showToast(`${data.document.fileName} ready for download!`);
      } else {
        showToast(data.error || 'Document export failed');
      }
    } catch {
      showToast('Failed to generate document');
    }
  };

  // Document Studio Generator Handler
  const handleStudioGenerateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docStudioContent.trim() || isGeneratingDoc) return;
    setIsGeneratingDoc(true);
    try {
      const res = await fetch('/api/ai/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: userScope,
          projectId: selectedProjectId || undefined,
          conversationId: currentSession?.id,
          title: docStudioTitle.trim() || 'EVERYKR_Document',
          format: docStudioFormat,
          content: docStudioContent
        })
      });
      const data = await res.json();
      if (res.ok && data.document) {
        setGeneratedDocs(prev => [data.document, ...prev]);
        showToast(`Generated ${data.document.fileName} (${(data.document.sizeBytes / 1024).toFixed(1)} KB)`);
      } else {
        showToast(data.error || 'Failed to generate document');
      }
    } catch {
      showToast('Document generation error');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  // Isolated Code Execution Sandbox Runner
  const handleRunSandboxCode = async (langOverride?: 'python' | 'javascript' | 'typescript' | 'html', codeOverride?: string) => {
    const langToRun = langOverride || sandboxLang;
    const codeToRun = codeOverride !== undefined ? codeOverride : sandboxCode;
    if (!codeToRun.trim() || isRunningSandbox) return;

    setIsRunningSandbox(true);
    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: userScope,
          projectId: selectedProjectId || undefined,
          conversationId: currentSession?.id,
          language: langToRun,
          code: codeToRun
        })
      });
      const data = await res.json();
      if (res.ok && data.job) {
        setActiveSandboxJob(data.job);
        setExecutionJobs(prev => [data.job, ...prev]);
        if (Array.isArray(data.generatedDocuments) && data.generatedDocuments.length > 0) {
          setGeneratedDocs(prev => [...data.generatedDocuments, ...prev]);
        }
        showToast(`Execution ${data.job.status} in ${data.job.durationMs}ms`);
      } else {
        showToast(data.error || 'Sandbox execution failed');
      }
    } catch {
      showToast('Failed to reach execution sandbox');
    } finally {
      setIsRunningSandbox(false);
    }
  };

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch('/api/ai/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: userScope,
          name: newProjectName.trim(),
          description: newProjectDesc.trim(),
          category: newProjectCategory
        })
      });
      const data = await res.json();
      if (res.ok && data.project) {
        setProjects(prev => [data.project, ...prev]);
        setSelectedProjectId(data.project.id);
        setNewProjectName('');
        setNewProjectDesc('');
        showToast(`Created project "${data.project.name}"`);
      }
    } catch {
      showToast('Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/ai/projects/${projectId}?ownerId=${encodeURIComponent(userScope)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (selectedProjectId === projectId) setSelectedProjectId('');
        showToast('Project deleted');
      }
    } catch {
      showToast('Failed to delete project');
    }
  };

  // Create & Update Tasks
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch('/api/ai/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: userScope,
          projectId: selectedProjectId || undefined,
          title: newTaskTitle.trim(),
          priority: newTaskPriority,
          dueDate: newTaskDueDate || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks(prev => [data.task, ...prev]);
        setNewTaskTitle('');
        setNewTaskDueDate('');
        showToast('Task added');
      }
    } catch {
      showToast('Failed to add task');
    }
  };

  const handleToggleTaskStatus = async (task: AiTaskClientItem) => {
    const nextStatus: AiTaskClientItem['status'] =
      task.status === 'completed' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'completed';
    try {
      const res = await fetch('/api/ai/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          ownerId: userScope,
          title: task.title,
          status: nextStatus
        })
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks(prev => prev.map(t => (t.id === task.id ? data.task : t)));
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/ai/tasks/${taskId}?ownerId=${encodeURIComponent(userScope)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch {
      // ignore
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setActiveExecutionStage(null);
      showToast('Generation stopped');
    }
  };

  const handleFeedback = (msgId: string, type: 'helpful' | 'unhelpful') => {
    if (!currentSession) return;
    const updated = currentSession.messages.map(m => (m.id === msgId ? { ...m, feedback: type } : m));
    updateSessionMessages(currentSession.id, updated, userScope);
    setSessions(getStoredChatSessions(userScope));
    showToast(type === 'helpful' ? 'Thank you for your feedback!' : 'Feedback noted.');
  };

  const handleRegenerate = (msgIndex: number) => {
    if (!currentSession || isGenerating) return;
    const userMsg = currentSession.messages[msgIndex - 1];
    if (userMsg && userMsg.sender === 'user') {
      const pruned = currentSession.messages.slice(0, msgIndex);
      updateSessionMessages(currentSession.id, pruned, userScope);
      setSessions(getStoredChatSessions(userScope));
      handleSendMessage(userMsg.text);
    }
  };

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  const promptSuggestions = [
    {
      category: 'Korean Universities & March 2027 Deadlines',
      icon: <GraduationCap className="w-4 h-4 text-emerald-400" />,
      query: 'Compare verified admission pathways, tuition fees, and March 2027 deadlines among the 25 approved Korean universities on EVERYKR.'
    },
    {
      category: 'Generate Study Plan (.DOCX)',
      icon: <FileText className="w-4 h-4 text-sky-400" />,
      query: 'Generate a complete, formal Korean University Study Plan & Personal Statement and export it as a Word (.docx) file.',
      format: 'docx' as SupportedDocFormat
    },
    {
      category: 'Generate Tuition & Scholarship Sheet (.XLSX)',
      icon: <FileSpreadsheet className="w-4 h-4 text-teal-400" />,
      query: 'Create an Excel (.xlsx) spreadsheet comparing semester tuition, dormitory costs, and GKS scholarship benefits across top Korean universities.',
      format: 'xlsx' as SupportedDocFormat
    },
    {
      category: 'Generate Presentation Deck (.PPTX)',
      icon: <Presentation className="w-4 h-4 text-amber-400" />,
      query: 'Create a 5-slide PowerPoint (.pptx) presentation guiding international students through D-2/D-4 visas, ARC registration, and living in South Korea.',
      format: 'pptx' as SupportedDocFormat
    },
    {
      category: 'Run Python Data Analysis',
      icon: <Terminal className="w-4 h-4 text-purple-400" />,
      query: 'Write and execute a Python script that calculates total 4-year study & living expenses in Seoul vs regional Korean cities with 30%, 50%, and 100% scholarships.'
    },
    {
      category: 'Advanced Math, Calculus & Interactive Graph',
      icon: <BookOpen className="w-4 h-4 text-rose-400" />,
      query: 'Solve f(x) = x^2 - 4x + 3 and g(x) = 2x - 2 step-by-step with LaTeX derivatives, roots, definite integral, and plot their interactive mathematical graph.'
    }
  ];

  // ==========================================================================
  // GUEST WELCOME SCREEN GATE (Shown before chat for unauthenticated guests)
  // ==========================================================================
  if (showGuestWelcomeGate) {
    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="min-h-[calc(100vh-64px)] bg-[#F8FAFC] dark:bg-[#050B18] text-[#10243A] dark:text-white flex items-center justify-center p-4 sm:p-6 transition-colors duration-200"
      >
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0B162C] border border-slate-200 dark:border-[#DCE5F0]/15 p-6 sm:p-8 shadow-2xl transition-colors duration-200">
          <div className="flex items-center justify-between gap-3 mb-5">
            <EveryKrAnimatedLogo
              variant="compact"
              isNight={isNight}
              imgClassName="h-8 sm:h-9"
            />

            {/* Day/Night Mode Selector Above Heading */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#050B18] border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !isNight
                    ? 'bg-white text-[#10243A] shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Day Mode"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Day</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isNight
                    ? 'bg-[#164A83] text-white shadow-xs'
                    : 'text-slate-500 hover:text-[#10243A]'
                }`}
                title="Night Mode"
              >
                <Moon className="w-3.5 h-3.5 text-[#4BA3FF]" />
                <span>Night</span>
              </button>
            </div>
          </div>

          <div
            data-no-translate="true"
            className="text-xs font-extrabold uppercase tracking-wider text-[#1769AA] dark:text-[#4BA3FF] mb-1.5"
          >
            EVERYKR AI
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-[#10243A] dark:text-white tracking-tight">
            {welcomeCopy.heading}
          </h1>
          <p className="text-sm text-slate-600 dark:text-[#9BAABD] mt-2 leading-relaxed">
            {welcomeCopy.description}
          </p>

          <form onSubmit={handleGuestNameSubmit} className="mt-6 space-y-4">
            <div>
              <input
                type="text"
                value={guestNameInput}
                onChange={e => {
                  setGuestNameInput(e.target.value);
                  if (guestNameError) setGuestNameError('');
                }}
                placeholder={welcomeCopy.placeholder}
                maxLength={50}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-[#DCE5F0]/20 text-[#10243A] dark:text-white placeholder-slate-400 dark:placeholder-[#9BAABD]/60 text-sm focus:outline-none focus:border-[#1769AA] dark:focus:border-[#4BA3FF] focus:ring-2 focus:ring-[#4BA3FF]/25 transition-all"
              />
              {guestNameError && (
                <p className="text-xs text-rose-500 dark:text-rose-400 mt-1.5">{guestNameError}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-3 px-5 rounded-xl bg-[#19B6A4] hover:bg-[#19B6A4]/90 text-[#050B18] font-bold text-sm transition-all cursor-pointer shadow-md"
              >
                {welcomeCopy.button}
              </button>
              {isEditingGuestName && guestName && (
                <button
                  type="button"
                  onClick={() => setIsEditingGuestName(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-[#9BAABD]">
            <span>Have an EVERYKR account?</span>
            <button
              type="button"
              onClick={() => setActivePage('login')}
              className="text-[#1769AA] dark:text-[#4BA3FF] hover:underline font-semibold cursor-pointer"
            >
              Sign in for cloud sync →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="h-[calc(100vh-64px)] bg-[#F8FAFC] dark:bg-[#050B18] flex overflow-hidden transition-colors duration-200 relative"
    >
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-20 lg:hidden"
        />
      )}

      {/* 1. Unified Left Sidebar: Day/Night Mode + EVERYKR AI Branding + Navigation + Conversations */}
      <aside
        className={`${
          isSidebarOpen
            ? 'w-72 sm:w-80 translate-x-0'
            : 'w-0 -translate-x-full lg:w-0'
        } fixed lg:relative inset-y-0 start-0 transition-all duration-300 bg-white dark:bg-[#081426] text-[#10243A] dark:text-white flex flex-col shrink-0 z-30 overflow-hidden border-r border-slate-200 dark:border-slate-800`}
      >
        <div className="p-4 flex flex-col h-full justify-between">
          <div className="flex flex-col min-h-0 flex-1">
            {/* Brand & Day/Night Mode Selector Above EVERYKR AI Heading */}
            <div className="mb-3 pb-3 border-b border-slate-200 dark:border-white/10">
              {/* Day / Night Mode Toggle Above Heading */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-[#050B18] border border-slate-200/90 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      !isNight
                        ? 'bg-white text-[#10243A] shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Switch to Day Mode"
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Day</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      isNight
                        ? 'bg-[#164A83] text-white shadow-xs'
                        : 'text-slate-500 hover:text-[#10243A]'
                    }`}
                    title="Switch to Night Mode"
                  >
                    <Moon className="w-3.5 h-3.5 text-[#4BA3FF]" />
                    <span>Night</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-[#10243A] dark:hover:text-white rounded-lg cursor-pointer"
                  title="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <img
                    src={OFFICIAL_EVERYKR_ICON}
                    alt="EveryKR — Everything Korea, One Platform"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain drop-shadow-[0_0_6px_rgba(147,197,253,0.35)]"
                  />
                </div>
                <div>
                  <div
                    data-no-translate="true"
                    className="text-sm font-extrabold tracking-tight text-[#10243A] dark:text-white"
                  >
                    EVERYKR AI
                  </div>
                </div>
              </div>

              {/* Active User / Guest Identity Bar */}
              <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                    {activeDisplayName}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white dark:bg-white/10 text-[#1769AA] dark:text-[#4BA3FF] border border-slate-200/60 dark:border-transparent">
                    {isAuthenticated ? 'Account' : 'Guest'}
                  </span>
                </div>
                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      setGuestNameInput(guestName || '');
                      setIsEditingGuestName(true);
                    }}
                    className="text-[11px] text-[#1769AA] dark:text-[#4BA3FF] hover:underline shrink-0 ms-2 cursor-pointer"
                  >
                    {welcomeCopy.changeNameLabel}
                  </button>
                )}
              </div>
            </div>

            {/* Unified Tool Mode Navigation */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-[#19B6A4] text-[#050B18] shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10 hover:text-[#10243A] dark:hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">AI Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('projects')}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'projects'
                    ? 'bg-[#19B6A4] text-[#050B18] shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10 hover:text-[#10243A] dark:hover:text-white'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Projects ({projects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'files'
                    ? 'bg-[#19B6A4] text-[#050B18] shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10 hover:text-[#10243A] dark:hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Docs &amp; Files ({generatedDocs.length + uploadedFiles.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sandbox')}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'sandbox'
                    ? 'bg-[#19B6A4] text-[#050B18] shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10 hover:text-[#10243A] dark:hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Code Sandbox</span>
              </button>
            </div>

            {/* New Conversation Button */}
            <button
              onClick={handleCreateNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-3 rounded-xl bg-[#164A83] hover:bg-[#4BA3FF] hover:text-[#050B18] text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New AI Conversation</span>
            </button>

            {/* Session Search */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sessionSearch}
                onChange={e => setSessionSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-[#10243A] dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-[#19B6A4] border border-slate-200 dark:border-white/10"
              />
            </div>

            {/* Conversations List */}
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 px-1">
              Conversations ({filteredSessions.length})
            </div>

            <div className="space-y-1 overflow-y-auto flex-1 scrollbar-thin pr-1">
              {filteredSessions.map(session => {
                const isActive = session.id === activeSessionId && activeTab === 'chat';
                const isEditing = editingTitleId === session.id;

                return (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-200/80 dark:bg-white/15 text-[#10243A] dark:text-white font-semibold border border-slate-300/80 dark:border-white/20'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-[#10243A] dark:hover:text-white'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={titleInput}
                          onChange={e => setTitleInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveRename(session.id)}
                          autoFocus
                          className="w-full px-2 py-0.5 rounded bg-white dark:bg-black/40 text-[#10243A] dark:text-white text-xs border border-slate-300 dark:border-white/20 focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveRename(session.id)}
                          className="p-1 text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate">
                          <Bot className="w-3.5 h-3.5 text-[#1769AA] dark:text-[#19B6A4] shrink-0" />
                          <span className="truncate">{session.title}</span>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditingTitleId(session.id);
                              setTitleInput(session.title);
                            }}
                            className="p-1 text-slate-400 hover:text-[#10243A] dark:hover:text-white"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={e => handleDeleteSession(session.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar Bottom: Return to EveryKR Platform */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button
              onClick={() => setActivePage('home')}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#10243A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to EVERYKR Home</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Unified Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Bar with Day/Night Mode Selector Above EVERYKR AI Heading */}
        <header className="px-4 sm:px-6 py-2.5 bg-white dark:bg-[#081426] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 transition-colors duration-200">
          <div className="flex items-center gap-3 min-w-0">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
                title="Open sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <div className="min-w-0">
              {/* Day / Night Mode Selector Above Main EVERYKR AI Heading */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#050B18] border border-slate-200/80 dark:border-slate-700/80 mb-1">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    !isNight
                      ? 'bg-white text-[#10243A] shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Day Mode"
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>Day</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    isNight
                      ? 'bg-[#164A83] text-white shadow-xs'
                      : 'text-slate-500 hover:text-[#10243A]'
                  }`}
                  title="Night Mode"
                >
                  <Moon className="w-3 h-3 text-[#4BA3FF]" />
                  <span>Night</span>
                </button>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <h1
                  data-no-translate="true"
                  className="text-sm sm:text-base font-extrabold tracking-tight text-[#10243A] dark:text-white shrink-0"
                >
                  EVERYKR AI
                </h1>
                {activeTab === 'projects' && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                    · Projects &amp; Tasks
                  </span>
                )}
                {activeTab === 'files' && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                    · Docs &amp; Files
                  </span>
                )}
                {activeTab === 'sandbox' && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                    · Code Sandbox
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Active Project Selector */}
            {projects.length > 0 && (
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="hidden sm:block px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#10243A] dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 focus:outline-none"
                title="Active Project Scope"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    Project: {p.name}
                  </option>
                ))}
              </select>
            )}

            {activeTab === 'chat' && currentSession && currentSession.messages.length > 1 && (
              <button
                onClick={() => {
                  const greetingMsg: ChatMessage = {
                    id: 'welcome_greeting_' + Date.now(),
                    sender: 'assistant',
                    text: personalizedGreetingText,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  };
                  updateSessionMessages(currentSession.id, [greetingMsg], userScope);
                  setSessions(getStoredChatSessions(userScope));
                  showToast('Conversation reset');
                }}
                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                title="Clear current conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* ==================================================================== */}
        {/* TAB 1: UNIFIED AI CHAT + INLINE DOCUMENT GENERATION & CODE EXECUTION */}
        {/* ==================================================================== */}
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 scrollbar-thin">
              {/* Render Messages (Always starts with Personalized Greeting) */}
              {currentSession?.messages.map((msg, index) => {
                const isUser = msg.sender === 'user';

                return (
                  <div
                    key={msg.id}
                    className={`max-w-3xl mx-auto flex gap-3.5 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-[#10243A] dark:bg-[#081426] text-white flex items-center justify-center shrink-0 shadow-xs mt-1 border border-slate-200 dark:border-slate-700">
                        <Bot className="w-4 h-4 text-[#4BA3FF]" />
                      </div>
                    )}

                    <div
                      className={`relative rounded-2xl px-5 py-4 max-w-[90%] sm:max-w-[84%] min-w-0 overflow-hidden shadow-xs ${
                        isUser
                          ? 'bg-[#10243A] dark:bg-[#164A83] text-white'
                          : 'bg-white dark:bg-[#0B162C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                      }`}
                    >

                      {/* File Attachment Chip */}
                      {msg.fileAttachment && (
                        <div className="mb-3 p-2 rounded-xl bg-black/10 dark:bg-white/10 flex items-center gap-2 text-xs">
                          <Paperclip className="w-4 h-4 text-[#4BA3FF]" />
                          <span className="truncate font-medium">{msg.fileAttachment.name}</span>
                        </div>
                      )}

                      {/* Parsed Uploaded File Summary Card */}
                      {msg.uploadedFile && (
                        <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs">
                          <div className="flex items-center justify-between font-bold text-[#10243A] dark:text-white">
                            <span>Verified File Analysis: {msg.uploadedFile.originalName}</span>
                            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">
                              {msg.uploadedFile.status}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">{msg.uploadedFile.summary}</p>
                        </div>
                      )}

                      {/* Message Content */}
                      {isUser ? (
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                      ) : (
                        <div className="min-w-0">
                          {msg.text ? (
                            <MarkdownRenderer content={msg.text} isStreaming={isGenerating} />
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                              <Loader2 className="w-4 h-4 text-[#19B6A4] animate-spin" />
                              <span>{activeExecutionStage || 'Processing request...'}</span>
                            </div>
                          )}

                          {/* Generated Downloadable Documents Attached to Message */}
                          {msg.generatedDocuments && msg.generatedDocuments.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <Download className="w-3.5 h-3.5" />
                                <span>Verified Downloadable Files Ready</span>
                              </div>
                              {msg.generatedDocuments.map(doc => (
                                <div
                                  key={doc.id}
                                  className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3"
                                >
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {doc.fileName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                      {doc.format.toUpperCase()} · {(doc.sizeBytes / 1024).toFixed(1)} KB
                                    </div>
                                  </div>
                                  <a
                                    href={doc.downloadUrl}
                                    download={doc.fileName}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Isolated Code Execution Job Result Attached to Message */}
                          {msg.executionJob && (
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                              <div className="p-3 rounded-xl bg-[#050B18] text-slate-200 border border-slate-800 font-mono text-xs">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                                  <span className="text-[#4BA3FF] font-bold">
                                    Isolated Sandbox ({msg.executionJob.language.toUpperCase()})
                                  </span>
                                  <span className="text-[11px] text-emerald-400">
                                    {msg.executionJob.status} · {msg.executionJob.durationMs}ms
                                  </span>
                                </div>
                                {msg.executionJob.stdout && (
                                  <pre className="whitespace-pre-wrap text-emerald-300 overflow-x-auto max-h-48">
                                    {msg.executionJob.stdout}
                                  </pre>
                                )}
                                {msg.executionJob.stderr && (
                                  <pre className="whitespace-pre-wrap text-rose-400 overflow-x-auto max-h-36 mt-1">
                                    {msg.executionJob.stderr}
                                  </pre>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Google Search Grounding Sources */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Globe2 className="w-3.5 h-3.5 text-[#1769AA] dark:text-[#19B6A4]" />
                                <span>Verified Sources &amp; Citations</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {msg.sources.map((src, sIdx) => (
                                  <a
                                    key={sIdx}
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs transition-colors"
                                  >
                                    <span className="font-medium truncate max-w-[200px]">{src.title}</span>
                                    <ExternalLink className="w-3 h-3 text-slate-400" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Message Action Bar + Quick Export Buttons */}
                          {msg.text && (
                            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-mono">{msg.timestamp}</span>
                                <span>·</span>
                                <button
                                  type="button"
                                  onClick={() => handleQuickExportMessage(msg.text, 'pdf')}
                                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold cursor-pointer"
                                  title="Export response as PDF"
                                >
                                  PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickExportMessage(msg.text, 'docx')}
                                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold cursor-pointer"
                                  title="Export response as Word DOCX"
                                >
                                  DOCX
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickExportMessage(msg.text, 'xlsx')}
                                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold cursor-pointer"
                                  title="Export response as Excel XLSX"
                                >
                                  XLSX
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickExportMessage(msg.text, 'pptx')}
                                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold cursor-pointer"
                                  title="Export response as PowerPoint PPTX"
                                >
                                  PPTX
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.text);
                                    showToast('Copied to clipboard');
                                  }}
                                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                                  title="Copy answer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => toggleSpeakMessage(msg.id, msg.text)}
                                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                                  title="Read aloud"
                                >
                                  {speakingMessageId === msg.id ? (
                                    <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                                  ) : (
                                    <Volume2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                {index > 0 && (
                                  <button
                                    onClick={() => handleRegenerate(index)}
                                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                                    title="Regenerate response"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleFeedback(msg.id, 'helpful')}
                                  className={`p-1.5 rounded ${
                                    msg.feedback === 'helpful'
                                      ? 'text-emerald-500'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleFeedback(msg.id, 'unhelpful')}
                                  className={`p-1.5 rounded ${
                                    msg.feedback === 'unhelpful'
                                      ? 'text-rose-500'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-xs mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Starter Suggestions Grid when conversation only has the initial greeting */}
              {currentSession && currentSession.messages.length <= 1 && (
                <div className="max-w-3xl mx-auto pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Unified Capabilities — Try a Workflow
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {promptSuggestions.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleSendMessage(prompt.query, prompt.format);
                        }}
                        className="p-4 rounded-2xl bg-white dark:bg-[#0B162C] border border-slate-200/90 dark:border-slate-800 hover:border-[#19B6A4] transition-all text-left group flex flex-col justify-between cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold text-[#10243A] dark:text-white mb-1.5">
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                              {prompt.icon}
                            </div>
                            <span>{prompt.category}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {prompt.query}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#1769AA] dark:text-[#19B6A4]">
                          <span>Run workflow</span>
                          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Chat Input & Tool Dock */}
            <div className="p-4 sm:p-5 bg-white dark:bg-[#081426] border-t border-slate-200 dark:border-slate-800 shrink-0">
              <div className="max-w-3xl mx-auto">
                {attachedFile && (
                  <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs">
                    <Paperclip className="w-3.5 h-3.5 text-[#19B6A4]" />
                    <span className="font-medium truncate max-w-[240px]">{attachedFile.name}</span>
                    <button
                      onClick={() => setAttachedFile(null)}
                      className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-900 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="relative rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#050B18] shadow-xs focus-within:border-[#19B6A4] transition-all p-2 flex flex-col">
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Ask EVERYKR AI anything — Korean universities, visas, research, code execution, or file generation...`}
                    rows={1}
                    className="w-full px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none bg-transparent max-h-40 leading-relaxed"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 px-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json,.xml,.zip,.py,.js,.ts,.html,.css,image/*"
                        onChange={e => handleFileUpload(e, false)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                        title="Upload PDF, DOCX, XLSX, CSV, ZIP, Code, or Image"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-[#19B6A4]" />
                        <span>Attach File</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleVoiceInput}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isListening
                            ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title="Voice input"
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      {/* Optional Auto-Export Document Format Selector */}
                      <select
                        value={requestedDocFormat}
                        onChange={e => setRequestedDocFormat(e.target.value as SupportedDocFormat | '')}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
                        title="Auto-generate downloadable document with response"
                      >
                        <option value="">Auto-Export: Off</option>
                        <option value="pdf">Export PDF (.pdf)</option>
                        <option value="docx">Export Word (.docx)</option>
                        <option value="xlsx">Export Excel (.xlsx)</option>
                        <option value="pptx">Export PowerPoint (.pptx)</option>
                        <option value="csv">Export CSV (.csv)</option>
                        <option value="md">Export Markdown (.md)</option>
                        <option value="json">Export JSON (.json)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setAutoExecuteCode(!autoExecuteCode)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                          autoExecuteCode
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                        title="Automatically execute generated code in sandbox"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Run Code</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {isGenerating ? (
                        <button
                          type="button"
                          onClick={handleStopGeneration}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendMessage()}
                          disabled={!inputMessage.trim() && !attachedFile}
                          className="px-4 py-2 rounded-xl bg-[#19B6A4] hover:bg-[#19B6A4]/90 disabled:opacity-40 text-[#050B18] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>Send</span>
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: PROJECTS & TASKS WORKSPACE                                    */}
        {/* ==================================================================== */}
        {activeTab === 'projects' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Projects List & Create Project */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0B162C] border border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-[#10243A] dark:text-white mb-3 flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-[#19B6A4]" />
                    <span>Create New Project</span>
                  </h3>
                  <form onSubmit={handleCreateProject} className="space-y-3">
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      placeholder="Project name (e.g. GKS 2027 Application)..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                    />
                    <input
                      type="text"
                      value={newProjectDesc}
                      onChange={e => setNewProjectDesc(e.target.value)}
                      placeholder="Short description..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={newProjectCategory}
                        onChange={e => setNewProjectCategory(e.target.value as AiProjectClientItem['category'])}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                      >
                        <option value="university_application">University Application</option>
                        <option value="research">Deep Research</option>
                        <option value="documents">Document Generation</option>
                        <option value="data_analysis">Data Analysis</option>
                        <option value="coding">Coding &amp; Development</option>
                        <option value="general">General</option>
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#19B6A4] text-[#050B18] font-bold text-xs cursor-pointer"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                </div>

                <div className="space-y-2.5">
                  {projects.map(proj => (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedProjectId === proj.id
                          ? 'bg-white dark:bg-[#102544] border-[#19B6A4]'
                          : 'bg-white dark:bg-[#0B162C] border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#10243A] dark:text-white">{proj.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#19B6A4]">
                            {proj.category.replace('_', ' ')}
                          </span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteProject(proj.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {proj.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">{proj.description}</p>
                      )}
                      <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>Files: {proj.fileIds.length}</span>
                        <span>Docs: {proj.documentIds.length}</span>
                        <span>Jobs: {proj.jobIds.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Project Tasks Checklist */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0B162C] border border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-[#10243A] dark:text-white mb-3 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#4BA3FF]" />
                    <span>Project Tasks &amp; Action Items</span>
                  </h3>
                  <form onSubmit={handleCreateTask} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="Add a task, milestone, or document deadline..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                    />
                    <select
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value as AiTaskClientItem['priority'])}
                      className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={e => setNewTaskDueDate(e.target.value)}
                      className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#164A83] hover:bg-[#4BA3FF] hover:text-[#050B18] text-white font-bold text-xs cursor-pointer"
                    >
                      Add Task
                    </button>
                  </form>

                  <div className="mt-4 space-y-2">
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(task)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer ${
                              task.status === 'completed'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : task.status === 'in_progress'
                                ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                                : 'border-slate-500'
                            }`}
                          >
                            {task.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <div className="min-w-0">
                            <div
                              className={`text-xs font-semibold truncate ${
                                task.status === 'completed'
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800 dark:text-white'
                              }`}
                            >
                              {task.title}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                              <span className="uppercase">{task.status.replace('_', ' ')}</span>
                              <span>·</span>
                              <span className="uppercase">{task.priority} priority</span>
                              {task.dueDate && <span>· Due {task.dueDate}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: DOCUMENT GENERATOR & MULTI-FORMAT FILE PROCESSING STUDIO      */}
        {/* ==================================================================== */}
        {activeTab === 'files' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Real Multi-Format Document Generator */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0B162C] border border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-[#10243A] dark:text-white mb-1 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#19B6A4]" />
                    <span>Real Document Generator (PDF, DOCX, XLSX, PPTX, CSV, MD)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Compiles valid binary/structured documents on the backend with instant download links.
                  </p>

                  <form onSubmit={handleStudioGenerateDocument} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={docStudioTitle}
                        onChange={e => setDocStudioTitle(e.target.value)}
                        placeholder="Document title..."
                        className="sm:col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                      />
                      <select
                        value={docStudioFormat}
                        onChange={e => setDocStudioFormat(e.target.value as SupportedDocFormat)}
                        className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#10243A] dark:text-[#4BA3FF]"
                      >
                        <option value="pdf">PDF (.pdf)</option>
                        <option value="docx">Word (.docx)</option>
                        <option value="xlsx">Excel (.xlsx)</option>
                        <option value="pptx">PowerPoint (.pptx)</option>
                        <option value="csv">CSV (.csv)</option>
                        <option value="md">Markdown (.md)</option>
                        <option value="txt">Text (.txt)</option>
                        <option value="json">JSON (.json)</option>
                        <option value="xml">XML (.xml)</option>
                      </select>
                    </div>

                    <textarea
                      rows={8}
                      value={docStudioContent}
                      onChange={e => setDocStudioContent(e.target.value)}
                      placeholder="Write Markdown headings, paragraphs, or pipe tables (| Col1 | Col2 |) for Excel sheets..."
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200"
                    />

                    <button
                      type="submit"
                      disabled={isGeneratingDoc}
                      className="w-full py-2.5 rounded-xl bg-[#19B6A4] hover:bg-[#19B6A4]/90 text-[#050B18] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        {isGeneratingDoc
                          ? 'Compiling Document...'
                          : `Generate & Save ${docStudioFormat.toUpperCase()} File`}
                      </span>
                    </button>
                  </form>
                </div>

                {/* Generated Documents List */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0B162C] border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Generated Downloadable Documents ({generatedDocs.length})
                  </h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {generatedDocs.map(doc => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                            {doc.fileName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {doc.format.toUpperCase()} · {(doc.sizeBytes / 1024).toFixed(1)} KB ·{' '}
                            {new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <a
                          href={doc.downloadUrl}
                          download={doc.fileName}
                          className="px-3 py-1.5 rounded-lg bg-[#164A83] hover:bg-[#4BA3FF] hover:text-[#050B18] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    ))}
                    {generatedDocs.length === 0 && (
                      <div className="text-xs text-slate-400 py-4 text-center">
                        No documents generated yet. Use the form above or ask EVERYKR AI in chat.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Secure File Upload & Multi-Format Parser */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0B162C] border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-[#10243A] dark:text-white flex items-center gap-2">
                      <FileArchive className="w-4 h-4 text-[#4BA3FF]" />
                      <span>Upload &amp; Parse Files</span>
                    </h3>
                    <input
                      ref={studioFileInputRef}
                      type="file"
                      accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json,.xml,.zip,.py,.js,.ts,.html,.css"
                      onChange={e => handleFileUpload(e, true)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => studioFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-[#164A83] hover:bg-[#4BA3FF] hover:text-[#050B18] text-white text-xs font-bold cursor-pointer"
                    >
                      + Upload File
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Supports PDF, DOCX, XLSX, CSV, TXT, MD, JSON, XML, ZIP, PY, JS, TS, HTML, CSS (up to 15 MB).
                  </p>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {uploadedFiles.map(file => (
                      <div
                        key={file.id}
                        onClick={() => setPreviewFileItem(file)}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-800 hover:border-[#4BA3FF] flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                            {file.originalName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {file.summary}
                          </div>
                        </div>
                        <Eye className="w-4 h-4 text-[#4BA3FF] shrink-0" />
                      </div>
                    ))}
                    {uploadedFiles.length === 0 && (
                      <div className="text-xs text-slate-400 py-4 text-center">
                        Upload any spreadsheet, PDF, Word file, or ZIP archive to inspect extracted structure.
                      </div>
                    )}
                  </div>
                </div>

                {/* Extracted File Inspector */}
                {previewFileItem && (
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#0B162C] border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-[#10243A] dark:text-white">
                        Extracted Content: {previewFileItem.originalName}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('chat');
                          handleSendMessage(
                            `Analyze the uploaded file "${previewFileItem.originalName}" and summarize its key data and findings.`
                          );
                        }}
                        className="text-xs font-bold text-[#19B6A4] hover:underline cursor-pointer"
                      >
                        Analyze in Chat →
                      </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-64 whitespace-pre-wrap">
                      {previewFileItem.extractedText.slice(0, 4000)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: ISOLATED CODE EXECUTION SANDBOX & BACKGROUND JOB QUEUE        */}
        {/* ==================================================================== */}
        {activeTab === 'sandbox' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Code Editor & Sandbox Runner */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0B162C] border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-[#19B6A4]" />
                      <h3 className="text-sm font-bold text-[#10243A] dark:text-white">
                        Isolated Code Execution Engine
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={sandboxLang}
                        onChange={e => {
                          const next = e.target.value as 'python' | 'javascript' | 'typescript' | 'html';
                          setSandboxLang(next);
                          if (next === 'javascript') {
                            setSandboxCode(
                              `// Isolated JavaScript VM Sandbox\nconst data = [3800000, 4300000, 6400000, 2600000];\nconst avg = data.reduce((a, b) => a + b, 0) / data.length;\nconsole.log("Average Korean University Semester Tuition (KRW):", avg.toLocaleString());`
                            );
                          } else if (next === 'html') {
                            setSandboxCode(
                              `<div style="font-family:sans-serif;padding:20px;background:#081426;color:#fff;border-radius:12px;">\n  <h2 style="color:#19B6A4;margin:0 0 8px;">EVERYKR HTML Sandbox Preview</h2>\n  <p>Live rendered HTML/CSS output inside isolated iframe.</p>\n</div>`
                            );
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#050B18] border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#10243A] dark:text-[#4BA3FF]"
                      >
                        <option value="python">Python 3 (python3 -I)</option>
                        <option value="javascript">JavaScript (Node VM)</option>
                        <option value="typescript">TypeScript</option>
                        <option value="html">HTML / CSS Preview</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRunSandboxCode()}
                        disabled={isRunningSandbox}
                        className="px-4 py-1.5 rounded-xl bg-[#19B6A4] hover:bg-[#19B6A4]/90 text-[#050B18] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{isRunningSandbox ? 'Running...' : 'Execute'}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={12}
                    value={sandboxCode}
                    onChange={e => setSandboxCode(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[#050B18] text-emerald-300 border border-slate-800 font-mono text-xs leading-relaxed focus:outline-none focus:border-[#4BA3FF]"
                  />
                </div>
              </div>

              {/* Right: Console Output, HTML Preview & Background Job History */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-[#050B18] text-white border border-slate-800">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs">
                    <span className="font-bold text-[#4BA3FF]">Verified Sandbox Output</span>
                    {activeSandboxJob && (
                      <span className="font-mono text-[11px] text-emerald-400">
                        {activeSandboxJob.status.toUpperCase()} · {activeSandboxJob.durationMs}ms
                      </span>
                    )}
                  </div>

                  {activeSandboxJob ? (
                    <div className="space-y-3">
                      {activeSandboxJob.htmlPreview ? (
                        <iframe
                          title="Sandbox HTML Preview"
                          sandbox=""
                          srcDoc={activeSandboxJob.htmlPreview}
                          className="w-full h-44 rounded-xl border border-slate-800 bg-white"
                        />
                      ) : (
                        <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap max-h-56 overflow-y-auto">
                          {activeSandboxJob.stdout || '(No stdout output)'}
                        </pre>
                      )}
                      {activeSandboxJob.stderr && (
                        <pre className="text-xs font-mono text-rose-400 whitespace-pre-wrap max-h-40 overflow-y-auto pt-2 border-t border-slate-800">
                          {activeSandboxJob.stderr}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 py-8 text-center">
                      Click &ldquo;Execute&rdquo; to run code in the isolated sandbox.
                    </div>
                  )}
                </div>

                {/* Job Queue History */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0B162C] border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Execution Job Queue ({executionJobs.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {executionJobs.map(job => (
                      <div
                        key={job.id}
                        onClick={() => setActiveSandboxJob(job)}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#4BA3FF]" />
                          <span className="font-mono font-semibold text-slate-800 dark:text-white uppercase">
                            {job.language}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">{job.durationMs}ms</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                            job.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
