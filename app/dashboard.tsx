"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { categories, classifyTask, normalizeTitle, type Category } from "../lib/classification";
import { orderTodayTasks, type RecommendationSettings } from "../lib/recommendation";
import StoneGrowth, { stoneStageCollection, visibleStoneCount, type StoneStageKey, type StoneStats } from "./stone-growth";
import HistoryCalendar, { prefetchHistoryMonth } from "./history-calendar";
import Leaderboard from "./leaderboard";
import { getMascotVariant, getTodayMood } from "../lib/today-mood";
import SafeImage from "./safe-image";
import StoneShareVisual from "./stone-share-visual";
import { stoneCatalog, stoneCatalogEntries, stoneSpeciesIndexes, unlockedStoneEntries } from "./stone-catalog";
import StoneFace from "./stone-face";
import CuteDatePicker from "./cute-date-picker";
import CuteSelect from "./cute-select";
import DurationClockPicker from "./duration-clock-picker";
import { GROWTH_COLLECTION_MAX, getStoneEasterEgg } from "../lib/stone-achievements";
import { koreanVocative } from "../lib/korean-vocative";
import { protectKoreanCounters } from "../lib/korean-line-break";
import { findTaskSuggestions, type TaskTemplate } from "../lib/task-suggestions";
import {
  bearPersonalityOptions,
  getBearCaption,
  getBearHeroLine,
  getEmptyTaskCopy,
  isBearPersonality,
  type BearPersonality,
} from "../lib/bear-personality";

type Energy = "낮음" | "보통" | "높음";
type RepeatMode = "once" | "daily" | "range";
type SettingsSection = "recommendation" | "personality" | "help";

type Task = {
  id: string;
  category: Category;
  title: string;
  minutes: number;
  allDay: boolean;
  reason: string;
  done: boolean;
  version: number;
  recurrence: "once" | "daily";
  scheduledDate: string;
  scheduledEndDate: string | null;
  isToday: boolean;
};

const demoToday = clientKstDateKey();
const initialTasks: Task[] = [
  {
    id: "demo-1",
    category: "취업",
    title: "보이저엑스 예상 질문 정리",
    minutes: 40,
    allDay: false,
    reason: "마감이 가장 가깝고, 집중력이 좋을 때 하기 좋아",
    done: false,
    version: 1,
    recurrence: "once",
    scheduledDate: demoToday,
    scheduledEndDate: null,
    isToday: true,
  },
  {
    id: "demo-2",
    category: "공부",
    title: "Playwright 강의 1개 듣기",
    minutes: 25,
    allDay: false,
    reason: "QA 자동화 준비를 끊기지 않게 이어갈 수 있어",
    done: true,
    version: 1,
    recurrence: "once",
    scheduledDate: demoToday,
    scheduledEndDate: null,
    isToday: true,
  },
  {
    id: "demo-3",
    category: "프로젝트",
    title: "Linkdo README 기능 범위 정리",
    minutes: 20,
    allDay: false,
    reason: "짧게 끝내고 진행 상황을 남길 수 있어",
    done: false,
    version: 1,
    recurrence: "once",
    scheduledDate: demoToday,
    scheduledEndDate: null,
    isToday: true,
  },
];

const energyOrder: Energy[] = ["낮음", "보통", "높음"];
const energyDescriptions: Record<Energy, string> = { 낮음: "짧고 가벼운 일부터 추천해", 보통: "시간과 분류를 균형 있게 섞어", 높음: "긴 집중 작업을 먼저 추천해" };
const defaultRecommendationSettings: RecommendationSettings = { mode: "auto", availableMinutes: 90, customTaskCount: 3, preferredName: "", leaderboardOptIn: false, strategy: "balanced", preferredCategory: "" };
const personalityStorageKey = "today-focus-bear-personality";
const personalitySyncKey = "today-focus-bear-personality-needs-sync";
const tooltipStorageKey = "today-focus-button-tooltips";
const demoStoneStats: StoneStats = { weekly: 1, current: 1, weekStartedAt: 0 };
const mascotImages = {
  celebrating: "/bear-celebrating.webp",
  encouraging: "/bear-encouraging.webp",
  default: "/chubby-bear-transparent-v3.webp",
  focused: "/bear-focused.webp",
} as const;
const collectionPageSize = 12;
const growthCollectionItems = [{ kind: "auto" as const }, ...stoneStageCollection.map((stage) => ({ kind: "stage" as const, stage }))];
const secondaryMascotImages = [mascotImages.encouraging, mascotImages.focused, mascotImages.celebrating];

