import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(import.meta.dirname, "Home.tsx"), "utf-8");

describe("Home.tsx product decisions", () => {
  it.each([
    ["the Rito view", /go\("rito"\)|renderRitual|ritualChoice|Rito de/],
    ["'Continuar outro dia' (button or text)", /[Cc]ontinu\w+ outro dia/],
    ["the wipe-everything restart", /restartFromZero/],
    ["the 'Meses ou mais' option", /Meses ou mais|"meses"/],
    ["any wording that presumes how long the person was away", /semanas|meses|Fiquei \w+ sem/i],
    ["the absence timer", /lastVisitedAt|isReturningAfterGap/],
    ["the debt route", /rota da dívida|Tentar compensar/],
    ["'Escolha como seguir'", /[Ee]scolha como seguir/],
    ["debt, recovery, compensation or charge language (even negated)", /dias perdidos|dívida|recuper(ar|ou|ação)|compens|cobran|atraso|obrigação|tarefa|pendente|para trás|primeiro dia|dias em que/i],
    ["'pagar' used for lost days", /pagar os dias/i],
  ])("does not contain %s", (_name, pattern) => {
    expect(source).not.toMatch(pattern);
  });

  it.each(["Fechar encontro", "Iniciar outro encontro", "Continuar de onde parei", "Começar novamente"])("offers '%s'", label => {
    expect(source).toContain(label);
  });

  it("keeps the free-return wording", () => {
    expect(source).toContain("Você pode voltar no seu próprio ritmo.");
  });

  it("keeps a message inspired by Filipenses 3:13–14 outside any Rito step", () => {
    expect(source).toContain("Inspirado em Filipenses 3:13–14");
  });

  it("keeps the care disclaimer somewhere in the app", () => {
    expect(source).toContain("Não substitui acompanhamento pastoral");
  });
});

describe("index.html", () => {
  const html = fs.readFileSync(path.resolve(import.meta.dirname, "../../index.html"), "utf-8");
  it("does not use debt or lost-days wording", () => {
    expect(html).not.toMatch(/dias perdidos|dívida|cobran|compens/i);
  });
});
