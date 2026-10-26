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

type Protocol = "alivio" | "mapa" | "constrangimento" | "proximo";
type Distance = "dias" | "semanas" | "meses" | "fe";
type Difficulty = "sobrecarregado" | "direcao" | "vergonha" | "desistencia";
type Level = "2" | "10" | "calma";
type Theme = "dark" | "light";
type View = "home" | "diagnostico" | "encontro" | "apoio" | "rito";

type AppState = {
  level: Level;
  completedStep: number;
  lastVisitedAt: number;
  protocol: Protocol;
  journeyStep: number;
  theme: Theme;
};

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

const STORAGE_KEY = "recomecar-hoje-app-v2";

const navItems: { id: View; label: string; shortLabel: string; icon: ReactNode }[] = [
  { id: "home", label: "Início", shortLabel: "Hoje", icon: <HomeIcon size={18} /> },
  { id: "diagnostico", label: "Ponto de partida", shortLabel: "Começar", icon: <Compass size={18} /> },
  { id: "encontro", label: "Meu encontro", shortLabel: "Encontro", icon: <BookOpen size={18} /> },
  { id: "apoio", label: "Apoio", shortLabel: "Apoio", icon: <CircleHelp size={18} /> },
  { id: "rito", label: "Rito de retorno", shortLabel: "Rito", icon: <RotateCcw size={18} /> },
];

const journeySteps: { number: string; title: string; description: string; view: View; icon: ReactNode }[] = [
  { number: "01", title: "Ponto de partida", description: "Entenda o que você precisa agora.", view: "diagnostico", icon: <Compass size={18} /> },
  { number: "02", title: "Ritmo de agora", description: "Escolha o tempo que você realmente tem.", view: "encontro", icon: <Timer size={18} /> },
  { number: "03", title: "Encontro guiado", description: "Leia, reflita e faça sua oração possível.", view: "encontro", icon: <BookOpen size={18} /> },
  { number: "04", title: "Próximo passo", description: "Saia sabendo como continuar.", view: "rito", icon: <Route size={18} /> },
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
    detail: "Um caminho claro para voltar ao texto sem tentar reconstruir todos os dias perdidos.",
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
  { value: "semanas", label: "Algumas semanas", description: "A volta já começou a ficar distante." },
  { value: "meses", label: "Meses ou mais", description: "Você quer voltar sem recomeçar do zero." },
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
    title: "Fiquei semanas sem abrir a Bíblia e agora não sei por onde começar",
    answer: "Você não precisa voltar ao primeiro dia. Abra uma passagem curta, observe o que toca seu momento atual e pare antes de transformar a volta em um plano impossível.",
    protocol: "mapa",
    action: "Abrir Mapa do Retorno",
  },
  {
    title: "Comecei um plano, parei e agora sinto que estraguei tudo",
    answer: "Um plano interrompido não vira dívida. O que ficou para trás pode ficar para trás. O encontro de hoje começa pelo texto que cabe no seu momento, não pela página que você perdeu.",
    protocol: "mapa",
    action: "Começar sem recuperar",
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
    answer: "Você pode fazer apenas o começo. Dois minutos já diminuem a distância e não criam uma obrigação de continuar quando o seu dia não comporta isso.",
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

function defaultState(): AppState {
  return { level: "10", completedStep: 0, lastVisitedAt: Date.now(), protocol: "mapa", journeyStep: 0, theme: "dark" };
}

function readState(): AppState {
  const fallback = defaultState();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      level: parsed.level === "2" || parsed.level === "10" || parsed.level === "calma" ? parsed.level : fallback.level,
      completedStep: typeof parsed.completedStep === "number" ? Math.max(0, parsed.completedStep) : 0,
      lastVisitedAt: typeof parsed.lastVisitedAt === "number" ? parsed.lastVisitedAt : fallback.lastVisitedAt,
      protocol: parsed.protocol === "alivio" || parsed.protocol === "mapa" || parsed.protocol === "constrangimento" || parsed.protocol === "proximo" ? parsed.protocol : fallback.protocol,
      journeyStep: typeof parsed.journeyStep === "number" ? Math.max(0, Math.min(3, parsed.journeyStep)) : 0,
      theme: parsed.theme === "light" ? "light" : "dark",
    };
  } catch {
    return fallback;
  }
}