export default function Dashboard({
  initialName,
  signedIn,
}: {
  initialName: string;
  signedIn: boolean;
}) {
  const [activeTab, setActiveTab] = useState("오늘");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [energy, setEnergy] = useState<Energy>("보통");
  const [tasks, setTasks] = useState(signedIn ? [] : initialTasks);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", category: "프로젝트" as Category, minutes: 20, allDay: false, recurrence: "once" as RepeatMode, scheduledDate: demoToday, scheduledEndDate: addDaysKey(demoToday, 6) });
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMode, setShareMode] = useState<"tasks" | "stones">("tasks");
  const [shareSelection, setShareSelection] = useState<string[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [shareReused, setShareReused] = useState(false);
  const [shareExpiresAt, setShareExpiresAt] = useState(0);
  const [draft, setDraft] = useState("");
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>(
    signedIn ? [] : initialTasks.map(({ title, category, minutes }) => ({ title, category, minutes })),
  );
  const [isTaskSuggestionsOpen, setIsTaskSuggestionsOpen] = useState(false);
  const [activeTaskSuggestion, setActiveTaskSuggestion] = useState(-1);
  const [draftMinutes, setDraftMinutes] = useState(20);
  const [draftAllDay, setDraftAllDay] = useState(false);
  const [draftRecurrence, setDraftRecurrence] = useState<RepeatMode>("once");
  const [todayDate, setTodayDate] = useState(demoToday);
  const [draftDateMode, setDraftDateMode] = useState<"today" | "tomorrow" | "custom">("today");
  const [draftScheduledDate, setDraftScheduledDate] = useState(demoToday);
  const [draftScheduledEndDate, setDraftScheduledEndDate] = useState(addDaysKey(demoToday, 6));
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [notice, setNotice] = useState("");
  const [stoneStats, setStoneStats] = useState<StoneStats>(signedIn ? { weekly: 0, current: 0, weekStartedAt: 0 } : demoStoneStats);
  const [stoneMotion, setStoneMotion] = useState<"added" | "removed" | null>(null);
  const [displayName, setDisplayName] = useState(initialName);
  const [recommendationSettings, setRecommendationSettings] = useState(defaultRecommendationSettings);
  const [settingsDraft, setSettingsDraft] = useState(defaultRecommendationSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("recommendation");
  const [showButtonTooltips, setShowButtonTooltips] = useState(true);
  const [bearPersonality, setBearPersonality] = useState<BearPersonality>("warm");
  const [personalityDraft, setPersonalityDraft] = useState<BearPersonality>("warm");
  const [isPersonalityOnboardingOpen, setIsPersonalityOnboardingOpen] = useState(false);
  const [isStoneCodexOpen, setIsStoneCodexOpen] = useState(false);
  const [taskPage, setTaskPage] = useState(0);
  const [growthPage, setGrowthPage] = useState(0);
  const [stoneCodexPage, setStoneCodexPage] = useState(0);
  const [speechVariant, setSpeechVariant] = useState(0);
  const [busyAction, setBusyAction] = useState<"recommend" | "save" | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [recommendationOffset, setRecommendationOffset] = useState(0);
  const [selectedStoneStage, setSelectedStoneStage] = useState<StoneStageKey>("auto");
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [pendingCompletionIds, setPendingCompletionIds] = useState<string[]>([]);
  const [historyRevision, setHistoryRevision] = useState(0);
  const addTaskLockRef = useRef(false);
  const busyActionRef = useRef(false);
  const completionLocksRef = useRef(new Set<string>());

  const todayTasks = useMemo(() => tasks.filter((task) => task.isToday), [tasks]);
  const todayPlan = useMemo(() => orderTodayTasks(todayTasks, recommendationSettings, recommendationOffset, energy), [energy, recommendationOffset, recommendationSettings, todayTasks]);
  const recommendedToday = todayPlan.recommended;
  const recommendedIds = useMemo(() => new Set(recommendedToday.map((task) => task.id)), [recommendedToday]);
  const orderedToday = todayPlan.ordered;
  const filteredTasks = useMemo(
    () =>
      activeTab === "오늘"
        ? orderedToday
        : activeTab === "기록" || activeTab === "랭킹"
          ? []
        : tasks.filter((task) => task.category === activeTab),
    [activeTab, orderedToday, tasks],
  );
  const taskPageCount = Math.max(1, Math.ceil(filteredTasks.length / 4));
  const safeTaskPage = Math.min(taskPage, taskPageCount - 1);
  const visibleTasks = useMemo(() => filteredTasks.slice(safeTaskPage * 4, safeTaskPage * 4 + 4), [filteredTasks, safeTaskPage]);
  const taskSuggestions = useMemo(
    () => isTaskSuggestionsOpen ? findTaskSuggestions(taskTemplates, draft) : [],
    [draft, isTaskSuggestionsOpen, taskTemplates],
  );
  const { completeCount, progressTarget } = useMemo(() => ({
    completeCount: todayTasks.filter((task) => task.done).length,
    progressTarget: todayTasks.length,
  }), [todayTasks]);
  const recommendedMinutes = useMemo(() => recommendedToday.reduce((sum, task) => sum + task.minutes, 0), [recommendedToday]);
  const remainingToday = Math.max(0, progressTarget - completeCount);
  const todayMood = getTodayMood(progressTarget, completeCount);
  const growthPageCount = Math.max(1, Math.ceil(growthCollectionItems.length / collectionPageSize));
  const safeGrowthPage = Math.min(growthPage, growthPageCount - 1);
  const visibleGrowthItems = useMemo(
    () => growthCollectionItems.slice(safeGrowthPage * collectionPageSize, safeGrowthPage * collectionPageSize + collectionPageSize),
    [safeGrowthPage],
  );
  const stoneCodexPageCount = Math.max(1, Math.ceil(stoneCatalogEntries.length / collectionPageSize));
  const safeStoneCodexPage = Math.min(stoneCodexPage, stoneCodexPageCount - 1);
  const visibleStoneCatalog = useMemo(
    () => stoneCatalogEntries.slice(safeStoneCodexPage * collectionPageSize, safeStoneCodexPage * collectionPageSize + collectionPageSize),
    [safeStoneCodexPage],
  );

  const loadTasks = useCallback(async () => {
    if (!signedIn) return;
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = await response.json() as { tasks: Task[]; taskTemplates: TaskTemplate[]; todayDate: string; energy: Energy; stoneStats: StoneStats; recommendationSettings: RecommendationSettings; bearPersonality: BearPersonality; selectedStoneStage: StoneStageKey };
      setTasks(data.tasks);
      setTaskTemplates(data.taskTemplates);
      setTodayDate(data.todayDate);
      setEnergy(data.energy);
      setStoneStats(data.stoneStats);
      setRecommendationSettings(data.recommendationSettings);
      setSettingsDraft(data.recommendationSettings);
      setBearPersonality(data.bearPersonality);
      setPersonalityDraft(data.bearPersonality);
      setDisplayName(data.recommendationSettings.preferredName || initialName);
      setSelectedStoneStage(data.selectedStoneStage);
      const storedPersonality = window.localStorage.getItem(personalityStorageKey);
      if (window.localStorage.getItem(personalitySyncKey) === "1" && isBearPersonality(storedPersonality)) {
        const syncResponse = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ bearPersonality: storedPersonality }),
        });
        if (syncResponse.ok) {
          setBearPersonality(storedPersonality);
          setPersonalityDraft(storedPersonality);
          window.localStorage.removeItem(personalitySyncKey);
        }
      }
    } catch {
      setNotice("일정을 불러오지 못했어. 잠시 후 새로고침해줘.");
    }
  }, [initialName, signedIn]);

  useEffect(() => {
    // Loading server-owned state is the intended external synchronization here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsInitialLoading(false), 850);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (signedIn) return;
    const storedPersonality = window.localStorage.getItem(personalityStorageKey);
    if (isBearPersonality(storedPersonality)) {
      // Device-local pre-login preference is the intended external synchronization here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBearPersonality(storedPersonality);
      setPersonalityDraft(storedPersonality);
      return;
    }
    setIsPersonalityOnboardingOpen(true);
  }, [signedIn]);

  useEffect(() => {
    const stored = window.localStorage.getItem(tooltipStorageKey);
    if (stored === "off") {
      // Device-local help preference is intentionally restored after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowButtonTooltips(false);
    }
  }, []);

  useEffect(() => {
    const warmImageCache = () => {
      for (const source of secondaryMascotImages) {
        const image = new window.Image();
        image.decoding = "async";
        image.fetchPriority = "low";
        image.src = source;
        void image.decode().catch(() => undefined);
      }
    };
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warmImageCache, { timeout: 1800 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = window.setTimeout(warmImageCache, 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!isMobileNavOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMobileNavOpen(false);
    }
    function closeOnDesktop(event: MediaQueryListEvent) {
      if (!event.matches) setIsMobileNavOpen(false);
    }
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    window.addEventListener("keydown", closeOnEscape);
    mobileQuery.addEventListener("change", closeOnDesktop);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      mobileQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [isMobileNavOpen]);

  function selectTab(tab: string) {
    setActiveTab(tab);
    setTaskPage(0);
    setIsMobileNavOpen(false);
  }

  async function toggleTask(id: string) {
    const current = tasks.find((task) => task.id === id);
    if (!current || !current.isToday) return;
    const shouldPersist = signedIn && !id.startsWith("demo-");
    if (shouldPersist) {
      if (completionLocksRef.current.has(id)) return;
      completionLocksRef.current.add(id);
      setPendingCompletionIds((ids) => [...ids, id]);
    }
    setTasks((items) =>
      items.map((task) =>
        task.id === id ? { ...task, done: !task.done, version: task.version + 1 } : task,
      ),
    );
    setNotice("진행 상황을 반영했어.");

    if (shouldPersist) {
      try {
        const response = await fetchWithRetry("/api/tasks", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, done: !current.done, expectedVersion: current.version }),
        });
        if (response.status === 409) {
          setNotice("다른 기기에서 먼저 수정돼서 최신 상태를 불러왔어.");
          await loadTasks();
        } else if (!response.ok) {
          throw new Error("save failed");
        } else {
          const data = await response.json() as { task: Task; stoneAwarded: boolean; stoneRemoved: boolean; stoneStats: StoneStats };
          setTasks((items) => items.map((task) => task.id === data.task.id ? data.task : task));
          setStoneStats(data.stoneStats);
          if (data.stoneAwarded) {
            setStoneMotion("added");
            window.setTimeout(() => setStoneMotion(null), 900);
            const easterEgg = getStoneEasterEgg(data.stoneStats.current);
            setNotice(easterEgg?.message ?? "할 일을 완료해서 돌 하나가 통통 들어왔어!");
          } else if (data.stoneRemoved) {
            setStoneMotion("removed");
            window.setTimeout(() => setStoneMotion(null), 700);
            setNotice("완료를 취소해서 돌 하나도 함께 돌아갔어.");
          }
        }
      } catch {
        setTasks((items) => items.map((task) => task.id === id ? current : task));
        setNotice("저장하지 못했어. 인터넷 연결을 확인하고 다시 눌러줘.");
      } finally {
        completionLocksRef.current.delete(id);
        setPendingCompletionIds((ids) => ids.filter((pendingId) => pendingId !== id));
      }
    } else {
      const delta = current.done ? -1 : 1;
      setStoneStats((stats) => ({ ...stats, current: Math.max(0, stats.current + delta), weekly: Math.max(0, stats.weekly + delta) }));
      setStoneMotion(delta > 0 ? "added" : "removed");
      window.setTimeout(() => setStoneMotion(null), 800);
      setNotice(delta > 0 ? "체험용 성취가 1개 늘었어." : "완료를 취소해서 체험용 성취도 1개 줄었어.");
    }
  }

  function syncHistoryStoneStats(stats: StoneStats, awarded: boolean) {
    setStoneStats(stats);
    if (!awarded) return;
    setStoneMotion("added");
    window.setTimeout(() => setStoneMotion(null), 900);
  }

  async function reshuffle() {
    await runBearWork("recommend", async () => {
      const nextOffset = recommendationOffset + 1;
      const nextOrder = orderTodayTasks(todayTasks, recommendationSettings, nextOffset, energy).ordered;
      const currentPendingIds = orderedToday.filter((task) => !task.done).map((task) => task.id);
      const nextPendingIds = nextOrder.filter((task) => !task.done).map((task) => task.id);
      const changed = currentPendingIds.some((id, index) => id !== nextPendingIds[index]);
      if (changed) setRecommendationOffset(nextOffset);
      setTaskPage(0);
      setNotice(changed ? `${energy} 강도와 내 추천 기준으로 미완료 일정 순서를 바꿨어. 완료한 일정은 맨 뒤에 둘게.` : "지금은 순서를 바꿀 수 있는 미완료 일정이 없어. 일정이나 추천 기준이 달라지면 다시 골라줄게.");
    });
  }

  function changeEnergy(level: Energy) {
    setEnergy(level);
    setRecommendationOffset(0);
    setNotice(`${level} 에너지: ${energyDescriptions[level]}`);
    if (signedIn) void fetch("/api/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ energy: level }) });
  }

  async function addTask() {
    if (!draft.trim() || addTaskLockRef.current) return;
    if (draftRecurrence === "range" && draftScheduledEndDate < draftScheduledDate) {
      setNotice("기간 반복 종료일은 시작일보다 뒤여야 해.");
      return;
    }
    addTaskLockRef.current = true;
    setIsAddingTask(true);
    const title = draft.trim();
    let added = false;
    try {
      if (signedIn) {
      try {
        const requestId = crypto.randomUUID();
        const response = await fetchWithRetry("/api/tasks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestId,
            title,
            energy,
            recurrence: draftRecurrence === "once" ? "once" : "daily",
            minutes: draftMinutes,
            allDay: draftAllDay,
            scheduledDate: draftScheduledDate,
            scheduledEndDate: draftRecurrence === "range" ? draftScheduledEndDate : null,
          }),
        });
        if (!response.ok) throw new Error("save failed");
        const data = await response.json() as { task: Task; classification: { category: Category; confidence: number } };
        const task = { ...data.task, isToday: taskOccursOn(data.task, todayDate) };
        setTasks((items) => [task, ...items.filter((item) => !item.id.startsWith("demo-"))]);
        setTaskTemplates((items) => [
          { title: task.title, category: task.category, minutes: task.minutes },
          ...items.filter((item) => normalizeTitle(item.title) !== normalizeTitle(task.title)),
        ].slice(0, 60));
        setHistoryRevision((revision) => revision + 1);
        setNotice(data.classification.confidence < 0.55
          ? `“${title}”은 분류가 애매해서 기타에 뒀어. 고쳐주면 다음엔 기억할게.`
          : `“${title}”은 ${data.task.category}로 자동 분류했어.`);
      } catch {
        setNotice("저장하지 못했어. 잠시 후 다시 시도해줘.");
        return;
      }
      } else {
      const classification = classifyTask(title);
      setTasks((items) => [
        ...items,
        {
          id: `demo-${Date.now()}`,
          category: classification.category,
          title,
          minutes: draftMinutes,
          allDay: draftAllDay,
          reason: "새로 추가한 일을 오늘 계획에 함께 살펴볼게",
          done: false,
          version: 1,
          recurrence: draftRecurrence === "once" ? "once" : "daily",
          scheduledDate: draftScheduledDate,
          scheduledEndDate: draftRecurrence === "range" ? draftScheduledEndDate : null,
          isToday: draftScheduledDate <= todayDate && (draftRecurrence !== "once" || draftScheduledDate === todayDate) && (draftRecurrence !== "range" || todayDate <= draftScheduledEndDate),
        },
      ]);
      }
      added = true;
      setDraft("");
      setIsTaskSuggestionsOpen(false);
      setActiveTaskSuggestion(-1);
      setDraftMinutes(20);
      setDraftAllDay(false);
      setDraftRecurrence("once");
      setDraftDateMode("today");
      setDraftScheduledDate(todayDate);
      setDraftScheduledEndDate(addDaysKey(todayDate, 6));
      setTaskPage(0);
      setIsAdding(false);
      if (!signedIn) setNotice("체험 목록에 새 할 일을 추가했어.");
    } finally {
      addTaskLockRef.current = false;
      setIsAddingTask(false);
      if (!added) setIsAdding(true);
    }
  }

  function selectTaskSuggestion(suggestion: TaskTemplate) {
    setDraft(suggestion.title);
    setDraftMinutes(suggestion.minutes);
    setIsTaskSuggestionsOpen(false);
    setActiveTaskSuggestion(-1);
  }

  function handleTaskDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && taskSuggestions.length) {
      event.preventDefault();
      setIsTaskSuggestionsOpen(true);
      setActiveTaskSuggestion((index) => Math.min(index + 1, taskSuggestions.length - 1));
      return;
    }
    if (event.key === "ArrowUp" && taskSuggestions.length) {
      event.preventDefault();
      setActiveTaskSuggestion((index) => index <= 0 ? taskSuggestions.length - 1 : index - 1);
      return;
    }
    if (event.key === "Escape" && isTaskSuggestionsOpen) {
      event.preventDefault();
      setIsTaskSuggestionsOpen(false);
      setActiveTaskSuggestion(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = taskSuggestions[activeTaskSuggestion];
      if (suggestion) selectTaskSuggestion(suggestion);
      else void addTask();
    }
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setIsDeleteConfirming(false);
    setEditDraft({
      title: task.title,
      category: task.category,
      minutes: task.minutes,
      allDay: task.allDay,
      recurrence: task.recurrence === "once" ? "once" : task.scheduledEndDate ? "range" : "daily",
      scheduledDate: task.scheduledDate,
      scheduledEndDate: task.scheduledEndDate ?? addDaysKey(task.scheduledDate, 6),
    });
  }

  async function performSaveEdit() {
    if (!editingTask || !editDraft.title.trim()) return;
    if (editDraft.recurrence === "range" && editDraft.scheduledEndDate < editDraft.scheduledDate) {
      setNotice("기간 반복 종료일은 시작일보다 뒤여야 해.");
      return;
    }
    const next = {
      ...editingTask,
      title: editDraft.title.trim(),
      category: editDraft.category,
      minutes: Math.max(5, Math.min(720, Math.round(editDraft.minutes || 5))),
      allDay: editDraft.allDay,
      reason: "수정한 내용과 현재 우선순위를 다시 반영했어",
      recurrence: editDraft.recurrence === "once" ? "once" as const : "daily" as const,
      scheduledDate: editDraft.scheduledDate,
      scheduledEndDate: editDraft.recurrence === "range" ? editDraft.scheduledEndDate : null,
      isToday: taskOccursOn({
        recurrence: editDraft.recurrence === "once" ? "once" : "daily",
        scheduledDate: editDraft.scheduledDate,
        scheduledEndDate: editDraft.recurrence === "range" ? editDraft.scheduledEndDate : null,
      }, todayDate),
      version: editingTask.version + 1,
    };

    if (signedIn && !editingTask.id.startsWith("demo-")) {
      try {
        const response = await fetchWithRetry("/api/tasks", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: editingTask.id,
            title: next.title,
            category: next.category,
            minutes: next.minutes,
            allDay: next.allDay,
            recurrence: next.recurrence,
            scheduledDate: next.scheduledDate,
            scheduledEndDate: next.scheduledEndDate,
            expectedVersion: editingTask.version,
          }),
        });
        if (response.status === 409) {
          setEditingTask(null);
          setNotice("다른 기기에서 먼저 수정돼서 최신 내용을 불러왔어.");
          await loadTasks();
          return;
        }
        if (!response.ok) throw new Error("save failed");
        const data = await response.json() as { task: Task };
        setTasks((items) => items.map((task) => task.id === data.task.id ? data.task : task));
      } catch {
        setNotice("수정 내용을 저장하지 못했어. 잠시 후 다시 시도해줘.");
        return;
      }
    } else {
      setTasks((items) => items.map((task) => task.id === next.id ? next : task));
    }

    setEditingTask(null);
    setNotice("수정한 내용을 저장했어. 바꾼 분류는 다음 자동 분류에도 반영할게.");
  }

  async function saveEdit() {
    await runBearWork("save", performSaveEdit);
  }

  async function deleteTask(deleteMode?: "single" | "series") {
    if (!editingTask) return;
    const wasDone = editingTask.done;
    if (signedIn && !editingTask.id.startsWith("demo-")) {
      try {
        const response = await fetchWithRetry("/api/tasks", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: editingTask.id,
            expectedVersion: editingTask.version,
            deleteMode,
            dateKey: editingTask.isToday ? todayDate : editingTask.scheduledDate,
          }),
        });
        if (response.status === 409) {
          setEditingTask(null);
          setNotice("다른 기기에서 내용이 바뀌어서 최신 목록을 불러왔어.");
          await loadTasks();
          return;
        }
        if (!response.ok) throw new Error("delete failed");
        const data = await response.json() as { stoneStats: StoneStats };
        setStoneStats(data.stoneStats);
      } catch {
        setNotice("삭제하지 못했어. 잠시 후 다시 시도해줘.");
        return;
      }
    } else if (wasDone && (editingTask.recurrence === "once" || deleteMode === "single")) {
      setStoneStats((stats) => ({ ...stats, current: Math.max(0, stats.current - 1), weekly: Math.max(0, stats.weekly - 1) }));
    }
    setTasks((items) => items.filter((task) => task.id !== editingTask.id));
    setEditingTask(null);
    setIsDeleteConfirming(false);
    const removesCurrentCompletion = wasDone && (editingTask.recurrence === "once" || deleteMode === "single");
    if (removesCurrentCompletion) {
      setStoneMotion("removed");
      window.setTimeout(() => setStoneMotion(null), 700);
    }
    setNotice(
      editingTask.recurrence === "daily" && deleteMode === "series"
        ? "반복 일정을 종료했어. 과거 완료 기록과 돌은 그대로 보관했어."
        : editingTask.recurrence === "daily"
          ? "오늘 일정만 삭제했어. 다음 반복일부터 다시 나타나."
          : wasDone
            ? "완료한 일정을 삭제해서 연결된 성취와 돌도 함께 빠졌어."
            : "할 일을 삭제했어.",
    );
  }

  function openSettings(section: SettingsSection = "recommendation") {
    setSettingsDraft({ ...recommendationSettings, preferredName: recommendationSettings.preferredName || displayName });
    setPersonalityDraft(bearPersonality);
    setSettingsSection(section);
    setIsSettingsOpen(true);
  }

  function changeButtonTooltips(enabled: boolean) {
    setShowButtonTooltips(enabled);
    window.localStorage.setItem(tooltipStorageKey, enabled ? "on" : "off");
    setNotice(enabled ? "버튼 도움말을 켰어." : "버튼 도움말을 껐어.");
  }

  async function performSaveRecommendationSettings() {
    const next: RecommendationSettings = {
      mode: settingsDraft.mode,
      availableMinutes: Math.max(15, Math.min(480, Math.round(settingsDraft.availableMinutes || 90))),
      customTaskCount: Math.max(1, Math.min(5, Math.round(settingsDraft.customTaskCount || 3))),
      preferredName: settingsDraft.preferredName.trim().slice(0, 20),
      leaderboardOptIn: settingsDraft.leaderboardOptIn,
      strategy: settingsDraft.strategy,
      preferredCategory: settingsDraft.preferredCategory,
    };

    if (signedIn) {
      try {
        const response = await fetchWithRetry("/api/tasks", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            recommendationMode: next.mode,
            availableMinutes: next.availableMinutes,
            customTaskCount: next.customTaskCount,
            preferredName: next.preferredName,
            leaderboardOptIn: next.leaderboardOptIn,
            recommendationStrategy: next.strategy,
            preferredCategory: next.preferredCategory,
          }),
        });
        if (!response.ok) throw new Error("settings save failed");
        const data = await response.json() as { recommendationSettings: RecommendationSettings };
        setRecommendationSettings(data.recommendationSettings);
        setSettingsDraft(data.recommendationSettings);
        setDisplayName(data.recommendationSettings.preferredName || initialName);
      } catch {
        setNotice("추천 설정을 저장하지 못했어. 잠시 후 다시 시도해줘.");
        return;
      }
    } else {
      setRecommendationSettings(next);
      setDisplayName(next.preferredName || initialName);
    }

    setIsSettingsOpen(false);
    setNotice(next.mode === "auto"
      ? `${next.availableMinutes}분 안에 할 수 있게 자동 추천할게.`
      : `오늘은 최대 ${next.customTaskCount}개를 보여줄게.`);
  }

  async function saveRecommendationSettings() {
    await runBearWork("recommend", performSaveRecommendationSettings);
  }

  async function saveBearPersonality() {
    if (signedIn) {
      try {
        const response = await fetchWithRetry("/api/tasks", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ bearPersonality: personalityDraft }),
        });
        if (!response.ok) throw new Error("personality save failed");
      } catch {
        setNotice("말풍선 성격을 저장하지 못했어. 잠시 후 다시 시도해줘.");
        return;
      }
    }
    setBearPersonality(personalityDraft);
    window.localStorage.setItem(personalityStorageKey, personalityDraft);
    setIsSettingsOpen(false);
    setNotice(`${bearPersonalityOptions.find((option) => option.value === personalityDraft)?.label ?? "선택한"} 말투로 바꿨어.`);
  }

  function applyPersonalityBeforeLogin() {
    setBearPersonality(personalityDraft);
    window.localStorage.setItem(personalityStorageKey, personalityDraft);
    window.localStorage.setItem(personalitySyncKey, "1");
    setIsPersonalityOnboardingOpen(false);
  }

  async function selectStoneStage(stage: StoneStageKey) {
    setSelectedStoneStage(stage);
    if (!signedIn) return;
    try {
      const response = await fetch("/api/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ selectedStoneStage: stage }) });
      if (!response.ok) throw new Error("stage save failed");
      setNotice(stage === "auto" ? "누적 성취에 맞춰 자동으로 전시할게." : "고른 성장 모습을 메인에 전시했어.");
    } catch {
      setNotice("전시 모습을 저장하지 못했어. 다시 눌러줘.");
    }
  }

  async function resetMyData() {
    if (!signedIn) return;
    await runBearWork("save", async () => {
      const response = await fetch("/api/account-data", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation: "RESET_MY_TASKS" }) });
      if (!response.ok) { setNotice("초기화하지 못했어. 잠시 후 다시 시도해줘."); return; }
      const result = await response.json() as { samples: number };
      setIsResetConfirming(false);
      await loadTasks();
      setNotice(result.samples ? "내 일정과 성취 기록을 정리했어." : "내 일정과 성취 기록을 모두 비웠어.");
    });
  }

  async function runBearWork(action: "recommend" | "save", work: () => Promise<void>) {
    if (busyActionRef.current) return;
    busyActionRef.current = true;
    setBusyAction(action);
    try {
      await Promise.all([work(), delay(950)]);
    } finally {
      busyActionRef.current = false;
      setBusyAction(null);
    }
  }

  function openShare() {
    if (!signedIn) {
      setNotice("진행 상황을 공유하려면 먼저 로그인해줘.");
      return;
    }
    const ids = todayTasks.filter((task) => !task.id.startsWith("demo-")).map((task) => task.id);
    setShareSelection(ids);
    setShareMode("tasks");
    setShareUrl("");
    setIsShareCopied(false);
    setShareReused(false);
    setShareExpiresAt(0);
    setIsSharing(true);
  }

  async function createShare(refresh = false) {
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: shareMode, taskIds: shareMode === "tasks" ? shareSelection : [], refresh }),
      });
      if (!response.ok) throw new Error("share failed");
      const data = await response.json() as { path: string; reused: boolean; expiresAt: number };
      setShareUrl(`${window.location.origin}${data.path}`);
      setShareReused(data.reused);
      setShareExpiresAt(data.expiresAt);
      setIsShareCopied(false);
    } catch {
      setNotice("공유 링크를 만들지 못했어. 공유할 일을 확인해줘.");
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsShareCopied(true);
      setNotice("공유 링크를 복사했어.");
      window.setTimeout(() => setIsShareCopied(false), 2500);
    } catch {
      setNotice("복사하지 못했어. 링크를 직접 선택해줘.");
    }
  }

  const heroLine = getBearHeroLine({
    personality: bearPersonality,
    activeTab,
    mood: todayMood,
    total: progressTarget,
    complete: completeCount,
    remaining: remainingToday,
    filtered: filteredTasks.length,
    recommended: recommendedToday.length,
    variantKey: `${todayDate}-${speechVariant}`,
  });
  const recommendationCaption = recommendationSettings.mode === "auto"
    ? `${recommendationSettings.availableMinutes}분과 ${energy} 강도에 맞춰 골랐어`
    : `직접 정한 ${recommendationSettings.customTaskCount}개 기준으로 골랐어`;
  const hasLegendaryBear = stoneStats.current >= GROWTH_COLLECTION_MAX;
  const captionContext = hasLegendaryBear
    ? "legendary"
    : activeTab !== "오늘"
      ? "recommendation"
      : todayMood === "empty" || todayMood === "complete" || todayMood === "progress"
        ? todayMood
        : "recommendation";
  const bearCaption = getBearCaption(bearPersonality, captionContext, recommendationCaption, completeCount);
  const mascotImage = hasLegendaryBear ? mascotImages.celebrating : mascotImages[getMascotVariant(todayMood, energy)];
  const heroGreeting = koreanVocative(displayName);
  const emptyTaskCopy = getEmptyTaskCopy(bearPersonality, activeTab);

  return (
    <main className={`app-shell${showButtonTooltips ? " tooltips-on" : " tooltips-off"}`}>
      <header className="topbar">
        <a className="brand" href="#main" aria-label="오늘 뭐하지 홈">
          오늘 뭐하지?<span className="brand-dot" />
        </a>
        <nav className="tabs" aria-label="할 일 분류">
          {["오늘", ...categories, "기록", "랭킹"].map((tab) => (
            <button
              className={activeTab === tab ? "tab active" : "tab"}
              key={tab}
              onPointerEnter={() => { if (tab === "기록" && signedIn) prefetchHistoryMonth(todayDate.slice(0, 7)); }}
              onFocus={() => { if (tab === "기록" && signedIn) prefetchHistoryMonth(todayDate.slice(0, 7)); }}
              onClick={() => selectTab(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
            >
              {tab}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className={`mobile-menu-button${isMobileNavOpen ? " open" : ""}`}
            type="button"
            data-help={isMobileNavOpen ? "분류 메뉴를 닫아요" : "할 일 분류 메뉴를 열어요"}
            aria-label={isMobileNavOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isMobileNavOpen}
            aria-controls="mobile-category-nav"
            onClick={() => setIsMobileNavOpen((open) => !open)}
          >
            <span /><span /><span />
          </button>
          <a className="account-button" href={signedIn ? "/signout-with-chatgpt?return_to=/" : "/signin-with-chatgpt?return_to=/"}>
            {signedIn ? "로그아웃" : "로그인"}
          </a>
          <Link className="feedback-link" href="/feedback" prefetch>버그·기능 제안</Link>
          <button className="add-button" data-help="새 할 일을 등록해요" onClick={() => setIsAdding(true)}>
            <span aria-hidden="true">＋</span> 할 일 추가
          </button>
        </div>
      </header>

      {isMobileNavOpen && <>
        <button className="mobile-nav-backdrop" type="button" aria-label="메뉴 닫기" onClick={() => setIsMobileNavOpen(false)} />
        <nav className="mobile-nav" id="mobile-category-nav" aria-label="모바일 할 일 분류">
          <p><strong>{activeTab}</strong> 목록을 보고 있어</p>
          <div>
            {["오늘", ...categories, "기록", "랭킹"].map((tab) => (
              <button
                type="button"
                className={activeTab === tab ? "active" : ""}
                key={tab}
                aria-current={activeTab === tab ? "page" : undefined}
                onPointerEnter={() => { if (tab === "기록" && signedIn) prefetchHistoryMonth(todayDate.slice(0, 7)); }}
                onFocus={() => { if (tab === "기록" && signedIn) prefetchHistoryMonth(todayDate.slice(0, 7)); }}
                onClick={() => selectTab(tab)}
              >
                <span aria-hidden="true">{tab === "오늘" ? "☀" : tab === "기록" ? "✦" : tab === "랭킹" ? "♛" : "•"}</span>
                {tab}
              </button>
            ))}
            <Link className="mobile-feedback-link" href="/feedback" prefetch><span aria-hidden="true">!</span>버그·기능 제안</Link>
          </div>
        </nav>
      </>}

      {!signedIn && (
        <aside className="demo-banner" aria-label="체험 화면 안내">
          <div>
            <span className="demo-pill">체험용 화면</span>
            <p><strong>지금 보이는 할 일은 예시야.</strong> 로그인하면 내 할 일을 저장하고 다른 기기에서도 이어볼 수 있어.</p>
          </div>
          <a href="/signin-with-chatgpt?return_to=/">로그인하고 내 할 일 시작하기 <span aria-hidden="true">→</span></a>
        </aside>
      )}

      <div className="workspace" id="main">
        <section className="focus-note" aria-labelledby="today-heading">
          <div className="guide-row">
            <div className={`mascot-placeholder${hasLegendaryBear ? " legendary-bear" : ""}`} aria-hidden="true">
              {hasLegendaryBear && <><span className="legendary-crown">♛</span><span className="legendary-sparkles">✦　✧　★　✦</span><span className="legendary-bear-name">돌친구 왕국 수호곰</span></>}
              <SafeImage key={mascotImage} src={mascotImage} alt="" eager />
            </div>
            <div className={`speech-bubble mood-${todayMood} tone-${bearPersonality}`}>
              <button
                className="speech-refresh-hitbox"
                type="button"
                aria-label="곰의 다른 말 보기"
                onClick={() => setSpeechVariant((variant) => variant + 1)}
              />
              <div className="eyebrow-row">
                <p className="eyebrow">{bearCaption}</p>
                <button className="recommend-settings-button" data-help="추천 시간·개수·우선순위를 바꿔요" onClick={() => openSettings("recommendation")}>추천 설정</button>
              </div>
              <h1 id="today-heading" className={heroLine.length > 31 ? "compact-dialogue" : ""}>
                {heroGreeting},<br />
                <span className="hero-message">{protectKoreanCounters(heroLine)}</span>
              </h1>
              {activeTab === "오늘" && recommendedToday.length > 0 && <p className="plan-summary"><strong>맞춤 추천 {recommendedToday.length}개</strong> · 예상 {recommendedMinutes}분 · {recommendedToday.some((task) => !task.done) ? `추천 일정 ${recommendedToday.filter((task) => !task.done).length}개 남음` : "추천 일정 모두 완료!"}</p>}
              <span className="speech-refresh-hint" aria-hidden="true">말풍선을 누르면 다른 말을 해줘 ↻</span>
            </div>
          </div>

          {activeTab === "기록" ? <HistoryCalendar signedIn={signedIn} stoneTotal={stoneStats.current} refreshRevision={historyRevision} onStoneStatsChange={syncHistoryStoneStats} /> : activeTab === "랭킹" ? <Leaderboard signedIn={signedIn} preferredName={recommendationSettings.preferredName} optIn={recommendationSettings.leaderboardOptIn} onSettingsChange={(preferredName, leaderboardOptIn) => { setDisplayName(preferredName || initialName); setRecommendationSettings((settings) => ({ ...settings, preferredName, leaderboardOptIn })); setSettingsDraft((settings) => ({ ...settings, preferredName, leaderboardOptIn })); }} /> : <><div className="task-carousel"><ol className="task-list" aria-live="polite">
            {filteredTasks.length === 0 && (
              <li className="empty-task">
                <span aria-hidden="true">✦</span>
                <div><strong>{emptyTaskCopy.title}</strong><p>{emptyTaskCopy.description}</p></div>
                <button onClick={() => setIsAdding(true)}>{emptyTaskCopy.action}</button>
              </li>
            )}
            {visibleTasks.map((task, index) => {
              const isRecommended = activeTab === "오늘" && recommendedIds.has(task.id);
              return (
              <li className={`task-row${task.done ? " done" : ""}${isRecommended ? " recommended" : ""}`} key={task.id}>
                <span className="task-number">{safeTaskPage * 4 + index + 1}</span>
                <div className="task-copy">
                  <div className="task-line">
                    <span className={`category category-${task.category}`}>{task.category}</span>
                    {isRecommended && <span className="recommended-task-tag"><span aria-hidden="true">✦</span> 추천</span>}
                    <strong>{task.title}</strong>
                    <span className="duration">{task.allDay ? "하루 종일" : `${task.minutes}분`}</span>
                    {task.recurrence === "daily" && <span className="repeat-tag">{task.scheduledEndDate ? "기간 반복" : "매일"}</span>}
                    {!task.isToday && <span className="schedule-tag">{formatScheduleLabel(task.scheduledDate, todayDate)}</span>}
                    {task.id.startsWith("demo-") && <span className="demo-task-tag">예시</span>}
                  </div>
                  <p className="reason"><span>✦</span> {task.reason}</p>
                </div>
                <div className="task-actions">
                  <button className="edit-button" data-help="할 일 내용과 일정을 수정해요" aria-label={`${task.title} 수정`} onClick={() => openEdit(task)}>✎</button>
                  <button
                    className={task.isToday ? "check-button" : "check-button future"}
                    aria-label={task.isToday ? `${task.title} ${task.done ? "미완료로 변경" : "완료"}` : `${task.title} 예정 일정`}
                    aria-pressed={task.done}
                    disabled={!task.isToday || pendingCompletionIds.includes(task.id)}
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.done ? "✓" : ""}
                  </button>
                </div>
              </li>
              );
            })}
          </ol>
          {taskPageCount > 1 && <>
            <button className="page-arrow page-arrow-left" data-help="이전 할 일 목록을 봐요" aria-label="이전 할 일 보기" disabled={safeTaskPage === 0} onClick={() => setTaskPage((page) => Math.max(0, page - 1))}>◀</button>
            <button className="page-arrow page-arrow-right" data-help="다음 할 일 목록을 봐요" aria-label="다음 할 일 보기" disabled={safeTaskPage === taskPageCount - 1} onClick={() => setTaskPage((page) => Math.min(taskPageCount - 1, page + 1))}>▶</button>
            <div className="task-page-indicator" aria-label={`${taskPageCount}페이지 중 ${safeTaskPage + 1}페이지`}><strong>{safeTaskPage + 1}</strong><span>/</span>{taskPageCount}</div>
          </>}</div>

          <div className="recommend-row">
            <button data-help="완료 상태는 유지하고 추천 순서만 다시 골라요" disabled={busyAction !== null} onClick={reshuffle}><span aria-hidden="true">↻</span> 다시 추천</button>
          </div></>}
          {notice && <p className="notice-toast" role="status">{notice}</p>}
        </section>

        <aside className="status-panel" aria-label="오늘의 상태">
          <section>
            <div className="section-heading">
              <p>오늘의 상태</p><span>✦</span>
            </div>
            <div className="progress-ring" style={{ "--progress": `${(completeCount / Math.max(progressTarget, 1)) * 360}deg` } as React.CSSProperties}>
              <div><strong>{completeCount} / {progressTarget}</strong><span>완료</span></div>
            </div>
          </section>

          <section className="energy-section">
            <div className="section-heading"><p>오늘 할 일 강도</p><span>✦</span></div>
            <div className="energy-options">
              {energyOrder.map((level, index) => (
                <button
                  key={level}
                  className={energy === level ? "energy active" : "energy"}
                  data-help={`${level} 강도에 맞춰 추천을 조정해요`}
                  onClick={() => changeEnergy(level)}
                  aria-pressed={energy === level}
                >
                  <span className="energy-face" aria-hidden="true">{index === 0 ? "˘﹏˘" : index === 1 ? "•‿•" : "⌃‿⌃"}</span>
                  {level}
                </button>
              ))}
            </div>
            <p className="energy-effect"><span aria-hidden="true">↳</span> {energyDescriptions[energy]}</p>
          </section>

          <section className="stones-section">
            <div className="section-heading"><p>돌 친구 성장</p><span>✦</span></div>
            <button className="stone-codex-trigger" data-help="모은 돌과 아직 잠긴 돌을 확인해요" onClick={() => { setGrowthPage(0); setStoneCodexPage(0); setIsStoneCodexOpen(true); }} aria-label="돌도감 열기">
              <StoneGrowth stats={stoneStats} motion={stoneMotion} selectedStage={selectedStoneStage} />
              <span>돌도감 보기 <b>→</b></span>
            </button>
            <button className="share-button" data-help="선택한 일정이나 돌도감의 읽기 전용 링크를 만들어요" onClick={openShare}>일정 · 돌 공유</button>
          </section>
        </aside>
      </div>

      <button
        className="floating-settings-button"
        type="button"
        aria-label="설정 열기"
        onClick={() => openSettings("recommendation")}
      >
        {showButtonTooltips && <span className="settings-tooltip" role="tooltip">추천 기준과 곰 말투 바꾸기 · 버튼 도움말 설정</span>}
        <span className="gear-icon" aria-hidden="true">⚙</span>
      </button>

      {isPersonalityOnboardingOpen && (
        <div className="modal-backdrop personality-onboarding-backdrop" role="presentation">
          <section className="modal personality-onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="personality-onboarding-title">
            <div className="onboarding-bear" aria-hidden="true">
              <SafeImage src="/chubby-bear-transparent-v3.webp" alt="" eager />
              <span>먼저 내 말투를 골라줘!</span>
            </div>
            <p className="eyebrow">로그인 전에 취향부터 맞추기</p>
            <h2 id="personality-onboarding-title">어떤 곰과 함께할까?</h2>
            <p>일정은 그대로지만 말풍선의 말투와 빈 목록 안내가 달라져. 기본은 부담 없이 응원하는 ‘다정’이야.</p>
            <PersonalityPicker value={personalityDraft} onChange={setPersonalityDraft} />
            <div className="personality-preview" aria-live="polite">
              <span aria-hidden="true">{bearPersonalityOptions.find((option) => option.value === personalityDraft)?.icon}</span>
              <p>{bearPersonalityOptions.find((option) => option.value === personalityDraft)?.sample}</p>
            </div>
            <button className="modal-submit" onClick={applyPersonalityBeforeLogin}>이 곰으로 체험 시작하기</button>
          </section>
        </div>
      )}

      {isAdding && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => { if (!isAddingTask) setIsAdding(false); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="닫기" disabled={isAddingTask} onClick={() => setIsAdding(false)}>×</button>
            <p className="eyebrow">머릿속에서 꺼내놓기</p>
            <h2 id="add-title">무엇을 해야 해?</h2>
            <p>자동 분류가 정리할게. 일단 편하게 적어줘.</p>
            <div className="task-title-combobox">
              <input
                autoFocus
                aria-activedescendant={activeTaskSuggestion >= 0 ? `task-suggestion-${activeTaskSuggestion}` : undefined}
                aria-autocomplete="list"
                aria-controls="task-suggestion-list"
                aria-expanded={Boolean(taskSuggestions.length)}
                autoComplete="off"
                disabled={isAddingTask}
                role="combobox"
                value={draft}
                onBlur={() => {
                  setIsTaskSuggestionsOpen(false);
                  setActiveTaskSuggestion(-1);
                }}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setIsTaskSuggestionsOpen(true);
                  setActiveTaskSuggestion(-1);
                }}
                onFocus={() => setIsTaskSuggestionsOpen(true)}
                onKeyDown={handleTaskDraftKeyDown}
                placeholder="예: CUBRID 지원 공고 다시 읽기"
              />
              {taskSuggestions.length > 0 && (
                <div className="task-suggestion-list" id="task-suggestion-list" role="listbox" aria-label="이전에 입력한 일정">
                  {taskSuggestions.map((suggestion, index) => (
                    <button
                      className={activeTaskSuggestion === index ? "active" : ""}
                      id={`task-suggestion-${index}`}
                      key={`${suggestion.title}-${suggestion.category}-${suggestion.minutes}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectTaskSuggestion(suggestion);
                      }}
                      role="option"
                      aria-selected={activeTaskSuggestion === index}
                      type="button"
                    >
                      <span>{suggestion.title}</span>
                      <small>{suggestion.category} · {suggestion.minutes}분</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DurationClockPicker disabled={isAddingTask} minutes={draftMinutes} allDay={draftAllDay} onChange={(value) => { setDraftMinutes(value.minutes); setDraftAllDay(value.allDay); }} />
            <fieldset className="schedule-field">
              <legend>언제 할 일정이야?</legend>
              <div className="schedule-options">
                <button disabled={isAddingTask} type="button" className={draftDateMode === "today" ? "active" : ""} onClick={() => { setDraftDateMode("today"); setDraftScheduledDate(todayDate); setDraftScheduledEndDate((end) => end < todayDate ? addDaysKey(todayDate, 6) : end); }}>오늘</button>
                <button disabled={isAddingTask} type="button" className={draftDateMode === "tomorrow" ? "active" : ""} onClick={() => { const tomorrow = addDaysKey(todayDate, 1); setDraftDateMode("tomorrow"); setDraftScheduledDate(tomorrow); setDraftScheduledEndDate((end) => end < tomorrow ? addDaysKey(tomorrow, 6) : end); }}>내일</button>
                <button disabled={isAddingTask} type="button" className={draftDateMode === "custom" ? "active" : ""} onClick={() => setDraftDateMode("custom")}>날짜 선택</button>
              </div>
              {draftDateMode === "custom" && <CuteDatePicker disabled={isAddingTask} min={todayDate} value={draftScheduledDate} onChange={(date) => { setDraftScheduledDate(date); setDraftScheduledEndDate((end) => end < date ? addDaysKey(date, 6) : end); }} />}
            </fieldset>
            <fieldset className="recurrence-field">
              <legend>이 일정은 얼마나 자주 해?</legend>
              <div>
                <button disabled={isAddingTask} type="button" className={draftRecurrence === "once" ? "active" : ""} onClick={() => setDraftRecurrence("once")}><strong>한 번만</strong><span>선택한 날짜에만 보여</span></button>
                <button disabled={isAddingTask} type="button" className={draftRecurrence === "daily" ? "active" : ""} onClick={() => setDraftRecurrence("daily")}><strong>매일 반복</strong><span>매일 새 체크로 나타나</span></button>
                <button disabled={isAddingTask} type="button" className={`range-option${draftRecurrence === "range" ? " active" : ""}`} onClick={() => setDraftRecurrence("range")}><strong>기간 반복</strong><span>정한 종료일까지 매일 보여</span></button>
              </div>
            </fieldset>
            {draftRecurrence === "range" && (
              <label className="range-end-field">
                <span>언제까지 반복할까?</span>
                <CuteDatePicker disabled={isAddingTask} min={draftScheduledDate} value={draftScheduledEndDate} onChange={setDraftScheduledEndDate} />
              </label>
            )}
            <button className="modal-submit" disabled={isAddingTask || !draft.trim()} onClick={addTask}>{isAddingTask ? "곰이 돌을 주우러 가는 중…" : "일정 추가하기"}</button>
            {isAddingTask && <div className="bear-loading" role="status" aria-live="polite"><span className="walking-bear"><SafeImage src="/chubby-bear-transparent-v3.webp" alt="" eager /></span><span className="loading-pebble">•‿•</span><p>딱 하나만 안전하게 담고 있어. 잠깐만 기다려줘!</p></div>}
          </section>
        </div>
      )}

      {isSettingsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsSettingsOpen(false)}>
          <section className="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="닫기" onClick={() => setIsSettingsOpen(false)}>×</button>
            <p className="eyebrow">한곳에서 취향 조절하기</p>
            <h2 id="settings-title">나만의 설정</h2>
            <nav className="settings-tabs" aria-label="설정 메뉴">
              <button className={settingsSection === "recommendation" ? "active" : ""} onClick={() => setSettingsSection("recommendation")} aria-current={settingsSection === "recommendation" ? "page" : undefined}>
                <span aria-hidden="true">✦</span><strong>추천 설정</strong><small>시간·개수·우선순위</small>
              </button>
              <button className={settingsSection === "personality" ? "active" : ""} onClick={() => setSettingsSection("personality")} aria-current={settingsSection === "personality" ? "page" : undefined}>
                <span aria-hidden="true">•◡•</span><strong>말풍선 성격</strong><small>곰의 말투와 반응</small>
              </button>
              <button className={settingsSection === "help" ? "active" : ""} onClick={() => setSettingsSection("help")} aria-current={settingsSection === "help" ? "page" : undefined}>
                <span aria-hidden="true">?</span><strong>버튼 도움말</strong><small>호버 설명 켜기·끄기</small>
              </button>
            </nav>

            {settingsSection === "recommendation" ? <>
              <div className="settings-section-heading">
                <strong>추천 설정</strong>
                <span>기본값: 자동 · 90분 · 분류를 골고루</span>
              </div>
              <p className="recommendation-method-note">시간·오늘의 강도·선호 분류를 계산해 추천해. 분류를 직접 고치면 이 계정에만 기억해서 다음 자동 분류에 반영할게.</p>
              <div className="edit-fields settings-edit-fields">
                <label>
                  <span>곰이 불러줄 이름</span>
                  <input value={settingsDraft.preferredName} maxLength={20} placeholder={initialName} onChange={(event) => setSettingsDraft((draft) => ({ ...draft, preferredName: event.target.value }))} />
                </label>
                <label className="leaderboard-setting"><input type="checkbox" checked={settingsDraft.leaderboardOptIn} onChange={(event) => setSettingsDraft((draft) => ({ ...draft, leaderboardOptIn: event.target.checked }))} /><span><strong>닉네임으로 랭킹 참여</strong><small>이메일과 할 일 내용은 공개하지 않아.</small></span></label>
                <fieldset className="recommend-mode-field">
                  <legend>오늘 할 일 개수</legend>
                  <div className="recommend-mode-options">
                    <button className={settingsDraft.mode === "auto" ? "active" : ""} onClick={() => setSettingsDraft((draft) => ({ ...draft, mode: "auto" }))} type="button"><strong>자동</strong><span>시간에 맞춰 골라줘</span></button>
                    <button className={settingsDraft.mode === "custom" ? "active" : ""} onClick={() => setSettingsDraft((draft) => ({ ...draft, mode: "custom" }))} type="button"><strong>직접</strong><span>개수를 내가 정할게</span></button>
                  </div>
                </fieldset>
                {settingsDraft.mode === "auto" ? (
                <div className="edit-field">
                  <span>오늘 쓸 수 있는 시간</span>
                  <CuteSelect ariaLabel="오늘 쓸 수 있는 시간" value={settingsDraft.availableMinutes} onChange={(availableMinutes) => setSettingsDraft((draft) => ({ ...draft, availableMinutes }))} options={[{ value: 30, label: "30분" }, { value: 60, label: "1시간" }, { value: 90, label: "1시간 30분" }, { value: 120, label: "2시간" }, { value: 180, label: "3시간" }, { value: 240, label: "4시간" }]} />
                  <small>예: 30분짜리 일이면 90분 안에 최대 3개를 추천해.</small>
                </div>
              ) : (
                <div className="edit-field">
                  <span>한 번에 볼 할 일</span>
                  <CuteSelect ariaLabel="한 번에 볼 할 일" value={settingsDraft.customTaskCount} onChange={(customTaskCount) => setSettingsDraft((draft) => ({ ...draft, customTaskCount }))} options={[1, 2, 3, 4, 5].map((count) => ({ value: count, label: `${count}개` }))} />
                </div>
              )}
              <div className="edit-field">
                <span>추천 우선 기준</span>
                <CuteSelect ariaLabel="추천 우선 기준" value={settingsDraft.strategy} onChange={(strategy) => setSettingsDraft((draft) => ({ ...draft, strategy }))} options={[{ value: "balanced", label: "분류를 골고루" }, { value: "quick", label: "짧게 끝나는 일부터" }, { value: "focus", label: "선호 분류를 먼저" }]} />
                <small>다시 추천할 때 이 기준으로 다른 조합을 찾아.</small>
              </div>
              {settingsDraft.strategy === "focus" && <div className="edit-field">
                <span>먼저 보고 싶은 분류</span>
                <CuteSelect ariaLabel="먼저 보고 싶은 분류" value={settingsDraft.preferredCategory} onChange={(preferredCategory) => setSettingsDraft((draft) => ({ ...draft, preferredCategory }))} options={[{ value: "" as const, label: "자동으로 고르기" }, ...categories.map((category) => ({ value: category, label: category }))]} />
              </div>}
              </div>
              <button className="modal-submit" disabled={busyAction !== null} onClick={saveRecommendationSettings}>{signedIn ? "추천 설정 저장하기" : "체험 화면에 적용하기"}</button>
              {signedIn && (isResetConfirming ? <div className="settings-reset-confirm"><p><strong>내 전체 일정 데이터를 초기화할까?</strong><span>내가 등록한 일정과 누적 성취가 모두 삭제돼.</span></p><div><button onClick={() => setIsResetConfirming(false)}>취소</button><button className="danger-button" onClick={resetMyData}>전체 초기화</button></div></div> : <button className="settings-reset-link" onClick={() => setIsResetConfirming(true)}>내 일정·성취 기록 전체 초기화</button>)}
            </> : settingsSection === "personality" ? <>
              <div className="settings-section-heading">
                <strong>말풍선 성격</strong>
                <span>기본값: 다정</span>
              </div>
              <p className="recommendation-method-note">할 일 수나 추천 결과는 바뀌지 않아. 곰이 건네는 말과 빈 목록 안내만 선택한 성격에 맞게 달라져.</p>
              <PersonalityPicker value={personalityDraft} onChange={setPersonalityDraft} />
              <div className={`personality-preview tone-${personalityDraft}`} aria-live="polite">
                <span aria-hidden="true">{bearPersonalityOptions.find((option) => option.value === personalityDraft)?.icon}</span>
                <div><small>말풍선 미리보기</small><p>{bearPersonalityOptions.find((option) => option.value === personalityDraft)?.sample}</p></div>
              </div>
              <button className="modal-submit" onClick={saveBearPersonality}>{signedIn ? "말풍선 성격 저장하기" : "체험 화면에 적용하기"}</button>
            </> : <>
              <div className="settings-section-heading">
                <strong>버튼 도움말</strong>
                <span>기본값: 켜짐</span>
              </div>
              <p className="recommendation-method-note">버튼 위에 마우스를 올리거나 키보드로 선택하면, 누르기 전에 어떤 기능인지 짧게 알려줘. 이 설정은 현재 기기에만 저장돼.</p>
              <div className="help-setting-card">
                <div>
                  <strong>호버 설명 표시</strong>
                  <span>{showButtonTooltips ? "주요 버튼의 기능을 미리 설명해요." : "버튼 설명을 숨기고 화면을 간결하게 봐요."}</span>
                </div>
                <button
                  className={`help-switch${showButtonTooltips ? " active" : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={showButtonTooltips}
                  aria-label="버튼 도움말 표시"
                  onClick={() => changeButtonTooltips(!showButtonTooltips)}
                >
                  <span aria-hidden="true" />
                  <strong>{showButtonTooltips ? "켜짐" : "꺼짐"}</strong>
                </button>
              </div>
            </>}
            {!signedIn && <p className="settings-login-note">로그인하면 선택한 설정을 내 계정으로 이어서 쓸 수 있어.</p>}
          </section>
        </div>
      )}

      {isSharing && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsSharing(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="share-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="닫기" onClick={() => setIsSharing(false)}>×</button>
            <p className="eyebrow">보여줄 것만 선택하기</p>
            <h2 id="share-title">귀엽게 공유하기</h2>
            {shareUrl ? (
              <div className="share-result">
                <p>{shareReused
                  ? `${shareMode === "stones" ? "현재 돌 친구 현황이" : "선택한 일정이"} 이전 공유 내용과 같아 기존 링크를 불러왔어. 기존 만료일은 그대로야.`
                  : shareMode === "stones"
                    ? "현재 돌 친구 현황을 담은 새 링크를 만들었어."
                    : "새로 추가하거나 선택을 바꾼 일정이 반영된 새 링크를 만들었어."}</p>
                <p className="share-readonly-note">공유 페이지에서는 내용을 수정할 수 없어.</p>
                {shareExpiresAt > 0 && <p className="share-expiry">만료 예정 · {formatShareExpiry(shareExpiresAt)}</p>}
                <input readOnly value={shareUrl} aria-label="공유 링크" />
                <button className={`modal-submit share-copy-button${isShareCopied ? " copied" : ""}`} onClick={copyShareLink}>{isShareCopied ? "✓ 복사 완료" : "링크 복사"}</button>
                {shareReused && <button className="share-renew-button" onClick={() => void createShare(true)}>새 링크로 30일 다시 시작</button>}
              </div>
            ) : (
              <>
                <div className="share-mode-tabs">
                  <button className={shareMode === "tasks" ? "active" : ""} onClick={() => setShareMode("tasks")}><strong>일정 공유</strong><span>고른 일정만 깔끔하게</span></button>
                  <button className={shareMode === "stones" ? "active" : ""} onClick={() => setShareMode("stones")}><strong>돌 공유</strong><span>모은 성취를 귀엽게</span></button>
                </div>
                {shareMode === "tasks" ? <div className="share-options clean">
                  {todayTasks.filter((task) => !task.id.startsWith("demo-")).map((task) => (
                    <button className={shareSelection.includes(task.id) ? "selected" : ""} key={task.id} onClick={() => setShareSelection((ids) => ids.includes(task.id) ? ids.filter((id) => id !== task.id) : [...ids, task.id])}>
                      <span className={`category category-${task.category}`}>{task.category}</span><strong>{task.title}</strong><i>{shareSelection.includes(task.id) ? "✓" : ""}</i>
                    </button>
                  ))}
                  {!todayTasks.some((task) => !task.id.startsWith("demo-")) && <p>오늘 저장된 할 일을 먼저 추가해줘.</p>}
                </div> : <div className="stone-share-preview"><StoneShareVisual total={stoneStats.current} weekly={stoneStats.weekly} compact /></div>}
                <button className="modal-submit" disabled={shareMode === "tasks" && !shareSelection.length} onClick={() => void createShare(false)}>{shareMode === "stones" ? "돌 친구 링크 만들기" : "일정 링크 만들기"}</button>
              </>
            )}
          </section>
        </div>
      )}

      {editingTask && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditingTask(null)}>
          <section className="modal edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="닫기" onClick={() => setEditingTask(null)}>×</button>
            <p className="eyebrow">필요한 만큼만 고치기</p>
            <h2 id="edit-title">할 일 수정</h2>
            <div className="edit-fields">
              <label>
                <span>할 일</span>
                <input autoFocus value={editDraft.title} maxLength={160} onChange={(event) => setEditDraft((draft) => ({ ...draft, title: event.target.value }))} onKeyDown={(event) => event.key === "Enter" && void saveEdit()} />
              </label>
              <div className="edit-field-row edit-category-row">
                <div className="edit-field">
                  <span>분류</span>
                  <CuteSelect ariaLabel="분류" value={editDraft.category} onChange={(category) => setEditDraft((draft) => ({ ...draft, category }))} options={categories.map((category) => ({ value: category, label: category }))} />
                </div>
              </div>
              <DurationClockPicker minutes={editDraft.minutes} allDay={editDraft.allDay} onChange={(value) => setEditDraft((draft) => ({ ...draft, ...value }))} />
              <div className="edit-field">
                <span>반복</span>
                <CuteSelect ariaLabel="반복" value={editDraft.recurrence} onChange={(recurrence) => setEditDraft((draft) => ({ ...draft, recurrence }))} options={[{ value: "once", label: "한 번만" }, { value: "daily", label: "매일 반복" }, { value: "range", label: "기간 반복" }]} />
              </div>
              <label>
                <span>일정 날짜</span>
                <CuteDatePicker min={todayDate} value={editDraft.scheduledDate} onChange={(date) => setEditDraft((draft) => ({ ...draft, scheduledDate: date, scheduledEndDate: draft.scheduledEndDate < date ? addDaysKey(date, 6) : draft.scheduledEndDate }))} />
              </label>
              {editDraft.recurrence === "range" && <label>
                <span>반복 종료일</span>
                <CuteDatePicker min={editDraft.scheduledDate} value={editDraft.scheduledEndDate} onChange={(date) => setEditDraft((draft) => ({ ...draft, scheduledEndDate: date }))} />
              </label>}
            </div>
            {isDeleteConfirming ? (
              <div className="delete-confirm" role="alert">
                {editingTask.recurrence === "daily" ? (
                  <>
                    <p><strong>어느 범위까지 삭제할까?</strong><span>전체를 삭제해도 과거 완료 기록과 돌은 그대로 남아.</span></p>
                    <div className="recurring-delete-options">
                      <button className="cancel-button" onClick={() => deleteTask("single")}><strong>{editingTask.isToday ? "오늘 일정만 삭제" : `${formatDateShort(editingTask.scheduledDate)} 일정만 삭제`}</strong><span>다음 반복일부터 다시 보여</span></button>
                      <button className="danger-button" onClick={() => deleteTask("series")}><strong>반복 일정 전체 삭제</strong><span>앞으로의 일정을 모두 종료해</span></button>
                      <button className="cancel-button back-option" onClick={() => setIsDeleteConfirming(false)}>돌아가기</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p><strong>정말 삭제할까?</strong><span>삭제한 할 일은 다시 복구할 수 없어.</span></p>
                    <div><button className="cancel-button" onClick={() => setIsDeleteConfirming(false)}>돌아가기</button><button className="danger-button" onClick={() => deleteTask()}>삭제하기</button></div>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="edit-modal-actions">
                  <button className="cancel-button" onClick={() => setEditingTask(null)}>취소</button>
                  <button className="modal-submit" disabled={busyAction !== null || !editDraft.title.trim()} onClick={saveEdit}>변경 내용 저장</button>
                </div>
                <button className="delete-link" onClick={() => setIsDeleteConfirming(true)}>이 할 일 삭제</button>
              </>
            )}
          </section>
        </div>
      )}

      {isStoneCodexOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsStoneCodexOpen(false)}>
          <section className="modal stone-codex-modal" role="dialog" aria-modal="true" aria-labelledby="stone-codex-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="닫기" onClick={() => setIsStoneCodexOpen(false)}>×</button>
            <p className="eyebrow">하나씩 만나는 작은 친구들</p>
            <h2 id="stone-codex-title">나의 돌도감</h2>
            <p>성장 컬렉션에는 개별 돌도감에서 해금한 친구들만 등장해. 누적 성취가 늘수록 바구니와 정원도 함께 성장해.</p>
            <div className="growth-collection">
              <div className="growth-collection-heading"><strong>성장 컬렉션</strong><span>12개씩 보기 · 누르면 메인에 전시</span></div>
              <div className="collection-carousel">
              <div className="growth-collection-grid">
                {visibleGrowthItems.map((item) => {
                  if (item.kind === "auto") return <button className={selectedStoneStage === "auto" ? "selected" : ""} key="auto" onClick={() => void selectStoneStage("auto")}><span className="growth-auto">↻</span><strong>자동 성장</strong><small>누적 성취에 맞춰 변경</small></button>;
                  const stage = item.stage;
                  const unlocked = stoneStats.current >= stage.unlockAt;
                  const stageStoneCount = visibleStoneCount(stage.key, stoneStats.current);
                  const stageSpecies = stoneSpeciesIndexes(stoneStats.current, stageStoneCount, Math.max(0, stoneStats.current - stageStoneCount));
                  return <button disabled={!unlocked} className={selectedStoneStage === stage.key ? "selected" : ""} key={stage.key} onClick={() => void selectStoneStage(stage.key)}><span className="growth-art"><span className={`growth-mini growth-${stage.key}`}>{unlocked && <span className="growth-species" aria-hidden="true">{stageSpecies.map((species, index) => <StoneFace index={species} className="growth-species-stone" ariaHidden key={`${species}-${index}`} />)}</span>}</span>{!unlocked && <b aria-label="잠김">🔒</b>}</span><strong>{unlocked ? stage.title : "아직 잠김"}</strong><small>누적 {stage.unlockAt.toLocaleString("ko-KR")}개</small></button>;
                })}
              </div>
              {growthPageCount > 1 && <>
                <button className="collection-arrow collection-arrow-left" aria-label="이전 성장 컬렉션 보기" disabled={safeGrowthPage === 0} onClick={() => setGrowthPage((page) => Math.max(0, page - 1))}>◀</button>
                <button className="collection-arrow collection-arrow-right" aria-label="다음 성장 컬렉션 보기" disabled={safeGrowthPage === growthPageCount - 1} onClick={() => setGrowthPage((page) => Math.min(growthPageCount - 1, page + 1))}>▶</button>
                <div className="collection-page-indicator" aria-label={`${growthPageCount}페이지 중 ${safeGrowthPage + 1}페이지`}>{safeGrowthPage + 1} / {growthPageCount}</div>
              </>}
              </div>
            </div>
            <div className="stone-codex-divider"><span>개별 돌 친구 · {unlockedStoneEntries(stoneStats.current).length}/{stoneCatalog.length}종 발견</span></div>
            <div className="collection-carousel stone-friends-carousel">
            <div className="stone-codex-grid">
              {visibleStoneCatalog.map(({ name: stoneName, goal, index }) => {
                const unlocked = stoneStats.current >= goal;
                return <div className={unlocked ? "codex-item unlocked" : "codex-item locked"} key={stoneName}><span className="codex-pebble-wrap"><StoneFace index={index} className="codex-pebble" face={unlocked ? undefined : ""} ariaHidden />{!unlocked && <b className="codex-lock-badge" aria-label="잠김">🔒</b>}</span><strong>{stoneName}</strong><small>{unlocked ? `누적 ${goal.toLocaleString("ko-KR")}개에 만났어` : `누적 ${goal.toLocaleString("ko-KR")}개에 해금`}</small></div>;
              })}
            </div>
            {stoneCodexPageCount > 1 && <>
              <button className="collection-arrow collection-arrow-left" aria-label="이전 돌 친구 보기" disabled={safeStoneCodexPage === 0} onClick={() => setStoneCodexPage((page) => Math.max(0, page - 1))}>◀</button>
              <button className="collection-arrow collection-arrow-right" aria-label="다음 돌 친구 보기" disabled={safeStoneCodexPage === stoneCodexPageCount - 1} onClick={() => setStoneCodexPage((page) => Math.min(stoneCodexPageCount - 1, page + 1))}>▶</button>
              <div className="collection-page-indicator" aria-label={`${stoneCodexPageCount}페이지 중 ${safeStoneCodexPage + 1}페이지`}>{safeStoneCodexPage + 1} / {stoneCodexPageCount}</div>
            </>}
            </div>
          </section>
        </div>
      )}
      {(busyAction || isInitialLoading) && <BearWorkLoading variant={busyAction ?? "initial"} />}
    </main>
  );
}

function PersonalityPicker({
  value,
  onChange,
}: {
  value: BearPersonality;
  onChange: (personality: BearPersonality) => void;
}) {
  return <fieldset className="personality-picker">
    <legend className="sr-status">곰의 말풍선 성격 선택</legend>
    {bearPersonalityOptions.map((option) => (
      <button
        type="button"
        className={value === option.value ? "active" : ""}
        aria-pressed={value === option.value}
        key={option.value}
        onClick={() => onChange(option.value)}
      >
        <span className={`personality-face tone-${option.value}`} aria-hidden="true">{option.icon}</span>
        <span><strong>{option.label}</strong><small>{option.description}</small></span>
        <i aria-hidden="true">{value === option.value ? "✓" : ""}</i>
      </button>
    ))}
  </fieldset>;
}

async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, attempts = 3) {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(input, init);
      lastResponse = response;
      if (![502, 503, 504].includes(response.status) || attempt === attempts - 1) return response;
    } catch (error) {
      if (attempt === attempts - 1) throw error;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 180 * 2 ** attempt + Math.random() * 120));
  }
  if (lastResponse) return lastResponse;
  throw new Error("request failed");
}

function clientKstDateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function formatShareExpiry(timestamp: number) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp));
}

function addDaysKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function taskOccursOn(
  task: { recurrence: "once" | "daily"; scheduledDate: string; scheduledEndDate: string | null },
  dateKey: string,
) {
  return task.recurrence === "daily"
    ? task.scheduledDate <= dateKey && (!task.scheduledEndDate || dateKey <= task.scheduledEndDate)
    : task.scheduledDate === dateKey;
}

function formatScheduleLabel(dateKey: string, today: string) {
  if (dateKey === addDaysKey(today, 1)) return "내일";
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}/${Number(day)} 예정`;
}

function formatDateShort(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function BearWorkLoading({ variant }: { variant: "recommend" | "save" | "initial" }) {
  return <div className="work-loading-backdrop" role="status" aria-live="polite"><div className={`work-loading-card ${variant}`}>
    <div className="work-scene">
      <SafeImage src="/chubby-bear-transparent-v3.webp" alt="" eager />
      {variant === "save" ? <span className="polish-stone">✦</span> : variant === "initial" ? <div className="welcome-stones"><span>•‿•</span><span>•ᴗ•</span></div> : <div className="sorting-stones"><span>•‿•</span><span>•ᴗ•</span><span>˙ᵕ˙</span></div>}
    </div>
    <strong>{variant === "save" ? "곰이 바뀐 내용을 반짝이게 닦는 중…" : variant === "initial" ? "곰과 돌 친구들이 오늘을 준비하는 중…" : "곰이 알맞은 돌 순서를 고르는 중…"}</strong>
    <p>{variant === "save" ? "안전하게 저장하고 있어. 잠깐만 기다려줘!" : variant === "initial" ? "조금만 기다리면 오늘의 목록이 열려." : "오늘의 시간과 에너지에 맞춰 차근차근 놓아볼게."}</p>
  </div></div>;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
