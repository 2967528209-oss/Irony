import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });

const ollamaClient = new OpenAI({
  apiKey: 'ollama',
  baseURL: 'http://localhost:11434/v1',
});

// ========== 1. 文档加载 ==========

interface RawDocument {
  content: string;
  metadata: {
    source: string;
    title: string;
  };
}

async function loadMarkdownFiles(dirs: string[]): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];

  for (const dir of dirs) {
    const absDir = resolve(__dirname, dir);
    let files: string[];
    try {
      files = await readdir(absDir);
    } catch {
      console.log(`  跳过不存在的目录: ${dir}`);
      continue;
    }

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = await readFile(resolve(absDir, file), 'utf-8');
      docs.push({
        content,
        metadata: {
          source: `${dir}/${file}`,
          title: content.split('\n')[0]?.replace(/^#+\s*/, '') || file,
        },
      });
    }
  }

  return docs;
}

// ========== 1.5 文档清洗 ==========

function cleanMarkdown(text: string): string {
  let cleaned = text;

  // 只移除包含 ASCII 图表的代码块（含有大量 │┌─└ 等字符）
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
    const boxChars = (match.match(/[│┌┐└┘├┤┬┴┼─═║╔╗╚╝╠╣╦╩╬↓↑→←]/g) || []).length;
    return boxChars > 5 ? '' : match;
  });

  // Markdown 表格转纯文本："|a|b|c|" → "a, b, c"
  cleaned = cleaned.replace(/^\|(.+)\|$/gm, (_, row: string) => {
    const cells = row.split('|').map((c: string) => c.trim()).filter(Boolean);
    if (cells.every((c: string) => /^[-:]+$/.test(c))) return '';
    return cells.join(', ');
  });

  // 压缩连续空行
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

// ========== 2. 文本分块（递归分块） ==========

interface DocumentChunk {
  content: string;
  metadata: {
    source: string;
    title: string;
    chunkIndex: number;
  };
}

function recursiveChunk(
  text: string,
  maxSize: number = 800,
  overlap: number = 100,
  minSize: number = 80,
): string[] {
  const separators = ['\n## ', '\n### ', '\n\n', '\n', '. '];

  function split(text: string, sepIndex: number): string[] {
    if (text.length <= maxSize) return [text];

    if (sepIndex >= separators.length) {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += maxSize - overlap) {
        chunks.push(text.slice(i, i + maxSize));
      }
      return chunks;
    }

    const sep = separators[sepIndex];
    const parts = text.split(sep).filter(p => p.trim());
    if (parts.length <= 1) return split(text, sepIndex + 1);

    const chunks: string[] = [];
    let current = '';

    for (const part of parts) {
      const piece = sep.trim() ? sep.trim() + ' ' + part : part;
      if (current.length + piece.length > maxSize && current) {
        chunks.push(current.trim());
        current = piece;
      } else {
        current = current ? current + '\n' + piece : piece;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    return chunks.flatMap(c => (c.length > maxSize ? split(c, sepIndex + 1) : [c]));
  }

  return split(text, 0).filter(c => c.trim().length >= minSize);
}

function chunkDocuments(docs: RawDocument[]): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  for (const doc of docs) {
    const textChunks = recursiveChunk(doc.content);
    for (let i = 0; i < textChunks.length; i++) {
      chunks.push({
        content: textChunks[i],
        metadata: {
          ...doc.metadata,
          chunkIndex: i,
        },
      });
    }
  }

  return chunks;
}

// ========== 3. Embedding ==========

async function embedTexts(texts: string[]): Promise<number[][]> {
  const batchSize = 20;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(`  编码 ${i + 1}-${Math.min(i + batchSize, texts.length)} / ${texts.length}`);

    const response = await ollamaClient.embeddings.create({
      model: 'bge-m3',
      input: batch,
    });

    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}

// ========== 4. 本地向量存储 ==========

interface VectorStoreEntry {
  content: string;
  metadata: DocumentChunk['metadata'];
  embedding: number[];
}

interface VectorStore {
  entries: VectorStoreEntry[];
  model: string;
  createdAt: string;
}

async function saveVectorStore(entries: VectorStoreEntry[], outputPath: string) {
  const store: VectorStore = {
    entries,
    model: 'bge-m3',
    createdAt: new Date().toISOString(),
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(store, null, 2), 'utf-8');
}

// ========== 主流程 ==========

async function main() {
  console.log('=== RAG Indexing 管线 ===\n');

  // 1. 加载文档
  console.log('1. 加载文档...');
  const docs = await loadMarkdownFiles([
    '../../../01-AI-Coding工作流/notes',
    '../../../02-LLM-API集成/notes',
    '../../../03-RAG系统/notes',
  ]);
  console.log(`  加载了 ${docs.length} 个文档\n`);

  // 1.5. 清洗
  console.log('1.5. 清洗文档（移除代码块/ASCII图表）...');
  const cleanedDocs = docs.map(doc => ({
    ...doc,
    content: cleanMarkdown(doc.content),
  }));
  const beforeSize = docs.reduce((s, d) => s + d.content.length, 0);
  const afterSize = cleanedDocs.reduce((s, d) => s + d.content.length, 0);
  console.log(`  清洗前: ${beforeSize} 字符 → 清洗后: ${afterSize} 字符 (去除 ${Math.round((1 - afterSize / beforeSize) * 100)}%)\n`);

  // 2. 分块
  console.log('2. 文本分块...');
  const chunks = chunkDocuments(cleanedDocs);
  console.log(`  生成了 ${chunks.length} 个文档块`);
  console.log(`  平均块大小: ${Math.round(chunks.reduce((s, c) => s + c.content.length, 0) / chunks.length)} 字符\n`);

  // 3. Embedding
  console.log('3. 生成 Embedding...');
  const texts = chunks.map(c => c.content);
  const embeddings = await embedTexts(texts);
  console.log(`  生成了 ${embeddings.length} 个向量，维度: ${embeddings[0].length}\n`);

  // 4. 存储
  const entries: VectorStoreEntry[] = chunks.map((chunk, i) => ({
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: embeddings[i],
  }));

  const storePath = resolve(__dirname, '../data/vector-store.json');
  console.log('4. 保存向量存储...');
  await saveVectorStore(entries, storePath);
  console.log(`  已保存到 ${storePath}\n`);

  console.log('=== Indexing 完成 ===');
}

main().catch(console.error);
