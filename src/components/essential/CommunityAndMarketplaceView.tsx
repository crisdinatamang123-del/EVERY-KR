import React, { useState, useMemo } from 'react';
import {
  Users,
  MessageSquare,
  Heart,
  Flag,
  Plus,
  Search,
  Edit3,
  Trash2,
  Send,
  Image as ImageIcon,
  CheckCircle2,
  MapPin,
  Store,
  Bookmark,
  ShieldAlert,
  X,
  Tag,
  Pin,
  Sparkles,
  Lock,
  CornerDownRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  EssentialCommunityChannel,
  EssentialCommunityPost,
  EssentialCommunityReply,
  EssentialMarketplaceCategory,
  EssentialMarketplaceCondition,
  EssentialMarketplaceListing,
  EssentialMarketplaceStatus,
  createEssentialCommunityPost,
  updateEssentialCommunityPost,
  deleteEssentialCommunityPost,
  addEssentialCommunityReply,
  editEssentialCommunityReply,
  deleteEssentialCommunityReply,
  toggleLikeCommunityReply,
  toggleLikeCommunityPost,
  getLikedCommunityPostIds,
  createEssentialMarketplaceListing,
  updateEssentialMarketplaceListingStatus,
  deleteEssentialMarketplaceListing,
  getSavedMarketplaceIds,
  toggleSavedMarketplaceId,
  uploadEssentialHubImage,
  submitEssentialHubSafetyReport
} from '../../services/essentialHubService';
import { openInNaverMap, openInKakaoMap } from '../../utils/koreaMapService';

const COMMUNITY_CHANNELS: EssentialCommunityChannel[] = [
  'All Discussions',
  'Student Q&A',
  'University Communities',
  'City Communities',
  'Country Communities',
  'Study Groups',
  'Housing & Roommates',
  'Part-Time Jobs',
  'Korean Language',
  'Student Experiences'
];

const MARKETPLACE_CATEGORIES: EssentialMarketplaceCategory[] = [
  'Electronics',
  'Furniture',
  'Home Appliances',
  'Books',
  'Clothing',
  'Bicycles',
  'Kitchen Items',
  'Study Materials',
  'Other Student Essentials'
];

const MARKETPLACE_CONDITIONS: EssentialMarketplaceCondition[] = [
  'Brand New',
  'Like New',
  'Good Condition',
  'Fair Condition'
];

// ============================================================================
// MODULE 4: EVERYKR COMMUNITY
// ============================================================================

