import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  MessageSquare,
  Heart,
  Flag,
  Pin,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Search,
  RefreshCw,
  BarChart3,
  UserX,
  UserCheck,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  EssentialCommunityPost,
  EssentialCommunityReply,
  StoredPostLikeEntry,
  fetchEssentialCommunityPosts,
  fetchPostLikesForAdmin,
  adminRemoveFraudulentLikeDoc,
  adminUpdateCommunityPostModerationDoc,
  adminModerateCommunityReplyDoc,
  deleteEssentialCommunityPost,
  fetchCommunityUserRestrictions,
  saveCommunityUserRestrictionDoc,
  fetchCommunityModerationReports,
  resolveCommunityModerationReportDoc,
} from '../../services/essentialHubService';
import type {
  CommunityUserRestrictionRecord,
  CommunityModerationReportRecord,
  UserProfile,
} from '../../types';

export const AdminCommunityControlTab: React.FC<{
  adminUid: string;
  adminName: string;
  adminEmail: string;
  users?: UserProfile[];
  initialSection?: 'posts' | 'likes_comments' | 'users' | 'reports' | 'analytics';
  onSuccessToast: (msg: string) => void;
}> = ({
  adminUid,
  adminName,
  adminEmail,
  users = [],
  initialSection = 'posts',
  onSuccessToast,
}) => {
  const [activeSection, setActiveSection] = useState<
    'posts' | 'likes_comments' | 'users' | 'reports' | 'analytics'
  >(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const [posts, setPosts] = useState<EssentialCommunityPost[]>([]);
  const [restrictions, setRestrictions] = useState<CommunityUserRestrictionRecord[]>([]);
  const [reports, setReports] = useState<CommunityModerationReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Like Inspector State
  const [selectedPostForLikes, setSelectedPostForLikes] = useState<EssentialCommunityPost | null>(
    null
  );
  const [postLikesList, setPostLikesList] = useState<StoredPostLikeEntry[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [removeLikeReason, setRemoveLikeReason] = useState('');

  // User Restriction Modal State
  const [editingRestrictionUser, setEditingRestrictionUser] = useState<{
    userId: string;
    userName: string;
    userEmail: string;
    restrictionStatus: CommunityUserRestrictionRecord['restrictionStatus'];
    canPost: boolean;
    canComment: boolean;
    canLike: boolean;
    reason: string;
  } | null>(null);

  // Report Resolution Modal
  const [resolvingReport, setResolvingReport] = useState<CommunityModerationReportRecord | null>(
    null
  );
  const [reportActionInput, setReportActionInput] = useState('Content Reviewed & Moderated');
  const [reportNotesInput, setReportNotesInput] = useState('');

  const adminActor = useMemo(
    () => ({
      uid: adminUid || 'admin',
      name: adminName || 'Administrator',
      email: adminEmail || 'admin@everykr.com',
    }),
    [adminUid, adminName, adminEmail]
  );

  const loadCommunityData = async () => {
    setLoading(true);
    try {
      const [allPosts, allRestrictions, allReports] = await Promise.all([
        fetchEssentialCommunityPosts(true),
        fetchCommunityUserRestrictions(),
        fetchCommunityModerationReports(),
      ]);
      setPosts(allPosts);
      setRestrictions(allRestrictions);
      setReports(allReports);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunityData();
  }, []);

  const openLikesInspector = async (post: EssentialCommunityPost) => {
    setSelectedPostForLikes(post);
    setLoadingLikes(true);
    try {
      const likes = await fetchPostLikesForAdmin(post.id);
      setPostLikesList(likes);
    } finally {
      setLoadingLikes(false);
    }
  };

  const handleRemoveFraudulentLike = async (likeEntry: StoredPostLikeEntry) => {
    if (!selectedPostForLikes) return;
    const reason = removeLikeReason.trim() || 'Fraudulent or policy-violating Like removed by moderator';
    await adminRemoveFraudulentLikeDoc({
      postId: selectedPostForLikes.id,
      postTitle: selectedPostForLikes.title,
      userId: likeEntry.userId,
      reason,
      adminActor,
    });
    const refreshedLikes = await fetchPostLikesForAdmin(selectedPostForLikes.id);
    setPostLikesList(refreshedLikes);
    await loadCommunityData();
    onSuccessToast(`Removed Like by ${likeEntry.userId} and recorded reason in Audit Logs.`);
  };

  const handlePostToggle = async (
    post: EssentialCommunityPost,
    field: 'pinned' | 'featured' | 'commentsLocked' | 'visibility'
  ) => {
    if (field === 'visibility') {
      const nextStatus = post.status === 'published' ? 'hidden' : 'published';
      await adminUpdateCommunityPostModerationDoc({
        postId: post.id,
        updates: { status: nextStatus },
        adminActor,
      });
      onSuccessToast(`Post "${post.title}" is now ${nextStatus}.`);
    } else {
      const nextVal = !post[field];
      await adminUpdateCommunityPostModerationDoc({
        postId: post.id,
        updates: { [field]: nextVal },
        adminActor,
      });
      onSuccessToast(`Updated "${post.title}" (${field}: ${nextVal ? 'Yes' : 'No'}).`);
    }
    await loadCommunityData();
  };

  const handleDeletePostAdmin = async (post: EssentialCommunityPost) => {
    await deleteEssentialCommunityPost(post.id);
    await loadCommunityData();
    onSuccessToast(`Deleted community post "${post.title}".`);
  };

  const handleModerateComment = async (
    postId: string,
    replyId: string,
    action: 'hide' | 'restore' | 'delete'
  ) => {
    await adminModerateCommunityReplyDoc({
      postId,
      replyId,
      action,
      reason: 'Moderated via Community Admin Control Center',
      adminActor,
    });
    await loadCommunityData();
    onSuccessToast(`Comment ${action === 'delete' ? 'deleted' : action === 'hide' ? 'hidden' : 'restored'}.`);
  };

  const handleSaveUserRestriction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestrictionUser) return;
    await saveCommunityUserRestrictionDoc({
      restriction: editingRestrictionUser,
      adminActor,
    });
    setEditingRestrictionUser(null);
    await loadCommunityData();
    onSuccessToast(`Updated community privileges for ${editingRestrictionUser.userName}.`);
  };

  const handleResolveReportSubmit = async (
    status: 'Reviewed' | 'Action Taken' | 'Dismissed'
  ) => {
    if (!resolvingReport) return;
    await resolveCommunityModerationReportDoc({
      reportId: resolvingReport.id,
      status,
      moderationAction: reportActionInput,
      moderationNotes: reportNotesInput,
      adminActor,
    });
    setResolvingReport(null);
    setReportNotesInput('');
    await loadCommunityData();
    onSuccessToast(`Report marked as ${status}.`);
  };

  // Flatten all comments/replies across posts for Comment Management
  const allCommentsFlat = useMemo(() => {
    const list: Array<{
      post: EssentialCommunityPost;
      reply: EssentialCommunityReply;
    }> = [];
    for (const p of posts) {
      for (const r of p.replies || []) {
        list.push({ post: p, reply: r });
      }
    }
    return list.sort((a, b) =>
      (b.reply.createdAt || '').localeCompare(a.reply.createdAt || '')
    );
  }, [posts]);

  // =========================================================================
  // PART 5: 100% DATABASE-DERIVED COMMUNITY ANALYTICS
  // =========================================================================
  const communityAnalytics = useMemo(() => {
    const totalPosts = posts.length;
    const totalComments = allCommentsFlat.filter((c) => !c.reply.parentReplyId).length;
    const totalReplies = allCommentsFlat.filter((c) => Boolean(c.reply.parentReplyId)).length;
    const totalLikes = posts.reduce((acc, p) => acc + Math.max(0, p.likesCount || 0), 0);
    const hiddenOrModCount =
      posts.filter((p) => p.status !== 'published').length +
      allCommentsFlat.filter((c) => c.reply.status && c.reply.status !== 'published').length;

    const contributorMap = new Map<
      string,
      { uid: string; name: string; email: string; posts: number; comments: number }
    >();

    for (const p of posts) {
      const cur = contributorMap.get(p.authorId) || {
        uid: p.authorId,
        name: p.authorName,
        email: p.authorEmail || '',
        posts: 0,
        comments: 0,
      };
      cur.posts += 1;
      contributorMap.set(p.authorId, cur);
    }

    for (const { reply } of allCommentsFlat) {
      const cur = contributorMap.get(reply.authorId) || {
        uid: reply.authorId,
        name: reply.authorName,
        email: reply.authorEmail || '',
        posts: 0,
        comments: 0,
      };
      cur.comments += 1;
      contributorMap.set(reply.authorId, cur);
    }

    const mostLikedPosts = [...posts]
      .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
      .slice(0, 5);

    const mostCommentedPosts = [...posts]
      .sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0))
      .slice(0, 5);

    return {
      totalPosts,
      totalComments,
      totalReplies,
      totalLikes,
      hiddenOrModCount,
      reportedCount: reports.length,
      pendingReportsCount: reports.filter((r) => r.status === 'Pending').length,
      activeContributors: Array.from(contributorMap.values()).sort(
        (a, b) => b.posts + b.comments - (a.posts + a.comments)
      ),
      mostLikedPosts,
      mostCommentedPosts,
    };
  }, [posts, allCommentsFlat, reports]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.channel.toLowerCase().includes(q)
      );
    });
  }, [posts, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <Users className="w-4 h-4" />
            <span>PART 3, 4 & 5 — EVERYKR COMMUNITY ADMIN CONTROL CENTER</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Community Posts, UID-Keyed Likes, Comments, User Privileges & Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real database-backed social moderation. Inspect genuine Like records, moderate comments, manage user posting privileges, and review safety reports.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCommunityData}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer self-start lg:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Community Data</span>
        </button>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'posts', label: `Community Posts (${posts.length})`, icon: MessageSquare },
          {
            id: 'likes_comments',
            label: `Likes (${communityAnalytics.totalLikes}) & Comments (${allCommentsFlat.length})`,
            icon: Heart,
          },
          {
            id: 'users',
            label: `Community User Privileges (${communityAnalytics.activeContributors.length})`,
            icon: Users,
          },
          {
            id: 'reports',
            label: `Reports & Moderation (${reports.length})`,
            icon: Flag,
          },
          {
            id: 'analytics',
            label: 'Real Community Analytics',
            icon: BarChart3,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* SECTION 1: COMMUNITY POSTS MANAGEMENT (PART 4.1)                    */}
      {/* =================================================================== */}
      {activeSection === 'posts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts by title, author, channel..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {['ALL', 'published', 'hidden', 'flagged'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3 px-3">Post Title & Channel</th>
                  <th className="py-3 px-3">Author</th>
                  <th className="py-3 px-3">Genuine Likes / Comments</th>
                  <th className="py-3 px-3">Flags & Status</th>
                  <th className="py-3 px-3 text-right">Moderation Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-3 max-w-md">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {post.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {post.channel} • {post.city} • {new Date(post.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {post.authorName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        UID: {post.authorId}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openLikesInspector(post)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold cursor-pointer"
                        >
                          <Heart className="w-3 h-3" />
                          <span>{post.likesCount} Likes (Inspect)</span>
                        </button>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold">
                          {(post.replies || []).length} Comments
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            post.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {post.status}
                        </span>
                        {post.pinned && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            Pinned
                          </span>
                        )}
                        {post.featured && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                            Featured
                          </span>
                        )}
                        {post.commentsLocked && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Locked
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handlePostToggle(post, 'pinned')}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            post.pinned
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                          title="Pin / Unpin Post"
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePostToggle(post, 'featured')}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            post.featured
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                          title="Feature / Unfeature Post"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePostToggle(post, 'commentsLocked')}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            post.commentsLocked
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                          title="Lock / Unlock Comments"
                        >
                          {post.commentsLocked ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePostToggle(post, 'visibility')}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold cursor-pointer"
                        >
                          {post.status === 'published' ? 'Hide' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePostAdmin(post)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION 2: LIKES & COMMENTS MODERATION (PART 4.2 & 4.3)             */}
      {/* =================================================================== */}
      {activeSection === 'likes_comments' && (
        <div className="space-y-4">
          {/* Genuine Likes Verification Notice */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-extrabold text-blue-950 dark:text-blue-200">
                Strict Anti-Fabrication Policy: Genuine Firebase UID Likes Only
              </div>
              <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                Every Like is stored under <code>community_posts/&#123;postId&#125;/likes/&#123;userId&#125;</code>. Admins can inspect user IDs & timestamps and remove fraudulent/spam Likes with a recorded moderation reason.
              </p>
            </div>
            <select
              value={selectedPostForLikes?.id || ''}
              onChange={(e) => {
                const found = posts.find((p) => p.id === e.target.value);
                if (found) openLikesInspector(found);
              }}
              className="h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-xs font-bold"
            >
              <option value="">Select a Post to Inspect Likes...</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title.slice(0, 50)} ({p.likesCount} Likes)
                </option>
              ))}
            </select>
          </div>

          {/* All Comments & Replies Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              All Community Comments & Nested Replies ({allCommentsFlat.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Comment / Reply Content</th>
                    <th className="py-2.5 px-3">Author & UID</th>
                    <th className="py-2.5 px-3">Parent Post</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allCommentsFlat.map(({ post, reply }) => (
                    <tr key={reply.id}>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-[10px]">
                          {reply.parentReplyId ? 'Reply' : 'Comment'}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-md">
                        <p className="text-slate-800 dark:text-slate-200">{reply.content}</p>
                        <span className="text-[10px] text-slate-400">
                          {new Date(reply.createdAt).toLocaleString()} • {reply.likesCount || 0} Likes
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold">{reply.authorName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{reply.authorId}</div>
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate font-semibold">{post.title}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            reply.status === 'hidden'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {reply.status || 'published'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleModerateComment(
                                post.id,
                                reply.id,
                                reply.status === 'hidden' ? 'restore' : 'hide'
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold cursor-pointer"
                          >
                            {reply.status === 'hidden' ? 'Restore' : 'Hide'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModerateComment(post.id, reply.id, 'delete')}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION 3: COMMUNITY USER MANAGEMENT (PART 4.4)                     */}
      {/* =================================================================== */}
      {activeSection === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Community Contributors & Privilege Restrictions (`community_user_restrictions`)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Community restrictions control posting, commenting, and liking privileges independently of Firebase Authentication login status.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3 px-3">Contributor Name & UID</th>
                  <th className="py-3 px-3">Posts Created</th>
                  <th className="py-3 px-3">Comments & Replies</th>
                  <th className="py-3 px-3">Community Privilege Status</th>
                  <th className="py-3 px-3 text-right">Manage Privileges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {communityAnalytics.activeContributors.map((c) => {
                  const rest = restrictions.find((r) => r.userId === c.uid);
                  const status = rest?.restrictionStatus || 'active';

                  return (
                    <tr key={c.uid}>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          UID: {c.uid} {c.email ? `• ${c.email}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-extrabold">{c.posts}</td>
                      <td className="py-3 px-3 font-extrabold">{c.comments}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                            status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {status}
                        </span>
                        {rest?.reason && status !== 'active' && (
                          <div className="text-[11px] text-rose-600 mt-0.5">
                            Reason: {rest.reason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingRestrictionUser({
                              userId: c.uid,
                              userName: c.name,
                              userEmail: c.email,
                              restrictionStatus: status,
                              canPost: rest ? rest.canPost : true,
                              canComment: rest ? rest.canComment : true,
                              canLike: rest ? rest.canLike : true,
                              reason: rest?.reason || '',
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold cursor-pointer"
                        >
                          Configure Privileges
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION 4: CENTRALIZED COMMUNITY REPORTS QUEUE (PART 4.5)           */}
      {/* =================================================================== */}
      {activeSection === 'reports' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Centralized Community Moderation Reports ({reports.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review reported posts, comments, replies, and accounts from the <code>reports</code> collection.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Target Type & Item</th>
                  <th className="py-3 px-3">Reason & Details</th>
                  <th className="py-3 px-3">Reporter</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No community reports pending review.
                    </td>
                  </tr>
                ) : (
                  reports.map((rep) => (
                    <tr key={rep.id}>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {new Date(rep.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-[10px] uppercase mr-1.5">
                          {rep.targetType}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {rep.targetTitleOrSnippet}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-bold text-rose-600">{rep.reasonCategory}</div>
                        <div className="text-slate-500">{rep.details}</div>
                      </td>
                      <td className="py-3 px-3">{rep.reporterName}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rep.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setResolvingReport(rep);
                            setReportNotesInput(rep.moderationNotes || '');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold cursor-pointer"
                        >
                          Review Report
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION 5: REAL DATABASE-DERIVED COMMUNITY ANALYTICS (PART 5)       */}
      {/* =================================================================== */}
      {activeSection === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Total Posts</div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {communityAnalytics.totalPosts}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-blue-500 uppercase">Total Comments</div>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">
                {communityAnalytics.totalComments}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-indigo-500 uppercase">Nested Replies</div>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                {communityAnalytics.totalReplies}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-rose-500 uppercase">Total Real Likes</div>
              <div className="text-2xl font-extrabold text-rose-600 mt-1">
                {communityAnalytics.totalLikes}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-amber-500 uppercase">Reported Content</div>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">
                {communityAnalytics.reportedCount}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-purple-500 uppercase">Hidden / Moderated</div>
              <div className="text-2xl font-extrabold text-purple-600 mt-1">
                {communityAnalytics.hiddenOrModCount}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Most Liked Community Discussions
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {communityAnalytics.mostLikedPosts.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                    <span className="font-bold truncate">{p.title}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-extrabold shrink-0">
                      {p.likesCount} Likes
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Most Commented Community Discussions
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {communityAnalytics.mostCommentedPosts.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                    <span className="font-bold truncate">{p.title}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-extrabold shrink-0">
                      {(p.replies || []).length} Comments
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: LIKE INSPECTOR (`community_posts/{postId}/likes/{userId}`)   */}
      {/* =================================================================== */}
      {selectedPostForLikes && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Genuine Like Records Inspector ({postLikesList.length})
                </h3>
                <p className="text-xs text-slate-500">{selectedPostForLikes.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPostForLikes(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                Moderation Reason (Required when removing a fraudulent/spam Like)
              </label>
              <input
                type="text"
                value={removeLikeReason}
                onChange={(e) => setRemoveLikeReason(e.target.value)}
                placeholder="e.g., Automated spam account or duplicate abuse"
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            {loadingLikes ? (
              <p className="text-xs text-slate-500 py-4 text-center">Loading Like records...</p>
            ) : postLikesList.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No user Likes recorded for this post yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {postLikesList.map((lk) => (
                  <div key={lk.userId} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {lk.userName} ({lk.userEmail || 'Verified UID'})
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        UID: {lk.userId} • {new Date(lk.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFraudulentLike(lk)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold cursor-pointer"
                    >
                      Remove Like
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CONFIGURE COMMUNITY USER RESTRICTIONS                        */}
      {/* =================================================================== */}
      {editingRestrictionUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUserRestriction}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Community Privileges: {editingRestrictionUser.userName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRestrictionUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Community Status</label>
              <select
                value={editingRestrictionUser.restrictionStatus}
                onChange={(e) => {
                  const val = e.target.value as CommunityUserRestrictionRecord['restrictionStatus'];
                  setEditingRestrictionUser({
                    ...editingRestrictionUser,
                    restrictionStatus: val,
                    canPost: val === 'active' || val === 'commenting_restricted',
                    canComment: val === 'active' || val === 'posting_restricted',
                    canLike: val !== 'community_suspended',
                  });
                }}
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="active">Active (Full Community Privileges)</option>
                <option value="posting_restricted">Restrict Posting Only</option>
                <option value="commenting_restricted">Restrict Commenting Only</option>
                <option value="community_suspended">Suspend All Community Access</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Moderation Reason</label>
              <textarea
                rows={2}
                required={editingRestrictionUser.restrictionStatus !== 'active'}
                value={editingRestrictionUser.reason}
                onChange={(e) =>
                  setEditingRestrictionUser({ ...editingRestrictionUser, reason: e.target.value })
                }
                placeholder="Reason for privilege change..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRestrictionUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 text-white cursor-pointer"
              >
                Save Privileges
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: RESOLVE COMMUNITY REPORT                                     */}
      {/* =================================================================== */}
      {resolvingReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Resolve Community Report
              </h3>
              <button
                type="button"
                onClick={() => setResolvingReport(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <div className="font-bold">{resolvingReport.targetTitleOrSnippet}</div>
              <div className="text-rose-600 font-semibold">{resolvingReport.details}</div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Moderation Action Taken</label>
              <input
                type="text"
                value={reportActionInput}
                onChange={(e) => setReportActionInput(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Resolution Notes</label>
              <textarea
                rows={2}
                value={reportNotesInput}
                onChange={(e) => setReportNotesInput(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => handleResolveReportSubmit('Dismissed')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 cursor-pointer"
              >
                Dismiss Report
              </button>
              <button
                type="button"
                onClick={() => handleResolveReportSubmit('Action Taken')}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 text-white cursor-pointer"
              >
                Mark Action Taken
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
