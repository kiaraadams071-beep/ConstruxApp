import { RiskDoc, RiskRow } from '../types';

export const calcRisk = (likelihood: number, severity: number): number => {
  return likelihood * severity;
};

export const generateRiskDocId = () => {
  return `risk_${Date.now()}`;
};

export const saveRiskDocLocal = (doc: RiskDoc) => {
  const existingRaw = localStorage.getItem('risk_assessments');
  const existing = existingRaw ? JSON.parse(existingRaw) : [];
  localStorage.setItem('risk_assessments', JSON.stringify([...existing, doc]));
};

export const loadRiskDocsLocal = (): RiskDoc[] => {
  const existingRaw = localStorage.getItem('risk_assessments');
  return existingRaw ? JSON.parse(existingRaw) : [];
};
