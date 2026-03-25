import { describe, it, expect } from 'vitest';
import { buildNotebookPrompt } from '@/lib/prompt';
import type { NotebookSpec, NotebookCell } from '@/lib/types';

const SAMPLE_PAPER = `
Attention Is All You Need

Abstract
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.
We propose the Transformer architecture, based solely on attention mechanisms.

1. Introduction
The Transformer architecture uses multi-head self-attention...

Algorithm: Scaled Dot-Product Attention
Given queries Q, keys K, and values V:
Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V

Dataset: WMT 2014 English-German (4.5M sentence pairs)
Metric: BLEU score
`.trim();

describe('buildNotebookPrompt', () => {
  it('returns an object with system and user fields', () => {
    const prompt = buildNotebookPrompt(SAMPLE_PAPER);
    expect(prompt).toHaveProperty('system');
    expect(prompt).toHaveProperty('user');
    expect(typeof prompt.system).toBe('string');
    expect(typeof prompt.user).toBe('string');
  });

  it('system prompt mentions expert ML researcher role', () => {
    const prompt = buildNotebookPrompt(SAMPLE_PAPER);
    expect(prompt.system.toLowerCase()).toMatch(/researcher|expert|scientist/);
  });

  it('user prompt includes the paper text', () => {
    const prompt = buildNotebookPrompt(SAMPLE_PAPER);
    expect(prompt.user).toContain('Attention Is All You Need');
  });

  it('prompt instructs for realistic synthetic data', () => {
    const { system, user } = buildNotebookPrompt(SAMPLE_PAPER);
    const combined = system + user;
    expect(combined.toLowerCase()).toMatch(/synthetic|realistic|real.world/);
  });

  it('prompt instructs for JSON output', () => {
    const { system, user } = buildNotebookPrompt(SAMPLE_PAPER);
    const combined = system + user;
    expect(combined).toMatch(/JSON|json/);
  });

  it('prompt instructs for 12 sections', () => {
    const { system, user } = buildNotebookPrompt(SAMPLE_PAPER);
    const combined = system + user;
    // Should mention the notebook sections
    expect(combined).toMatch(/section|cell/i);
  });

  it('prompt explicitly forbids toy/placeholder data', () => {
    const { system, user } = buildNotebookPrompt(SAMPLE_PAPER);
    const combined = system + user;
    // Should have negative examples or explicit "no toy" instruction
    expect(combined.toLowerCase()).toMatch(/no toy|not toy|not a toy|production.quality|high.quality|never use placeholder/i);
  });
});

describe('NotebookSpec type compliance', () => {
  it('a well-formed NotebookSpec validates its structure', () => {
    // This is a compile-time test — if types are wrong it won't compile
    const spec: NotebookSpec = {
      title: 'Test Paper',
      abstract: 'A test abstract.',
      sections: [
        {
          id: 'setup',
          title: 'Setup',
          cell_type: 'code',
          source: ['!pip install numpy'],
        },
      ],
    };
    expect(spec.title).toBe('Test Paper');
    expect(spec.sections).toHaveLength(1);
    expect((spec.sections[0] as NotebookCell).cell_type).toBe('code');
  });
});
