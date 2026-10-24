import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Compass,
  HeartHandshake,
  Leaf,
  LockKeyhole,
  Moon,
  RotateCcw,
  Route,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";

type Protocol = "alivio" | "mapa" | "constrangimento" | "proximo";
type Distance = "dias" | "semanas" | "meses" | "fe";
type Difficulty = "sobrecarregado" | "direcao" | "vergonha" | "desistencia";
type Level = "2" | "10" | "calma";

type ProgressState = {
  level: Level;
  completedStep: number;
  lastVisitedAt: number;
  protocol: Protocol;
};

const STORAGE_KEY = "recomecar-hoje-progress-v1";
const sections = [
  { id: "diagnostico", label: "Seu ponto de partida" },
  { id: "roteiro", label: "Roteiro" },
  { id: "travas", label: "Se travar" },
  { id: "rito", label: "Rito de retorno" },
];

const protocolDetails: Record<
  Protocol,
  { title: string; description: string; icon: React.ReactNode; label: string }
> = {
  alivio: {
    title: "Modo Alívio",
    description: "Para quando até abrir a Bíblia parece pesado. Um começo mínimo ainda é um começo.",
    icon: <Sparkles size={20} strokeWidth={1.8} />,
    label: "começo mínimo",
  },
  mapa: {
    title: "Mapa do Retorno",
    description: "Para quem está distante e não sabe por onde abrir. Você não precisa voltar ao primeiro dia.",
    icon: <Compass size={20} strokeWidth={1.8} />,
    label: "ponto de partida",
  },
  constrangimento: {
    title: "Volta sem Constrangimento",
    description: "Para quem parou e está evitando voltar. Você não precisa justificar a ausência para recomeçar.",
    icon: <HeartHandshake size={20} strokeWidth={1.8} />,
    label: "retorno leve",
  },
  proximo: {
    title: "Próximo Encontro",
    description: "Para quem terminou uma sessão e não sabe o que vem depois. O próximo passo já vem pronto.",
    icon: <Route size={20} strokeWidth={1.8} />,
    label: "continuidade",
  },
};

const distanceOptions: { value: Distance; label: string }[] = [
  { value: "dias", label: "Poucos dias" },
  { value: "semanas", label: "Algumas semanas" },
  { value: "meses", label: "Meses ou mais" },
  { value: "fe", label: "Estou recomeçando na fé" },
];

const difficultyOptions: { value: Difficulty; label: string }[] = [
  { value: "sobrecarregado", label: "Estou sobrecarregado" },
  { value: "direcao", label: "Não sei por onde começar" },
  { value: "vergonha", label: "Sinto vergonha de ter parado" },
  { value: "desistencia", label: "Já tentei e desisti" },
];

const troubleItems: {
  title: string;
  answer: string;
  protocol: Protocol;
}[] = [
  {
    title: "Fiquei semanas sem abrir a Bíblia e agora não sei por onde começar",
    answer: "Comece pelo Mapa do Retorno. Você não precisa voltar ao primeiro dia nem reconstruir toda a rotina. Escolha o encontro possível para o seu momento atual.",
    protocol: "mapa",
  },
  {
    title: "Comecei um plano, parei e agora sinto que estraguei tudo",
    answer: "Você não estragou tudo. Um plano interrompido não vira dívida. Abra um novo encontro e siga a partir de hoje.",
    protocol: "mapa",
  },
  {
    title: "Tenho vontade de voltar, mas estou me sentindo constrangido",
    answer: "Use a Volta sem Constrangimento. Você não precisa explicar sua ausência, provar constância ou fingir que está tudo bem para começar.",
    protocol: "constrangimento",
  },
  {
    title: "Não consigo fazer uma oração longa",
    answer: "Use o Modo Alívio. Uma frase honesta já pode ser a oração possível de hoje.",
    protocol: "alivio",
  },
  {
    title: "Tenho só alguns minutos e não quero iniciar algo que não vou terminar",
    answer: "Escolha Tenho 2 minutos. O primeiro passo foi feito para caber num dia corrido, sem abrir uma obrigação que você não consegue sustentar.",
    protocol: "alivio",
  },
  {
    title: "Terminei o encontro, mas não sei qual é o próximo passo",
    answer: "Abra o Próximo Encontro. Você recebe uma nova passagem, uma pergunta de reflexão e uma oração possível, sem precisar procurar outro plano.",
    protocol: "proximo",
  },
];

