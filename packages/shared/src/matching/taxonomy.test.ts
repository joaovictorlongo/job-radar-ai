import { describe, expect, it } from 'vitest';
import { isAnalysisNoise, normalizeSkillForAnalysis } from './taxonomy.js';

describe('normalizeSkillForAnalysis', () => {
  it('agrupa variantes de observabilidade sob um único canônico', () => {
    for (const raw of [
      'observabilidade',
      'monitoramento/observabilidade',
      'logs estruturados',
      'tracing',
      'metricas',
    ]) {
      const res = normalizeSkillForAnalysis(raw);
      expect(res).toHaveLength(1);
      expect(res[0]?.canonical).toBe('observabilidade');
      expect(res[0]?.cluster).toBe('Observabilidade & Monitoramento');
    }
  });

  it('divide requisitos compostos como kafka/rabbitmq', () => {
    const res = normalizeSkillForAnalysis('kafka/rabbitmq');
    expect(res.map((r) => r.canonical)).toEqual(['kafka', 'rabbitmq']);
  });

  it('normaliza frases longas conhecidas para skills canônicas', () => {
    expect(normalizeSkillForAnalysis('testes automatizados com playwright')[0]?.canonical).toBe(
      'playwright',
    );
    expect(normalizeSkillForAnalysis('orquestracao multiplos agentes de ia')[0]?.canonical).toBe(
      'agentes de ia',
    );
    expect(normalizeSkillForAnalysis('prompt evaluation')[0]?.canonical).toBe('evals');
    expect(normalizeSkillForAnalysis('multi tenant access control and rbac')[0]?.canonical).toBe(
      'rbac / multi-tenant',
    );
  });

  it('filtra frases genéricas e ruído não técnico', () => {
    expect(isAnalysisNoise('vontade de aprender e se desenvolver na area de desenvolvimento web')).toBe(
      true,
    );
    expect(normalizeSkillForAnalysis('vontade de aprender e se desenvolver na area de desenvolvimento web')).toEqual(
      [],
    );
    expect(normalizeSkillForAnalysis('high growth environments')).toEqual([]);
    expect(normalizeSkillForAnalysis('end to end problem ownership')).toEqual([]);
  });
});
