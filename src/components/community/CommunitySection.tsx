/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CommunityCategory, CommunityPost } from '../../types';
import {
  Users,
  MessageSquare,
  ThumbsUp,
  PlusCircle,
  Search,
  Pin,
  Send,
  X,
  Globe2,
  CheckCircle,
} from 'lucide-react';

export const CommunitySection: React.FC = () => {
  const {
    communityPosts,
    addCommunityPost,
    likeCommunityPost,
    addCommunityReply,
    currentUser,
    addToast,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [activePostForReply, setActivePostForReply] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState<string>('');

  // New post form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<CommunityCategory>('general');
  const [newContent, setNewContent] = useState('');

  const filteredPosts = useMemo(() => {
    return communityPosts.filter((post) => {
      const q = search.toLowerCase();
      const matchesSearch =
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.authorUniversity.toLowerCase().includes(q);

      const matchesCat = activeCategory === 'all' || post.category === activeCategory;

      return matchesSearch && matchesCat;
    });
  }, [communityPosts, search, activeCategory]);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      addToast('Please provide both title and content', 'warning');
      return;
    }

    addCommunityPost({
      title: newTitle,
      category: newCategory,
      content: newContent,
    });

    setNewTitle('');
    setNewContent('');
    setShowCreateModal(false);
  };

  const handleSendReply = (postId: string) => {
    if (!replyInput.trim()) return;
    addCommunityReply(postId, replyInput);
    setReplyInput('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-sky-600 mb-1">
              Global Student Network
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              International Student Community & Forum
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Connect with fellow exchange students, find weekend Hangang language exchanges, discuss S-3 part-time permits, and share verified living tips.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Discussion Post</span>
          </button>
        </div>
      </div>

      {/* Filter and Categories Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search discussions by topic, campus, or questions..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All Topics' },
            { id: 'visa_help', label: 'Visa & Work Permits' },
            { id: 'campus_life', label: 'Campus Life & Housing' },
            { id: 'language_exchange', label: 'Language Exchange' },
            { id: 'jobs_internships', label: 'Jobs & Internships' },
            { id: 'general', label: 'General Discussion' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Community Posts Stream */}
      <div className="space-y-4">
        {filteredPosts.map((post) => {
          const isReplyOpen = activePostForReply === post.id;
          return (
            <div
              key={post.id}
              className={`bg-white rounded-2xl border transition-all p-6 ${
                post.isPinned
                  ? 'border-blue-300 shadow-sm bg-blue-50/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Post Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {post.authorName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {post.authorName}
                      </span>
                      <span className="text-slate-400 text-xs">·</span>
                      <span className="text-xs text-blue-600 font-medium">
                        {post.authorUniversity}
                      </span>
                      <span className="text-slate-400 text-xs">·</span>
                      <span className="text-xs text-slate-500">
                        {post.authorNationality}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {post.createdAt}
                    </div>
                  </div>
                </div>

                {post.isPinned && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                    <Pin className="w-3 h-3" />
                    <span>Pinned by Moderator</span>
                  </span>
                )}
              </div>

              {/* Title & Content */}
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {post.title}
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line mb-4">
                {post.content}
              </p>

              {/* Reactions & Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => likeCommunityPost(post.id)}
                    className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors font-medium cursor-pointer"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="font-mono">{post.likes}</span>
                    <span>Helpful</span>
                  </button>

                  <button
                    onClick={() => setActivePostForReply(isReplyOpen ? null : post.id)}
                    className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors font-medium cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-mono">{post.repliesCount}</span>
                    <span>Replies</span>
                  </button>
                </div>

                <span className="text-[11px] font-medium text-slate-400 capitalize">
                  #{post.category.replace('_', ' ')}
                </span>
              </div>

              {/* Replies Thread */}
              {isReplyOpen && (
                <div className="mt-4 pt-4 border-t border-slate-200/80 bg-slate-50/70 -mx-6 -mb-6 p-6 rounded-b-2xl space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Responses ({post.replies?.length || 0}):
                  </div>

                  {post.replies && post.replies.length > 0 ? (
                    <div className="space-y-2">
                      {post.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-900">
                              {reply.authorName} ({reply.authorUniversity})
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {reply.createdAt}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-1">
                      No replies yet. Be the first to share your experience!
                    </div>
                  )}

                  {/* Reply Input Box */}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendReply(post.id);
                      }}
                      placeholder="Write a supportive reply as an international peer..."
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSendReply(post.id)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Post Modal with Glassmorphism */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-lg w-full shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] border border-white/60 overflow-hidden ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-900">
                Create a Discussion Post
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Topic / Question Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Tips for opening Woori Bank account without ARC?"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="visa_help">Visa & Work Permits</option>
                  <option value="campus_life">Campus Life & Housing</option>
                  <option value="language_exchange">Language Exchange</option>
                  <option value="jobs_internships">Jobs & Internships</option>
                  <option value="general">General Discussion</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detailed Discussion Body
                </label>
                <textarea
                  rows={4}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Share your experience, question, or event details..."
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Publish to Community
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