function readSavedProgress(): ProgressState {
  const fallback: ProgressState = { level: "10", completedStep: 0, lastVisitedAt: Date.now(), protocol: "mapa" };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    if (!parsed.level || typeof parsed.completedStep !== "number") return fallback;
    return {
      level: parsed.level,
      completedStep: Math.max(0, parsed.completedStep),
      lastVisitedAt: typeof parsed.lastVisitedAt === "number" ? parsed.lastVisitedAt : Date.now(),
      protocol: parsed.protocol ?? "mapa",
    };
  } catch {
    return fallback;
  }
}

function getRecommendedProtocol(distance?: Distance, difficulty?: Difficulty): Protocol | null {
  if (!distance || !difficulty) return null;
  if (difficulty === "sobrecarregado") return "alivio";
  if (difficulty === "vergonha" || difficulty === "desistencia") return "constrangimento";
  if (distance === "dias" && difficulty === "direcao") return "proximo";
  if (difficulty === "direcao") return "mapa";
  return distance === "dias" ? "proximo" : "mapa";
}

function getSteps(level: Level, protocol: Protocol) {
  if (level === "2") {
    return [
      {
        time: "2 min",
        eyebrow: "Modo Alívio",
        title: "Faça uma oração de chegada",
        prompt: "Diga uma frase verdadeira sobre como você chegou hoje.",
        passage: "Você pode começar assim: “Deus, eu estou aqui, mesmo sem saber por onde começar.”",
        action: "Fazer minha oração",
      },
    ];
  }
  if (level === "calma") {
    return [
      {
        time: "5 min",
        eyebrow: "Passagem",
        title: "Leia Salmo 23:1-3",
        prompt: "Leia devagar. Não tente recuperar o que ficou para trás.",
        passage: "Observe a imagem de cuidado, direção e descanso que aparece no texto.",
        action: "Concluir passagem",
      },
      {
        time: "10 min",
        eyebrow: "Reflexão ampliada",
        title: "Nomeie o que pesa",
        prompt: "O que em você está pedindo descanso, direção ou coragem para voltar?",
        passage: "Escreva uma frase. Não é uma redação e não precisa soar bonita.",
        action: "Concluir reflexão",
      },
      {
        time: "5 min",
        eyebrow: "Oração",
        title: "Ore sem preparar discurso",
        prompt: "Fale com Deus sobre a frase que você escreveu.",
        passage: "Quando terminar, abra o Próximo Encontro ou continue outro dia. A volta não precisa virar cobrança.",
        action: "Concluir encontro",
      },
    ];
  }
  return [
    {
      time: "3 min",
      eyebrow: protocol === "mapa" ? "Mapa do Retorno" : protocol === "constrangimento" ? "Volta sem Constrangimento" : protocol === "proximo" ? "Próximo Encontro" : "Passagem",
      title: protocol === "mapa" ? "Abra pelo seu momento" : protocol === "constrangimento" ? "Volte sem explicar sua ausência" : protocol === "proximo" ? "Continue pelo próximo trecho" : "Leia Salmo 23:1-3",
      prompt: protocol === "mapa" ? "Leia Salmo 23:1-3 sem procurar o primeiro dia perdido." : protocol === "constrangimento" ? "Leia Salmo 23:1-3 lembrando que você não precisa provar nada para voltar." : protocol === "proximo" ? "Leia Salmo 23:1-3 como o próximo passo, não como uma dívida antiga." : "Leia a passagem indicada sem tentar recuperar dias perdidos.",
      passage: protocol === "mapa" ? "Observe uma palavra ou imagem que encontre o seu momento de hoje." : protocol === "constrangimento" ? "Você pode chegar como está. Não precisa transformar a ausência em explicação." : protocol === "proximo" ? "Observe uma palavra que possa acompanhar o seu próximo encontro." : "Observe uma palavra ou imagem que encontre o seu momento de hoje.",
      action: "Concluir passagem",
    },
    {
      time: "5 min",
      eyebrow: "Reflexão",
      title: "Nomeie o que pesa",
      prompt: "O que em você precisa de descanso, direção ou coragem hoje?",
      passage: "Responda em uma frase. O objetivo é estar presente, não produzir uma reflexão perfeita.",
      action: "Concluir reflexão",
    },
    {
      time: "2 min",
      eyebrow: "Oração possível",
      title: "Fale com Deus em uma frase",
      prompt: "Você pode usar suas próprias palavras ou começar com “Deus, me ajude a voltar sem medo.”",
      passage: "Quando terminar, você voltou. Isso importa mais do que os dias em que ficou longe.",
      action: "Concluir encontro",
    },
  ];
}