function getRecommendedProtocol(distance?: Distance, difficulty?: Difficulty): Protocol | null {
  if (!distance || !difficulty) return null;
  if (difficulty === "sobrecarregado") return "alivio";
  if (difficulty === "vergonha" || difficulty === "desistencia") return "constrangimento";
  if (difficulty === "direcao") return distance === "dias" ? "proximo" : "mapa";
  return distance === "dias" || distance === "fe" ? "proximo" : "mapa";
}

function getSteps(level: Level, protocol: Protocol): RouteStep[] {
  if (level === "2") {
    return [{
      time: "2 min",
      eyebrow: "Modo Alívio",
      title: "Faça uma oração de chegada",
      prompt: "Diga uma frase verdadeira sobre como você chegou hoje.",
      passage: "Você pode começar assim: “Deus, eu estou aqui, mesmo sem saber por onde começar.”",
      focus: "Não procure a frase perfeita. Apenas nomeie a sua presença.",
      why: "Um começo pequeno reduz a pressão e torna a volta possível sem criar outra cobrança.",
      action: "Fazer minha oração",
    }];
  }
  if (level === "calma") {
    return [
      {
        time: "5 min",
        eyebrow: "Passagem",
        title: "Leia Salmo 23:1-3",
        prompt: "Leia devagar, sem tentar recuperar o que ficou para trás.",
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
        passage: "Quando terminar, abra o Próximo Encontro ou continue outro dia. A volta não precisa virar cobrança.",
        focus: "Termine com uma frase que você consegue sustentar hoje.",
        why: "O encontro acaba com direção, não com a sensação de que outra tarefa ficou pendente.",
        action: "Concluir encontro",
      },
    ];
  }
  const firstTitle = protocol === "mapa" ? "Abra pelo seu momento" : protocol === "constrangimento" ? "Volte sem explicar sua ausência" : protocol === "proximo" ? "Continue pelo próximo trecho" : "Leia Salmo 23:1-3";
  const firstPrompt = protocol === "mapa" ? "Leia Salmo 23:1-3 sem procurar o primeiro dia perdido." : protocol === "constrangimento" ? "Leia lembrando que você não precisa provar nada para voltar." : protocol === "proximo" ? "Leia como o próximo passo, não como uma dívida antiga." : "Leia a passagem indicada sem tentar recuperar dias perdidos.";
  const firstPassage = protocol === "mapa" ? "Observe uma palavra ou imagem que encontre o seu momento de hoje." : protocol === "constrangimento" ? "Você pode chegar como está. Não precisa transformar a ausência em explicação." : protocol === "proximo" ? "Observe uma palavra que possa acompanhar o seu próximo encontro." : "Observe uma palavra ou imagem que encontre o seu momento de hoje.";
  return [
    { time: "3 min", eyebrow: protocolDetails[protocol].title, title: firstTitle, prompt: firstPrompt, passage: firstPassage, focus: "Leia para encontrar um ponto de contato, não para terminar uma obrigação.", why: "A primeira passagem devolve um lugar claro para começar.", action: "Concluir passagem" },
    { time: "5 min", eyebrow: "Reflexão", title: "Nomeie o que pesa", prompt: "O que em você precisa de descanso, direção ou coragem hoje?", passage: "Responda em uma frase. O objetivo é estar presente, não produzir uma reflexão perfeita.", focus: "Se ajudar, complete: “Hoje eu preciso de...”", why: "A reflexão transforma uma sensação difusa em algo que pode ser levado para a oração.", action: "Concluir reflexão" },
    { time: "2 min", eyebrow: "Oração possível", title: "Fale com Deus em uma frase", prompt: "Use suas próprias palavras ou comece com: “Deus, me ajude a voltar sem medo.”", passage: "Quando terminar, você voltou. Isso importa mais do que os dias em que ficou longe.", focus: "Não prometa constância. Apenas entregue o que é verdadeiro agora.", why: "O encontro termina com uma volta possível, não com uma meta difícil de manter.", action: "Concluir encontro" },
  ];
}

