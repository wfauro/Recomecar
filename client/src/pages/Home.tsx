import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Compass,
  HeartHandshake,
  Home as HomeIcon,
  Info,
  Leaf,
  Lightbulb,
  LockKeyhole,
  Moon,
  RotateCcw,
  Route,
  ShieldCheck,
  Sparkles,
  Sun,
  Timer,
  X,
  Zap,
} from "lucide-react";
import {
  closeEncounter as closeEncounterState,
  defaultState,
  hasEncounterInProgress,
  normalizeState,
  startNewEncounter,
  type AppState,
  type Level,
  type Protocol,
  type Theme,
} from "@/lib/appState";

type Distance = "dias" | "fe";
type Difficulty = "sobrecarregado" | "direcao" | "vergonha" | "desistencia";
type View = "home" | "diagnostico" | "encontro" | "apoio";

type RouteStep = {
  time: string;
  eyebrow: string;
  title: string;
  prompt: string;
  passage: string;
  focus: string;
  why: string;
  action: string;
};

type BibleTarget = {
  book: "PSA" | "MAT";
  chapter: number;
  start: number;
  end: number;
  reference: string;
  fallback: string;
};

type BibleState = {
  status: "idle" | "loading" | "ready" | "fallback";
  text: string;
};

const STORAGE_KEY = "recomecar-hoje-app-v2";

const navItems: { id: View; label: string; shortLabel: string; icon: ReactNode }[] = [
  { id: "home", label: "Início", shortLabel: "Hoje", icon: <HomeIcon size={18} /> },
  { id: "diagnostico", label: "Ponto de partida", shortLabel: "Começar", icon: <Compass size={18} /> },
  { id: "encontro", label: "Meu encontro", shortLabel: "Encontro", icon: <BookOpen size={18} /> },
  { id: "apoio", label: "Apoio", shortLabel: "Apoio", icon: <CircleHelp size={18} /> },
];

const journeySteps: { number: string; title: string; description: string; view: View; icon: ReactNode }[] = [
  { number: "01", title: "Ponto de partida", description: "Entenda o que você precisa agora.", view: "diagnostico", icon: <Compass size={18} /> },
  { number: "02", title: "Ritmo de agora", description: "Escolha o tempo que você realmente tem.", view: "encontro", icon: <Timer size={18} /> },
  { number: "03", title: "Encontro guiado", description: "Leia, reflita e faça sua oração possível.", view: "encontro", icon: <BookOpen size={18} /> },
];

const protocolDetails: Record<Protocol, { title: string; description: string; icon: ReactNode; label: string; detail: string }> = {
  alivio: {
    title: "Modo Alívio",
    description: "Quando até abrir a Bíblia parece pesado.",
    icon: <Sparkles size={19} />,
    label: "começo mínimo",
    detail: "Uma oração honesta e pequena para reduzir a distância entre você e o primeiro passo.",
  },
  mapa: {
    title: "Mapa do Retorno",
    description: "Quando você está distante e não sabe por onde abrir.",
    icon: <Compass size={19} />,
    label: "ponto de partida",
    detail: "Um caminho claro para voltar ao texto, a partir de hoje e no seu próprio ritmo.",
  },
  constrangimento: {
    title: "Volta sem Constrangimento",
    description: "Quando a vergonha faz você adiar a volta.",
    icon: <HeartHandshake size={19} />,
    label: "retorno leve",
    detail: "Você chega como está, sem precisar justificar a ausência nem provar constância.",
  },
  proximo: {
    title: "Próximo Encontro",
    description: "Quando você terminou e não sabe o que vem depois.",
    icon: <Route size={19} />,
    label: "continuidade",
    detail: "O próximo trecho vem pronto para você não depender de uma nova decisão.",
  },
};

const distanceOptions: { value: Distance; label: string; description: string }[] = [
  { value: "dias", label: "Poucos dias", description: "A pausa ainda parece recente." },
  { value: "fe", label: "Estou recomeçando na fé", description: "Quero um primeiro passo sem complicar." },
];

const difficultyOptions: { value: Difficulty; label: string; description: string }[] = [
  { value: "sobrecarregado", label: "Estou sobrecarregado", description: "Minha cabeça já está cheia." },
  { value: "direcao", label: "Não sei por onde começar", description: "Tenho vontade, mas falta direção." },
  { value: "vergonha", label: "Sinto vergonha de ter parado", description: "Parece que preciso explicar minha ausência." },
  { value: "desistencia", label: "Já tentei e desisti", description: "Tenho medo de começar mais uma vez." },
];