export default function Home() {
  const [progress, setProgress] = useState<ProgressState>(() => readSavedProgress());
  const [activeProtocol, setActiveProtocol] = useState<Protocol>(() => readSavedProgress().protocol);
  const [distance, setDistance] = useState<Distance>();
  const [difficulty, setDifficulty] = useState<Difficulty>();
  const [activeSection, setActiveSection] = useState("diagnostico");
  const [openTrouble, setOpenTrouble] = useState<number | null>(null);
  const [showRitual, setShowRitual] = useState(false);
  const [ritualChoice, setRitualChoice] = useState<"recover" | "return" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const steps = useMemo(() => getSteps(progress.level, activeProtocol), [progress.level, activeProtocol]);
  const recommended = getRecommendedProtocol(distance, difficulty);
  const completed = progress.completedStep >= steps.length;
  const currentIndex = Math.min(progress.completedStep, Math.max(steps.length - 1, 0));
  const completionPercent = Math.min(100, Math.round((progress.completedStep / steps.length) * 100));
  const isReturningAfterGap = progress.completedStep > 0 && !completed && Date.now() - progress.lastVisitedAt > 36 * 60 * 60 * 1000;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Local storage may be unavailable in a restricted browser context.
    }
  }, [progress]);

  useEffect(() => {
    if (isReturningAfterGap) setShowRitual(true);
  }, [isReturningAfterGap]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-22% 0px -62% 0px", threshold: [0.1, 0.3, 0.6] },
    );
    sections.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chooseLevel = (level: Level, protocolOverride?: Protocol) => {
    const nextProtocol = protocolOverride ?? (level === "2" ? "alivio" : activeProtocol === "alivio" ? "mapa" : activeProtocol);
    setActiveProtocol(nextProtocol);
    setProgress(current => ({ ...current, level, protocol: nextProtocol, completedStep: 0, lastVisitedAt: Date.now() }));
    setNotice(level === "2" ? "Você escolheu um começo de 2 minutos." : level === "10" ? "Você escolheu o encontro de 10 minutos." : "Você escolheu continuar com mais calma.");
  };

  const completeCurrentStep = () => {
    setProgress(current => ({
      ...current,
      completedStep: Math.min(current.completedStep + 1, steps.length),
      lastVisitedAt: Date.now(),
    }));
  };

  const startNextEncounter = () => {
    setProgress(current => ({ ...current, completedStep: 0, lastVisitedAt: Date.now() }));
    setNotice("Novo encontro pronto. Você não precisa recuperar nenhum dia.");
    setShowRitual(false);
    scrollTo("roteiro");
  };

  const selectProtocol = (protocol: Protocol) => {
    const nextLevel: Level = protocol === "alivio" ? "2" : progress.level === "2" ? "10" : progress.level;
    chooseLevel(nextLevel, protocol);
    setNotice(`${protocolDetails[protocol].title} selecionado.`);
    window.setTimeout(() => scrollTo("roteiro"), 80);
  };

  const openTroubleshooterProtocol = (protocol: Protocol) => {
    setOpenTrouble(null);
    selectProtocol(protocol);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" type="button" onClick={() => scrollTo("topo")} aria-label="Voltar ao início">
            <span className="brand-mark"><Leaf size={17} strokeWidth={2.2} /></span>
            <span>Recomeçar Hoje</span>
          </button>
          <nav className="section-nav" aria-label="Navegação principal">
            {sections.map(section => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? "active" : ""}
                onClick={() => scrollTo(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
          <button className="nav-status" type="button" onClick={() => scrollTo("roteiro")}>
            <span className="status-dot" />
            {progress.completedStep > 0 && !completed ? "Continuar" : "Sem cobrança"}
          </button>
        </div>
      </header>

      <main>
        <section className="hero section-wrap" id="topo">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> Um encontro possível para hoje</div>
            <h1>Você não precisa recuperar os dias perdidos.</h1>
            <p className="hero-lead">Precisa de um próximo encontro. Curto, guiado e sem precisar fingir que está tudo bem.</p>
            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={() => scrollTo("diagnostico")}>
                Começar meu retorno <ArrowRight size={17} />
              </button>
              <button className="text-button" type="button" onClick={() => scrollTo("roteiro")}>
                Ver o roteiro <ArrowDown size={16} />
              </button>
            </div>
            <div className="hero-note"><ShieldCheck size={16} /> Sem streak. Sem punição. Seu progresso fica salvo neste navegador.</div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="sun-disc"><span>HOJE</span><small>é um bom dia<br />para voltar</small></div>
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="visual-tag visual-tag-top"><Clock3 size={15} /> 10 min</div>
            <div className="visual-tag visual-tag-bottom"><RotateCcw size={15} /> sem recuperar</div>
          </div>
        </section>

        <section className="intro-band">
          <div className="section-wrap intro-grid">
            <div><span className="section-kicker">A regra de hoje</span><h2>Constância não é nunca falhar. É saber voltar.</h2></div>
            <p>O Recomeçar Hoje organiza o primeiro passo para você não transformar a volta em outra dívida.</p>
          </div>
        </section>

        <section className="section-wrap section" id="diagnostico">
          <div className="section-heading">
            <div><span className="section-kicker">01 · Seu ponto de partida</span><h2>Como você chegou até aqui?</h2></div>
            <p>Responda sem pensar demais. O objetivo não é medir você. É tirar a escolha das suas costas.</p>
          </div>
          <div className="diagnostic-layout">
            <div className="diagnostic-card card-surface">
              <div className="question-block">
                <span className="question-label">Há quanto tempo você está distante?</span>
                <div className="choice-grid choice-grid-four">
                  {distanceOptions.map(option => (
                    <button key={option.value} type="button" className={`choice ${distance === option.value ? "selected" : ""}`} onClick={() => setDistance(option.value)}>
                      <span className="choice-check">{distance === option.value ? <Check size={14} /> : null}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="question-block">
                <span className="question-label">O que mais dificulta seu retorno agora?</span>
                <div className="choice-grid choice-grid-two">
                  {difficultyOptions.map(option => (
                    <button key={option.value} type="button" className={`choice ${difficulty === option.value ? "selected" : ""}`} onClick={() => setDifficulty(option.value)}>
                      <span className="choice-check">{difficulty === option.value ? <Check size={14} /> : null}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {recommended ? (
                <div className="recommendation" role="status">
                  <div className="recommendation-icon">{protocolDetails[recommended].icon}</div>
                  <div><span className="mini-label">Seu ponto de partida pode ser</span><strong>{protocolDetails[recommended].title}</strong><p>{protocolDetails[recommended].description}</p></div>
                  <button className="icon-button" type="button" onClick={() => selectProtocol(recommended)} aria-label="Ir para o protocolo recomendado"><ArrowUpRight size={19} /></button>
                </div>
              ) : (
                <div className="diagnostic-hint"><CircleHelp size={17} /> Escolha uma opção em cada pergunta para receber um ponto de partida.</div>
              )}
            </div>
            <aside className="side-note">
              <span className="note-number">01</span>
              <h3>Não existe uma resposta certa aqui.</h3>
              <p>O melhor retorno é o que cabe no momento em que você está, não o que parece mais disciplinado.</p>
            </aside>
          </div>
          <div className="protocol-list">
            <div className="list-heading"><span className="section-kicker">Quatro portas de entrada</span><span className="list-caption">Escolha ou deixe o diagnóstico indicar.</span></div>
            <div className="protocol-grid">
              {(Object.keys(protocolDetails) as Protocol[]).map(protocol => {
                const detail = protocolDetails[protocol];
                return <button key={protocol} type="button" className="protocol-card" onClick={() => selectProtocol(protocol)}><span className="protocol-icon">{detail.icon}</span><span className="protocol-copy"><strong>{detail.title}</strong><span>{detail.description}</span></span><span className="protocol-label">{detail.label}</span><ArrowUpRight className="protocol-arrow" size={18} /></button>;
              })}
            </div>
          </div>
        </section>

        <section className="section-wrap section" id="roteiro">
          <div className="section-heading section-heading-tight">
            <div><span className="section-kicker">02 · Seu próximo encontro</span><h2>Escolha o nível de agora.</h2></div>
            <p>Não escolha o que você gostaria de conseguir. Escolha o tempo que realmente tem.</p>
          </div>
          <div className="level-grid">
            <button type="button" className={`level-card ${progress.level === "2" ? "selected" : ""}`} onClick={() => chooseLevel("2")}><span className="level-icon"><Zap size={20} /></span><span className="level-time">2 min</span><strong>Tenho 2 minutos</strong><span>Uma oração de chegada. O menor passo possível.</span></button>
            <button type="button" className={`level-card ${progress.level === "10" ? "selected" : ""}`} onClick={() => chooseLevel("10")}><span className="level-icon"><Timer size={20} /></span><span className="level-time">10 min</span><strong>Tenho 10 minutos</strong><span>Passagem, reflexão e oração em um encontro guiado.</span></button>
            <button type="button" className={`level-card ${progress.level === "calma" ? "selected" : ""}`} onClick={() => chooseLevel("calma")}><span className="level-icon"><Moon size={20} /></span><span className="level-time">ritmo calmo</span><strong>Quero continuar com mais calma</strong><span>Reflexão ampliada e acesso ao Próximo Encontro.</span></button>
          </div>

          <div className="route-shell card-surface">
            <div className="route-header">
              <div><span className="mini-label">{progress.level === "2" ? "Modo Alívio" : progress.level === "calma" ? `${protocolDetails[activeProtocol].title} · ritmo calmo` : protocolDetails[activeProtocol].title}</span><h3>{completed ? "Você voltou." : "Um encontro sem dívida."}</h3></div>
              <div className="progress-summary"><span>{progress.completedStep} de {steps.length} partes</span><strong>{completionPercent}%</strong></div>
            </div>
            <div className="progress-track" aria-label={`${completionPercent}% concluído`}><span style={{ width: `${completionPercent}%` }} /></div>
            <div className="step-index-row">
              {steps.map((step, index) => <span key={step.title} className={`step-index ${index < progress.completedStep ? "done" : index === currentIndex && !completed ? "current" : ""}`}><span>{index < progress.completedStep ? <Check size={13} /> : index + 1}</span>{step.eyebrow}</span>)}
            </div>
            {!completed ? (
              <div className="active-step">
                <div className="active-step-marker"><BookOpen size={22} /></div>
                <div className="active-step-content"><span className="section-kicker">{steps[currentIndex].time} · {steps[currentIndex].eyebrow}</span><h3>{steps[currentIndex].title}</h3><p className="step-prompt">{steps[currentIndex].prompt}</p><div className="passage-box"><span className="mini-label">Para este momento</span><p>{steps[currentIndex].passage}</p></div><button className="button button-primary" type="button" onClick={completeCurrentStep}>{steps[currentIndex].action} <Check size={17} /></button></div>
              </div>
            ) : (
              <div className="completion-state" role="status"><div className="completion-icon"><Check size={28} /></div><div><span className="section-kicker">Encontro concluído</span><h3>Você voltou. Isso importa.</h3><p>Mais do que os dias em que você ficou longe, importa o próximo encontro que você escolheu fazer.</p><div className="identity-statement"><span className="mini-label">Declaração de identidade</span><strong>Você é alguém que consegue voltar.</strong></div><div className="completion-actions"><button className="button button-primary" type="button" onClick={startNextEncounter}>Abrir o Próximo Encontro <ArrowRight size={17} /></button><button className="text-button" type="button" onClick={() => setNotice("Tudo bem continuar outro dia. Seu progresso ficou salvo neste navegador.")}>Continuar outro dia</button></div></div></div>
            )}
            <div className="return-note"><LockKeyhole size={15} /><span>Seu progresso fica salvo neste navegador. Se você parar, pode continuar daqui ou começar um novo encontro.</span></div>
          </div>
        </section>

        <section className="section-wrap section" id="travas">
          <div className="section-heading"><div><span className="section-kicker">03 · Se travar</span><h2>O que está travando seu retorno?</h2></div><p>Abra só a situação que parece com a sua. A resposta é curta de propósito.</p></div>
          <div className="accordion-list">
            {troubleItems.map((item, index) => {
              const isOpen = openTrouble === index;
              return <div className={`accordion-item ${isOpen ? "open" : ""}`} key={item.title}><button type="button" className="accordion-trigger" onClick={() => setOpenTrouble(isOpen ? null : index)} aria-expanded={isOpen}><span>{item.title}</span><ChevronDown size={19} /></button>{isOpen && <div className="accordion-content"><p>{item.answer}</p><button type="button" className="inline-link" onClick={() => openTroubleshooterProtocol(item.protocol)}>Ir para {protocolDetails[item.protocol].title} <ArrowRight size={15} /></button></div>}</div>;
            })}
          </div>
        </section>

        <section className="section-wrap section" id="rito">
          <div className="ritual-panel">
            <div className="ritual-copy"><span className="section-kicker">04 · Rito de Recomeço</span><h2>Você vai tentar pagar os dias perdidos ou voltar para o próximo encontro?</h2><p>Quando a culpa aparecer, não deixe que ela escolha por você. Veja as duas rotas com clareza.</p><button type="button" className="button button-primary" onClick={() => { setRitualChoice(null); setShowRitual(true); }}>Abrir o rito <RotateCcw size={17} /></button></div>
            <div className="ritual-visual"><div className="ritual-orbit"><span className="ritual-center">HOJE<small>é onde você volta</small></span></div><span className="ritual-caption">a volta começa<br />no próximo encontro</span></div>
          </div>
        </section>

        <section className="section-wrap final-section">
          <div className="final-card"><span className="brand-mark large"><Leaf size={23} /></span><h2>O próximo passo não precisa ser grande.</h2><p>Ele só precisa existir.</p><button type="button" className="button button-primary" onClick={() => scrollTo("roteiro")}>Voltar para o encontro <ArrowRight size={17} /></button></div>
          <div className="disclaimer"><span className="section-kicker">Nota de cuidado</span><p>Recomeçar Hoje é uma ferramenta de apoio à prática devocional. Ele não substitui acompanhamento pastoral, psicológico ou médico. Use o conteúdo com liberdade e interrompa se alguma parte não fizer sentido para o seu momento.</p></div>
        </section>
      </main>

      <footer className="site-footer"><div className="section-wrap footer-inner"><span className="brand"><span className="brand-mark"><Leaf size={15} /></span> Recomeçar Hoje</span><span>Feito para voltar sem pagar os dias perdidos.</span></div></footer>

      {notice && <div className="toast" role="status"><Check size={17} /> <span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={16} /></button></div>}

      {showRitual && <div className="modal-backdrop" role="presentation"><div className="ritual-modal" role="dialog" aria-modal="true" aria-labelledby="ritual-title"><button className="modal-close" type="button" onClick={() => setShowRitual(false)} aria-label="Fechar rito"><X size={20} /></button><span className="section-kicker">Rito de Recomeço</span><h2 id="ritual-title">A culpa quer que você volte para trás.</h2><p>Você pode escolher com clareza o que acontece agora.</p><div className="ritual-choice-grid"><button type="button" className={`ritual-choice recovery ${ritualChoice === "recover" ? "chosen" : ""}`} onClick={() => setRitualChoice("recover")}><span className="ritual-choice-icon"><ArrowDown size={19} /></span><strong>Tentar recuperar os dias perdidos</strong><span>Leitura acumulada, sensação de dívida e um plano difícil de manter.</span></button><button type="button" className={`ritual-choice return ${ritualChoice === "return" ? "chosen" : ""}`} onClick={() => setRitualChoice("return")}><span className="ritual-choice-icon"><RotateCcw size={19} /></span><strong>Voltar para o próximo encontro</strong><span>Começar do ponto atual, fazer uma sessão curta e seguir quando estiver pronto.</span></button></div>{ritualChoice === "recover" && <div className="ritual-feedback negative"><strong>Você não precisa escolher essa dívida.</strong><span>Os dias perdidos não precisam virar uma lista de tarefas.</span></div>}{ritualChoice === "return" && <div className="ritual-feedback positive"><strong>Essa é a rota do Recomeçar Hoje.</strong><span>O próximo encontro está pronto para você.</span></div>}<button className="button button-primary modal-action" type="button" onClick={() => { if (ritualChoice === "return") { setShowRitual(false); startNextEncounter(); } else { setRitualChoice("return"); } }}>{ritualChoice === "return" ? "Voltar agora" : "Escolher a rota possível"} <ArrowRight size={17} /></button></div></div>}
    </div>
  );
}
