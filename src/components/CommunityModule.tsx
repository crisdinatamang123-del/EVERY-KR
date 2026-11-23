import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CommunityPost } from '../types';
import {
  Users,
  MessageSquare,
  Heart,
  Bookmark,
  PlusCircle,
  Search,
  MapPin,
  Send,
  Flag,
  CheckCircle,
  X
} from 'lucide-react';

interface CommunityModuleProps {
  isFullPage?: boolean;
}

export const CommunityModule: React.FC<CommunityModuleProps> = ({ isFullPage = false }) => {
  const {
    posts,
    likePost,
    addPostReply,
    setIsCreatePostModalOpen,
    showToast,
    setActivePage
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Post detail modal & replies
  const [activePost, setActivePost] = useState<CommunityPost | null>(null);
  const [replyText, setReplyText] = useState('');

  const categories = [
    'All',
    'General Discussion',
    'University Life',
    'Visa & Immigration',
    'Jobs & Careers',
    'Accommodation',
    'Korean Language'
  ];

  const cities = ['All', 'Seoul', 'Busan', 'Daejeon', 'Incheon', 'Daegu', 'Gwangju'];

  const filteredPosts = posts.filter((p) => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchCity = selectedCity === 'All' || p.city === selectedCity;
    const matchSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchCity && matchSearch;
  });

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePost || !replyText.trim()) return;
    addPostReply(activePost.id, replyText.trim());
    setReplyText('');
    // Update local modal view
    const updated = posts.find(p => p.id === activePost.id);
    if (updated) setActivePost(updated);
  };

  return (
    <section className={`bg-transparent ${isFullPage ? 'py-10 min-h-[82vh]' : 'py-16'} border-b border-[#0754B8]/10 dark:border-white/10`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2">
              <span className="w-4 h-0.5 rounded-full bg-[#FFB800]" aria-hidden="true" />
              <span className="text-[11px] font-extrabold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-[0.2em]">
                Student Voices &amp; Experiences
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#061B49] dark:text-white tracking-tight">
              International Student Community
            </h2>
            <p className="text-sm text-[#4B607F] dark:text-[#B8C9E5] max-w-2xl">
              Ask questions, exchange survival tips, organize study meetups, and share authentic advice with fellow scholars living across South Korea.
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <button
              onClick={() => setIsCreatePostModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white ekr-glass-btn-primary rounded-xl transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Start Discussion</span>
            </button>

            {!isFullPage && (
              <button
                onClick={() => setActivePage('community')}
                className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline underline-offset-4 cursor-pointer"
              >
                Join the Community →
              </button>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="ekr-glass-panel p-4 rounded-2xl mb-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search discussions by topic, visa keyword, or university..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm ekr-glass-input rounded-xl focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm ekr-glass-input rounded-xl focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-[#0B204A]">Category: {c}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm ekr-glass-input rounded-xl focus:outline-none"
              >
                {cities.map((city) => (
                  <option key={city} value={city} className="bg-white dark:bg-[#0B204A]">City: {city}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => setActivePost(post)}
              className="ekr-glass-card rounded-2xl p-5 cursor-pointer"
            >
              {/* Unboxed Metadata (Anti-pill) */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5] mb-2">
                <span className="font-semibold text-[#10213D] dark:text-white">{post.authorName}</span>
                <span aria-hidden="true">·</span>
                <span>{post.authorRole}</span>
                <span aria-hidden="true">·</span>
                <span>From {post.authorNationality}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#0754B8] dark:text-[#60A5FA] font-medium">{post.category}</span>
                <span aria-hidden="true">·</span>
                <span className="opacity-75">{post.timestamp}</span>
              </div>

              {/* Title & Content */}
              <h3 className="text-base font-bold text-[#10213D] dark:text-white hover:text-[#0754B8] dark:hover:text-[#60A5FA] transition-colors leading-snug">
                {post.title}
              </h3>
              <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-2 line-clamp-2 leading-relaxed">
                {post.content}
              </p>

              {/* Footer Engagement bar */}
              <div className="mt-4 pt-3 border-t border-[#0754B8]/10 dark:border-white/10 flex items-center justify-between text-xs text-[#526685] dark:text-[#B8C9E5]">
                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      likePost(post.id);
                    }}
                    className="flex items-center gap-1.5 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>{post.likesCount}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 opacity-70" />
                    <span>{post.repliesCount} replies</span>
                  </div>

                  <span className="flex items-center gap-1 opacity-80">
                    <MapPin className="w-3 h-3" />
                    <span>{post.city}</span>
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    showToast('Report submitted for moderator review');
                  }}
                  className="opacity-75 hover:opacity-100 flex items-center gap-1 cursor-pointer"
                  title="Report spam or inappropriate content"
                >
                  <Flag className="w-3 h-3" />
                  <span>Report</span>
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* Post Detail & Comments Modal */}
      {activePost && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#061B49]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl ekr-glass-modal rounded-3xl overflow-hidden my-8 animate-fade-in max-h-[90vh] flex flex-col">
            
            <div className="p-6 border-b border-[#0754B8]/10 dark:border-white/10 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5]">
                  <span className="font-semibold text-[#10213D] dark:text-white">{activePost.authorName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activePost.authorNationality}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#0754B8] dark:text-[#60A5FA] font-bold">{activePost.category}</span>
                </div>
                <h3 className="text-lg font-bold text-[#10213D] dark:text-white mt-1">{activePost.title}</h3>
              </div>
              <button
                onClick={() => setActivePost(null)}
                className="p-1.5 text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Full Content */}
              <div className="text-xs sm:text-sm text-[#10213D] dark:text-slate-100 leading-relaxed whitespace-pre-wrap ekr-glass-subtle p-4 rounded-xl">
                {activePost.content}
              </div>

              {/* Replies Thread */}
              <div>
                <h4 className="text-xs font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider mb-3">
                  Discussion Replies ({activePost.replies?.length || 0})
                </h4>

                <div className="space-y-3">
                  {activePost.replies && activePost.replies.length > 0 ? (
                    activePost.replies.map((rep) => (
                      <div key={rep.id} className="p-3 ekr-glass-subtle rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between text-[#526685] dark:text-[#B8C9E5] text-[11px]">
                          <span className="font-semibold text-[#10213D] dark:text-white">{rep.authorName}</span>
                          <span>{rep.timestamp}</span>
                        </div>
                        <p className="text-[#10213D] dark:text-slate-200 leading-relaxed">{rep.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#526685] dark:text-[#B8C9E5] italic">No replies yet. Be the first to share your experience!</p>
                  )}
                </div>
              </div>

              {/* Add Reply Form */}
              <form onSubmit={handleReplySubmit} className="pt-4 border-t border-[#0754B8]/10 dark:border-white/10">
                <label className="block text-xs font-semibold text-[#10213D] dark:text-white mb-1.5">Join the conversation</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a helpful response or answer..."
                    className="flex-1 px-3 py-2 text-xs ekr-glass-input rounded-xl focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white ekr-glass-btn-primary rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>Reply</span>
                  </button>
                </div>
              </form>

            </div>

          </div>
        </div>
      )}

    </section>
  );
};