const troubleItems: { title: string; answer: string; protocol: Protocol; action: string }[] = [
  {
    title: "Quando quiser recomeçar",
    answer: "Você pode começar por qualquer ponto. Abra uma passagem curta, observe o que toca seu momento atual e pare antes de transformar a volta em um plano impossível.",
    protocol: "mapa",
    action: "Abrir Mapa do Retorno",
  },
  {
    title: "Comecei um plano, parei e agora sinto que estraguei tudo",
    answer: "Você pode voltar no seu próprio ritmo. O encontro de hoje começa pelo texto que cabe no seu momento.",
    protocol: "mapa",
    action: "Começar agora",
  },
  {
    title: "Tenho vontade de voltar, mas estou me sentindo constrangido",
    answer: "A volta não exige explicação. Você não precisa provar que mudou, prometer que nunca mais vai parar ou fingir que está bem. Apenas chegue com verdade.",
    protocol: "constrangimento",
    action: "Voltar sem constrangimento",
  },
  {
    title: "Não consigo fazer uma oração longa",
    answer: "Oração possível não é oração menor. Diga uma frase verdadeira: o que você carrega, o que precisa ou simplesmente que está aqui.",
    protocol: "alivio",
    action: "Usar Modo Alívio",
  },
  {
    title: "Tenho só alguns minutos e não quero iniciar algo que não vou terminar",
    answer: "Você pode fazer apenas o começo. Dois minutos já diminuem a distância, e continuar é uma escolha sua.",
    protocol: "alivio",
    action: "Começar em 2 minutos",
  },
  {
    title: "Terminei o encontro, mas não sei qual é o próximo passo",
    answer: "Você não precisa procurar um novo plano. O próximo encontro oferece uma passagem, uma pergunta e uma oração possível para seguir sem abrir outra frente.",
    protocol: "proximo",
    action: "Abrir Próximo Encontro",
  },
];

function readState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw), (level, protocol) => getSteps(level, protocol).length);
  } catch {
    return defaultState();
  }
}

function getRecommendedProtocol(distance?: Distance, difficulty?: Difficulty): Protocol | null {
  if (!distance || !difficulty) return null;
  if (difficulty === "sobrecarregado") return "alivio";
  if (difficulty === "vergonha" || difficulty === "desistencia") return "constrangimento";
  if (difficulty === "direcao") return distance === "dias" ? "proximo" : "mapa";
  return distance === "dias" || distance === "fe" ? "proximo" : "mapa";
}

function getBibleTarget(level: Level, protocol: Protocol): BibleTarget {
  if (protocol === "alivio" || protocol === "constrangimento") {
    return level === "2"
      ? { book: "MAT", chapter: 11, start: 28, end: 28, reference: "Mateus 11:28", fallback: "Vinde a mim, todos vocês que trabalham e estão sobrecarregados, e eu lhes darei descanso." }
      : { book: "MAT", chapter: 11, start: 28, end: level === "calma" ? 30 : 29, reference: level === "calma" ? "Mateus 11:28-30" : "Mateus 11:28-29", fallback: level === "calma" ? "Vinde a mim, todos vocês que trabalham e estão sobrecarregados, e eu lhes darei descanso. Tomai sobre vós o meu jugo e aprendei de mim, pois sou manso e humilde de coração; e encontrareis descanso para vossas almas. Pois o meu jugo é fácil, e meu fardo é leve." : "Vinde a mim, todos vocês que trabalham e estão sobrecarregados, e eu lhes darei descanso. Tomai sobre vós o meu jugo e aprendei de mim, pois sou manso e humilde de coração; e encontrareis descanso para vossas almas." };
  }
  return level === "calma"
    ? { book: "PSA", chapter: 23, start: 1, end: 6, reference: "Salmos 23:1-6", fallback: "Yahweh é meu pastor; nada me faltará. Ele me faz deitar em pastos verdes. Ele me conduz ao lado de águas paradas. Ele restaura minha alma. Ele me guia nos caminhos da retidão por causa de seu nome. Embora eu caminhe pelo vale da sombra da morte, eu não temerei nenhum mal, pois vocês estão comigo. Certamente a bondade e a bondade amorosa me acompanharão todos os dias da minha vida, e eu morarei na casa de Yahweh para sempre." }
    : { book: "PSA", chapter: 23, start: 1, end: 3, reference: "Salmos 23:1-3", fallback: "Yahweh é meu pastor; nada me faltará. Ele me faz deitar em pastos verdes. Ele me conduz ao lado de águas paradas. Ele restaura minha alma. Ele me guia nos caminhos da retidão por causa de seu nome." };
}

function extractBibleText(payload: { chapter?: { content?: { type?: string; number?: number; content?: (string | { text?: string })[] }[] } }, target: BibleTarget) {
  const verses = (payload.chapter?.content ?? []).filter(item => item.type === "verse" && typeof item.number === "number" && item.number >= target.start && item.number <= target.end);
  const text = verses.map(verse => `${verse.number}. ${(verse.content ?? []).map(part => typeof part === "string" ? part : part.text ?? "").join(" ")}`).join(" ");
  if (!text) throw new Error("A passagem não foi encontrada.");
  return text;
}

