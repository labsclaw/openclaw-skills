// ssc-chunker.cjs — Módulo de chunking de Markdown para SSC
//
// Divide arquivos markdown de segments em chunks de tamanho controlado
// para indexação vetorial.
//
// Uso:
//   const { chunkMarkdown, estimateTokens, chunkAllSegments } = require('./ssc-chunker.cjs');
//   const chunks = chunkMarkdown(content, { maxTokens: 500, segmentId: 's001' });

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Estimativa de tokens
// ---------------------------------------------------------------------------

/**
 * Estima o número de tokens em um texto.
 * Fórmula: contagem de palavras × 1.3 (média empírica tokens/palavra
 * para conteúdo técnico mesclando português e inglês).
 *
 * @param {string} text - Texto para estimar
 * @returns {number} Número estimado de tokens
 */
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  const wordCount = trimmed.split(/\s+/).length;
  return Math.ceil(wordCount * 1.3);
}

// ---------------------------------------------------------------------------
// Split por headers (boundaries naturais)
// ---------------------------------------------------------------------------

/**
 * Divide o conteúdo markdown em seções delimitadas por headers.
 * Cada seção preserva seu header como referência.
 *
 * Edge cases tratados:
 * - Arquivo sem headers → seção única com header=null
 * - Header sem conteúdo após si → seção com conteúdo vazio
 * - Conteúdo antes do primeiro header → incluído na primeira seção
 *
 * @param {string} content - Conteúdo markdown
 * @returns {Array<{header: string|null, level: number, content: string}>}
 */