export default function Home() {
  const [state, setState] = useState<AppState>(() => readState());
  const [view, setView] = useState<View>("home");
  const [distance, setDistance] = useState<Distance>();
  const [difficulty, setDifficulty] = useState<Difficulty>();
  const [openTrouble, setOpenTrouble] = useState<number | null>(null);
  const [ritualChoice, setRitualChoice] = useState<"recover" | "return" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const steps = useMemo(() => getSteps(state.level, state.protocol), [state.level, state.protocol]);
  const completed = state.completedStep >= steps.length;
  const currentIndex = Math.min(state.completedStep, Math.max(steps.length - 1, 0));
  const completionPercent = Math.min(100, Math.round((state.completedStep / steps.length) * 100));
  const recommended = getRecommendedProtocol(distance, difficulty);
  const isReturningAfterGap = state.completedStep > 0 && !completed && Date.now() - state.lastVisitedAt > 36 * 60 * 60 * 1000;
  const nextAction = state.journeyStep === 0
    ? { eyebrow: "Passo 01", title: "Escolha seu ponto de partida", copy: "Duas respostas rápidas para tirar a escolha das suas costas.", button: "Começar agora", view: "diagnostico" as View }
    : state.journeyStep === 1
      ? { eyebrow: "Passo 02", title: "Escolha o ritmo de agora", copy: "Não escolha o que gostaria de conseguir. Escolha o tempo que realmente tem.", button: "Escolher meu ritmo", view: "encontro" as View }
      : state.journeyStep === 2
        ? { eyebrow: "Passo 03", title: completed ? "Seu encontro está concluído" : "Continue o encontro daqui", copy: completed ? "Você já voltou. Agora escolha como seguir." : `${steps[currentIndex]?.title ?? "Próximo passo"}. O conteúdo está pronto para você.`, button: completed ? "Ver próximo passo" : "Continuar encontro", view: completed ? "rito" as View : "encontro" as View }
        : { eyebrow: "Passo 04", title: "Você não precisa voltar sozinho", copy: "O próximo encontro já está organizado para quando você quiser continuar.", button: "Abrir próximo passo", view: "rito" as View };

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

  const go = (nextView: View) => setView(nextView);

  const continueFromDiagnostic = () => {
    if (!recommended) return;
    setState(current => ({ ...current, protocol: recommended, journeyStep: Math.max(current.journeyStep, 1), lastVisitedAt: Date.now() }));
    setNotice(`${protocolDetails[recommended].title} escolhido como ponto de partida.`);
    go("encontro");
  };

  const chooseLevel = (level: Level) => {
    const protocol = level === "2" ? "alivio" : state.protocol === "alivio" ? "mapa" : state.protocol;
    setState(current => ({ ...current, level, protocol, completedStep: 0, journeyStep: 2, lastVisitedAt: Date.now() }));
    setNotice(level === "2" ? "Seu encontro de 2 minutos está pronto." : level === "10" ? "Seu encontro de 10 minutos está pronto." : "Seu ritmo calmo está pronto.");
  };

  const completeCurrentStep = () => {
    const nextCount = Math.min(state.completedStep + 1, steps.length);
    setState(current => ({ ...current, completedStep: nextCount, journeyStep: nextCount >= steps.length ? 3 : 2, lastVisitedAt: Date.now() }));
    setNotice(nextCount >= steps.length ? "Encontro concluído. Você voltou hoje." : "Etapa concluída. O próximo passo já está aberto.");
  };

  const startNextEncounter = () => {
    setState(current => ({ ...current, completedStep: 0, journeyStep: 2, lastVisitedAt: Date.now() }));
    setRitualChoice("return");
    setNotice("Novo encontro pronto. Você não precisa recuperar nenhum dia.");
    go("encontro");
  };

  const chooseProtocol = (protocol: Protocol) => {
    const level = protocol === "alivio" ? "2" : state.level === "2" ? "10" : state.level;
    setState(current => ({ ...current, protocol, level, journeyStep: Math.max(current.journeyStep, 1), completedStep: 0, lastVisitedAt: Date.now() }));
    setNotice(`${protocolDetails[protocol].title} selecionado.`);
    go("encontro");
  };

  const toggleTheme = (nextTheme: Theme) => {
    setState(current => ({ ...current, theme: nextTheme }));
    setNotice(nextTheme === "dark" ? "Tema escuro ativado." : "Tema claro ativado.");
  };

  const renderHeader = () => (
    <header className="app-header">
      <div className="header-inner">
        <button className="brand" type="button" onClick={() => go("home")} aria-label="Voltar ao início">
          <span className="brand-mark"><Leaf size={17} strokeWidth={2.4} /></span>
          <span className="brand-name">Recomeçar Hoje</span>
        </button>
        <div className="header-context">
          <span className="live-dot" />
          {completed ? "Encontro concluído" : state.journeyStep === 0 ? "Um passo de cada vez" : `Passo ${String(Math.min(state.journeyStep + 1, 4)).padStart(2, "0")} de 04`}
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
        <div className="side-progress-head"><span>Seu progresso</span><strong>{state.journeyStep}/4</strong></div>
        <div className="mini-progress"><span style={{ width: `${(state.journeyStep / 4) * 100}%` }} /></div>
        <p>Sem cobrança. O ponto é saber voltar.</p>
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
          <h1>Volte sem pagar os dias perdidos.</h1>
          <p className="lead">O Recomeçar Hoje organiza o próximo passo para você retomar a prática devocional sem culpa, sem performance e sem precisar fingir que está tudo bem.</p>
        </div>
        <div className="intro-meta"><span className="meta-icon"><Clock3 size={16} /></span><span><strong>10 min</strong><small>é o encontro completo</small></span></div>
      </section>

      {isReturningAfterGap ? (
        <section className="gap-banner">
          <div className="gap-icon"><RotateCcw size={19} /></div>
          <div><span className="eyebrow">Você voltou</span><h2>Não tente recuperar tudo agora.</h2><p>Abra o Rito de Recomeço para escolher com clareza entre pagar os dias perdidos e voltar ao próximo encontro.</p></div>
          <button className="button button-green" type="button" onClick={() => go("rito")}>Abrir rito <ArrowRight size={16} /></button>
        </section>
      ) : null}

      <section className="home-grid">
        <article className="next-action-card surface-card">
          <div className="card-topline"><span className="eyebrow">{nextAction.eyebrow}</span><span className="step-badge">{String(Math.min(state.journeyStep + 1, 4)).padStart(2, "0")}/04</span></div>
          <div className="next-action-icon"><Zap size={21} fill="currentColor" /></div>
          <h2>{nextAction.title}</h2>
          <p>{nextAction.copy}</p>
          <button className="button button-green" type="button" onClick={() => go(nextAction.view)}>{nextAction.button} <ArrowRight size={16} /></button>
          <div className="card-footnote"><ShieldCheck size={14} /> Seu progresso fica salvo sem contagem de dias.</div>
        </article>
        <article className="principles-card surface-card">
          <div className="card-topline"><span className="eyebrow">A regra de hoje</span><span className="quiet-label">01</span></div>
          <h3>Constância não é nunca falhar. É saber voltar.</h3>
          <p>A culpa tenta transformar a volta em uma prova. Aqui, a volta é um encontro curto com um próximo passo claro.</p>
          <div className="principle-list">
            <div><span className="principle-number">01</span><span><strong>Sem recuperar</strong><small>O passado não é uma tarefa.</small></span></div>
            <div><span className="principle-number">02</span><span><strong>Sem fingir</strong><small>Você começa como está.</small></span></div>
            <div><span className="principle-number">03</span><span><strong>Com direção</strong><small>O próximo passo vem pronto.</small></span></div>
          </div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-title-row"><div><span className="eyebrow">Sua sequência</span><h2>Um caminho, não um labirinto.</h2></div><span className="section-caption">{state.journeyStep === 3 ? "caminho concluído" : `${4 - state.journeyStep} passos restantes`}</span></div>
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
      <div className="flow-progress"><span className="active">01 Ponto de partida</span><span>02 Ritmo</span><span>03 Encontro</span><span>04 Próximo passo</span></div>
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
      <div className="flow-progress"><span className="done">01 Ponto de partida</span><span className={state.journeyStep >= 2 ? "active" : "active"}>02 Ritmo</span><span className={state.journeyStep >= 2 ? "active" : "muted"}>03 Encontro</span><span className={state.journeyStep === 3 ? "active" : "muted"}>04 Próximo passo</span></div>
      <section className="level-section"><div className="section-title-row"><div><span className="eyebrow">Escolha de agora</span><h2>Quanto cabe no seu momento?</h2></div><span className="section-caption">{state.journeyStep >= 2 ? "roteiro liberado" : "selecione um ritmo"}</span></div><div className="level-grid-app"><button type="button" className={`level-app-card ${state.level === "2" ? "selected" : ""}`} onClick={() => chooseLevel("2")}><span className="level-app-icon"><Zap size={19} /></span><span className="level-app-time">02 min</span><strong>Tenho 2 minutos</strong><small>Uma oração de chegada. O menor passo possível.</small></button><button type="button" className={`level-app-card ${state.level === "10" ? "selected" : ""}`} onClick={() => chooseLevel("10")}><span className="level-app-icon"><Clock3 size={19} /></span><span className="level-app-time">10 min</span><strong>Tenho 10 minutos</strong><small>Passagem, reflexão e oração em um encontro guiado.</small></button><button type="button" className={`level-app-card ${state.level === "calma" ? "selected" : ""}`} onClick={() => chooseLevel("calma")}><span className="level-app-icon"><Leaf size={19} /></span><span className="level-app-time">RITMO CALMO</span><strong>Quero continuar com mais calma</strong><small>Reflexão ampliada e acesso ao próximo encontro.</small></button></div></section>
      {state.journeyStep >= 2 ? <section className="route-panel surface-card"><div className="route-header-app"><div><span className="eyebrow">Passo 03 · Encontro guiado</span><h2>{completed ? "Você concluiu o encontro." : "Um encontro sem dívida."}</h2><p>{completed ? "A próxima decisão pode ser pequena também." : `${protocolDetails[state.protocol].title} · ${state.level === "2" ? "2 minutos" : state.level === "calma" ? "ritmo calmo" : "10 minutos"}`}</p></div><div className="percent-badge"><strong>{completionPercent}%</strong><small>{state.completedStep} de {steps.length}</small></div></div><div className="route-progress"><span style={{ width: `${completionPercent}%` }} /></div><div className="step-tabs">{steps.map((step, index) => <div key={`${step.title}-${index}`} className={`step-tab ${index < state.completedStep ? "done" : index === currentIndex && !completed ? "active" : ""}`}><span>{index < state.completedStep ? <Check size={12} /> : index + 1}</span><small>{step.eyebrow}</small></div>)}</div>{completed ? <div className="completion-panel"><div className="completion-check"><Check size={23} /></div><div><span className="eyebrow">Encontro concluído</span><h2>Você voltou hoje.</h2><p>Não porque recuperou o que ficou para trás, mas porque escolheu estar presente no próximo passo.</p><div className="identity-quote">“Eu posso voltar sem pagar os dias perdidos.”</div><div className="action-row"><button className="button button-green" type="button" onClick={() => go("rito")}>Ver próximo passo <ArrowRight size={16} /></button><button className="text-button-app" type="button" onClick={() => setNotice("Tudo bem. Você pode continuar quando quiser.")}>Continuar outro dia</button></div></div></div> : <div className="active-step-card"><div className="active-step-icon"><BookOpen size={22} /></div><div className="active-step-main"><div className="step-meta"><span>{steps[currentIndex].time}</span><span>Agora</span></div><h2>{steps[currentIndex].title}</h2><p className="step-prompt-app">{steps[currentIndex].prompt}</p><div className="passage-block"><span>Para este momento</span><p>{steps[currentIndex].passage}</p></div><div className="step-details"><div><span>Faça assim</span><p>{steps[currentIndex].focus}</p></div><div><span>Por que ajuda</span><p>{steps[currentIndex].why}</p></div></div><button className="button button-green" type="button" onClick={completeCurrentStep}>{steps[currentIndex].action} <Check size={16} /></button></div></div>}<div className="route-footnote"><LockKeyhole size={14} /> Salvo neste navegador. Se sair agora, você volta exatamente daqui.</div></section> : null}
    </div>;
  };

  const renderSupport = () => (
    <div className="view-stack">
      <section className="page-intro compact-intro"><div className="eyebrow">Apoio · quando a escolha pesar</div><h1>Você não precisa descobrir tudo sozinho.</h1><p className="lead">Use esta área quando não souber qual porta abrir. Escolha pelo que está mais verdadeiro hoje, não pelo que parece mais espiritual.</p></section>
      <section className="section-block"><div className="section-title-row"><div><span className="eyebrow">Quatro portas de entrada</span><h2>Escolha pelo seu momento.</h2></div><span className="section-caption">toque para começar</span></div><div className="protocol-app-grid">{(Object.keys(protocolDetails) as Protocol[]).map(protocol => { const item = protocolDetails[protocol]; return <button key={protocol} type="button" className={`protocol-app-card ${state.protocol === protocol ? "selected" : ""}`} onClick={() => chooseProtocol(protocol)}><span className="protocol-app-icon">{item.icon}</span><span className="protocol-app-label">{item.label}</span><strong>{item.title}</strong><small>{item.description}</small><p>{item.detail}</p><span className="protocol-app-arrow"><ArrowRight size={15} /></span></button>; })}</div></section>
      <section className="troubleshooter-panel surface-card"><div className="section-title-row"><div><span className="eyebrow">Troubleshooter</span><h2>O que está travando seu retorno?</h2></div><CircleHelp size={22} className="heading-icon" /></div><p className="section-lead">Abra só a situação que parece com a sua. A resposta é curta de propósito, e sempre aponta para uma próxima ação.</p><div className="accordion-list-app">{troubleItems.map((item, index) => <div key={item.title} className={`accordion-app ${openTrouble === index ? "open" : ""}`}><button type="button" className="accordion-trigger-app" onClick={() => setOpenTrouble(openTrouble === index ? null : index)}><span>{item.title}</span><ChevronDown size={17} /></button>{openTrouble === index ? <div className="accordion-answer"><p>{item.answer}</p><button type="button" className="inline-action" onClick={() => chooseProtocol(item.protocol)}>{item.action} <ArrowRight size={14} /></button></div> : null}</div>)}</div></section>
      <section className="quiet-callout"><Lightbulb size={18} /><div><strong>Uma regra simples.</strong><p>Se uma opção aumentar a culpa, ela não é o próximo passo certo para hoje.</p></div></section>
    </div>
  );

  const renderRitual = () => (
    <div className="view-stack">
      <section className="page-intro compact-intro"><button className="back-button" type="button" onClick={() => go("home")}><ArrowLeft size={15} /> Início</button><div className="eyebrow">Passo 04 · Rito de Recomeço</div><h1>Você vai tentar pagar os dias perdidos ou voltar para o próximo encontro?</h1><p className="lead">Quando a culpa aparecer, não deixe que ela escolha por você. Veja as duas rotas com clareza e escolha a que devolve movimento.</p></section>
      <div className="flow-progress"><span className={state.journeyStep > 0 ? "done" : ""}>01 Ponto de partida</span><span className={state.journeyStep > 1 ? "done" : ""}>02 Ritmo</span><span className={state.journeyStep > 2 ? "done" : ""}>03 Encontro</span><span className="active">04 Próximo passo</span></div>
      <section className="ritual-choice-grid-app"><button type="button" className={`ritual-app-card recovery ${ritualChoice === "recover" ? "selected" : ""}`} onClick={() => setRitualChoice("recover")}><span className="ritual-number">A</span><span className="eyebrow">A rota da dívida</span><h2>Tentar recuperar os dias perdidos</h2><p>Você volta para o calendário, calcula o atraso e transforma a prática em uma prova de que consegue compensar.</p><span className="ritual-result"><X size={15} /> aumenta o peso antes de começar</span></button><button type="button" className={`ritual-app-card return ${ritualChoice === "return" ? "selected" : ""}`} onClick={() => setRitualChoice("return")}><span className="ritual-number">B</span><span className="eyebrow">A rota do encontro</span><h2>Voltar para o próximo encontro</h2><p>Você deixa os dias perdidos onde estão e abre uma passagem, uma pergunta e uma oração que cabem em hoje.</p><span className="ritual-result"><Check size={15} /> devolve direção sem punição</span></button></section>
      {ritualChoice === "recover" ? <div className="ritual-feedback negative"><strong>Perceba o que acontece.</strong><span>Recuperar parece responsável, mas mantém você preso ao primeiro dia que não aconteceu. O retorno não precisa começar ali.</span><button className="button button-outline" type="button" onClick={() => setRitualChoice("return")}>Escolher o próximo encontro <ArrowRight size={15} /></button></div> : null}
      {ritualChoice === "return" ? <div className="ritual-feedback positive"><strong>É por aqui.</strong><span>Você não precisa recuperar nada para continuar. Um próximo encontro já é uma forma real de voltar.</span><button className="button button-green" type="button" onClick={startNextEncounter}>Abrir próximo encontro <ArrowRight size={15} /></button></div> : null}
      <section className="remember-grid"><div><span className="remember-number">01</span><strong>Chegue como está.</strong><p>Não espere a vergonha passar para começar.</p></div><div><span className="remember-number">02</span><strong>Faça o que cabe.</strong><p>O encontro certo é o que você consegue sustentar agora.</p></div><div><span className="remember-number">03</span><strong>Saiba como seguir.</strong><p>O próximo passo deve estar claro antes de você sair.</p></div></section>
      <section className="care-note"><ShieldCheck size={17} /><p>Recomeçar Hoje é uma ferramenta de apoio à prática devocional. Não substitui acompanhamento pastoral, psicológico ou médico. Use com liberdade e interrompa se alguma parte não fizer sentido para o seu momento.</p></section>
    </div>
  );

  return <div className={`app-shell theme-${state.theme}`}><div className="ambient-glow" />{renderHeader()}<div className="app-frame">{renderSidebar()}<main className="app-main">{view === "home" ? renderHome() : view === "diagnostico" ? renderDiagnostic() : view === "encontro" ? renderEncounter() : view === "apoio" ? renderSupport() : renderRitual()}</main></div>{renderBottomNav()}<footer className="app-footer"><span><Leaf size={14} /> Recomeçar Hoje</span><span>Feito para voltar sem pagar os dias perdidos.</span></footer>{notice ? <div className="toast-app"><Check size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={14} /></button></div> : null}</div>;
}