function getSteps(level: Level, protocol: Protocol): RouteStep[] {
  if (level === "2") {
    return [
      {
        time: "1 min",
        eyebrow: "Ler",
        title: "Leia uma frase que acolhe",
        prompt: "Leia a passagem sugerida sem tentar fazer mais do que cabe agora.",
        passage: "Receba uma frase de descanso como o seu ponto de chegada hoje.",
        focus: "Leia uma vez, devagar, e perceba a palavra que mais chama sua atenção.",
        why: "Um começo pequeno reduz a pressão e torna a volta possível no seu próprio ritmo.",
        action: "Concluir leitura",
      },
      {
        time: "30 s",
        eyebrow: "Meditar",
        title: "Fique com uma palavra",
        prompt: "Escolha uma palavra da passagem para levar com você neste momento.",
        passage: "Você não precisa explicar o texto. Apenas perceba o que ele desperta em você.",
        focus: "Respire e permaneça alguns instantes com essa palavra.",
        why: "Uma pausa breve transforma a leitura em presença, sem exigir uma reflexão longa.",
        action: "Concluir reflexão",
      },
      {
        time: "30 s",
        eyebrow: "Orar",
        title: "Faça uma oração de chegada",
        prompt: "Diga uma frase verdadeira sobre como você chegou hoje.",
        passage: "Você pode começar assim: “Deus, eu estou aqui, mesmo sem saber por onde começar.”",
        focus: "Não procure a frase perfeita. Apenas nomeie a sua presença.",
        why: "A oração possível encerra o encontro no seu próprio ritmo.",
        action: "Finalizar encontro",
      },
    ];
  }
  if (level === "calma") {
    return [
      {
        time: "5 min",
        eyebrow: "Passagem",
        title: "Leia Salmo 23:1-3",
        prompt: "Leia devagar, no seu próprio ritmo.",
        passage: "Observe a imagem de cuidado, direção e descanso que aparece no texto.",
        focus: "Escolha uma palavra ou imagem para levar com você.",
        why: "A leitura volta a ser um encontro, não uma prova de desempenho.",
        action: "Concluir passagem",
      },
      {
        time: "10 min",
        eyebrow: "Reflexão ampliada",
        title: "Nomeie o que pesa",
        prompt: "O que em você está pedindo descanso, direção ou coragem para voltar?",
        passage: "Escreva uma frase. Não é uma redação e não precisa soar bonita.",
        focus: "Fique com a pergunta por alguns minutos antes de procurar uma resposta.",
        why: "Dar nome ao peso diminui a sensação de que você precisa resolver tudo de uma vez.",
        action: "Concluir reflexão",
      },
      {
        time: "5 min",
        eyebrow: "Oração",
        title: "Ore sem preparar discurso",
        prompt: "Fale com Deus sobre a frase que você escreveu.",
        passage: "Você pode voltar no seu próprio ritmo.",
        focus: "Termine com uma frase que você consegue sustentar hoje.",
        why: "O encontro acaba com uma direção simples para o seu momento.",
        action: "Concluir encontro",
      },
    ];
  }
  const firstTitle = protocol === "mapa" ? "Abra pelo seu momento" : protocol === "constrangimento" ? "Volte sem explicar sua ausência" : protocol === "proximo" ? "Continue pelo próximo trecho" : "Leia Salmo 23:1-3";
  const firstPrompt = protocol === "mapa" ? "Leia Salmo 23:1-3 a partir do seu momento de hoje." : protocol === "constrangimento" ? "Leia lembrando que você não precisa provar nada para voltar." : protocol === "proximo" ? "Leia como o próximo passo, no seu próprio ritmo." : "Leia a passagem indicada no seu próprio ritmo.";
  const firstPassage = protocol === "mapa" ? "Observe uma palavra ou imagem que encontre o seu momento de hoje." : protocol === "constrangimento" ? "Você pode chegar como está. Não precisa transformar a ausência em explicação." : protocol === "proximo" ? "Observe uma palavra que possa acompanhar o seu próximo encontro." : "Observe uma palavra ou imagem que encontre o seu momento de hoje.";
  return [
    { time: "3 min", eyebrow: protocolDetails[protocol].title, title: firstTitle, prompt: firstPrompt, passage: firstPassage, focus: "Leia para encontrar um ponto de contato.", why: "A primeira passagem devolve um lugar claro para começar.", action: "Concluir passagem" },
    { time: "5 min", eyebrow: "Reflexão", title: "Nomeie o que pesa", prompt: "O que em você precisa de descanso, direção ou coragem hoje?", passage: "Responda em uma frase. O objetivo é estar presente, não produzir uma reflexão perfeita.", focus: "Se ajudar, complete: “Hoje eu preciso de...”", why: "A reflexão transforma uma sensação difusa em algo que pode ser levado para a oração.", action: "Concluir reflexão" },
    { time: "2 min", eyebrow: "Oração possível", title: "Fale com Deus em uma frase", prompt: "Use suas próprias palavras ou comece com: “Deus, me ajude a voltar sem medo.”", passage: "Quando terminar, você voltou, e pode seguir no seu próprio ritmo.", focus: "Não prometa constância. Apenas entregue o que é verdadeiro agora.", why: "O encontro termina com uma volta possível, não com uma meta difícil de manter.", action: "Concluir encontro" },
  ];
}