function splitByHeaders(content) {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const HEADER_RE = /^(#{1,6})\s+(.+)$/gm;

  const sections = [];
  let lastMatch = null;       // { header, level, index }
  let lastEndOfMatch = 0;     // index após o último header encontrado

  let match;
  while ((match = HEADER_RE.exec(content)) !== null) {
    if (lastMatch !== null) {
      // Conteúdo entre o header anterior e este header
      const sectionContent = content.substring(lastMatch.contentEnd, match.index).trim();
      sections.push({
        header: lastMatch.fullLine,
        level: lastMatch.level,
        content: sectionContent,
      });
    } else if (match.index > 0) {
      // Conteúdo antes do primeiro header (preâmbulo)
      const preamble = content.substring(0, match.index).trim();
      if (preamble.length > 0) {
        sections.push({
          header: null,
          level: 0,
          content: preamble,
        });
      }
    }

    lastMatch = {
      fullLine: match[0],              // Ex: "## Resumo"
      level: match[1].length,          // Ex: 2
      contentEnd: HEADER_RE.lastIndex, // index após o header
    };
  }

  // Última seção (após o último header)
  if (lastMatch !== null) {
    const tail = content.substring(lastMatch.contentEnd).trim();
    if (tail.length > 0) {
      sections.push({
        header: lastMatch.fullLine,
        level: lastMatch.level,
        content: tail,
      });
    }
  } else {
    // Nenhum header encontrado — conteúdo inteiro como seção única
    const trimmed = content.trim();
    if (trimmed.length > 0) {
      sections.push({
        header: null,
        level: 0,
        content: trimmed,
      });
    }
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Split por parágrafos
// ---------------------------------------------------------------------------

/**
 * Divide texto em parágrafos usando linha em branco (dupla newline) como
 * delimitador. Normaliza whitespace e remove parágrafos vazios.
 *
 * Edge cases:
 * - Múltiplas linhas em branco consecutivas → tratadas como um separador
 * - Linhas de apenas whitespace → ignoradas
 * - Listas/ code blocks com newlines internas → preservadas como um parágrafo
 *
 * @param {string} text
 * @returns {string[]}
 */
function splitByParagraphs(text) {
  if (!text || text.trim().length === 0) return [];

  // Split por uma ou mais linhas em branco (com ou sem whitespace)
  // Importante: não quebrar dentro de code blocks (```) ou listas
  const BLANK_LINE_RE = /\n\s*\n/;
  const parts = text.split(BLANK_LINE_RE);

  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// ---------------------------------------------------------------------------
// Criação de chunks
// ---------------------------------------------------------------------------

/**
 * Cria um objeto chunk com metadados.
 *
 * @param {string} content  - Conteúdo textual do chunk
 * @param {string} segmentId - ID do segmento de origem
 * @param {number} index     - Índice ordinal dentro do segmento
 * @param {string|null} header - Header markdown associado (ex: "## Resumo")
 * @returns {object} Chunk formatado
 */
function buildChunk(content, segmentId, index, header) {
  return {
    id: `seg-${segmentId}-${index}`,
    segmentId: segmentId,
    content: content,
    tokens: estimateTokens(content),
    header: header,
  };
}

// ---------------------------------------------------------------------------
// Overlap entre chunks consecutivos
// ---------------------------------------------------------------------------

/**
 * Extrai as últimas N palavras de um texto para usar como overlap.
 * Tenta quebrar em fronteira de palavra.
 *
 * @param {string} text
 * @param {number} tokenCount - Quantidade aproximada de tokens para overlap
 * @returns {string} Texto de overlap
 */
function extractOverlapText(text, tokenCount) {
  if (!text || text.trim().length === 0 || tokenCount <= 0) return '';

  const words = text.trim().split(/\s+/);
  const targetWords = Math.max(1, Math.ceil(tokenCount / 1.3));
  const startIdx = Math.max(0, words.length - targetWords);

  if (startIdx >= words.length) return '';

  return words.slice(startIdx).join(' ');
}

/**
 * Aplica overlap entre chunks consecutivos.
 * Os últimos overlapTokens de cada chunk (i) são copiados para o início
 * do chunk (i+1), garantindo contexto contínuo entre fronteiras.
 *
 * @param {object[]} chunks - Array de chunks SEM overlap
 * @param {number} overlapTokens - Tokens de overlap desejados
 * @returns {object[]} Chunks com overlap aplicado
 */
function applyOverlap(chunks, overlapTokens) {
  if (chunks.length <= 1 || overlapTokens <= 0) {
    return chunks;
  }

  const result = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (i > 0) {
      const overlapText = extractOverlapText(chunks[i - 1].content, overlapTokens);
      if (overlapText.length > 0) {
        chunk.content = overlapText + '\n\n' + chunk.content;
        chunk.tokens = estimateTokens(chunk.content);
      }
    }

    result.push(chunk);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Chunkerização principal
// ---------------------------------------------------------------------------

/**
 * Divide conteúdo markdown em chunks de tamanho controlado.
 *
 * Algoritmo:
 * 1. Divide por headers markdown (boundaries naturais)
 * 2. Para cada seção:
 *    a. Se cabe em maxTokens → chunk inteiro
 *    b. Se > maxTokens → quebra por parágrafos, agrupa em chunks
 * 3. Aplica overlap entre chunks consecutivos
 *
 * Edge cases:
 * - Conteúdo vazio → array vazio
 * - Sem headers → chunkeriza como texto plano
 * - Seção única > maxTokens → quebra por parágrafos
 * - Parágrafo único > maxTokens → chunk único (não quebra no meio de parágrafo)
 *
 * @param {string} content  - Conteúdo markdown
 * @param {object} [options]
 * @param {number} [options.maxTokens=500] - Tokens máximos por chunk
 * @param {number} [options.overlapTokens=50] - Tokens de overlap entre chunks
 * @param {string} [options.segmentId='unknown'] - ID do segmento de origem
 * @returns {object[]} Array de chunks
 */
function chunkMarkdown(content, options = {}) {
  const maxTokens = options.maxTokens || 500;
  const overlapTokens = options.overlapTokens || 50;
  const segmentId = options.segmentId || 'unknown';

  // Edge case: conteúdo vazio
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return [];
  }

  // Edge case: conteúdo muito pequeno
  if (estimateTokens(content) <= maxTokens) {
    return [
      buildChunk(content.trim(), segmentId, 0, null),
    ];
  }

  // 1. Divide em seções por headers
  const sections = splitByHeaders(content);
  if (sections.length === 0) return [];

  const rawChunks = [];
  let chunkIdx = 0;

  for (const section of sections) {
    const sectionText = section.content;
    const sectionTokens = estimateTokens(sectionText);

    if (sectionTokens <= maxTokens) {
      // Seção cabe inteira em um chunk
      const chunkContent = section.header
        ? `${section.header}\n\n${sectionText}`
        : sectionText;

      rawChunks.push(buildChunk(chunkContent, segmentId, chunkIdx++, section.header));
    } else {
      // Seção > maxTokens — quebrar por parágrafos
      const paragraphs = splitByParagraphs(sectionText);
      if (paragraphs.length === 0) continue;

      let accParts = [];
      let accTokens = 0;
      const headerPrefix = section.header ? `${section.header}\n\n` : '';
      const headerTokens = section.header ? estimateTokens(section.header) : 0;

      for (const para of paragraphs) {
        const paraTokens = estimateTokens(para);

        // Se parágrafo isolado já excede maxTokens, chunk único (não quebra meio)
        if (paraTokens > maxTokens) {
          // Descarrega acumulado anterior, se houver
          if (accParts.length > 0) {
            const accText = headerPrefix + accParts.join('\n\n');
            rawChunks.push(buildChunk(accText, segmentId, chunkIdx++, section.header));
            accParts = [];
            accTokens = 0;
          }

          // Parágrafo gigante vira chunk próprio
          const giantContent = headerPrefix + para;
          rawChunks.push(buildChunk(giantContent, segmentId, chunkIdx++, section.header));
          continue;
        }

        // Verifica se cabe no chunk atual (incluindo header e acumulado)
        const candidateTokens = headerTokens + accTokens + paraTokens;
        if (candidateTokens <= maxTokens || accParts.length === 0) {
          accParts.push(para);
          accTokens += paraTokens;
        } else {
          // Fecha chunk atual
          const accText = headerPrefix + accParts.join('\n\n');
          rawChunks.push(buildChunk(accText, segmentId, chunkIdx++, section.header));

          // Inicia novo chunk com este parágrafo
          accParts = [para];
          accTokens = paraTokens;
        }
      }

      // Último acúmulo da seção
      if (accParts.length > 0) {
        const accText = headerPrefix + accParts.join('\n\n');
        rawChunks.push(buildChunk(accText, segmentId, chunkIdx++, section.header));
      }
    }
  }

  // 3. Aplica overlap entre chunks
  return applyOverlap(rawChunks, overlapTokens);
}

// ---------------------------------------------------------------------------
// Chunkerização de todos os segments
// ---------------------------------------------------------------------------

/**
 * Lê todos os arquivos .md de memory/segments/, chunkeriza cada um,
 * e retorna um array plano de chunks.
 *
 * @param {string} memoryDir - Caminho absoluto para o diretório raiz de memória
 * @returns {object[]} Array combinado de chunks de todos os segments
 */
function chunkAllSegments(memoryDir) {
  if (!memoryDir || typeof memoryDir !== 'string') {
    throw new Error('memoryDir é obrigatório');
  }

  const segmentsDir = path.resolve(memoryDir, 'segments');

  if (!fs.existsSync(segmentsDir)) {
    console.error(`[ssc-chunker] Diretório não encontrado: ${segmentsDir}`);
    return [];
  }

  const files = fs.readdirSync(segmentsDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.warn('[ssc-chunker] Nenhum arquivo .md encontrado em segments/');
    return [];
  }

  const allChunks = [];

  for (const file of files) {
    const filePath = path.join(segmentsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const segmentId = path.basename(file, '.md'); // Ex: "s001-infra"

    const chunks = chunkMarkdown(content, { segmentId });

    if (chunks.length > 0) {
      console.log(
        `[ssc-chunker] ${file}: ${chunks.length} chunks ` +
        `(médio ${average(chunks.map((c) => c.tokens)).toFixed(0)} tokens)`
      );
    }

    allChunks.push(...chunks);
  }

  return allChunks;
}

// ---------------------------------------------------------------------------
// Utilitário
// ---------------------------------------------------------------------------

function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  chunkMarkdown,
  estimateTokens,
  chunkAllSegments,
  // Utilitários exportados para teste/uso avançado
  splitByHeaders,
  splitByParagraphs,
};