export const EssentialCommunityModule: React.FC<{
  posts: EssentialCommunityPost[];
  onRefresh: () => void;
}> = ({ posts, onRefresh }) => {
  const { currentUser, setIsAuthModalOpen, showToast } = useApp();
  const [activeChannel, setActiveChannel] = useState<EssentialCommunityChannel>('All Discussions');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedIds, setLikedIds] = useState<Set<string>>(() =>
    getLikedCommunityPostIds(currentUser?.id)
  );
  const [expandedPostId, setExpandedPostId] = useState<string | null>(posts[0]?.id || null);
  const [replyTextByPost, setReplyTextByPost] = useState<Record<string, string>>({});
  const [replyTargetByPost, setReplyTargetByPost] = useState<
    Record<string, { id: string; authorName: string } | null>
  >({});
  const [editingReply, setEditingReply] = useState<{
    postId: string;
    replyId: string;
    content: string;
  } | null>(null);

  // Create / Edit Post Modal
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EssentialCommunityPost | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState<EssentialCommunityChannel>('Student Q&A');
  const [city, setCity] = useState('Seoul');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Safety Report Modal
  const [reportTarget, setReportTarget] = useState<{
    id: string;
    postId?: string;
    title: string;
    type: 'post' | 'comment' | 'reply';
    authorUid?: string;
    authorName?: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('Spam or misleading content');
  const [reportDetails, setReportDetails] = useState('');

  const cities = useMemo(() => {
    const s = new Set<string>(['Seoul', 'Busan', 'Daejeon', 'Daegu', 'Suwon', 'Incheon', 'Gwangju']);
    posts.forEach((p) => {
      if (p.city) s.add(p.city);
    });
    return ['All', ...Array.from(s)];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((p) => {
      if (p.status === 'archived' || p.status === 'hidden') return false;
      if (activeChannel !== 'All Discussions' && p.channel !== activeChannel) return false;
      if (cityFilter !== 'All' && p.city.toLowerCase() !== cityFilter.toLowerCase()) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        (p.authorUniversity || '').toLowerCase().includes(q) ||
        p.authorNationality.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, activeChannel, cityFilter, searchQuery]);

  const openCreateModal = () => {
    if (!currentUser) {
      showToast('Please sign in to create a community discussion post.');
      setIsAuthModalOpen(true);
      return;
    }
    setEditingPost(null);
    setTitle('');
    setContent('');
    setChannel(activeChannel === 'All Discussions' ? 'Student Q&A' : activeChannel);
    setCity('Seoul');
    setTagsInput('');
    setImageUrl('');
    setIsPostModalOpen(true);
  };

  const openEditModal = (post: EssentialCommunityPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setContent(post.content);
    setChannel(post.channel);
    setCity(post.city);
    setTagsInput(post.tags.join(', '));
    setImageUrl(post.imageUrl || '');
    setIsPostModalOpen(true);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadEssentialHubImage(file, 'community');
      setImageUrl(url);
      showToast('Image attached to post.');
    } catch (err: any) {
      showToast(err?.message || 'Could not upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (editingPost) {
        await updateEssentialCommunityPost({
          postId: editingPost.id,
          title,
          content,
          channel,
          city,
          tags: parsedTags
        });
        showToast('Your community post has been updated.');
      } else {
        await createEssentialCommunityPost({
          title,
          content,
          channel,
          city,
          tags: parsedTags,
          imageUrl,
          authorId: currentUser.id,
          authorName: currentUser.fullName || currentUser.name || 'Student Member',
          authorEmail: currentUser.email,
          authorRole: currentUser.role === 'admin' ? 'EveryKR Moderator' : 'Student Member',
          authorNationality: currentUser.nationality || 'International',
          authorUniversity: currentUser.university || currentUser.preferredUniversity || '',
          isVerifiedAuthor: Boolean(currentUser.emailVerified || currentUser.role === 'admin')
        });
        showToast('Community post published!');
      }
      setIsPostModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (post: EssentialCommunityPost) => {
    await deleteEssentialCommunityPost(post.id);
    showToast('Post removed.');
    onRefresh();
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) {
      showToast('Please sign in to like community posts.');
      setIsAuthModalOpen(true);
      return;
    }
    try {
      await toggleLikeCommunityPost(postId, {
        uid: currentUser.id,
        name: currentUser.fullName || currentUser.name,
        email: currentUser.email,
      });
      setLikedIds(getLikedCommunityPostIds(currentUser.id));
      onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Unable to update like.');
    }
  };

  const handleAddReply = async (postId: string) => {
    if (!currentUser) {
      showToast('Please sign in to comment or reply.');
      setIsAuthModalOpen(true);
      return;
    }
    const text = (replyTextByPost[postId] || '').trim();
    if (!text) return;
    const replyTarget = replyTargetByPost[postId];
    try {
      await addEssentialCommunityReply({
        postId,
        parentReplyId: replyTarget?.id || null,
        content: text,
        authorId: currentUser.id,
        authorName: currentUser.fullName || currentUser.name || 'Student Member',
        authorEmail: currentUser.email,
        authorUniversity: currentUser.university || currentUser.preferredUniversity || '',
        authorCity: currentUser.currentCity || 'Seoul',
        authorCountry: currentUser.nationality || 'International',
        isVerifiedStudent: Boolean(currentUser.emailVerified || currentUser.role === 'admin')
      });
      setReplyTextByPost((prev) => ({ ...prev, [postId]: '' }));
      setReplyTargetByPost((prev) => ({ ...prev, [postId]: null }));
      showToast(replyTarget ? 'Reply posted!' : 'Comment posted!');
      onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Could not post comment.');
    }
  };

  const handleSaveEditedReply = async () => {
    if (!editingReply || !currentUser) return;
    try {
      await editEssentialCommunityReply({
        postId: editingReply.postId,
        replyId: editingReply.replyId,
        content: editingReply.content,
        actorUid: currentUser.id,
      });
      setEditingReply(null);
      showToast('Comment updated.');
      onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Could not update comment.');
    }
  };

  const handleDeleteReply = async (postId: string, replyId: string) => {
    if (!currentUser) return;
    try {
      await deleteEssentialCommunityReply({
        postId,
        replyId,
        actorUid: currentUser.id,
        isAdmin: currentUser.role === 'admin',
      });
      showToast('Comment deleted.');
      onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Could not delete comment.');
    }
  };

  const handleLikeReply = async (postId: string, replyId: string) => {
    if (!currentUser) {
      showToast('Please sign in to like comments.');
      setIsAuthModalOpen(true);
      return;
    }
    try {
      await toggleLikeCommunityReply({
        postId,
        replyId,
        userId: currentUser.id,
      });
      onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Could not like comment.');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    await submitEssentialHubSafetyReport({
      targetType: reportTarget.type,
      targetId: reportTarget.id,
      postId: reportTarget.postId,
      targetTitle: reportTarget.title,
      targetAuthorUid: reportTarget.authorUid,
      targetAuthorName: reportTarget.authorName,
      reason: reportReason,
      details: reportDetails,
      reporterId: currentUser?.id || 'guest',
      reporterName: currentUser?.fullName || currentUser?.name || 'Community Member',
      reporterEmail: currentUser?.email || ''
    });
    setReportTarget(null);
    setReportDetails('');
    showToast('Safety report submitted to EveryKR moderators.');
  };

  return (
    <div className="space-y-6">
      {/* Community Header & Action Bar */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#10243A] dark:text-white">
              EveryKR International Student Community
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Connect by university, city, country, study group, housing, part-time jobs, and Korean language learning.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-[#1769AA] hover:bg-[#10243A] text-white transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Community Post</span>
          </button>
        </div>

        {/* Channel Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {COMMUNITY_CHANNELS.map((ch) => {
            const active = activeChannel === ch;
            return (
              <button
                key={ch}
                type="button"
                onClick={() => setActiveChannel(ch)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
                  active
                    ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A] dark:border-[#19B6A4]'
                    : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                {ch}
              </button>
            );
          })}
        </div>

        {/* Search & City Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCityFilter(c)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  cityFilter === c
                    ? 'bg-[#1769AA]/15 text-[#1769AA] dark:bg-[#19B6A4]/20 dark:text-[#19B6A4]'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {c === 'All' ? 'All Cities' : c}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search university, country, topic..."
              className="w-full h-9 ps-9 pe-8 text-xs bg-[#F8FAFC] dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Community Discussion Feed */}
      <div className="space-y-4">
        {filteredPosts.map((post) => {
          const isOwner =
            Boolean(currentUser) &&
            (currentUser?.id === post.authorId || currentUser?.role === 'admin');
          const isLiked = Boolean(
            currentUser &&
              (post.likedByUids?.includes(currentUser.id) || likedIds.has(post.id))
          );
          const isExpanded = expandedPostId === post.id;
          const visibleReplies = (post.replies || []).filter(
            (r) => r.status !== 'deleted' && r.status !== 'hidden'
          );
          const topLevelComments = visibleReplies.filter((r) => !r.parentReplyId);

          return (
            <div
              key={post.id}
              className="bg-white dark:bg-[#10243A] rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4"
            >
              {/* Pinned / Featured / Locked Badges */}
              {(post.pinned || post.featured || post.commentsLocked) && (
                <div className="flex flex-wrap items-center gap-2">
                  {post.pinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                      <Pin className="w-3 h-3" />
                      <span>Pinned Discussion</span>
                    </span>
                  )}
                  {post.featured && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
                      <Sparkles className="w-3 h-3" />
                      <span>Featured Guide</span>
                    </span>
                  )}
                  {post.commentsLocked && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Lock className="w-3 h-3" />
                      <span>Comments Locked</span>
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#10243A] dark:bg-[#19B6A4] text-white dark:text-[#10243A] font-extrabold text-sm flex items-center justify-center shrink-0">
                    {post.authorName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#10243A] dark:text-white">
                        {post.authorName}
                      </span>
                      {post.isVerifiedAuthor && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          {post.authorRole}
                        </span>
                      )}
                      {!post.isVerifiedAuthor && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {post.authorRole}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        · {post.authorNationality}
                        {post.authorUniversity ? ` · ${post.authorUniversity}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-semibold text-[#1769AA] dark:text-[#19B6A4]">
                        {post.channel}
                      </span>
                      <span>·</span>
                      <span>{post.city}</span>
                      <span>·</span>
                      <span>{post.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isOwner && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(post)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#1769AA] cursor-pointer"
                        title="Edit Post"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setReportTarget({
                        id: post.id,
                        postId: post.id,
                        title: post.title,
                        type: 'post',
                        authorUid: post.authorId,
                        authorName: post.authorName,
                      })
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 cursor-pointer"
                    title="Report Post"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white leading-snug">
                  {post.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>
              </div>

              {post.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-80">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Post Footer Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleLike(post.id)}
                    className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      isLiked
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50/60'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 ${isLiked ? 'fill-current ekr-heart-pop' : ''}`} />
                    <span>{post.likesCount}</span>
                    <span>{isLiked ? 'Liked' : 'Like'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 ekr-icon-msg-bounce" />
                    <span>{visibleReplies.length} Comments</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-400">
                  {currentUser ? 'Authenticated Community Member' : 'Sign in to Like or Comment'}
                </span>
              </div>

              {/* Expanded Comments, Nested Replies & Composer */}
              {isExpanded && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/70 dark:bg-[#0B1523]/70 p-4 rounded-xl">
                  {topLevelComments.length > 0 ? (
                    <div className="space-y-3">
                      {topLevelComments.map((rep) => {
                        const childReplies = visibleReplies.filter(
                          (c) => c.parentReplyId === rep.id
                        );
                        const canModifyComment =
                          Boolean(currentUser) &&
                          (currentUser?.id === rep.authorId || currentUser?.role === 'admin');
                        const isCommentLiked = Boolean(
                          currentUser && rep.likedByUids?.includes(currentUser.id)
                        );

                        return (
                          <div key={rep.id} className="space-y-2">
                            <div className="bg-white dark:bg-[#10243A] p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-[#10243A] dark:text-white">
                                    {rep.authorName}
                                  </span>
                                  {rep.isVerifiedStudent && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Verified
                                    </span>
                                  )}
                                  {rep.authorUniversity && (
                                    <span className="text-[11px] text-[#1769AA] dark:text-[#19B6A4] font-semibold">
                                      {rep.authorUniversity}
                                    </span>
                                  )}
                                  {rep.authorCountry && (
                                    <span className="text-[11px] text-slate-400">
                                      ({rep.authorCountry})
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleLikeReply(post.id, rep.id)}
                                    className={`group inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer ${
                                      isCommentLiked
                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                                        : 'text-slate-400 hover:text-rose-500'
                                    }`}
                                  >
                                    <Heart className={`w-3 h-3 transition-transform duration-200 group-hover:scale-110 ${isCommentLiked ? 'fill-current ekr-heart-pop' : ''}`} />
                                    <span>{rep.likesCount || 0}</span>
                                  </button>

                                  {!post.commentsLocked && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReplyTargetByPost((prev) => ({
                                          ...prev,
                                          [post.id]: { id: rep.id, authorName: rep.authorName },
                                        }))
                                      }
                                      className="text-[11px] font-bold text-[#1769AA] dark:text-[#19B6A4] hover:underline cursor-pointer"
                                    >
                                      Reply
                                    </button>
                                  )}

                                  {canModifyComment && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingReply({
                                            postId: post.id,
                                            replyId: rep.id,
                                            content: rep.content,
                                          })
                                        }
                                        className="text-slate-400 hover:text-[#1769AA] cursor-pointer"
                                        title="Edit Comment"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteReply(post.id, rep.id)}
                                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                        title="Delete Comment"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReportTarget({
                                        id: rep.id,
                                        postId: post.id,
                                        title: `Comment by ${rep.authorName}`,
                                        type: 'comment',
                                        authorUid: rep.authorId,
                                        authorName: rep.authorName,
                                      })
                                    }
                                    className="text-slate-400 hover:text-amber-600 cursor-pointer"
                                    title="Report Comment"
                                  >
                                    <Flag className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {editingReply?.replyId === rep.id ? (
                                <div className="flex items-center gap-2 pt-1">
                                  <input
                                    type="text"
                                    value={editingReply.content}
                                    onChange={(e) =>
                                      setEditingReply({ ...editingReply, content: e.target.value })
                                    }
                                    className="flex-1 h-8 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1523]"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSaveEditedReply}
                                    className="px-3 py-1 rounded-lg bg-[#1769AA] text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingReply(null)}
                                    className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-[11px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {rep.content}
                                </p>
                              )}
                            </div>

                            {/* Nested Replies under this Comment */}
                            {childReplies.length > 0 && (
                              <div className="ps-6 space-y-2">
                                {childReplies.map((child: EssentialCommunityReply) => {
                                  const canModChild =
                                    Boolean(currentUser) &&
                                    (currentUser?.id === child.authorId ||
                                      currentUser?.role === 'admin');
                                  const isChildLiked = Boolean(
                                    currentUser && child.likedByUids?.includes(currentUser.id)
                                  );

                                  return (
                                    <div
                                      key={child.id}
                                      className="bg-white/90 dark:bg-[#10243A]/90 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                          <CornerDownRight className="w-3 h-3 text-slate-400" />
                                          <span className="font-bold text-[#10243A] dark:text-white">
                                            {child.authorName}
                                          </span>
                                          {child.isVerifiedStudent && (
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleLikeReply(post.id, child.id)}
                                            className={`inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                                              isChildLiked ? 'text-rose-600' : 'text-slate-400'
                                            }`}
                                          >
                                            <Heart
                                              className={`w-3 h-3 ${isChildLiked ? 'fill-current' : ''}`}
                                            />
                                            <span>{child.likesCount || 0}</span>
                                          </button>
                                          {canModChild && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteReply(post.id, child.id)}
                                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setReportTarget({
                                                id: child.id,
                                                postId: post.id,
                                                title: `Reply by ${child.authorName}`,
                                                type: 'reply',
                                                authorUid: child.authorId,
                                                authorName: child.authorName,
                                              })
                                            }
                                            className="text-slate-400 hover:text-amber-600 cursor-pointer"
                                          >
                                            <Flag className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                      <p className="text-slate-600 dark:text-slate-300 ps-4">
                                        {child.content}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No comments yet. Be the first student to share helpful advice!
                    </p>
                  )}

                  {post.commentsLocked ? (
                    <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Comments are locked on this post by an EveryKR moderator.</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      {replyTargetByPost[post.id] && (
                        <div className="flex items-center justify-between text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg">
                          <span>
                            Replying to <strong>{replyTargetByPost[post.id]?.authorName}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setReplyTargetByPost((prev) => ({ ...prev, [post.id]: null }))
                            }
                            className="underline cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={replyTextByPost[post.id] || ''}
                          onChange={(e) =>
                            setReplyTextByPost((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder={
                            replyTargetByPost[post.id]
                              ? `Write a reply to ${replyTargetByPost[post.id]?.authorName}...`
                              : 'Write a helpful comment...'
                          }
                          className="flex-1 h-9 px-3.5 text-xs bg-white dark:bg-[#10243A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddReply(post.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#10243A] dark:bg-[#19B6A4] text-white dark:text-[#10243A] cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{replyTargetByPost[post.id] ? 'Reply' : 'Comment'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create / Edit Post Modal */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePost}
            className="bg-white dark:bg-[#10243A] rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#10243A] dark:text-white">
                {editingPost ? 'Edit Community Post' : 'Create Community Discussion Post'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Community Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as EssentialCommunityChannel)}
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
                >
                  {COMMUNITY_CHANNELS.filter((c) => c !== 'All Discussions').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">City in Korea</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Post Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g., Looking for TOPIK II study group near Yonsei / Sinchon"
                className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Details & Question</label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                placeholder="Share helpful details, tips, or questions for fellow international students..."
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="ARC, Dormitory, Sinchon"
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Attach Image (Optional)</label>
                <label className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-[#1769AA]" />
                  <span>{uploadingImage ? 'Uploading...' : imageUrl ? 'Image Attached' : 'Choose Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingImage}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-[#1769AA] text-white cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Publishing...' : editingPost ? 'Save Changes' : 'Publish Post'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Report Modal */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitReport}
            className="bg-white dark:bg-[#10243A] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#10243A] dark:text-white">
                Report Community Content
              </h3>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">Reporting: {reportTarget.title}</p>
            <div>
              <label className="block text-xs font-bold mb-1">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
              >
                <option value="Spam or misleading content">Spam or misleading content</option>
                <option value="Suspected financial or job scam">Suspected financial or job scam</option>
                <option value="Illegal visa/brokerage solicitation">Illegal visa/brokerage solicitation</option>
                <option value="Harassment or abusive language">Harassment or abusive language</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Additional Details</label>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Optional context for moderators..."
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-600 text-white cursor-pointer"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODULE 5: EVERYKR SECOND-HAND MARKETPLACE
// ============================================================================

export const EssentialMarketplaceModule: React.FC<{
  listings: EssentialMarketplaceListing[];
  onRefresh: () => void;
}> = ({ listings, onRefresh }) => {
  const { currentUser, setIsAuthModalOpen, showToast } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<'All' | EssentialMarketplaceCategory>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'saved'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(() => getSavedMarketplaceIds());
  const [contactModalListing, setContactModalListing] = useState<EssentialMarketplaceListing | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Create Listing Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EssentialMarketplaceCategory>('Electronics');
  const [priceKRW, setPriceKRW] = useState<number>(45000);
  const [condition, setCondition] = useState<EssentialMarketplaceCondition>('Good Condition');
  const [city, setCity] = useState('Seoul');
  const [neighborhood, setNeighborhood] = useState('');
  const [meetupStation, setMeetupStation] = useState('');
  const [description, setDescription] = useState('');
  const [sellerContact, setSellerContact] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = listings.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (sortBy === 'saved' && !savedIds.has(item.id)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.neighborhood.toLowerCase().includes(q) ||
        (item.sellerUniversity || '').toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price_asc') return a.priceKRW - b.priceKRW;
      if (sortBy === 'price_desc') return b.priceKRW - a.priceKRW;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [listings, selectedCategory, sortBy, searchQuery, savedIds]);

  const handleToggleSave = (id: string) => {
    const nowSaved = toggleSavedMarketplaceId(id);
    setSavedIds(getSavedMarketplaceIds());
    showToast(nowSaved ? 'Saved to your Marketplace favorites.' : 'Removed from saved items.');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadEssentialHubImage(file, 'marketplace');
      setUploadedImages((prev) => [...prev, url]);
      showToast('Item photo uploaded.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      await createEssentialMarketplaceListing({
        title,
        category,
        priceKRW: Number(priceKRW),
        condition,
        city,
        neighborhood,
        meetupStationOrLandmark: meetupStation || `${city} Subway Station`,
        description,
        images: uploadedImages,
        sellerId: currentUser.id,
        sellerName: currentUser.fullName || currentUser.name || 'Student Seller',
        sellerUniversity: '',
        sellerContact: sellerContact || currentUser.email || 'In-App Student Message',
        contactMethod: 'Safe In-App Inquiry'
      });
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setUploadedImages([]);
      showToast('Second-hand item listed on EveryKR Marketplace!');
      onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Could not create listing.');
    }
  };

  const handleStatusChange = async (id: string, status: EssentialMarketplaceStatus) => {
    await updateEssentialMarketplaceListingStatus(id, status);
    showToast(`Listing marked as ${status}.`);
    onRefresh();
  };

  const handleDeleteListing = async (id: string) => {
    await deleteEssentialMarketplaceListing(id);
    showToast('Marketplace listing deleted.');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Mandatory Anti-Scam & Safe Meetup Notice (No Online Escrow) */}
      <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 dark:text-amber-100 space-y-1">
          <p className="font-bold text-sm">
            Student Marketplace Safety Rule: In-Person Campus or Subway Station Meetup Only
          </p>
          <p className="leading-relaxed">
            EveryKR does not process online payments or escrow. Never wire money or pay deposits in advance before inspecting the item in person at a well-lit university campus gate or subway station exit. Use the <strong>Naver Map</strong> or <strong>Kakao Map</strong> meetup button on any listing to verify the meetup location.
          </p>
        </div>
      </div>

      {/* Marketplace Header & Controls */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#10243A] dark:text-white">
              EveryKR Student Second-Hand Marketplace ({filteredListings.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Buy and sell verified student essentials in KRW (₩) across Korean university neighborhoods.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                showToast('Please sign in to post a second-hand item.');
                setIsAuthModalOpen(true);
                return;
              }
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-[#1769AA] hover:bg-[#10243A] text-white transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Sell an Item (KRW)</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border ${
              selectedCategory === 'All'
                ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A]'
                : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            All Categories ({listings.length})
          </button>
          {MARKETPLACE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A]'
                  : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-3 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
            >
              <option value="newest">Sort: Newest Listed</option>
              <option value="price_asc">Sort: Price Low to High (₩)</option>
              <option value="price_desc">Sort: Price High to Low (₩)</option>
              <option value="saved">Saved / Favorites ({savedIds.size})</option>
            </select>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search monitor, rice cooker, bicycle, city..."
              className="w-full h-9 ps-9 pe-8 text-xs bg-[#F8FAFC] dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Marketplace Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredListings.map((item) => {
          const isSaved = savedIds.has(item.id);
          const isSeller =
            Boolean(currentUser) &&
            (currentUser?.id === item.sellerId || currentUser?.role === 'admin');
          const mapTarget = {
            nameEn: item.meetupStationOrLandmark || item.location,
            nameKo: item.meetupStationOrLandmark || item.city,
            addressEn: `${item.neighborhood}, ${item.city}`,
            addressKo: `${item.city} ${item.neighborhood}`,
            city: item.city,
            province: item.city,
            lat: item.latitude ?? 37.5665,
            lng: item.longitude ?? 126.978
          };

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="relative h-48 bg-slate-100 dark:bg-slate-900">
                  {item.images[0] && (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                        item.status === 'Available'
                          ? 'bg-emerald-600 text-white'
                          : item.status === 'Reserved'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                      {item.condition}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSave(item.id)}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 dark:bg-[#10243A]/90 text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Save Listing"
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#1769AA] text-[#1769AA]' : ''}`} />
                  </button>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold text-[#1769AA] dark:text-[#19B6A4]">
                      {item.category}
                    </span>
                    <span>{item.postedDate}</span>
                  </div>

                  <h3 className="text-base font-extrabold text-[#10243A] dark:text-white leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xl font-black text-[#10243A] dark:text-[#19B6A4] font-mono">
                    ₩{item.priceKRW.toLocaleString()} KRW
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                    <p className="inline-flex items-center gap-1 font-semibold text-[#10243A] dark:text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" aria-hidden="true" />
                      <span>{item.city} · {item.neighborhood}</span>
                    </p>
                    <p>
                      Seller: <strong>{item.sellerName}</strong>
                      {item.sellerUniversity ? ` (${item.sellerUniversity})` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 space-y-2">
                {/* Meetup Location Map Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openInNaverMap(mapTarget)}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#03C75A]/15 text-[#029e47] dark:text-[#03C75A] cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Meetup on Naver</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openInKakaoMap(mapTarget)}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#FEE500]/40 text-amber-950 dark:text-amber-300 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Meetup on Kakao</span>
                  </button>
                </div>

                {isSeller && (
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    {(['Available', 'Reserved', 'Sold'] as EssentialMarketplaceStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusChange(item.id, st)}
                        className={`flex-1 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                          item.status === st
                            ? 'bg-[#10243A] text-white border-[#10243A]'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleDeleteListing(item.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setContactModalListing(item)}
                  disabled={item.status === 'Sold'}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {item.status === 'Sold' ? 'Item Sold' : 'Contact Student Seller'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contact Seller Modal */}
      {contactModalListing && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#10243A] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[#1769AA] dark:text-[#19B6A4]">
                  {contactModalListing.category} · ₩{contactModalListing.priceKRW.toLocaleString()}
                </span>
                <h3 className="text-base font-extrabold text-[#10243A] dark:text-white mt-0.5">
                  {contactModalListing.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setContactModalListing(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-[#0B1523] p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <p>
                <strong>Seller:</strong> {contactModalListing.sellerName}{' '}
                {contactModalListing.sellerUniversity
                  ? `(${contactModalListing.sellerUniversity})`
                  : ''}
              </p>
              <p>
                <strong>Preferred Meetup Station:</strong>{' '}
                {contactModalListing.meetupStationOrLandmark || contactModalListing.location}
              </p>
              <p>
                <strong>Contact Instructions:</strong> {contactModalListing.sellerContact}
              </p>
            </div>

            <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl">
              Safety Reminder: Meet at the subway station exit or campus gate during daytime and inspect the item before transferring KRW.
            </p>

            <button
              type="button"
              onClick={() => setContactModalListing(null)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#10243A] text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Marketplace Listing Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateListing}
            className="bg-white dark:bg-[#10243A] rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#10243A] dark:text-white">
                List a Student Item on EveryKR Marketplace
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Item Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g., LG 24-inch Monitor / Cuckoo Rice Cooker"
                className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EssentialMarketplaceCategory)}
                  className="w-full h-10 px-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
                >
                  {MARKETPLACE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Price (KRW ₩)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={priceKRW}
                  onChange={(e) => setPriceKRW(Number(e.target.value))}
                  required
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as EssentialMarketplaceCondition)}
                  className="w-full h-10 px-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
                >
                  {MARKETPLACE_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">District / University Area</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  required
                  placeholder="e.g., Sinchon / Hoegi / PNU Front Gate"
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Meetup Subway Station / Gate</label>
                <input
                  type="text"
                  value={meetupStation}
                  onChange={(e) => setMeetupStation(e.target.value)}
                  required
                  placeholder="e.g., Sinchon Station Exit 3"
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Item Photo</label>
                <label className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-[#1769AA]" />
                  <span>
                    {uploadingPhoto
                      ? 'Uploading...'
                      : uploadedImages.length > 0
                      ? `${uploadedImages.length} Photo(s) Ready`
                      : 'Upload Item Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Contact Method / Note</label>
              <input
                type="text"
                value={sellerContact}
                onChange={(e) => setSellerContact(e.target.value)}
                placeholder="e.g., KakaoTalk OpenChat or University Email"
                className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Describe condition, usage duration, and included accessories..."
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingPhoto}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-[#1769AA] text-white cursor-pointer"
              >
                Publish Listing
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