export default function Home() {
  const [state, setState] = useState<AppState>(() => readState());
  const [view, setView] = useState<View>("home");
  const [distance, setDistance] = useState<Distance>();
  const [difficulty, setDifficulty] = useState<Difficulty>();
  const [openTrouble, setOpenTrouble] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resumePending, setResumePending] = useState(() => hasEncounterInProgress(state, getSteps(state.level, state.protocol).length));

  const steps = useMemo(() => getSteps(state.level, state.protocol), [state.level, state.protocol]);
  const bibleTarget = useMemo(() => getBibleTarget(state.level, state.protocol), [state.level, state.protocol]);
  const [bibleState, setBibleState] = useState<BibleState>({ status: "idle", text: "" });
  const completed = state.completedStep >= steps.length;
  const currentIndex = Math.min(state.completedStep, Math.max(steps.length - 1, 0));
  const completionPercent = Math.min(100, Math.round((state.completedStep / steps.length) * 100));
  const recommended = getRecommendedProtocol(distance, difficulty);
  const nextAction = completed
    ? { eyebrow: "Encontro concluído", title: "Você voltou hoje", copy: "O encontro de hoje foi concluído. Você pode voltar no seu próprio ritmo.", button: "Fechar encontro", view: "home" as View }
    : state.journeyStep === 0
    ? { eyebrow: "Passo 01", title: "Escolha seu ponto de partida", copy: "Duas respostas rápidas para tirar a escolha das suas costas.", button: "Começar agora", view: "diagnostico" as View }
    : state.journeyStep === 1
      ? { eyebrow: "Passo 02", title: "Escolha o ritmo de agora", copy: "Não escolha o que gostaria de conseguir. Escolha o tempo que realmente tem.", button: "Escolher meu ritmo", view: "encontro" as View }
    : { eyebrow: "Encontro", title: "Continue o encontro daqui", copy: `${steps[currentIndex]?.title ?? "Próximo passo"}. O conteúdo está pronto para você.`, button: "Continuar encontro", view: "encontro" as View };

  useEffect(() => {
    const controller = new AbortController();
    setBibleState({ status: "loading", text: "" });
    fetch(`https://bible.helloao.org/api/por_bsl/${bibleTarget.book}/${bibleTarget.chapter}.json`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Falha ao carregar a passagem.");
        return response.json();
      })
      .then(payload => setBibleState({ status: "ready", text: extractBibleText(payload, bibleTarget) }))
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBibleState({ status: "fallback", text: bibleTarget.fallback });
      });
    return () => controller.abort();
  }, [bibleTarget]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // O progresso continua funcionando mesmo se o navegador bloquear storage.
    }
  }, [state]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const go = (nextView: View) => {
    if (nextView === "encontro") setResumePending(false);
    setView(nextView);
  };

  const continueFromDiagnostic = () => {
    if (!recommended) return;
    setState(current => ({ ...current, protocol: recommended, journeyStep: Math.max(current.journeyStep, 1) }));
    setNotice(`${protocolDetails[recommended].title} escolhido como ponto de partida.`);
    go("encontro");
  };

  const chooseLevel = (level: Level) => {
    const protocol = level === "2" ? "alivio" : state.protocol === "alivio" ? "mapa" : state.protocol;
    setState(current => ({ ...current, level, protocol, completedStep: 0, journeyStep: 2 }));
    setNotice(level === "2" ? "Seu encontro de 2 minutos está pronto." : level === "10" ? "Seu encontro de 10 minutos está pronto." : "Seu ritmo calmo está pronto.");
  };

  const completeCurrentStep = () => {
    const nextCount = Math.min(state.completedStep + 1, steps.length);
    setState(current => ({ ...current, completedStep: nextCount, journeyStep: nextCount >= steps.length ? 3 : 2 }));
    setNotice(nextCount >= steps.length ? "Encontro concluído. Você voltou hoje." : "Etapa concluída. O próximo passo já está aberto.");
  };

  const startNextEncounter = () => {
    setState(current => startNewEncounter(current));
    setNotice("Novo encontro pronto.");
    go("encontro");
  };

  const closeEncounter = () => {
    setState(current => closeEncounterState(current));
    setNotice("Encontro fechado.");
    go("home");
  };

  const handleNextAction = () => (completed ? closeEncounter() : go(nextAction.view));

  const chooseProtocol = (protocol: Protocol) => {
    const level = protocol === "alivio" ? "2" : state.level === "2" ? "10" : state.level;
    setState(current => ({ ...current, protocol, level, journeyStep: Math.max(current.journeyStep, 1), completedStep: 0 }));
    setNotice(`${protocolDetails[protocol].title} selecionado.`);
    go("encontro");
  };

  const toggleTheme = (nextTheme: Theme) => {
    setState(current => ({ ...current, theme: nextTheme }));
    setNotice(nextTheme === "dark" ? "Tema escuro ativado." : "Tema claro ativado.");
  };

  const renderBibleCard = () => (
    <div className="bible-card">
      <div className="bible-card-top"><span className="eyebrow"><BookOpen size={13} /> Texto sugerido</span><span className="bible-version">Bíblia Portuguesa Mundial</span></div>
      <strong className="bible-reference">{bibleTarget.reference}</strong>
      <p className={`bible-text ${bibleState.status === "loading" ? "is-loading" : ""}`}>{bibleState.status === "loading" ? "Abrindo a passagem para você..." : `“${bibleState.text}”`}</p>
      <div className="bible-card-foot"><span><ShieldCheck size={13} /> {bibleState.status === "fallback" ? "Texto disponível sem conexão" : "Texto carregado automaticamente"}</span><span>Tradução fixa no app</span></div>
    </div>
  );

  const renderHeader = () => (
    <header className="app-header">
      <div className="header-inner">
        <button className="brand" type="button" onClick={() => go("home")} aria-label="Voltar ao início">
          <span className="brand-mark"><Leaf size={17} strokeWidth={2.4} /></span>
          <span className="brand-name">Recomeçar Hoje</span>
        </button>
        <div className="header-context">
          <span className="live-dot" />
            {completed ? "Encontro concluído" : state.journeyStep === 0 ? "Um passo de cada vez" : "Encontro em andamento"}
        </div>
        <div className="header-actions">
          <span className="desktop-only privacy-chip"><ShieldCheck size={14} /> Sem streak</span>
          <button className="icon-button" type="button" onClick={() => toggleTheme(state.theme === "dark" ? "light" : "dark")} aria-label={state.theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}>
            {state.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );

  const renderSidebar = () => (
    <aside className="side-nav">
      <div className="side-label">Seu caminho</div>
      <nav aria-label="Navegação principal">
        {navItems.map(item => (
          <button key={item.id} type="button" className={`side-link ${view === item.id ? "active" : ""}`} onClick={() => go(item.id)}>
            <span className="side-link-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === "encontro" && state.completedStep > 0 && !completed ? <span className="side-link-dot" /> : null}
          </button>
        ))}
      </nav>
      <div className="side-progress">
        <div className="side-progress-head"><span>Seu progresso</span><strong>{state.completedStep}/{steps.length}</strong></div>
        <div className="mini-progress"><span style={{ width: `${completionPercent}%` }} /></div>
        <p>Você pode voltar no seu próprio ritmo.</p>
      </div>
      <div className="side-footer"><LockKeyhole size={13} /> Salvo neste navegador</div>
    </aside>
  );

  const renderBottomNav = () => (
    <nav className="bottom-nav" aria-label="Navegação inferior">
      {navItems.map(item => (
        <button key={item.id} type="button" className={`bottom-link ${view === item.id ? "active" : ""}`} onClick={() => go(item.id)}>
          <span className="bottom-icon">{item.icon}</span>
          <span>{item.shortLabel}</span>
        </button>
      ))}
    </nav>
  );

  const renderHome = () => (
    <div className="view-stack">
      <section className="page-intro home-intro">
        <div>
          <div className="eyebrow"><span className="eyebrow-pulse" /> Um encontro possível para hoje</div>
          <h1>Você pode voltar no seu próprio ritmo.</h1>
          <p className="lead">O Recomeçar Hoje organiza o próximo passo para você retomar a prática devocional sem culpa, sem performance e sem precisar fingir que está tudo bem.</p>
        </div>
        <div className="intro-meta"><span className="meta-icon"><Clock3 size={16} /></span><span><strong>10 min</strong><small>é o encontro completo</small></span></div>
      </section>

      {resumePending && state.completedStep > 0 && !completed ? (
        <section className="gap-banner">
          <div className="gap-icon"><RotateCcw size={19} /></div>
          <div><span className="eyebrow">Encontro em andamento</span><h2>Como você quer seguir?</h2><p>Você pode continuar o encontro que começou ou iniciar um novo momento.</p></div>
          <div className="action-row"><button className="button button-green" type="button" onClick={() => go("encontro")}>Continuar de onde parei <ArrowRight size={16} /></button><button className="text-button-app" type="button" onClick={startNextEncounter}>Começar novamente</button></div>
        </section>
      ) : null}

      <section className="home-grid">
        <article className="next-action-card surface-card">
          <div className="card-topline"><span className="eyebrow">{nextAction.eyebrow}</span><span className="step-badge">{String(Math.min(state.journeyStep + 1, 3)).padStart(2, "0")}/03</span></div>
          <div className="next-action-icon"><Zap size={21} fill="currentColor" /></div>
          <h2>{nextAction.title}</h2>
          <p>{nextAction.copy}</p>
          <button className="button button-green" type="button" onClick={handleNextAction}>{nextAction.button} <ArrowRight size={16} /></button>
          <div className="card-footnote"><ShieldCheck size={14} /> Seu progresso fica salvo sem contagem de dias.</div>
        </article>
        <article className="principles-card surface-card">
          <div className="card-topline"><span className="eyebrow">A regra de hoje</span><span className="quiet-label">01</span></div>
          <h3>Constância não é nunca falhar. É saber voltar.</h3>
          <p>A culpa tenta transformar a volta em uma prova. Aqui, a volta é um encontro curto com um próximo passo claro.</p>
          <div className="principle-list">
            <div><span className="principle-number">01</span><span><strong>Sem pressa</strong><small>Você escolhe quanto cabe hoje.</small></span></div>
            <div><span className="principle-number">02</span><span><strong>Sem fingir</strong><small>Você começa como está.</small></span></div>
            <div><span className="principle-number">03</span><span><strong>Com direção</strong><small>O próximo passo vem pronto.</small></span></div>
          </div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-title-row"><div><span className="eyebrow">Sua sequência</span><h2>Um caminho, não um labirinto.</h2></div><span className="section-caption">{state.journeyStep === 3 ? "caminho concluído" : `${3 - state.journeyStep} passos restantes`}</span></div>
        <div className="journey-list">
          {journeySteps.map((step, index) => {
            const done = index < state.journeyStep;
            const active = index === state.journeyStep;
            const locked = index > state.journeyStep;
            const targetView = index === 2 ? "encontro" : step.view;
            return (
              <button key={step.number} className={`journey-row ${done ? "done" : ""} ${active ? "active" : ""} ${locked ? "locked" : ""}`} type="button" onClick={() => !locked && go(targetView)}>
                <span className="journey-number">{done ? <Check size={15} /> : step.number}</span>
                <span className="journey-icon">{step.icon}</span>
                <span className="journey-copy"><strong>{step.title}</strong><small>{step.description}</small></span>
                <span className="journey-state">{done ? "feito" : active ? "agora" : <LockKeyhole size={14} />}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="insight-card">
        <div className="insight-symbol"><Lightbulb size={22} /></div>
        <div><span className="eyebrow">Para levar com você</span><h3>A fantasia do momento perfeito também atrasa a volta.</h3><p>Você não precisa sentir vontade, ter a rotina certa ou saber exatamente o que dizer. O encontro começa quando você escolhe um passo possível mesmo sem certeza.</p></div>
      </section>

      <section className="theme-panel surface-card">
        <div><span className="eyebrow">Preferência visual</span><h3>Escolha como este espaço conversa com você.</h3><p>A paleta fica salva neste navegador. Você pode trocar quando quiser.</p></div>
        <div className="theme-switcher"><button type="button" className={state.theme === "dark" ? "selected" : ""} onClick={() => toggleTheme("dark")}><Moon size={16} /> Dark</button><button type="button" className={state.theme === "light" ? "selected" : ""} onClick={() => toggleTheme("light")}><Sun size={16} /> Light</button></div>
      </section>
    </div>
  );

  const renderDiagnostic = () => (
    <div className="view-stack">
      <section className="page-intro compact-intro"><button className="back-button" type="button" onClick={() => go("home")}><ArrowLeft size={15} /> Início</button><div className="eyebrow">Passo 01 · Seu ponto de partida</div><h1>Como você chegou até aqui?</h1><p className="lead">Responda sem pensar demais. Não é um teste de disciplina. É só uma forma de tirar a próxima escolha das suas costas.</p></section>
      <div className="flow-progress"><span className="active">01 Ponto de partida</span><span>02 Ritmo</span><span>03 Encontro</span></div>
      <section className="diagnostic-panel surface-card">
        <div className="panel-intro"><span className="panel-number">01</span><div><h2>Primeiro, localize a distância.</h2><p>Escolha a frase que mais se aproxima do que aconteceu, sem usar isso para se julgar.</p></div></div>
        <div className="option-grid four-columns">{distanceOptions.map(option => <button key={option.value} type="button" className={`option-card ${distance === option.value ? "selected" : ""}`} onClick={() => setDistance(option.value)}><span className="option-radio">{distance === option.value ? <Check size={12} /> : null}</span><strong>{option.label}</strong><small>{option.description}</small></button>)}</div>
        <div className="panel-divider" />
        <div className="panel-intro"><span className="panel-number">02</span><div><h2>E o que pesa mais agora?</h2><p>Escolha a dificuldade que você quer que o próximo encontro respeite.</p></div></div>
        <div className="option-grid two-columns">{difficultyOptions.map(option => <button key={option.value} type="button" className={`option-card ${difficulty === option.value ? "selected" : ""}`} onClick={() => setDifficulty(option.value)}><span className="option-radio">{difficulty === option.value ? <Check size={12} /> : null}</span><strong>{option.label}</strong><small>{option.description}</small></button>)}</div>
        {recommended ? <div className="recommendation-card"><div className="recommendation-icon">{protocolDetails[recommended].icon}</div><div><span className="eyebrow">Seu ponto de partida pode ser</span><h3>{protocolDetails[recommended].title}</h3><p>{protocolDetails[recommended].detail}</p></div><button className="button button-green" type="button" onClick={continueFromDiagnostic}>Continuar <ArrowRight size={15} /></button></div> : <div className="panel-hint"><Info size={15} /> Escolha uma opção em cada pergunta para receber uma direção.</div>}
      </section>
      <section className="quiet-callout"><ShieldCheck size={18} /><div><strong>Você não está sendo medido.</strong><p>O melhor retorno é o que cabe no momento em que você está, não o que parece mais disciplinado.</p></div></section>
    </div>
  );

  const renderEncounter = () => {
    if (state.journeyStep === 0) {
      return <div className="view-stack"><section className="page-intro compact-intro"><div className="eyebrow">Passo 02 · Seu próximo encontro</div><h1>Antes do roteiro, escolha o seu ponto de partida.</h1><p className="lead">A sequência foi pensada para você não precisar decidir tudo de uma vez.</p></section><section className="flow-gate surface-card"><div className="gate-icon"><Compass size={23} /></div><div><span className="eyebrow">A ordem importa</span><h2>Comece pelo diagnóstico curto.</h2><p>Ele ajuda o encontro a respeitar o seu momento e evita que você escolha um plano grande demais para hoje.</p><button className="button button-green" type="button" onClick={() => go("diagnostico")}>Ir para ponto de partida <ArrowRight size={16} /></button></div></section></div>;
    }
    return <div className="view-stack">
      <section className="page-intro compact-intro"><button className="back-button" type="button" onClick={() => go("diagnostico")}><ArrowLeft size={15} /> Ponto de partida</button><div className="eyebrow">Passo 02 · Seu encontro</div><h1>Escolha o seu ritmo.</h1><p className="lead">Você não precisa provar que consegue fazer mais. Só precisa escolher uma entrada possível.</p></section>
      <div className="flow-progress"><span className={state.completedStep > 0 ? "done" : "active"}>01 Ler</span><span className={state.completedStep > 1 ? "done" : state.completedStep === 1 ? "active" : "muted"}>02 Meditar</span><span className={state.completedStep >= 3 ? "done active" : state.completedStep === 2 ? "active" : "muted"}>03 Orar</span></div>
      <section className="level-section"><div className="section-title-row"><div><span className="eyebrow">Escolha de agora</span><h2>Quanto cabe no seu momento?</h2></div><span className="section-caption">{state.journeyStep >= 2 ? "roteiro liberado" : "selecione um ritmo"}</span></div><div className="level-grid-app"><button type="button" className={`level-app-card ${state.level === "2" ? "selected" : ""}`} onClick={() => chooseLevel("2")}><span className="level-app-icon"><Zap size={19} /></span><span className="level-app-time">02 min</span><strong>Tenho 2 minutos</strong><small>Uma oração de chegada. O menor passo possível.</small></button><button type="button" className={`level-app-card ${state.level === "10" ? "selected" : ""}`} onClick={() => chooseLevel("10")}><span className="level-app-icon"><Clock3 size={19} /></span><span className="level-app-time">10 min</span><strong>Tenho 10 minutos</strong><small>Passagem, reflexão e oração em um encontro guiado.</small></button><button type="button" className={`level-app-card ${state.level === "calma" ? "selected" : ""}`} onClick={() => chooseLevel("calma")}><span className="level-app-icon"><Leaf size={19} /></span><span className="level-app-time">RITMO CALMO</span><strong>Quero continuar com mais calma</strong><small>Reflexão ampliada e acesso ao próximo encontro.</small></button></div></section>
      {state.journeyStep >= 2 ? <section className="route-panel surface-card"><div className="route-header-app"><div><span className="eyebrow">Passo 03 · Encontro guiado</span><h2>{completed ? "Você concluiu o encontro." : "Um encontro no seu ritmo."}</h2><p>{completed ? "A próxima decisão pode ser pequena também." : `${protocolDetails[state.protocol].title} · ${state.level === "2" ? "2 minutos" : state.level === "calma" ? "ritmo calmo" : "10 minutos"}`}</p></div><div className="percent-badge"><strong>{completionPercent}%</strong><small>{state.completedStep} de {steps.length}</small></div></div><div className="route-progress"><span style={{ width: `${completionPercent}%` }} /></div><div className="step-tabs">{steps.map((step, index) => <div key={`${step.title}-${index}`} className={`step-tab ${index < state.completedStep ? "done" : index === currentIndex && !completed ? "active" : ""}`}><span>{index < state.completedStep ? <Check size={12} /> : index + 1}</span><small>{step.eyebrow}</small></div>)}</div>{completed ? <div className="completion-panel"><div className="completion-check"><Check size={23} /></div><div><span className="eyebrow">Encontro concluído</span><h2>Você voltou hoje.</h2><p>Você escolheu estar presente neste momento.</p><div className="identity-quote">“Eu posso seguir em frente, um passo de cada vez.”<small>Inspirado em Filipenses 3:13–14</small></div><div className="action-row"><button className="button button-green" type="button" onClick={closeEncounter}>Fechar encontro <ArrowRight size={16} /></button></div><p className="step-prompt-app">Se desejar permanecer mais um pouco, você pode iniciar outro encontro. O encontro de hoje já foi concluído.</p><button className="text-button-app" type="button" onClick={startNextEncounter}>Iniciar outro encontro</button></div></div> : <div className="active-step-card"><div className="active-step-icon"><BookOpen size={22} /></div><div className="active-step-main"><div className="step-meta"><span>{steps[currentIndex].time}</span><span>Agora</span></div><h2>{steps[currentIndex].title}</h2><p className="step-prompt-app">{steps[currentIndex].prompt}</p>{currentIndex === 0 ? renderBibleCard() : null}<div className="passage-block"><span>Para este momento</span><p>{steps[currentIndex].passage}</p></div><div className="step-details"><div><span>Faça assim</span><p>{steps[currentIndex].focus}</p></div><div><span>Por que ajuda</span><p>{steps[currentIndex].why}</p></div></div><button className="button button-green" type="button" onClick={completeCurrentStep}>{steps[currentIndex].action} <Check size={16} /></button></div></div>}<div className="route-footnote"><LockKeyhole size={14} /> Salvo neste navegador. Se sair agora, você volta exatamente daqui.</div></section> : null}
    </div>;
  };

  const renderSupport = () => (
    <div className="view-stack">
      <section className="page-intro compact-intro"><div className="eyebrow">Apoio · quando a escolha pesar</div><h1>Você não precisa descobrir tudo sozinho.</h1><p className="lead">Use esta área quando não souber qual porta abrir. Escolha pelo que está mais verdadeiro hoje, não pelo que parece mais espiritual.</p></section>
      <section className="section-block"><div className="section-title-row"><div><span className="eyebrow">Quatro portas de entrada</span><h2>Escolha pelo seu momento.</h2></div><span className="section-caption">toque para começar</span></div><div className="protocol-app-grid">{(Object.keys(protocolDetails) as Protocol[]).map(protocol => { const item = protocolDetails[protocol]; return <button key={protocol} type="button" className={`protocol-app-card ${state.protocol === protocol ? "selected" : ""}`} onClick={() => chooseProtocol(protocol)}><span className="protocol-app-icon">{item.icon}</span><span className="protocol-app-label">{item.label}</span><strong>{item.title}</strong><small>{item.description}</small><p>{item.detail}</p><span className="protocol-app-arrow"><ArrowRight size={15} /></span></button>; })}</div></section>
      <section className="troubleshooter-panel surface-card"><div className="section-title-row"><div><span className="eyebrow">Troubleshooter</span><h2>O que está travando seu retorno?</h2></div><CircleHelp size={22} className="heading-icon" /></div><p className="section-lead">Abra só a situação que parece com a sua. A resposta é curta de propósito, e sempre aponta para uma próxima ação.</p><div className="accordion-list-app">{troubleItems.map((item, index) => <div key={item.title} className={`accordion-app ${openTrouble === index ? "open" : ""}`}><button type="button" className="accordion-trigger-app" onClick={() => setOpenTrouble(openTrouble === index ? null : index)}><span>{item.title}</span><ChevronDown size={17} /></button>{openTrouble === index ? <div className="accordion-answer"><p>{item.answer}</p><button type="button" className="inline-action" onClick={() => chooseProtocol(item.protocol)}>{item.action} <ArrowRight size={14} /></button></div> : null}</div>)}</div></section>
      <section className="quiet-callout"><Lightbulb size={18} /><div><strong>Uma regra simples.</strong><p>Se uma opção aumentar a culpa, ela não é o próximo passo certo para hoje.</p></div></section>
      <section className="care-note"><ShieldCheck size={17} /><p>Recomeçar Hoje é uma ferramenta de apoio à prática devocional. Não substitui acompanhamento pastoral, psicológico ou médico. Use com liberdade e interrompa se alguma parte não fizer sentido para o seu momento.</p></section>
    </div>
  );

  return <div className={`app-shell theme-${state.theme}`}><div className="ambient-glow" />{renderHeader()}<div className="app-frame">{renderSidebar()}<main className="app-main">{view === "home" ? renderHome() : view === "diagnostico" ? renderDiagnostic() : view === "encontro" ? renderEncounter() : renderSupport()}</main></div>{renderBottomNav()}<footer className="app-footer"><span><Leaf size={14} /> Recomeçar Hoje</span><span>Feito para você voltar no seu próprio ritmo.</span></footer>{notice ? <div className="toast-app"><Check size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={14} /></button></div> : null}</div>;
}
