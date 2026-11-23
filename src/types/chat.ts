/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActivePage } from '../context/AppContext';

export interface GroundingSource {
  title: string;
  url: string;
}

export type SupportedDocFormat =
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'csv'
  | 'txt'
  | 'md'
  | 'json'
  | 'xml'
  | 'py'
  | 'js'
  | 'ts'
  | 'html'
  | 'css';

export interface GeneratedDocClientItem {
  id: string;
  ownerId: string;
  projectId?: string;
  conversationId?: string;
  title: string;
  fileName: string;
  format: SupportedDocFormat;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  summary: string;
  previewText: string;
  downloadUrl: string;
}

export interface UploadedFileClientItem {
  id: string;
  ownerId: string;
  projectId?: string;
  conversationId?: string;
  originalName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  status: 'processed' | 'failed';
  extractedText: string;
  summary: string;
  metadata: {
    lineCount?: number;
    wordCount?: number;
    sheetNames?: string[];
    rowCount?: number;
    columnNames?: string[];
    sampleRows?: Record<string, any>[];
    numericStats?: Record<string, { min: number; max: number; avg: number; sum: number; count: number }>;
    archiveEntries?: string[];
    pageEstimate?: number;
  };
}

export interface ExecutionJobClientItem {
  id: string;
  ownerId: string;
  projectId?: string;
  conversationId?: string;
  language: 'python' | 'javascript' | 'typescript' | 'html';
  code: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  createdAt: string;
  completedAt?: string;
  logs: string[];
  generatedDocumentIds: string[];
  htmlPreview?: string;
}

export interface AiProjectClientItem {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  category: 'research' | 'university_application' | 'coding' | 'data_analysis' | 'documents' | 'general';
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  conversationIds: string[];
  fileIds: string[];
  documentIds: string[];
  jobIds: string[];
}

export interface AiTaskClientItem {
  id: string;
  ownerId: string;
  projectId?: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  fileAttachment?: {
    name: string;
    mimeType: string;
    dataUrl?: string;
  };
  uploadedFile?: UploadedFileClientItem;
  generatedDocuments?: GeneratedDocClientItem[];
  executionJob?: ExecutionJobClientItem | null;
  executionStages?: string[];
  sources?: GroundingSource[];
  actions?: ParsedChatAction[];
  isOfflineFallback?: boolean;
  feedback?: 'helpful' | 'unhelpful';
}

export interface ParsedChatAction {
  type: 'NAVIGATE' | 'COMPARE' | 'BUDGET';
  page?: ActivePage;
  query?: string;
  label?: string;
  rawParams?: Record<string, string>;
}

export interface ChatSession {
  id: string;
  title: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  language?: string;
}
